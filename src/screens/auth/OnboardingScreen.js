import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { ERROR_MESSAGES } from '../../constants/errors';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Step 1: Name/Photo -> Step 2: Add Bike -> Step 3: Riding Style
  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [ridingStyle, setRidingStyle] = useState('');
  const [photo, setPhoto] = useState(null);
  const [bikePhoto, setBikePhoto] = useState(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handlePickBikeImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setBikePhoto(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!photo) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.PHOTO_REQUIRED });
        return;
      }
      if (!name.trim()) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.NAME_REQUIRED });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!bikeModel.trim()) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.BIKE_REQUIRED });
        return;
      }
      if (!bikePhoto) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.BIKE_PHOTO_REQUIRED });
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!ridingStyle) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.STYLE_REQUIRED });
        return;
      }
      // Finish Onboarding -> Go to Main App
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>👋 Let's get to know you</Text>
            <TouchableOpacity onPress={handlePickImage} style={styles.photoContainer}>
              <View style={styles.photoPlaceholder}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                ) : (
                  <>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📸</Text>
                    <Text style={styles.photoText}>Add Photo</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="👤 Your Full Name"
              value={name}
              onChangeText={setName}
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>🏍️ Add Your Bike</Text>
            <Text style={styles.subtitle}>🤔 What do you ride?</Text>
            <TouchableOpacity onPress={handlePickBikeImage} style={styles.photoContainer}>
              <View style={styles.photoPlaceholder}>
                {bikePhoto ? (
                  <Image source={{ uri: bikePhoto }} style={styles.photoImage} />
                ) : (
                  <>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📸</Text>
                    <Text style={styles.photoText}>Add Bike Photo</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="🏍️ Bike Make & Model (e.g., Yamaha MT-07)"
              value={bikeModel}
              onChangeText={setBikeModel}
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>🔥 Your Riding Style</Text>
            <Text style={styles.subtitle}>👇 Select what describes you best</Text>

            {['🛵 Commuter', '🛣️ Touring', '🏎️ Sport/Track', '🏜️ Off-road', '😎 Cruiser'].map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.optionButton,
                  ridingStyle === style && styles.optionButtonActive
                ]}
                onPress={() => setRidingStyle(style)}
              >
                <Text style={[
                  styles.optionText,
                  ridingStyle === style && styles.optionTextActive
                ]}>{style}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, step >= 1 && styles.progressActive]} />
          <View style={[styles.progressBar, step >= 2 && styles.progressActive]} />
          <View style={[styles.progressBar, step >= 3 && styles.progressActive]} />
        </View>

        <View style={styles.content}>
          {renderStepContent()}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>{step === 3 ? "Finish" : "Next"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    marginTop: 20,
  },
  progressBar: {
    height: 4,
    flex: 1,
    backgroundColor: '#eee',
    marginHorizontal: 4,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#FF5722',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoContainer: {
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  photoText: {
    color: '#999',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
  },
  optionButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
  },
  optionButtonActive: {
    borderColor: '#FF5722',
    backgroundColor: '#FFF3E0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextActive: {
    color: '#FF5722',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FF5722',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
