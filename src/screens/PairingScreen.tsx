import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, Monitor, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { useCompanionStore } from '../store/companionStore';
import { CompanionPairingPayload } from '../types';

export const PairingScreen: React.FC = () => {
  let permission: any = null;
  let requestPermission: any = async () => ({ granted: false });
  try {
    const cameraHook = useCameraPermissions();
    if (cameraHook) {
      permission = cameraHook[0];
      requestPermission = cameraHook[1];
    }
  } catch (err) {
    console.warn('[PairingScreen] Camera hook error:', err);
  }

  const [isScanning, setIsScanning] = useState(true);
  const [isPairing, setIsPairing] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Manual fallback inputs
  const [manualHost, setManualHost] = useState('');
  const [manualPort, setManualPort] = useState('51820');
  const [manualToken, setManualToken] = useState('');

  const { pairWithDesktop } = useCompanionStore();

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!isScanning || isPairing) return;
    setIsScanning(false);
    setIsPairing(true);

    try {
      const payload = JSON.parse(data) as CompanionPairingPayload;
      if (!payload.pairingToken || !payload.localIps || !payload.port) {
        throw new Error('Invalid QR payload format');
      }

      const success = await pairWithDesktop(payload);
      if (!success) {
        Alert.alert(
          'Pairing Failed',
          'Could not reach your PC. Make sure both your phone and PC are connected to the same Wi-Fi network and Out-of-LAN mode is configured.',
          [{ text: 'Retry', onPress: () => setIsScanning(true) }]
        );
      }
    } catch (err) {
      console.warn('[Pairing] QR parse error:', err);
      Alert.alert('Invalid QR Code', 'Please scan the pairing QR code displayed in Purrsonica Desktop Settings.', [
        { text: 'Scan Again', onPress: () => setIsScanning(true) },
      ]);
    } finally {
      setIsPairing(false);
    }
  };

  const handleManualPair = async () => {
    if (!manualHost.trim() || !manualToken.trim()) {
      Alert.alert('Missing Fields', 'Please enter your Desktop IP and Pairing Code.');
      return;
    }

    setIsPairing(true);
    const success = await pairWithDesktop({
      version: 1,
      serverName: 'Purrsonica Desktop',
      localIps: [manualHost.trim()],
      port: parseInt(manualPort.trim(), 10) || 51820,
      pairingToken: manualToken.trim(),
      fingerprint: 'manual',
      expiresAt: Date.now() + 600000,
    });

    setIsPairing(false);
    if (!success) {
      Alert.alert('Connection Failed', 'Could not pair with the specified IP address. Verify the IP and port.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <QrCode size={24} color={Colors.primaryLight} />
        </View>
        <Text style={styles.title}>Pair with Purrsonica</Text>
        <Text style={styles.subtitle}>
          Scan the QR code displayed in your Desktop App under Settings → Mobile Companion
        </Text>
      </View>

      {/* Viewfinder or Manual Mode */}
      {!showManualInput ? (
        <View style={styles.scannerWrapper}>
          {!permission?.granted ? (
            <View style={styles.permissionCard}>
              <AlertCircle size={40} color={Colors.warning} />
              <Text style={styles.permissionTitle}>Camera Permission Required</Text>
              <Text style={styles.permissionDesc}>
                Purrsonica needs camera access to scan your desktop pairing code.
              </Text>
              <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
                <Text style={styles.grantButtonText}>Grant Camera Access</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.manualLink}
                onPress={() => setShowManualInput(true)}
              >
                <Text style={styles.manualLinkText}>Or Enter IP Manually</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraBox}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
              />

              {/* Viewfinder Reticle Corners */}
              <View style={styles.reticle}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>

              {isPairing && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={Colors.primaryLight} />
                  <Text style={styles.loadingText}>Authorizing Companion Device...</Text>
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        /* Manual IP Fallback */
        <View style={styles.manualCard}>
          <Text style={styles.manualTitle}>Manual Desktop Connection</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Desktop IP Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 192.168.1.142"
              placeholderTextColor={Colors.textDisabled}
              value={manualHost}
              onChangeText={setManualHost}
              autoCapitalize="none"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Port</Text>
            <TextInput
              style={styles.input}
              placeholder="51820"
              placeholderTextColor={Colors.textDisabled}
              value={manualPort}
              onChangeText={setManualPort}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pairing Token / Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter pairing token from PC"
              placeholderTextColor={Colors.textDisabled}
              value={manualToken}
              onChangeText={setManualToken}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={styles.manualConnectButton}
            onPress={handleManualPair}
            disabled={isPairing}
          >
            {isPairing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.manualConnectButtonText}>Connect & Pair</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToScannerButton}
            onPress={() => setShowManualInput(false)}
          >
            <Text style={styles.backToScannerText}>← Back to QR Scanner</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer Info */}
      <View style={styles.footer}>
        <View style={styles.privacyRow}>
          <ShieldCheck size={16} color={Colors.primaryLight} />
          <Text style={styles.privacyText}>
            Direct encrypted streaming • Zero third-party cloud servers
          </Text>
        </View>
        {!showManualInput && permission?.granted && (
          <TouchableOpacity onPress={() => setShowManualInput(true)}>
            <Text style={styles.manualLinkText}>Cannot scan? Connect manually with IP</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDarkest,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    gap: 8,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
  },
  scannerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  cameraBox: {
    width: 270,
    height: 270,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  reticle: {
    ...StyleSheet.absoluteFill,
    margin: 20,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.primaryLight,
  },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  permissionCard: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 12,
    maxWidth: 320,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  permissionDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  grantButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  grantButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  manualLink: {
    paddingTop: 8,
  },
  manualLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accentLight,
    textAlign: 'center',
  },
  manualCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 14,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.bgDark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
  },
  manualConnectButton: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  manualConnectButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  backToScannerButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  backToScannerText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  footer: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
