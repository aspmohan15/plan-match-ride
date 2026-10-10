import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';

export default function RiderProfileScreen({ route, navigation }) {
  const { rider } = route.params; // Make sure rider.id is passed!
  const { user } = useContext(AuthContext);

  const isMe = String(user?.id) === String(rider?.id);

  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (rider.id && !isMe) {
      fetchConnectionStatus();
    } else {
      setLoading(false);
    }
  }, [rider.id, isMe]);

  const fetchConnectionStatus = async () => {
    try {
      const res = await api.get(`/groups/connections/${rider.id}/status`);
      setConnectionStatus(res);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!rider.id) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Invalid rider ID' });
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/groups/connections/${rider.id}/request`);
      Toast.show({ type: 'success', text1: 'Request Sent', text2: `Connection request sent to ${rider.name}` });
      fetchConnectionStatus();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Could not send request' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          {rider.profileImage ? (
            <Image source={{ uri: rider.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {rider.name ? rider.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{rider.name}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Bike</Text>
          <Text style={styles.sectionText}>{rider.bike || 'Unknown Bike'}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Riding Style</Text>
          <Text style={styles.sectionText}>{rider.ridingStyle || 'Any'}</Text>
        </View>

        {!loading && rider.id && !isMe && (
          <View style={{ width: '100%', marginTop: 24 }}>
            {connectionStatus?.status === 'accepted' ? (
              <View style={[styles.connectButton, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.connectButtonText}>✅ Connected</Text>
              </View>
            ) : connectionStatus?.status === 'pending' ? (
              <View style={[styles.connectButton, { backgroundColor: '#FFC107' }]}>
                <Text style={[styles.connectButtonText, { color: '#333' }]}>⏳ Pending Request</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.connectButton, actionLoading && { opacity: 0.7 }]}
                onPress={handleConnect}
                disabled={actionLoading}
              >
                <Text style={styles.connectButtonText}>
                  {actionLoading ? 'Sending...' : 'Connect'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  connectButton: {
    width: '100%',
    backgroundColor: '#FF5722',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
