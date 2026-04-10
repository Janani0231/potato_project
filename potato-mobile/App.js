import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://192.168.1.5:8000/predict';

const CLASS_LABELS = {
  Potato___Early_blight: 'Early Blight',
  Potato___Late_blight: 'Late Blight',
  Potato___healthy: 'Healthy',
};

const CLASS_COLORS = {
  Potato___Early_blight: '#D97706',
  Potato___Late_blight: '#B91C1C',
  Potato___healthy: '#15803D',
};

const CLASS_ORDER = [
  'Potato___Early_blight',
  'Potato___Late_blight',
  'Potato___healthy',
];

const RESULT_COPY = {
  Potato___Early_blight: 'Leaf pattern suggests an early-stage fungal infection.',
  Potato___Late_blight: 'Signs point to an aggressive blight infection. Act quickly.',
  Potato___healthy: 'Leaf looks healthy with no strong disease signal detected.',
};

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resultColor = prediction ? CLASS_COLORS[prediction.class] : '#3F6212';

  const probabilityRows = useMemo(() => {
    if (!prediction?.all_predictions) {
      return [];
    }

    return CLASS_ORDER.map((classKey) => {
      const rawValue = Number(prediction.all_predictions[classKey] ?? 0);
      return {
        key: classKey,
        label: CLASS_LABELS[classKey],
        value: rawValue,
        percentage: `${(rawValue * 100).toFixed(1)}%`,
        width: `${Math.max(rawValue * 100, rawValue > 0 ? 4 : 0)}%`,
        color: CLASS_COLORS[classKey],
      };
    });
  }, [prediction]);

  const requestMediaPermission = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Gallery permission is needed to pick a potato leaf image.'
      );
      return false;
    }

    return true;
  };

  const requestCameraPermission = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Camera permission is needed to capture a potato leaf photo.'
      );
      return false;
    }

    return true;
  };

  const handleImageResult = (result) => {
    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    setSelectedImage(asset);
    setPrediction(null);
    setError('');
  };

  const pickFromGallery = async () => {
    const granted = await requestMediaPermission();
    if (!granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    handleImageResult(result);
  };

  const takePhoto = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
      cameraType: ImagePicker.CameraType.back,
    });

    handleImageResult(result);
  };

  const detectDisease = async () => {
    if (!selectedImage?.uri) {
      setError('Select or capture a potato leaf image before running detection.');
      return;
    }

    setLoading(true);
    setError('');
    setPrediction(null);

    try {
      const formData = new FormData();
      const fileName = selectedImage.fileName || `leaf.${getFileExtension(selectedImage.uri)}`;
      const mimeType = selectedImage.mimeType || getMimeType(fileName);

      formData.append('file', {
        uri: selectedImage.uri,
        name: fileName,
        type: mimeType,
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setPrediction(data);
    } catch (_fetchError) {
      setError(
        'Cannot reach the prediction server. Make sure your phone and laptop are on the same WiFi and that the API_URL points to your laptop IP.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSelectedImage(null);
    setPrediction(null);
    setError('');
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Field Scan</Text>
          <Text style={styles.title}>Potato Disease Detector</Text>
          <Text style={styles.subtitle}>
            Capture a leaf or choose one from the gallery, then send it to your FastAPI
            model for diagnosis.
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={pickFromGallery}>
              <Text style={styles.secondaryButtonText}>Pick from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
              <Text style={styles.secondaryButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.previewCard}>
            {selectedImage?.uri ? (
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No image selected</Text>
                <Text style={styles.emptyText}>
                  Use the gallery or camera buttons to load a potato leaf image.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={detectDisease}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingInline}>
                <ActivityIndicator color="#FFF7ED" />
                <Text style={styles.primaryButtonText}>Detecting...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Detect Disease</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={resetState}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Connection error</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#3F6212" />
              <Text style={styles.loadingText}>Sending image to the FastAPI backend...</Text>
            </View>
          ) : null}

          {prediction ? (
            <View style={styles.resultCard}>
              <View style={[styles.resultBadge, { backgroundColor: `${resultColor}20` }]}>
                <View style={[styles.resultDot, { backgroundColor: resultColor }]} />
                <Text style={[styles.resultBadgeText, { color: resultColor }]}>
                  Prediction Ready
                </Text>
              </View>

              <Text style={styles.resultLabel}>Detected condition</Text>
              <Text style={[styles.resultValue, { color: resultColor }]}>
                {CLASS_LABELS[prediction.class] || prediction.class}
              </Text>
              <Text style={styles.resultSummary}>
                {RESULT_COPY[prediction.class] || 'Prediction received from the backend.'}
              </Text>

              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>Confidence</Text>
                <Text style={styles.confidenceValue}>
                  {(Number(prediction.confidence || 0) * 100).toFixed(1)}%
                </Text>
              </View>

              <View style={styles.divider} />

              {probabilityRows.map((item) => (
                <View key={item.key} style={styles.probabilityBlock}>
                  <View style={styles.probabilityHeader}>
                    <Text style={styles.probabilityLabel}>{item.label}</Text>
                    <Text style={styles.probabilityValue}>{item.percentage}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: item.width,
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getFileExtension(uri) {
  const cleanUri = uri.split('?')[0];
  const parts = cleanUri.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'jpg';
}

function getMimeType(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'heic') {
    return 'image/heic';
  }

  return 'image/jpeg';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F5EF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  hero: {
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#6B7A38',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: '#243010',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: '#5B624B',
    maxWidth: 520,
  },
  panel: {
    gap: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E7E2D4',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D7D0BF',
  },
  secondaryButtonText: {
    textAlign: 'center',
    color: '#38411F',
    fontSize: 15,
    fontWeight: '700',
  },
  previewCard: {
    minHeight: 280,
    backgroundColor: '#EDE7D8',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D6CEBB',
  },
  previewImage: {
    width: '100%',
    height: 320,
    resizeMode: 'cover',
  },
  emptyState: {
    flex: 1,
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#EEE6D2',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E341F',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: '#6A705C',
  },
  primaryButton: {
    backgroundColor: '#556B2F',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.8,
  },
  primaryButtonText: {
    textAlign: 'center',
    color: '#FFF7ED',
    fontSize: 16,
    fontWeight: '800',
  },
  loadingInline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  errorTitle: {
    color: '#991B1B',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  errorText: {
    color: '#7F1D1D',
    fontSize: 14,
    lineHeight: 21,
  },
  loadingCard: {
    backgroundColor: '#ECE8DB',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#46512D',
    fontSize: 14,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#FBFAF6',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2DCCB',
  },
  resultBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  resultDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  resultBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#7A806C',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    marginBottom: 8,
  },
  resultSummary: {
    color: '#5D6650',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceLabel: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
  },
  confidenceValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#E6E0D1',
    marginVertical: 18,
  },
  probabilityBlock: {
    marginBottom: 14,
  },
  probabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  probabilityLabel: {
    color: '#2E3722',
    fontSize: 15,
    fontWeight: '700',
  },
  probabilityValue: {
    color: '#5B624B',
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 14,
    backgroundColor: '#E7E2D4',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
});
