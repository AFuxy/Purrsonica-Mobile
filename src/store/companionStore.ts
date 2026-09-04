import { create } from 'zustand';
import {
  Album,
  CompanionPairingPayload,
  ConnectionStatus,
  DesktopPlaybackState,
  PlaybackTarget,
  Playlist,
  RemotePlaybackCommand,
  Track,
} from '../types';
import { connectionService } from '../services/connection';
import { audioService } from '../services/audio';
import { getServerConfig, StoredServerConfig } from '../services/storage';

interface CompanionState {
  connectionStatus: ConnectionStatus;
  serverConfig: StoredServerConfig | null;
  activeHost: string | null;

  // Library
  tracks: Track[];
  playlists: Playlist[];
  albums: Album[];
  isLoadingLibrary: boolean;
  searchQuery: string;

  // Mobile Audio State
  currentTrack: Track | null;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isBuffering: boolean;
  isFullPlayerOpen: boolean;

  // Cross-Device Playback Awareness
  playbackTarget: PlaybackTarget;
  desktopPlaybackState: DesktopPlaybackState | null;

  // Actions
  init: () => Promise<void>;
  pairWithDesktop: (payload: CompanionPairingPayload) => Promise<boolean>;
  disconnectAndUnpair: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  playTrack: (track: Track) => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (positionMillis: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  setPlaybackTarget: (target: PlaybackTarget) => void;
  sendRemoteDesktopCommand: (command: RemotePlaybackCommand) => void;
  transferToPC: () => Promise<void>;
  transferToPhone: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFullPlayerOpen: (open: boolean) => void;
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  connectionStatus: 'disconnected',
  serverConfig: null,
  activeHost: null,

  tracks: [],
  playlists: [],
  albums: [],
  isLoadingLibrary: false,
  searchQuery: '',

  currentTrack: null,
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  isBuffering: false,
  isFullPlayerOpen: false,

  playbackTarget: 'phone',
  desktopPlaybackState: null,

  init: async () => {
    // 1. Listen to connection state changes
    connectionService.addStatusListener(async (status) => {
      set({
        connectionStatus: status,
        activeHost: connectionService.getActiveHost(),
      });

      if (status === 'connected') {
        // Fetch library once connected
        get().refreshLibrary();
        // Notify audio service in case range resume is needed
        audioService.handleNetworkRestored();
      }
    });

    // 2. Listen to desktop playback broadcasts
    connectionService.addDesktopStateListener((desktopState) => {
      set({ desktopPlaybackState: desktopState });
    });

    // 3. Listen to incoming remote commands from desktop PC
    connectionService.addRemoteCommandListener((cmd) => {
      if (cmd.type === 'play') {
        audioService.resume();
      } else if (cmd.type === 'pause') {
        audioService.pause();
      } else if (cmd.type === 'toggle') {
        audioService.togglePlay();
      } else if (cmd.type === 'next') {
        get().playNext();
      } else if (cmd.type === 'previous') {
        get().playPrevious();
      } else if (cmd.type === 'seek' && typeof cmd.position === 'number') {
        audioService.seekTo(cmd.position * 1000);
      } else if (cmd.type === 'playTrack' && cmd.trackId) {
        const found = get().tracks.find((t) => t.id === cmd.trackId) || {
          id: cmd.trackId,
          title: (cmd as any).title || 'Streaming Track',
          artist: (cmd as any).artist || 'Unknown Artist',
          album: (cmd as any).album,
          duration: (cmd as any).duration || 0,
          file_name: 'track',
          file_path: '',
          format: 'mp3',
          file_size: 0,
          date_added: Date.now(),
        };
        get().playTrack(found as Track);
        if (typeof cmd.position === 'number' && cmd.position > 0) {
          setTimeout(() => {
            audioService.seekTo(cmd.position! * 1000);
          }, 250);
        }
      }
    });

    // 4. Listen to local mobile audio updates
    audioService.addStatusListener((status) => {
      set({
        isPlaying: status.isPlaying,
        positionMillis: status.positionMillis,
        durationMillis: status.durationMillis,
        isBuffering: status.isBuffering,
      });

      if (status.didJustFinish) {
        get().playNext();
      }
    });

    // 5. Load stored server config & attempt auto-connect
    const config = await getServerConfig();
    set({ serverConfig: config });

    if (config) {
      await connectionService.autoConnect();
    }
  },

  pairWithDesktop: async (payload) => {
    const success = await connectionService.pairWithDesktop(payload);
    if (success) {
      const config = await getServerConfig();
      set({
        serverConfig: config,
        activeHost: connectionService.getActiveHost(),
      });
      get().refreshLibrary();
    }
    return success;
  },

  disconnectAndUnpair: async () => {
    await audioService.stop();
    await connectionService.disconnectAndUnpair();
    set({
      serverConfig: null,
      activeHost: null,
      tracks: [],
      playlists: [],
      currentTrack: null,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      desktopPlaybackState: null,
    });
  },

  refreshLibrary: async () => {
    if (get().isLoadingLibrary) return;
    set({ isLoadingLibrary: true });
    try {
      const [tracks, playlists, albums] = await Promise.all([
        connectionService.fetchLibraryTracks(50000, 0),
        connectionService.fetchPlaylists(),
        connectionService.fetchAlbums(),
      ]);
      set({ tracks, playlists, albums });
    } catch (err) {
      console.warn('[Store] Failed to refresh library:', err);
    } finally {
      set({ isLoadingLibrary: false });
    }
  },

  playTrack: async (track) => {
    set({ currentTrack: track, playbackTarget: 'phone' });
    await audioService.playTrack(track);
  },

  togglePlay: async () => {
    const target = get().playbackTarget;
    if (target === 'remote_desktop') {
      connectionService.sendRemoteCommand({ type: 'toggle' });
    } else {
      await audioService.togglePlay();
    }
  },

  seekTo: async (positionMillis) => {
    const target = get().playbackTarget;
    if (target === 'remote_desktop') {
      connectionService.sendRemoteCommand({
        type: 'seek',
        position: Math.round(positionMillis / 1000),
      });
    } else {
      await audioService.seekTo(positionMillis);
    }
  },

  playNext: async () => {
    // When connected, let the Desktop app resolve the next track (smart queue, playlist, shuffle)
    if (connectionService.isConnected()) {
      connectionService.sendRemoteCommand({ type: 'next' });
      return;
    }

    // Offline fallback
    const { tracks, currentTrack } = get();
    if (tracks.length === 0 || !currentTrack) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    await get().playTrack(tracks[nextIndex]);
  },

  playPrevious: async () => {
    // When connected, let the Desktop app resolve previous track / restart track
    if (connectionService.isConnected()) {
      connectionService.sendRemoteCommand({ type: 'previous' });
      return;
    }

    // Offline fallback
    const { tracks, currentTrack, positionMillis } = get();
    if (tracks.length === 0 || !currentTrack) return;

    // If more than 3 seconds in, restart current track
    if (positionMillis > 3000) {
      await audioService.seekTo(0);
      return;
    }

    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    await get().playTrack(tracks[prevIndex]);
  },

  setPlaybackTarget: (target) => set({ playbackTarget: target }),

  sendRemoteDesktopCommand: (command) => connectionService.sendRemoteCommand(command),

  transferToPC: async () => {
    const { currentTrack, positionMillis } = get();
    if (!currentTrack) return;
    await audioService.pause();
    connectionService.sendRemoteCommand({
      type: 'playTrack',
      trackId: currentTrack.id,
      position: Math.max(0, Math.floor(positionMillis / 1000)),
    });
    set({ playbackTarget: 'remote_desktop' });
  },

  transferToPhone: async () => {
    const { desktopPlaybackState, tracks } = get();
    // 1. Tell PC to pause
    connectionService.sendRemoteCommand({ type: 'pause' });

    // 2. Play locally from exact timestamp
    if (desktopPlaybackState?.track) {
      const trackId = desktopPlaybackState.track.id;
      const found = tracks.find((t) => t.id === trackId) || (desktopPlaybackState.track as any);
      set({ currentTrack: found, playbackTarget: 'phone' });
      await audioService.playTrack(found, Math.floor(desktopPlaybackState.currentTime || 0));
    } else {
      set({ playbackTarget: 'phone' });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setFullPlayerOpen: (open) => set({ isFullPlayerOpen: open }),
}));
