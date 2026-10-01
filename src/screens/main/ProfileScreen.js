import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
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

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const { logout } = useContext(AuthContext);

  const performLogout = () => {
    setLogoutModalVisible(false);
    logout();
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const json = await AuthService.getCurrentUser();
        if (json.success) {
          console.log('[PROFILE DATA RAW]:', json.data.user || json.data);
          setProfile(json.data.user || json.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  const user = {
    name: profile?.name || "Rider",
    city: "Bangalore", // Hardcoded as backend doesn't provide this yet
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
          {user.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
          <Text style={styles.location}>📍 {user.city}</Text>
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

        <TouchableOpacity style={styles.logoutButton} onPress={() => setLogoutModalVisible(true)}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <LogoutModal
        visible={isLogoutModalVisible}
        onConfirm={performLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
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
  location: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
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
});