import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthService } from '../../services/auth.service';
import { AuthContext } from '../../context/AuthContext';
import LogoutModal from '../../components/LogoutModal';

const getTrendyRidingStyle = (style) => {
  if (!style) return "Born to Ride 🏍️🔥";

  const s = style.toLowerCase();
  if (s.includes('touring')) return "Touring Explorer 🗺️🏍️";
  if (s.includes('adventure')) return "Off-Road Adventurer ⛰️⛺";
  if (s.includes('weekend')) return "Weekend Warrior ☀️🛣️";
  if (s.includes('fast')) return "Speed Demon ⚡🏁";
  if (s.includes('moderate')) return "Smooth Cruiser 🌊✌️";
  if (s.includes('slow')) return "Chill & Scenic 🍃📸";
  if (s.includes('scenic')) return "Chill & Scenic 🍃📸";

  return `${style} 🏍️✨`;
};

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);

  // Edit Profile States
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingConnectionsCount, setPendingConnectionsCount] = useState(0);

  const { logout } = useContext(AuthContext);

  const performLogout = () => {
    setLogoutModalVisible(false);
    logout();
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const json = await AuthService.getCurrentUser();
      if (json.success) {
        const userData = json.data.user || json.data;
        setProfile(userData);
        setEditName(userData.name || '');
        const cleanPhone = (userData.phoneNumber || userData.phone_number || '').replace(/\D/g, '').slice(-10);
        setEditPhone(cleanPhone);
      }

      // Fetch pending connections count for the badge
      const { default: api } = await import('../../services/api');
      const pendingRes = await api.get('/groups/connections/pending');
      if (Array.isArray(pendingRes)) {
        setPendingConnectionsCount(pendingRes.length);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfile();
    });
    fetchProfile();
    return unsubscribe;
  }, [navigation]);

  const openEditModal = () => {
    setEditName(profile?.name || '');
    const cleanPhone = (profile?.phoneNumber || profile?.phone_number || '').replace(/\D/g, '').slice(-10);
    setEditPhone(cleanPhone);
    setOtpRequested(false);
    setOtp('');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Name cannot be empty' });
      return;
    }
    if (editPhone.trim().length !== 10) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid 10-digit mobile number' });
      return;
    }

    const currentPhone = profile?.phoneNumber || profile?.phone_number || '';
    const current10 = currentPhone.replace(/\D/g, '').slice(-10);
    const isPhoneChanged = editPhone.trim() !== current10;
    const fullNewPhone = `+91${editPhone.trim()}`;

    setSavingProfile(true);

    try {
      if (isPhoneChanged && !otpRequested) {
        // Step 1: Send OTP to new phone number
        await AuthService.sendOtp(fullNewPhone, true); // True means it's an update, so backend will check if taken
        setOtpRequested(true);
        Toast.show({ type: 'success', text1: 'OTP Sent', text2: `Please enter the OTP sent to ${fullNewPhone}` });
        setSavingProfile(false);
        return;
      }

      if (isPhoneChanged && otpRequested && !otp.trim()) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter the OTP' });
        setSavingProfile(false);
        return;
      }

      // Step 2: Save Profile (with or without OTP)
      const res = await AuthService.updateProfile({
        name: editName.trim(),
        phoneNumber: isPhoneChanged ? fullNewPhone : undefined,
        otp: isPhoneChanged ? otp.trim() : undefined
      });

      if (res && res.success) {
        Toast.show({ type: 'success', text1: 'Profile Updated', text2: 'Your information has been saved.' });
        setEditModalVisible(false);
        fetchProfile(); // Refresh the data
      } else {
         throw res.error || new Error('Failed to update profile');
      }
    } catch (err) {
      console.warn("Update profile error:", err);
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  const user = {
    name: profile?.name || "Rider",
    phoneNumber: profile?.phoneNumber || profile?.phone_number || "",
    bikeBrand: "",
    bikeModel: profile?.bikeModel || profile?.bike_model || "Bike",
    ridingStyle: "Touring", // Hardcoded
    verified: profile?.profileCompleted || profile?.profile_completed || false,
    bikePhoto: profile?.bikeImageUrl || profile?.bike_image_url || null,
    profilePhoto: profile?.profileImageUrl || profile?.profile_image_url || null,
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.editProfileIcon} onPress={openEditModal}>
            <Text style={{fontSize: 20}}>✏️</Text>
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            {user.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{user.name}</Text>
          {user.phoneNumber ? (
            <Text style={styles.phone}>📞 {user.phoneNumber}</Text>
          ) : null}
          {user.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Garage</Text>
          <View style={styles.card}>
            {user.bikePhoto ? (
              <Image source={{ uri: user.bikePhoto }} style={styles.bikeImage} />
            ) : (
              <View style={styles.bikeImagePlaceholder}>
                 <Text style={{fontSize: 32}}>🏍️</Text>
              </View>
            )}
            <View style={styles.cardRight}>
              <Text style={styles.cardLabel}>Bike</Text>
              <Text style={styles.cardValue}>
                {user.bikeBrand ? `${user.bikeBrand} ` : ''}{user.bikeModel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Riding Preference</Text>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>🛣️</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardLabel}>Style</Text>
              <Text style={styles.cardValue}>{getTrendyRidingStyle(user.ridingStyle)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connections</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('MyConnections')}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>🤝</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardLabel}>Network</Text>
              <Text style={styles.cardValue}>My Connections</Text>
            </View>
            {pendingConnectionsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{pendingConnectionsCount}</Text>
              </View>
            )}
            <Text style={{ fontSize: 24, color: '#ccc' }}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => setLogoutModalVisible(true)}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <LogoutModal
        visible={isLogoutModalVisible}
        onConfirm={performLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              value={editName}
              onChangeText={setEditName}
              editable={!savingProfile}
            />

            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="9876543210"
                value={editPhone}
                onChangeText={(text) => {
                   const formatted = text.replace(/[^0-9]/g, '').slice(0, 10);
                   setEditPhone(formatted);
                   setOtpRequested(false); // Reset OTP flow if user modifies number again
                   setOtp('');
                }}
                keyboardType="number-pad"
                maxLength={10}
                editable={!savingProfile}
              />
            </View>

            {otpRequested && (
              <View style={styles.otpContainer}>
                <Text style={styles.label}>Enter OTP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!savingProfile}
                />
                <Text style={styles.helperText}>OTP sent to +91 {editPhone}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={savingProfile}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, savingProfile && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editPhone.trim() !== (profile?.phoneNumber || profile?.phone_number || '').replace(/\D/g, '').slice(-10) && !otpRequested
                      ? 'Request OTP'
                      : 'Save Changes'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
    position: 'relative',
  },
  editProfileIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderRadius: 50,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFF',
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  phone: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
    marginBottom: 8,
  },
  verifiedBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  verifiedText: {
    color: '#137333',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bikeImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  bikeImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconEmoji: {
    fontSize: 28,
  },
  cardRight: {
    flex: 1,
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 13,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  notificationBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FFF0F0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  input: {
    backgroundColor: '#F0F2F5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20
  },
  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5',
    borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20
  },
  countryCode: {
    paddingHorizontal: 16, fontSize: 16, color: '#555', fontWeight: 'bold',
    borderRightWidth: 1, borderRightColor: '#E5E7EB'
  },
  phoneInput: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#333'
  },
  otpContainer: {
    backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0'
  },
  helperText: {
    fontSize: 12, color: '#666', marginTop: -12, marginBottom: 8, textAlign: 'center'
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelButton: { flex: 1, paddingVertical: 14, alignItems: 'center', marginRight: 10, borderRadius: 8, backgroundColor: '#E5E7EB' },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: '#4B5563' },
  saveButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#FF5722' },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});