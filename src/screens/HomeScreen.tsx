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
} from 'react-native';
import {
  Search,
  RefreshCw,
  Unlink,
  Music,
  ListMusic,
  Sliders,
  ShieldCheck,
  Smartphone,
  HardDrive,
  Info,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { useCompanionStore } from '../store/companionStore';
import { TrackItem } from '../components/TrackItem';
import { ConnectionBanner } from '../components/ConnectionBanner';

type TabType = 'tracks' | 'playlists' | 'settings';

export const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tracks');
  const [searchText, setSearchText] = useState('');

  const {
    tracks,
    playlists,
    isLoadingLibrary,
    refreshLibrary,
    currentTrack,
    isPlaying,
    playTrack,
    disconnectAndUnpair,
    serverConfig,
    activeHost,
  } = useCompanionStore();

  const filteredTracks = tracks.filter((t) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.album && t.album.toLowerCase().includes(q))
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
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tracks' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tracks')}
        >
          <Music
            size={14}
            color={activeTab === 'tracks' ? Colors.primaryLight : Colors.textMuted}
          />
          <Text
            style={[styles.tabText, activeTab === 'tracks' && styles.tabTextActive]}
          >
            Tracks ({tracks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'playlists' && styles.tabButtonActive]}
          onPress={() => setActiveTab('playlists')}
        >
          <ListMusic
            size={14}
            color={activeTab === 'playlists' ? Colors.primaryLight : Colors.textMuted}
          />
          <Text
            style={[styles.tabText, activeTab === 'playlists' && styles.tabTextActive]}
          >
            Playlists ({playlists.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Sliders
            size={14}
            color={activeTab === 'settings' ? Colors.primaryLight : Colors.textMuted}
          />
          <Text
            style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}
          >
            Info & Settings
          </Text>
        </TouchableOpacity>
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

      {activeTab === 'playlists' && (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.playlistCard}>
              <View style={styles.playlistArtPlaceholder}>
                <ListMusic size={24} color={Colors.primaryLight} />
              </View>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>{item.name}</Text>
                <Text style={styles.playlistDetails}>
                  {item.track_count} tracks • {item.description || 'Playlist'}
                </Text>
              </View>
            </View>
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
});
