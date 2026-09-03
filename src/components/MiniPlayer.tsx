import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Play, Pause, SkipForward, Music } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { useCompanionStore } from '../store/companionStore';
import { connectionService } from '../services/connection';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    positionMillis,
    durationMillis,
    togglePlay,
    playNext,
    setFullPlayerOpen,
  } = useCompanionStore();

  if (!currentTrack) return null;

  const progressPercent = durationMillis > 0
    ? Math.min(100, Math.max(0, (positionMillis / durationMillis) * 100))
    : 0;

  const artUrl = currentTrack.cover_art_path
    ? connectionService.getArtUrl(currentTrack.id)
    : null;

  return (
    <View style={styles.outerContainer}>
      {/* Top Progress Line */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.9}
        onPress={() => setFullPlayerOpen(true)}
      >
        {/* Cover Thumbnail */}
        <View style={styles.artWrapper}>
          {artUrl ? (
            <Image source={{ uri: artUrl }} style={styles.artImage} />
          ) : (
            <View style={styles.artPlaceholder}>
              <Music size={16} color={Colors.textMuted} />
            </View>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.infoWrapper}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title || currentTrack.file_name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {currentTrack.artist || 'Unknown Artist'}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isPlaying ? (
              <Pause size={18} color="#000" fill="#000" />
            ) : (
              <Play size={18} color="#000" fill="#000" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={(e) => {
              e.stopPropagation();
              playNext();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SkipForward size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  progressBarBackground: {
    height: 2.5,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  artWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  artPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrapper: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    padding: 6,
  },
});
