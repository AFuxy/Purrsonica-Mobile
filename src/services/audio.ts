import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
  AudioStatus,
} from 'expo-audio';
import { Track } from '../types';
import { connectionService } from './connection';
import { getAuthToken, getDeviceName, getOrCreateDeviceId } from './storage';

export type AudioStatusCallback = (status: {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isBuffering: boolean;
  didJustFinish: boolean;
}) => void;

class AudioService {
  private player: AudioPlayer | null = null;
  private currentTrack: Track | null = null;
  private lastKnownPositionSec: number = 0;
  private isConfigured: boolean = false;
  private statusListeners = new Set<AudioStatusCallback>();
  private pollInterval: any = null;
  private isRecovering: boolean = false;

  public async initialize(): Promise<void> {
    if (this.isConfigured) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      this.isConfigured = true;
      console.log('[AudioService] Configured expo-audio for background streaming');
    } catch (err) {
      console.warn('[AudioService] Failed to set audio mode:', err);
    }
  }

  public addStatusListener(cb: AudioStatusCallback): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public async playTrack(track: Track, startPositionSec = 0): Promise<void> {
    await this.initialize();
    this.currentTrack = track;
    this.lastKnownPositionSec = startPositionSec;

    // Cleanup previous player
    this.cleanupPlayer();

    const streamUrl = connectionService.getStreamUrl(track.id);
    console.log(`[AudioService] Streaming track ${track.id} from ${streamUrl} at offset ${startPositionSec}s`);

    try {
      this.player = createAudioPlayer(streamUrl);

      // Configure lock screen metadata
      const artUrl = track.cover_art_path ? connectionService.getArtUrl(track.id) : undefined;
      this.player.setActiveForLockScreen(true, {
        title: track.title || track.file_name,
        artist: track.artist || 'Purrsonica',
        albumTitle: track.album || 'Purrsonica Music',
        artworkUrl: artUrl,
      });

      if (startPositionSec > 0) {
        await this.player.seekTo(startPositionSec);
      }

      this.player.play();
      this.startStatusPolling();
      this.notifyPlaybackState(true, startPositionSec * 1000);
    } catch (err) {
      console.error('[AudioService] playTrack error:', err);
    }
  }

  public pause(): void {
    if (this.player && this.player.playing) {
      this.player.pause();
      this.notifyPlaybackState(false, this.lastKnownPositionSec * 1000);
    }
  }

  public resume(): void {
    if (this.player && !this.player.playing) {
      this.player.play();
      this.notifyPlaybackState(true, this.lastKnownPositionSec * 1000);
    }
  }

  public togglePlay(): void {
    if (!this.player) return;
    if (this.player.playing) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public async seekTo(positionMillis: number): Promise<void> {
    const sec = Math.max(0, positionMillis / 1000);
    this.lastKnownPositionSec = sec;
    if (this.player) {
      await this.player.seekTo(sec);
      this.notifyPlaybackState(this.player.playing, positionMillis);
    }
  }

  public async stop(): Promise<void> {
    this.cleanupPlayer();
    this.currentTrack = null;
    this.lastKnownPositionSec = 0;
    this.notifyPlaybackState(false, 0);
  }

  /**
   * Resilient Range Resumption Recovery
   * Called by connectionService when network reconnects after a drop
   */
  public async handleNetworkRestored(): Promise<void> {
    if (!this.currentTrack || !this.lastKnownPositionSec || this.isRecovering) return;

    // If player stopped playing due to network drop, resume from exact position
    if (this.player && !this.player.playing) {
      this.isRecovering = true;
      console.log(`[AudioService] Recovering stream after reconnect from ${this.lastKnownPositionSec}s...`);
      try {
        await this.playTrack(this.currentTrack, this.lastKnownPositionSec);
      } catch (err) {
        console.warn('[AudioService] Stream recovery error:', err);
      } finally {
        this.isRecovering = false;
      }
    }
  }

  private startStatusPolling(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(() => {
      if (!this.player) return;

      const isPlaying = this.player.playing;
      const currentSec = this.player.currentTime || 0;
      const durationSec = this.player.duration || this.currentTrack?.duration || 0;
      const isBuffering = this.player.isBuffering;

      if (currentSec > 0) {
        this.lastKnownPositionSec = currentSec;
      }

      const positionMillis = Math.floor(currentSec * 1000);
      const durationMillis = Math.floor(durationSec * 1000);
      const didJustFinish = durationSec > 0 && currentSec >= durationSec - 0.5;

      this.statusListeners.forEach((cb) => {
        cb({
          isPlaying,
          positionMillis,
          durationMillis,
          isBuffering,
          didJustFinish,
        });
      });

      if (didJustFinish) {
        this.cleanupPlayer();
      }
    }, 500);
  }

  private cleanupPlayer(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.player) {
      try {
        this.player.pause();
        this.player.setActiveForLockScreen(false);
      } catch {}
      this.player = null;
    }
  }

  private async notifyPlaybackState(isPlaying: boolean, positionMillis: number): Promise<void> {
    const token = await getAuthToken();
    const deviceId = await getOrCreateDeviceId();
    const deviceName = await getDeviceName();

    connectionService.broadcastPlaybackState({
      deviceId,
      deviceName,
      isPlaying,
      trackId: this.currentTrack?.id,
      trackTitle: this.currentTrack?.title || this.currentTrack?.file_name,
      artist: this.currentTrack?.artist,
      currentTime: Math.floor(positionMillis / 1000),
      duration: this.currentTrack ? Math.floor(this.currentTrack.duration) : 0,
      volume: 1.0,
    });
  }
}

export const audioService = new AudioService();
