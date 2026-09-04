import React, { useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from './src/theme/colors';
import { useCompanionStore } from './src/store/companionStore';
import { useThemeStore } from './src/store/themeStore';
import { PairingScreen } from './src/screens/PairingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MiniPlayer } from './src/components/MiniPlayer';
import { FullPlayerModal } from './src/components/FullPlayerModal';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Purrsonica Mobile Crash]', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <StatusBar style="light" />
          <Text style={styles.errorTitle}>Purrsonica Mobile Diagnostic</Text>
          <Text style={styles.errorSubtitle}>
            An unhandled runtime error occurred:
          </Text>
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorText}>
              {this.state.error?.message || 'Unknown error'}
            </Text>
            {this.state.error?.stack && (
              <Text style={styles.errorStack}>{this.state.error.stack}</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.restartButton} onPress={this.handleRestart}>
            <Text style={styles.restartButtonText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const { serverConfig, init } = useCompanionStore();
  const accentColor = useThemeStore((s) => s.accentColor);

  useEffect(() => {
    useThemeStore.getState().loadSavedTheme();
    init().catch((err) => {
      console.warn('[CompanionStore] init error:', err);
    });
  }, [init]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Screen Router */}
      {!serverConfig ? (
        <PairingScreen />
      ) : (
        <View style={styles.mainLayout}>
          <HomeScreen />
          <MiniPlayer />
          <FullPlayerModal />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDarkest,
  },
  mainLayout: {
    flex: 1,
    position: 'relative',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.danger,
  },
  errorSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  errorBox: {
    maxHeight: 250,
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorText: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
  restartButton: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  restartButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
});
