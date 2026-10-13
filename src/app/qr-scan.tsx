import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Animated, Easing, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOX_SIZE = 250;

export default function QRScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (cameraReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(lineAnim, {
            toValue: BOX_SIZE - 5,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(lineAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [cameraReady, lineAnim]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.message}>
            Kütüphane masa QR kodunu tarayabilmek için kamera erişimine izin vermeniz gerekmektedir.
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionCancelBtn} onPress={() => router.back()}>
            <Text style={styles.permissionCancelText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Alert.alert(
      'Masa Bulundu!',
      `Okunan Kod: ${data}\n\nBu masaya oturmak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel', onPress: () => setScanned(false) },
        {
          text: 'Otur',
          onPress: () => {
            Alert.alert('Başarılı', 'Koltuk size rezerve edildi!');
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Kamera - tam ekran */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Geri Dön butonu - absolute pozisyonlu, kameranın üstünde */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>✕ Geri Dön</Text>
      </TouchableOpacity>

      {/* Tarama kutusu - tam ortada, absolute pozisyonlu */}
      <View style={styles.scanBox} pointerEvents="none">
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
        <Animated.View
          style={[styles.laserLine, { transform: [{ translateY: lineAnim }] }]}
        />
      </View>

      {/* Alt yazı */}
      <View style={styles.instructionContainer} pointerEvents="none">
        <Text style={styles.instructionText}>QR Kodu kutunun içine yerleştirin</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#b5121b',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#b5121b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  permissionCancelBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  permissionCancelText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  closeButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  scanBox: {
    position: 'absolute',
    width: BOX_SIZE,
    height: BOX_SIZE,
    top: (SCREEN_HEIGHT - BOX_SIZE) / 2,
    left: (SCREEN_WIDTH - BOX_SIZE) / 2,
    overflow: 'hidden',
  },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderColor: '#ff4757', borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 12 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderColor: '#ff4757', borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 12 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderColor: '#ff4757', borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 12 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderColor: '#ff4757', borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 12 },
  laserLine: {
    width: '100%',
    height: 3,
    backgroundColor: '#ff4757',
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: (SCREEN_HEIGHT - BOX_SIZE) / 2 - 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
