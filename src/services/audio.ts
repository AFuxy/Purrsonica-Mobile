import { Audio, AVPlaybackStatus } from 'expo-av';
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
  private sound: Audio.Sound | null = null;
  private currentTrack: Track | null = null;
  private lastKnownPosition: number = 0;
  private isConfigured: boolean = false;
  private statusListeners = new Set<AudioStatusCallback>();
  private resumeTimeout: any = null;

  public async initialize(): Promise<void> {
    if (this.isConfigured) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isConfigured = true;
      console.log('[AudioService] Audio mode configured for background streaming');
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

  public async playTrack(track: Track, startPositionMillis = 0): Promise<void> {
    await this.initialize();
    this.currentTrack = track;
    this.lastKnownPosition = startPositionMillis;

    // Unload existing audio if present
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch {}
      this.sound = null;
    }

    const token = await getAuthToken();
    const streamUrl = connectionService.getStreamUrl(track.id);

    if (!streamUrl) {
      console.error('[AudioService] Cannot play track: No stream URL available');
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        {
          uri: streamUrl,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
        {
          shouldPlay: true,
          positionMillis: startPositionMillis,
          progressUpdateIntervalMillis: 500,
        },
        this.onPlaybackStatusUpdate
      );

      this.sound = sound;
      this.broadcastStateToDesktop(true, startPositionMillis / 1000);
    } catch (err) {
      console.error('[AudioService] Error creating sound:', err);
    }
  }

  public async togglePlay(): Promise<void> {
    if (!this.sound) return;
    try {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await this.sound.pauseAsync();
        } else {
          await this.sound.playAsync();
        }
      }
    } catch (err) {
      console.warn('[AudioService] Toggle play error:', err);
    }
  }

  public async pause(): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.pauseAsync();
    } catch (err) {
      console.warn('[AudioService] Pause error:', err);
    }
  }

  public async resume(): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.playAsync();
    } catch (err) {
      console.warn('[AudioService] Resume error:', err);
    }
  }

  public async seekTo(positionMillis: number): Promise<void> {
    this.lastKnownPosition = positionMillis;
    if (!this.sound) return;
    try {
      await this.sound.setPositionAsync(positionMillis);
    } catch (err) {
      console.warn('[AudioService] Seek error:', err);
    }
  }

  public async setVolume(volume: number): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    } catch (err) {
      console.warn('[AudioService] Volume error:', err);
    }
  }

  // Range-resumption callback: handles network drops and resumes from saved offset
  public async handleNetworkRestored(): Promise<void> {
    if (!this.currentTrack || !this.sound) return;

    try {
      const status = await this.sound.getStatusAsync();
      if (!status.isLoaded && this.lastKnownPosition > 0) {
        console.log(
          `[AudioService] Network restored. Resuming ${this.currentTrack.title} at ${Math.round(
            this.lastKnownPosition / 1000
          )}s`
        );
        await this.playTrack(this.currentTrack, this.lastKnownPosition);
      }
    } catch (err) {
      console.warn('[AudioService] Network restore check error:', err);
    }
  }

  private onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.warn(`[AudioService] Playback error: ${status.error}`);
        // If an unexpected stream failure occurred while track was playing, attempt range recovery
        if (this.currentTrack && this.lastKnownPosition > 0) {
          if (this.resumeTimeout) clearTimeout(this.resumeTimeout);
          this.resumeTimeout = setTimeout(() => {
            if (this.currentTrack) {
              console.log('[AudioService] Attempting range recovery after error...');
              this.playTrack(this.currentTrack, this.lastKnownPosition);
            }
          }, 1500);
        }
      }
      return;
    }

    this.lastKnownPosition = status.positionMillis;

    this.statusListeners.forEach((cb) =>
      cb({
        isPlaying: status.isPlaying,
        positionMillis: status.positionMillis,
        durationMillis: status.durationMillis || (this.currentTrack ? this.currentTrack.duration * 1000 : 0),
        isBuffering: status.isBuffering,
        didJustFinish: status.didJustFinish,
      })
    );

    this.broadcastStateToDesktop(status.isPlaying, status.positionMillis / 1000);
  };

  private async broadcastStateToDesktop(isPlaying: boolean, currentSec: number): Promise<void> {
    if (!this.currentTrack) return;
    const deviceId = await getOrCreateDeviceId();
    const deviceName = await getDeviceName();

    connectionService.broadcastPlaybackState({
      isPlaying,
      trackId: this.currentTrack.id,
      trackTitle: this.currentTrack.title,
      artist: this.currentTrack.artist,
      currentTime: Math.floor(currentSec),
      duration: Math.floor(this.currentTrack.duration),
      volume: 1.0,
      deviceId,
      deviceName,
    });
  }

  public async stopAndUnload(): Promise<void> {
    if (this.resumeTimeout) clearTimeout(this.resumeTimeout);
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch {}
      this.sound = null;
    }
    this.currentTrack = null;
    this.lastKnownPosition = 0;
  }
}

export const audioService = new AudioService();
