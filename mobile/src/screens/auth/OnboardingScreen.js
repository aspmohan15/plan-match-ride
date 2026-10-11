import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { UserService } from '../../services/user.service';

export default function OnboardingScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { login } = React.useContext(AuthContext);

  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [photo, setPhoto] = useState(null);
  const [bikePhoto, setBikePhoto] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadText, setUploadText] = useState('');

  const compressImage = async (uri) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }], // Resize width, maintain aspect ratio
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.warn("Failed to compress image:", error);
      return uri; // fallback to original
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // Will compress manually
    });

    if (!result.canceled && result.assets[0].uri) {
      const compressedUri = await compressImage(result.assets[0].uri);
      setPhoto(compressedUri);
    }
  };

  const handlePickBikeImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9], // Bikes often look better wide
      quality: 1,
    });
    if (!result.canceled && result.assets[0].uri) {
      const compressedUri = await compressImage(result.assets[0].uri);
      setBikePhoto(compressedUri);
    }
  };

  const isStep1Complete = name.trim().length > 0 && photo !== null;
  const isStep2Complete = bikeModel.trim().length > 0 && bikePhoto !== null;

  const handleNextStep = () => {
    if (step === 1 && isStep1Complete) {
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async () => {
    if (!isStep1Complete || !isStep2Complete) return;

    setIsUploading(true);

    try {
      // We pass the JWT token explicitly so the api doesn't rely on AsyncStorage being completely updated yet
      const token = route.params?.token;

      // 1. Upload Profile Image
      setUploadText('Uploading profile image...');
      const profileUploadResult = await UserService.uploadProfileImage(photo, token);

      // 2. Upload Bike Image
      setUploadText('Uploading bike image...');
      const bikeUploadResult = await UserService.uploadBikeImage(bikePhoto, token);

      // 3. Update Text Info
      setUploadText('Saving profile...');
      await UserService.updateProfile({ name: name.trim(), bikeModel: bikeModel.trim() }, token);

      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile setup complete!' });

      if (route.params?.token && route.params?.user) {
        login(route.params.token, {
           ...route.params.user,
           name: name.trim(),
           bikeModel: bikeModel.trim(),
           profileImageUrl: profileUploadResult?.data?.imageUrl,
           bikeImageUrl: bikeUploadResult?.data?.imageUrl,
           profileCompleted: true
        });
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: error.message || 'Unable to upload image. Please try again.'
      });
    } finally {
      setIsUploading(false);
      setUploadText('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, step >= 1 && styles.progressActive]} />
        <View style={[styles.progressBar, step >= 2 && styles.progressActive]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>About You</Text>
            <Text style={styles.subtitle}>Let's start with your profile.</Text>

            <View style={styles.section}>
              <Text style={styles.label}>Profile Image *</Text>
              <TouchableOpacity onPress={handlePickImage} style={styles.photoContainer} disabled={isUploading}>
                <View style={styles.photoPlaceholder}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.photoImage} />
                  ) : (
                    <>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>📸</Text>
                      <Text style={styles.photoText}>Choose Photo</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., John Doe"
                value={name}
                onChangeText={setName}
                editable={!isUploading}
              />
            </View>
          </View>
        ) : (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Your Ride</Text>
            <Text style={styles.subtitle}>Tell us about your motorcycle.</Text>

            <View style={styles.section}>
              <Text style={styles.label}>Bike Model *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Yamaha MT-07"
                value={bikeModel}
                onChangeText={setBikeModel}
                editable={!isUploading}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Bike Image *</Text>
              <TouchableOpacity onPress={handlePickBikeImage} style={styles.photoContainer} disabled={isUploading}>
                <View style={[styles.photoPlaceholder, styles.bikePlaceholder]}>
                  {bikePhoto ? (
                    <Image source={{ uri: bikePhoto }} style={styles.bikeImage} />
                  ) : (
                    <>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>📸</Text>
                      <Text style={styles.photoText}>Choose Photo</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {step === 1 ? (
          <TouchableOpacity
            style={[styles.primaryButton, !isStep1Complete && styles.primaryButtonDisabled]}
            onPress={handleNextStep}
            disabled={!isStep1Complete}
          >
            <Text style={styles.primaryButtonText}>Next: Add Bike</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePrevStep}
              disabled={isUploading}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, styles.flexButton, !isStep2Complete && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isStep2Complete || isUploading}
            >
              {isUploading ? (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <ActivityIndicator color="#fff" style={{marginRight: 10}} />
                  <Text style={styles.primaryButtonText}>{uploadText || 'Uploading...'}</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Complete Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  progressContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 20 },
  progressBar: { height: 4, flex: 1, backgroundColor: '#eee', marginHorizontal: 4, borderRadius: 2 },
  progressActive: { backgroundColor: '#FF5722' },
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 60 },
  stepContainer: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 25 },
  section: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#444', marginBottom: 12 },
  photoPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f0f0f0', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  bikePlaceholder: { width: 240, height: 135, borderRadius: 12 },
  photoContainer: { alignItems: 'center' },
  photoImage: { width: '100%', height: '100%', borderRadius: 60 },
  bikeImage: { width: '100%', height: '100%', borderRadius: 12 },
  photoText: { color: '#999' },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, backgroundColor: '#f9f9f9' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  primaryButton: { backgroundColor: '#FF5722', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  flexButton: { flex: 1, marginLeft: 10 },
  primaryButtonDisabled: { backgroundColor: '#FFCCBC' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#f5f5f5', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  secondaryButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
});