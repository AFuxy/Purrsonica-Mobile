import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from './src/theme/colors';
import { useCompanionStore } from './src/store/companionStore';
import { PairingScreen } from './src/screens/PairingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MiniPlayer } from './src/components/MiniPlayer';
import { FullPlayerModal } from './src/components/FullPlayerModal';

export default function App() {
  const { serverConfig, init } = useCompanionStore();

  useEffect(() => {
    init();
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDarkest,
  },
  mainLayout: {
    flex: 1,
    position: 'relative',
  },
});
