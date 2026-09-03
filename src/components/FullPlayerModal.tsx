import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Monitor,
  Smartphone,
  Radio,
  Sliders,
} from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { useCompanionStore } from '../store/companionStore';
import { connectionService } from '../services/connection';

const { width } = Dimensions.get('window');
const ART_SIZE = width - 64;

export const FullPlayerModal: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    positionMillis,
    durationMillis,
    isFullPlayerOpen,
    setFullPlayerOpen,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    playbackTarget,
    setPlaybackTarget,
    sendRemoteDesktopCommand,
    serverConfig,
  } = useCompanionStore();

  if (!currentTrack) return null;

  const artUrl = currentTrack.cover_art_path
    ? connectionService.getArtUrl(currentTrack.id)
    : null;

  const formatTime = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = durationMillis > 0
    ? Math.min(100, Math.max(0, (positionMillis / durationMillis) * 100))
    : 0;

  const handleScrub = (event: any) => {
    const { locationX } = event.nativeEvent;
    const barWidth = width - 48;
    const ratio = Math.max(0, Math.min(1, locationX / barWidth));
    const targetMs = ratio * durationMillis;
    seekTo(targetMs);
  };

  const handleHandoffToPC = () => {
    sendRemoteDesktopCommand({
      type: 'playTrack',
      trackId: currentTrack.id,
      position: Math.floor(positionMillis / 1000),
    });
    setPlaybackTarget('remote_desktop');
  };

  return (
    <Modal
      visible={isFullPlayerOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setFullPlayerOpen(false)}
    >
      <SafeAreaView style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullPlayerOpen(false)}
          >
            <ChevronDown size={28} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>PLAYING FROM LIBRARY</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentTrack.album || 'Purrsonica'}
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Large Album Artwork */}
        <View style={styles.artContainer}>
          {artUrl ? (
            <Image source={{ uri: artUrl }} style={styles.artImage} />
          ) : (
            <View style={styles.artPlaceholder}>
              <Music size={64} color={Colors.textMuted} />
            </View>
          )}
        </View>

        {/* Metadata & Harmonic Mixing Tags */}
        <View style={styles.metaContainer}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {currentTrack.title || currentTrack.file_name}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {currentTrack.artist || 'Unknown Artist'}
              </Text>
            </View>

            {/* BPM & Camelot Key Badges */}
            <View style={styles.tagsContainer}>
              {currentTrack.bpm && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{Math.round(currentTrack.bpm)} BPM</Text>
                </View>
              )}
              {currentTrack.camelot_key && (
                <View style={[styles.tag, styles.tagKey]}>
                  <Text style={styles.tagTextKey}>{currentTrack.camelot_key}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Interactive Scrub Bar */}
        <View style={styles.scrubberContainer}>
          <TouchableOpacity
            style={styles.scrubTrack}
            activeOpacity={1}
            onPress={handleScrub}
          >
            <View style={[styles.scrubFill, { width: `${progressPercent}%` }]} />
            <View style={[styles.scrubThumb, { left: `${progressPercent}%` }]} />
          </TouchableOpacity>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
            <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
          </View>
        </View>

        {/* Main Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.skipButton} onPress={playPrevious}>
            <SkipBack size={26} color={Colors.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.mainPlayButton} onPress={togglePlay}>
            {isPlaying ? (
              <Pause size={32} color="#000" fill="#000" />
            ) : (
              <Play size={32} color="#000" fill="#000" />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={playNext}>
            <SkipForward size={26} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Cross-Device Output Switcher Pill */}
        <View style={styles.deviceSwitcherContainer}>
          <TouchableOpacity
            style={styles.deviceSwitcher}
            onPress={handleHandoffToPC}
            activeOpacity={0.8}
          >
            <Monitor size={16} color={Colors.accentLight} />
            <Text style={styles.deviceSwitcherText}>
              Transfer Playback to {serverConfig?.serverName || 'PC'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDarkest,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 6,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  artContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  artImage: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  artPlaceholder: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaContainer: {
    paddingHorizontal: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagKey: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  tagTextKey: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.accentLight,
  },
  scrubberContainer: {
    paddingHorizontal: 24,
    gap: 8,
  },
  scrubTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    justifyContent: 'center',
  },
  scrubFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  scrubThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.text,
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    paddingVertical: 8,
  },
  skipButton: {
    padding: 12,
  },
  mainPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  deviceSwitcherContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  deviceSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  deviceSwitcherText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accentLight,
  },
});
