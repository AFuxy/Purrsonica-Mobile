export interface Track {
  id: string;
  file_path: string;
  file_name: string;
  title: string;
  artist: string;
  album: string;
  album_artist?: string | null;
  genre?: string | null;
  year?: number | null;
  track_number?: number | null;
  duration: number;
  bitrate?: number | null;
  sample_rate?: number | null;
  format: string;
  file_size: number;
  cover_art_path?: string | null;
  bpm?: number | null;
  musical_key?: string | null;
  camelot_key?: string | null;
  is_liked: boolean;
  play_count: number;
  media_type: 'audio' | 'video';
  // Offline caching status
  is_cached?: boolean;
  local_cached_uri?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string | null;
  cover_art_path?: string | null;
  is_system: boolean;
  track_count: number;
  created_at: number;
}

export interface CompanionPairingPayload {
  version: number;
  serverName: string;
  localIps: string[];
  port: number;
  pairingToken: string;
  fingerprint: string;
  expiresAt: number;
  allowOutsideLan?: boolean;
}

export interface CompanionDevice {
  id: string;
  name: string;
  platform: 'ios' | 'android' | 'other';
  model?: string;
  ip_address?: string;
  paired_at: number;
  last_seen_at: number;
  is_active: boolean;
}

export interface PairingResponse {
  success: boolean;
  token: string;
  deviceId: string;
  serverName: string;
  version: string;
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export interface MobilePlaybackState {
  isPlaying: boolean;
  trackId?: string;
  trackTitle?: string;
  artist?: string;
  currentTime: number;
  duration: number;
  volume: number;
  deviceId: string;
  deviceName: string;
}

export interface DesktopPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  track?: {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    bpm?: number | null;
    camelot_key?: string | null;
    has_cover: boolean;
  } | null;
}

export interface RemotePlaybackCommand {
  type:
    | 'play'
    | 'pause'
    | 'toggle'
    | 'next'
    | 'previous'
    | 'seek'
    | 'setVolume'
    | 'playTrack'
    | 'transferToPC';
  trackId?: string;
  position?: number;
  volume?: number;
}

export type PlaybackTarget = 'phone' | 'remote_desktop';
