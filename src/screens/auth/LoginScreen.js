import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { ERROR_MESSAGES } from '../../constants/errors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthService } from '../../services/auth.service';
import { AuthContext } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useContext(AuthContext);
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0 && step === 'otp') {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown, step]);

  const handleSendOTP = async () => {
    const phone = phoneNumber.trim();
    if (phone.length !== 10) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = '+91' + phone;
      const res = await AuthService.sendOtp(fullPhone);
      if (res.success) {
        Toast.show({ type: 'success', text1: 'OTP Sent', text2: `OTP sent to ${fullPhone}` });
        setStep('otp');
        setCountdown(45);
        setOtp('');
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to send OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid 6-digit OTP.' });
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = '+91' + phoneNumber.trim();
      const res = await AuthService.verifyOtp(fullPhone, otp.trim());

      if (res.success) {
        if (res.data.isNewUser || !res.data.isProfileComplete) {
          // Temporarily navigate to onboarding if profile is not complete
          // We don't log them in context until they finish onboarding if we wanted,
          // but logging them in allows Onboarding to be inside MainTabs or AuthStack.
          // Wait, if they are logged in, RootNavigator switches to MainTabs.
          // Let's pass the token to Onboarding and let it log them in at the end.
          navigation.navigate('Onboarding', { token: res.data.accessToken, user: res.data.user });
        } else {
          login(res.data.accessToken, res.data.user);
        }
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Invalid OTP. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}>
        {step === 'phone' ? (
          <>
            <Text style={styles.title}>📱 Enter your phone number</Text>
            <Text style={styles.subtitle}>We will send you a verification code.</Text>

            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>🇮🇳 +91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP 📨</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>🔒 Verify OTP</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to +91 {phoneNumber}</Text>

            <TextInput
              style={styles.input}
              placeholder="🔢 Enter 6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              editable={!isLoading}
              autoFocus
            />

            <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Continue 🚀</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resendButton, countdown > 0 && { opacity: 0.5 }]}
              onPress={handleSendOTP}
              disabled={countdown > 0 || isLoading}
            >
              <Text style={styles.resendButtonText}>
                {countdown > 0 ? \`Resend OTP in \${countdown}s\` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setStep('phone')} disabled={isLoading}>
              <Text style={styles.backButtonText}>🔙 Change Phone Number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, marginBottom: 24, backgroundColor: '#f9f9f9'
  },
  countryCode: { paddingHorizontal: 16, fontSize: 16, color: '#333', fontWeight: '600', borderRightWidth: 1, borderRightColor: '#ddd', lineHeight: 50 },
  phoneInput: { flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 16 },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, marginBottom: 24, backgroundColor: '#f9f9f9', letterSpacing: 8, textAlign: 'center' },
  button: { backgroundColor: '#FF5722', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  resendButton: { marginTop: 24, alignItems: 'center' },
  resendButtonText: { color: '#333', fontSize: 16, fontWeight: '500' },
  backButton: { marginTop: 16, alignItems: 'center' },
  backButtonText: { color: '#FF5722', fontSize: 16 }
});