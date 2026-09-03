import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Wifi, WifiOff, RefreshCw, Monitor, Smartphone } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { useCompanionStore } from '../store/companionStore';

export const ConnectionBanner: React.FC = () => {
  const {
    connectionStatus,
    serverConfig,
    activeHost,
    desktopPlaybackState,
    playbackTarget,
    setPlaybackTarget,
    sendRemoteDesktopCommand,
  } = useCompanionStore();

  const isReconnecting = connectionStatus === 'reconnecting' || connectionStatus === 'connecting';
  const isConnected = connectionStatus === 'connected';

  return (
    <View style={styles.container}>
      {/* Network Status Pill */}
      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          {isConnected ? (
            <Wifi size={13} color={Colors.primaryLight} />
          ) : isReconnecting ? (
            <RefreshCw size={13} color={Colors.warning} />
          ) : (
            <WifiOff size={13} color={Colors.danger} />
          )}

          <Text
            style={[
              styles.statusText,
              isConnected
                ? styles.textConnected
                : isReconnecting
                ? styles.textReconnecting
                : styles.textDisconnected,
            ]}
          >
            {isConnected
              ? `Connected • ${serverConfig?.serverName || 'Desktop'}`
              : isReconnecting
              ? 'Reconnecting to Desktop...'
              : 'Desktop Offline (Auto-reconnecting)'}
          </Text>
        </View>

        {activeHost && isConnected && (
          <Text style={styles.ipText}>{activeHost}</Text>
        )}
      </View>

      {/* Cross-Device Desktop Playback Awareness Pill */}
      {desktopPlaybackState?.isPlaying && desktopPlaybackState.track && (
        <View style={styles.desktopCard}>
          <View style={styles.desktopInfo}>
            <Monitor size={16} color={Colors.accentLight} />
            <View style={styles.desktopTextContainer}>
              <Text style={styles.desktopTitle} numberOfLines={1}>
                {desktopPlaybackState.track.title}
              </Text>
              <Text style={styles.desktopSubtitle} numberOfLines={1}>
                Playing on {serverConfig?.serverName || 'PC'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              if (playbackTarget === 'remote_desktop') {
                sendRemoteDesktopCommand({ type: 'toggle' });
              } else {
                setPlaybackTarget('remote_desktop');
              }
            }}
          >
            <Text style={styles.controlButtonText}>
              {playbackTarget === 'remote_desktop' ? 'Control PC' : 'Switch to PC'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textConnected: {
    color: Colors.primaryLight,
  },
  textReconnecting: {
    color: Colors.warning,
  },
  textDisconnected: {
    color: Colors.danger,
  },
  ipText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.textMuted,
  },
  desktopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  desktopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  desktopTextContainer: {
    flex: 1,
  },
  desktopTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text,
  },
  desktopSubtitle: {
    fontSize: 10,
    color: Colors.accentLight,
  },
  controlButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.accentDark,
  },
  controlButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
});
