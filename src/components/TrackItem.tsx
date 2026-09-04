import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Music, Play, Pause } from 'lucide-react-native';
import { Track } from '../types';
import { Colors } from '../theme/colors';
import { connectionService } from '../services/connection';
import { useCompanionStore } from '../store/companionStore';
import { useThemeStore } from '../store/themeStore';

interface TrackItemProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  onPress: () => void;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  isCurrent,
  isPlaying,
  onPress,
}) => {
  const accentColor = useThemeStore((s) => s.accentColor);
  const hasCover = Boolean(track.has_cover || track.cover_art_path);
  const artUrl = hasCover ? connectionService.getArtUrl(track.id) : null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isCurrent && {
          backgroundColor: Colors.primaryGlow,
          borderColor: Colors.primary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Artwork or Icon */}
      <View style={styles.artWrapper}>
        {artUrl ? (
          <Image source={{ uri: artUrl }} style={styles.artImage} />
        ) : (
          <View style={styles.artPlaceholder}>
            <Music size={18} color={Colors.textMuted} />
          </View>
        )}

        {isCurrent && (
          <View style={[styles.playingOverlay, { backgroundColor: Colors.primary }]}>
            {isPlaying ? (
              <Pause size={14} color="#000" fill="#000" />
            ) : (
              <Play size={14} color="#000" fill="#000" />
            )}
          </View>
        )}
      </View>

      {/* Track Metadata */}
      <View style={styles.infoWrapper}>
        <Text
          style={[styles.title, isCurrent && { color: Colors.primaryLight, fontWeight: 'bold' }]}
          numberOfLines={1}
        >
          {track.title || track.file_name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {track.artist || 'Unknown Artist'} • {track.album || 'Unknown Album'}
        </Text>
      </View>

      {/* Duration & Tags */}
      <View style={styles.rightWrapper}>
        {track.bpm && (
          <View style={styles.bpmBadge}>
            <Text style={styles.bpmText}>{Math.round(track.bpm)}</Text>
          </View>
        )}
        <Text style={[styles.duration, isCurrent && styles.durationActive]}>
          {formatDuration(track.duration)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    gap: 12,
  },
  containerActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  artWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  artPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(52, 211, 153, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrapper: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  titleActive: {
    color: Colors.primaryLight,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  rightWrapper: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bpmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  bpmText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accentLight,
  },
  duration: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.textSecondary,
  },
  durationActive: {
    color: Colors.primaryLight,
    fontWeight: 'bold',
  },
});
