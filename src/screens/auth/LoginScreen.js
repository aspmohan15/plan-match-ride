import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { ERROR_MESSAGES } from '../../constants/errors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');

  const handleSendOTP = () => {
    const phone = phoneNumber.trim();
    if (phone.length !== 10) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.PHONE_INVALID });
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.PHONE_NOT_INDIAN });
      return;
    }
    setStep('otp');
  };

  const handleVerifyOTP = () => {
    if (!otp.trim() || (otp.trim().length !== 4 && otp.trim().length !== 6)) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.OTP_INVALID });
      return;
    }
    navigation.navigate('Onboarding');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}>
        {step === 'phone' ? (
          <>
            <Text style={styles.title}>Enter your phone number</Text>
            <Text style={styles.subtitle}>We will send you a verification code.</Text>

            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSendOTP}>
              <Text style={styles.buttonText}>Send OTP</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Enter the code sent to {phoneNumber}</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter OTP (e.g. 1234)"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />

            <TouchableOpacity style={styles.button} onPress={handleVerifyOTP}>
              <Text style={styles.buttonText}>Verify & Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setStep('phone')}>
              <Text style={styles.backButtonText}>Change Phone Number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
  },
  countryCode: {
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    lineHeight: 50,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#FF5722',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FF5722',
    fontSize: 16,
  }
});
