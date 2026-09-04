import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import {
  Search,
  RefreshCw,
  Unlink,
  Music,
  ListMusic,
  Disc,
  Sliders,
  ShieldCheck,
  Smartphone,
  HardDrive,
  Info,
  ChevronLeft,
  Play,
  Sparkles,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { useCompanionStore } from '../store/companionStore';
import { useThemeStore } from '../store/themeStore';
import { TrackItem } from '../components/TrackItem';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { connectionService } from '../services/connection';
import { Album, Playlist, Track } from '../types';

type TabType = 'tracks' | 'albums' | 'playlists' | 'settings';

export const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tracks');
  const [searchText, setSearchText] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [isLoadingPlaylistTracks, setIsLoadingPlaylistTracks] = useState(false);

  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
  const [isLoadingAlbumTracks, setIsLoadingAlbumTracks] = useState(false);

  const {
    tracks,
    playlists,
    albums,
    isLoadingLibrary,
    refreshLibrary,
    currentTrack,
    isPlaying,
    playTrack,
    disconnectAndUnpair,
    serverConfig,
    activeHost,
  } = useCompanionStore();
  const { accentColor, accentPreset } = useThemeStore();

  const handleOpenPlaylist = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setIsLoadingPlaylistTracks(true);
    try {
      const pTracks = await connectionService.fetchLibraryTracks(50000, 0, playlist.id);
      setPlaylistTracks(pTracks);
    } catch {
      setPlaylistTracks([]);
    } finally {
      setIsLoadingPlaylistTracks(false);
    }
  };

  const handleBackToPlaylists = () => {
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
  };

  const handleOpenAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    setIsLoadingAlbumTracks(true);
    try {
      const aTracks = await connectionService.fetchLibraryTracks(50000, 0, undefined, album.name);
      if (aTracks.length > 0) {
        setAlbumTracks(aTracks);
      } else {
        setAlbumTracks(
          tracks.filter(
            (t) => t.album && t.album.trim().toLowerCase() === album.name.trim().toLowerCase()
          )
        );
      }
    } catch {
      setAlbumTracks(
        tracks.filter(
          (t) => t.album && t.album.trim().toLowerCase() === album.name.trim().toLowerCase()
        )
      );
    } finally {
      setIsLoadingAlbumTracks(false);
    }
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setAlbumTracks([]);
  };

  const filteredTracks = tracks.filter((t) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.album && t.album.toLowerCase().includes(q))
    );
  });

  const filteredAlbums = albums.filter((a) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.artist && a.artist.toLowerCase().includes(q))
    );
  });

  const handleUnpairPrompt = () => {
    Alert.alert(
      'Disconnect & Unpair?',
      'This will remove this phone from your Purrsonica desktop. You will need to scan the pairing QR code again to reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: () => disconnectAndUnpair(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search & Top Actions Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tracks, artists, albums..."
            placeholderTextColor={Colors.textDisabled}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={refreshLibrary}
          disabled={isLoadingLibrary}
        >
          <RefreshCw
            size={18}
            color={isLoadingLibrary ? Colors.primaryLight : Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Connection and Cross-Device Banner */}
      <ConnectionBanner />

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRowContainer}
        >
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'tracks' && {
                backgroundColor: Colors.primaryGlow,
                borderWidth: 1,
                borderColor: Colors.primary,
              },
            ]}
            onPress={() => setActiveTab('tracks')}
          >
            <Music
              size={14}
              color={activeTab === 'tracks' ? Colors.primaryLight : Colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'tracks' && { color: Colors.primaryLight, fontWeight: 'bold' },
              ]}
            >
              Tracks ({tracks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'albums' && {
                backgroundColor: Colors.primaryGlow,
                borderWidth: 1,
                borderColor: Colors.primary,
              },
            ]}
            onPress={() => setActiveTab('albums')}
          >
            <Disc
              size={14}
              color={activeTab === 'albums' ? Colors.primaryLight : Colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'albums' && { color: Colors.primaryLight, fontWeight: 'bold' },
              ]}
            >
              Albums ({albums.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'playlists' && {
                backgroundColor: Colors.primaryGlow,
                borderWidth: 1,
                borderColor: Colors.primary,
              },
            ]}
            onPress={() => setActiveTab('playlists')}
          >
            <ListMusic
              size={14}
              color={activeTab === 'playlists' ? Colors.primaryLight : Colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'playlists' && { color: Colors.primaryLight, fontWeight: 'bold' },
              ]}
            >
              Playlists ({playlists.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'settings' && {
                backgroundColor: Colors.primaryGlow,
                borderWidth: 1,
                borderColor: Colors.primary,
              },
            ]}
            onPress={() => setActiveTab('settings')}
          >
            <Sliders
              size={14}
              color={activeTab === 'settings' ? Colors.primaryLight : Colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'settings' && { color: Colors.primaryLight, fontWeight: 'bold' },
              ]}
            >
              Info & Settings
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab Content */}
      {activeTab === 'tracks' && (
        <FlatList
          data={filteredTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrackItem
              track={item}
              isCurrent={currentTrack?.id === item.id}
              isPlaying={isPlaying && currentTrack?.id === item.id}
              onPress={() => playTrack(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingLibrary}
              onRefresh={refreshLibrary}
              tintColor={Colors.primaryLight}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Music size={40} color={Colors.textDisabled} />
              <Text style={styles.emptyStateTitle}>
                {searchText ? 'No Matching Tracks' : 'Library is Empty'}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchText
                  ? 'Try searching with a different artist or title'
                  : 'Add audio files in your Purrsonica Desktop app and pull down to refresh'}
              </Text>
            </View>
          }
          contentContainerStyle={filteredTracks.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
        />
      )}

      {activeTab === 'albums' && selectedAlbum && (
        <View style={{ flex: 1 }}>
          {/* Album Detail Header */}
          <View style={styles.playlistDetailHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToAlbums}
            >
              <ChevronLeft size={20} color={Colors.primaryLight} />
              <Text style={styles.backButtonText}>Albums</Text>
            </TouchableOpacity>

            <View style={styles.playlistDetailInfo}>
              <View style={styles.albumDetailArt}>
                {selectedAlbum.has_cover || selectedAlbum.cover_art_path ? (
                  <Image
                    source={{ uri: connectionService.getAlbumArtUrl(selectedAlbum.name) }}
                    style={styles.albumDetailArtImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.albumArtFallback}>
                    <Disc size={24} color={Colors.primaryLight} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.playlistDetailTitle} numberOfLines={1}>
                  {selectedAlbum.name}
                </Text>
                <Text style={styles.playlistDetailSubtitle} numberOfLines={1}>
                  {selectedAlbum.artist} {selectedAlbum.year ? `• ${selectedAlbum.year}` : ''}
                </Text>
                <Text style={[styles.playlistDetailSubtitle, { marginTop: 1 }]}>
                  {selectedAlbum.track_count} tracks
                </Text>
              </View>
              {albumTracks.length > 0 && (
                <TouchableOpacity
                  style={styles.playlistPlayAllButton}
                  onPress={() => playTrack(albumTracks[0])}
                >
                  <Play size={14} color="#000" fill="#000" />
                  <Text style={styles.playlistPlayAllText}>Play</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isLoadingAlbumTracks ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primaryLight} />
              <Text style={styles.loadingText}>Loading album tracks...</Text>
            </View>
          ) : (
            <FlatList
              data={albumTracks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TrackItem
                  track={item}
                  isCurrent={currentTrack?.id === item.id}
                  isPlaying={isPlaying && currentTrack?.id === item.id}
                  onPress={() => playTrack(item)}
                />
              )}
              contentContainerStyle={albumTracks.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Disc size={36} color={Colors.textDisabled} />
                  <Text style={styles.emptyStateTitle}>No Tracks in Album</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Pull down on the library to refresh album contents
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeTab === 'albums' && !selectedAlbum && (
        <FlatList
          data={filteredAlbums}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.albumColumnWrapper}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.albumCard}
              onPress={() => handleOpenAlbum(item)}
              activeOpacity={0.75}
            >
              <View style={styles.albumArtContainer}>
                {item.has_cover || item.cover_art_path ? (
                  <Image
                    source={{ uri: connectionService.getAlbumArtUrl(item.name) }}
                    style={styles.albumArtImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.albumArtFallback}>
                    <Disc size={36} color={Colors.primaryLight} opacity={0.6} />
                  </View>
                )}
              </View>
              <Text style={styles.albumTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.albumArtist} numberOfLines={1}>
                {item.artist}
              </Text>
              <Text style={styles.albumDetails}>
                {item.track_count} tracks {item.year ? `• ${item.year}` : ''}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={
            filteredAlbums.length === 0
              ? { flex: 1 }
              : { paddingTop: 16, paddingBottom: 80 }
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoadingLibrary}
              onRefresh={refreshLibrary}
              tintColor={Colors.primaryLight}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Disc size={40} color={Colors.textDisabled} />
              <Text style={styles.emptyStateTitle}>
                {searchText ? 'No Matching Albums' : 'No Albums Found'}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchText
                  ? 'Try searching with a different album or artist'
                  : 'Add songs with album tags in your Purrsonica Desktop app'}
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'playlists' && selectedPlaylist && (
        <View style={{ flex: 1 }}>
          {/* Playlist Detail Header */}
          <View style={styles.playlistDetailHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToPlaylists}
            >
              <ChevronLeft size={20} color={Colors.primaryLight} />
              <Text style={styles.backButtonText}>Playlists</Text>
            </TouchableOpacity>

            <View style={styles.playlistDetailInfo}>
              <View style={styles.playlistDetailArt}>
                <ListMusic size={24} color={Colors.primaryLight} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.playlistDetailTitle} numberOfLines={1}>
                  {selectedPlaylist.name}
                </Text>
                <Text style={styles.playlistDetailSubtitle}>
                  {selectedPlaylist.track_count} tracks {selectedPlaylist.description ? `• ${selectedPlaylist.description}` : ''}
                </Text>
              </View>
              {playlistTracks.length > 0 && (
                <TouchableOpacity
                  style={styles.playlistPlayAllButton}
                  onPress={() => playTrack(playlistTracks[0])}
                >
                  <Play size={14} color="#000" fill="#000" />
                  <Text style={styles.playlistPlayAllText}>Play</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isLoadingPlaylistTracks ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primaryLight} />
              <Text style={styles.loadingText}>Loading tracks...</Text>
            </View>
          ) : (
            <FlatList
              data={playlistTracks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TrackItem
                  track={item}
                  isCurrent={currentTrack?.id === item.id}
                  isPlaying={isPlaying && currentTrack?.id === item.id}
                  onPress={() => playTrack(item)}
                />
              )}
              contentContainerStyle={playlistTracks.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Music size={36} color={Colors.textDisabled} />
                  <Text style={styles.emptyStateTitle}>Playlist is Empty</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Add songs to this playlist in Purrsonica Desktop
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeTab === 'playlists' && !selectedPlaylist && (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playlistCard}
              onPress={() => handleOpenPlaylist(item)}
              activeOpacity={0.7}
            >
              <View style={styles.playlistArtPlaceholder}>
                <ListMusic size={24} color={Colors.primaryLight} />
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>{item.name}</Text>
                <Text style={styles.playlistDetails}>
                  {item.track_count} tracks • {item.description || 'Playlist'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ListMusic size={40} color={Colors.textDisabled} />
              <Text style={styles.emptyStateTitle}>No Playlists Yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Create playlists in Purrsonica Desktop to sync them here
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'settings' && (
        <View style={styles.settingsContainer}>
          {/* Server Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <HardDrive size={18} color={Colors.primaryLight} />
              <Text style={styles.cardTitle}>Paired Desktop Instance</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>PC Hostname</Text>
              <Text style={styles.cardValue}>{serverConfig?.serverName || 'Desktop'}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Connected IP</Text>
              <Text style={styles.cardValue}>{activeHost || 'Discovering...'}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Port</Text>
              <Text style={styles.cardValue}>{serverConfig?.port || 51820}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Out-of-LAN Remote</Text>
              <Text
                style={[
                  styles.cardValue,
                  serverConfig?.allowOutsideLan ? { color: Colors.accentLight } : {},
                ]}
              >
                {serverConfig?.allowOutsideLan ? 'Enabled (4G/5G Access)' : 'Local LAN Only'}
              </Text>
            </View>
          </View>

          {/* Desktop Theme Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Sparkles size={18} color={Colors.primaryLight} />
              <Text style={styles.cardTitle}>Desktop Accent Theme</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Synced Color</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: Colors.primary,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                />
                <Text style={styles.cardValue}>
                  {accentPreset ? accentPreset.charAt(0).toUpperCase() + accentPreset.slice(1) : 'Synced'} ({Colors.primary})
                </Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              Theme accents are broadcast live from your desktop and applied dynamically across the mobile player.
            </Text>
          </View>

          {/* Privacy & Protocol Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ShieldCheck size={18} color={Colors.primaryLight} />
              <Text style={styles.cardTitle}>Security & Privacy</Text>
            </View>
            <Text style={styles.cardDesc}>
              This phone connects directly to your desktop over your private network with encrypted
              WebSocket control and HTTP 206 chunk range streaming. No cloud servers store any
              audio or listening history.
            </Text>
          </View>

          {/* Unpair Button */}
          <TouchableOpacity style={styles.unpairButton} onPress={handleUnpairPrompt}>
            <Unlink size={16} color={Colors.danger} />
            <Text style={styles.unpairButtonText}>Disconnect & Unpair Device</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDarkest,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  headerIconButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabsRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabsRowContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primaryLight,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 16,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playlistArtPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  playlistDetails: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  settingsContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  cardValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  unpairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    marginTop: 8,
  },
  unpairButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.danger,
  },
  playlistDetailHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  playlistDetailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playlistDetailArt: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  playlistDetailSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  playlistPlayAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },
  playlistPlayAllText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  albumColumnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  albumCard: {
    width: '48%',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  albumArtContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.bgDark,
    marginBottom: 8,
  },
  albumArtImage: {
    width: '100%',
    height: '100%',
  },
  albumArtFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  albumTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
  },
  albumArtist: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  albumDetails: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  albumDetailArt: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumDetailArtImage: {
    width: '100%',
    height: '100%',
  },
});
