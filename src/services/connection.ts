import { Platform } from 'react-native';
import {
  CompanionPairingPayload,
  ConnectionStatus,
  DesktopPlaybackState,
  MobilePlaybackState,
  PairingResponse,
  Playlist,
  RemotePlaybackCommand,
  Track,
} from '../types';
import {
  getAuthToken,
  getOrCreateDeviceId,
  getDeviceName,
  getServerConfig,
  saveAuthToken,
  saveServerConfig,
  wipePairingSession,
  StoredServerConfig,
} from './storage';

type StatusListener = (status: ConnectionStatus) => void;
type DesktopStateListener = (state: DesktopPlaybackState) => void;
type RemoteCommandListener = (cmd: RemotePlaybackCommand) => void;

class ConnectionService {
  private status: ConnectionStatus = 'disconnected';
  private ws: WebSocket | null = null;
  private activeHost: string | null = null;
  private port: number = 51820;
  private cachedToken: string | null = null;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private retryCount: number = 0;
  private isExplicitDisconnect: boolean = false;

  private statusListeners = new Set<StatusListener>();
  private desktopStateListeners = new Set<DesktopStateListener>();
  private remoteCommandListeners = new Set<RemoteCommandListener>();

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getActiveHost(): string | null {
    return this.activeHost;
  }

  public getPort(): number {
    return this.port;
  }

  public addStatusListener(cb: StatusListener): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  public addDesktopStateListener(cb: DesktopStateListener): () => void {
    this.desktopStateListeners.add(cb);
    return () => this.desktopStateListeners.delete(cb);
  }

  public addRemoteCommandListener(cb: RemoteCommandListener): () => void {
    this.remoteCommandListeners.add(cb);
    return () => this.remoteCommandListeners.delete(cb);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  // --- Pairing Flow ---
  public async pairWithDesktop(payload: CompanionPairingPayload): Promise<boolean> {
    this.isExplicitDisconnect = false;
    this.setStatus('connecting');

    const deviceId = await getOrCreateDeviceId();
    const deviceName = await getDeviceName();
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'other';

    // Find the responding host IP from the payload
    const workingHost = await this.discoverResponsiveHost(payload.localIps, payload.port);
    if (!workingHost) {
      console.warn('[Connection] No responding host found in candidate IPs');
      this.setStatus('failed');
      return false;
    }

    this.activeHost = workingHost;
    this.port = payload.port;

    try {
      const response = await fetch(`http://${workingHost}:${payload.port}/api/v1/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingToken: payload.pairingToken,
          deviceId,
          deviceName,
          platform,
          model: Platform.select({
            ios: 'iPhone',
            android: ((Platform.constants as any)?.Model as string) || 'Android Device',
            default: 'Mobile',
          }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Connection] Pairing failed with HTTP status:', response.status, errorText);
        this.setStatus('failed');
        return false;
      }

      const data = (await response.json()) as any;
      const token = data?.token || data?.authToken;
      if (!token) {
        console.error('[Connection] Pairing failed: token not found in response:', data);
        this.setStatus('failed');
        return false;
      }

      // Save token and server configuration
      await saveAuthToken(token);
      await saveServerConfig({
        serverName: data.serverName || payload.serverName,
        localIps: payload.localIps,
        port: payload.port,
        fingerprint: data.fingerprint || payload.fingerprint,
        allowOutsideLan: payload.allowOutsideLan,
      });

      this.retryCount = 0;
      await this.connectWebSocket(workingHost, payload.port, token);
      return true;
    } catch (err) {
      console.error('[Connection] Pairing request error:', err);
      this.setStatus('failed');
      return false;
    }
  }

  // --- Auto-Connect & Reconnect Engine ---
  public async autoConnect(): Promise<boolean> {
    const token = await getAuthToken();
    const config = await getServerConfig();

    if (!token || !config) {
      this.setStatus('disconnected');
      return false;
    }

    return await this.attemptConnection(config, token);
  }

  private async attemptConnection(config: StoredServerConfig, token: string): Promise<boolean> {
    this.setStatus(this.retryCount > 0 ? 'reconnecting' : 'connecting');

    // Attempt to reach any candidate host IP
    const candidateIps = [...config.localIps];
    if (this.activeHost && !candidateIps.includes(this.activeHost)) {
      candidateIps.unshift(this.activeHost);
    }

    const host = await this.discoverResponsiveHost(candidateIps, config.port);
    if (!host) {
      console.warn(`[Connection] Discovery failed on attempt ${this.retryCount + 1}. Scheduling retry.`);
      this.scheduleReconnect();
      return false;
    }

    this.activeHost = host;
    this.port = config.port;

    return await this.connectWebSocket(host, config.port, token);
  }

  // Ping candidate hosts concurrently with a 3500ms timeout
  private async discoverResponsiveHost(ips: string[], port: number): Promise<string | null> {
    const checkIp = async (ip: string): Promise<string | null> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        console.log(`[Connection] Probing candidate host: http://${ip}:${port}/api/v1/ping`);
        const res = await fetch(`http://${ip}:${port}/api/v1/ping`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok') {
            console.log(`[Connection] Successfully discovered responsive host: ${ip}`);
            return ip;
          }
        }
      } catch (err: any) {
        console.warn(`[Connection] Ping to http://${ip}:${port} failed:`, err?.message || err);
      }
      return null;
    };

    const results = await Promise.all(ips.map(checkIp));
    return results.find((r) => r !== null) || null;
  }

  // Connect WebSocket for real-time bidirectional syncing
  private connectWebSocket(host: string, port: number, token: string): Promise<boolean> {
    this.cachedToken = token;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    return new Promise((resolve) => {
      try {
        const wsUrl = `ws://${host}:${port}/ws?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = async () => {
          console.log('[Connection] WebSocket connected to', host);
          this.retryCount = 0;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          this.setStatus('connected');
          this.startHeartbeat();

          // Sync device info and model to desktop server
          try {
            const deviceName = await getDeviceName();
            const model = Platform.OS === 'android' ? (((Platform.constants as any)?.Model as string) || 'Android') : 'iPhone';
            this.ws?.send(
              JSON.stringify({
                type: 'DEVICE_INFO',
                payload: {
                  name: deviceName,
                  model,
                  platform: Platform.OS,
                },
              })
            );
          } catch {}

          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };

        this.ws.onerror = (err) => {
          console.warn('[Connection] WebSocket error:', err);
        };

        this.ws.onclose = (event) => {
          console.log('[Connection] WebSocket closed with code:', event.code);
          this.stopHeartbeat();
          if (!this.isExplicitDisconnect) {
            this.scheduleReconnect();
          } else {
            this.setStatus('disconnected');
          }
          resolve(false);
        };
      } catch (err) {
        console.error('[Connection] WebSocket instantiation failed:', err);
        this.scheduleReconnect();
        resolve(false);
      }
    });
  }

  // Exponential backoff reconnect loop
  private scheduleReconnect(): void {
    if (this.isExplicitDisconnect) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.setStatus('reconnecting');
    this.retryCount++;

    // Backoff: 1s, 1.5s, 2.25s, max 10s
    const delay = Math.min(1000 * Math.pow(1.5, Math.min(this.retryCount, 8)), 10000);
    console.log(`[Connection] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.retryCount})...`);

    this.reconnectTimer = setTimeout(async () => {
      const token = await getAuthToken();
      const config = await getServerConfig();
      if (token && config) {
        await this.attemptConnection(config, token);
      } else {
        this.setStatus('disconnected');
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Handle messages received from Desktop
  private handleIncomingMessage(rawData: any): void {
    try {
      const message = JSON.parse(rawData);
      switch (message.type) {
        case 'DESKTOP_PLAYBACK_STATE':
        case 'DESKTOP_STATE_UPDATE':
          this.desktopStateListeners.forEach((cb) => cb(message.payload));
          break;
        case 'REMOTE_COMMAND':
          this.remoteCommandListeners.forEach((cb) => cb(message.payload));
          break;
        case 'PONG':
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('[Connection] Failed to parse incoming WebSocket message:', err);
    }
  }

  // Send Mobile Playback State to Desktop PlaybackBar
  public broadcastPlaybackState(state: MobilePlaybackState): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'MOBILE_PLAYBACK_STATE',
          payload: state,
        })
      );
    }
  }

  // Send Remote Control Command to Desktop Player
  public sendRemoteCommand(command: RemotePlaybackCommand): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'REMOTE_COMMAND',
          payload: command,
        })
      );
    }
  }

  // --- REST API Client Methods ---
  public async fetchLibraryTracks(limit = 50000, offset = 0, playlistId?: string): Promise<Track[]> {
    if (!this.activeHost) return [];
    const token = this.cachedToken || (await getAuthToken());
    if (!token) return [];

    try {
      const playlistParam = playlistId ? `&playlistId=${encodeURIComponent(playlistId)}` : '';
      const res = await fetch(
        `http://${this.activeHost}:${this.port}/api/v1/library/tracks?limit=${limit}&offset=${offset}${playlistParam}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const json = await res.json();
        return json.tracks || [];
      }
    } catch (err) {
      console.warn('[Connection] Failed to fetch tracks:', err);
    }
    return [];
  }

  public async fetchPlaylists(): Promise<Playlist[]> {
    if (!this.activeHost) return [];
    const token = this.cachedToken || (await getAuthToken());
    if (!token) return [];

    try {
      const res = await fetch(`http://${this.activeHost}:${this.port}/api/v1/library/playlists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        return json.playlists || [];
      }
    } catch (err) {
      console.warn('[Connection] Failed to fetch playlists:', err);
    }
    return [];
  }

  public getStreamUrl(trackId: string): string {
    if (!this.activeHost) return '';
    const tokenQuery = this.cachedToken ? `?token=${encodeURIComponent(this.cachedToken)}` : '';
    return `http://${this.activeHost}:${this.port}/api/v1/stream/${trackId}${tokenQuery}`;
  }

  public getArtUrl(trackId: string): string {
    if (!this.activeHost) return '';
    const tokenQuery = this.cachedToken ? `?token=${encodeURIComponent(this.cachedToken)}` : '';
    return `http://${this.activeHost}:${this.port}/api/v1/art/${trackId}${tokenQuery}`;
  }

  // Explicit disconnect & unpair
  public async disconnectAndUnpair(): Promise<void> {
    this.isExplicitDisconnect = true;
    this.cachedToken = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    await wipePairingSession();
    this.activeHost = null;
    this.setStatus('disconnected');
  }
}

export const connectionService = new ConnectionService();
