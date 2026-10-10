import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const TABS = ['Connected', 'Received', 'Sent'];

export default function MyConnectionsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Connected');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (activeTab === 'Connected') endpoint = '/groups/connections/accepted';
      else if (activeTab === 'Received') endpoint = '/groups/connections/pending';
      else if (activeTab === 'Sent') endpoint = '/groups/connections/sent';

      const response = await api.get(endpoint);
      setData(response || []);
    } catch (err) {
      console.warn("Failed to fetch connections", err);
      Alert.alert("Error", "Could not load connections.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (targetId, action) => {
    try {
      const endpoint = `/groups/connections/${targetId}/${action}`;
      const response = await api.post(endpoint);

      if (response && response.success) {
        let successMessage = '';
        if (action === 'accept') successMessage = 'Connection accepted!';
        if (action === 'decline') successMessage = 'Request declined.';
        if (action === 'cancel') successMessage = 'Request cancelled.';

        Toast.show({ type: 'success', text1: 'Success', text2: successMessage });
        fetchData(); // Refresh list
      } else {
        throw new Error('Backend failed');
      }
    } catch (err) {
      console.warn(`Connection ${action} failed:`, err);
      Alert.alert('Error', `Failed to ${action} request.`);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.infoContainer}
        onPress={() => navigation.navigate('RiderProfile', {
          rider: { id: item.id, name: item.name, profileImage: item.profile_image, bike: item.bike }
        })}
      >
        {item.profile_image ? (
          <Image source={{ uri: item.profile_image }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.bike}>🏍️ {item.bike}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actionContainer}>
        {activeTab === 'Received' && (
          <>
            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAction(item.id, 'accept')}>
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={() => handleAction(item.id, 'decline')}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </>
        )}
        {activeTab === 'Sent' && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => handleAction(item.id, 'cancel')}>
            <Text style={styles.declineButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'Connected' && (
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedText}>✅</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5722" />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} connections found.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#E9ECEF', borderRadius: 12,
    padding: 4, marginHorizontal: 16, marginTop: 16, marginBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { fontSize: 13, color: '#666', fontWeight: '600' },
  activeTabText: { color: '#1A1A1A', fontWeight: 'bold' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  infoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#FF5722', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  bike: { fontSize: 13, color: '#666' },
  actionContainer: { flexDirection: 'row', gap: 8 },
  acceptButton: { backgroundColor: '#FF5722', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  declineButton: { backgroundColor: '#E0E0E0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  cancelButton: { backgroundColor: '#FFEBEE', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  declineButtonText: { color: '#333', fontWeight: 'bold', fontSize: 12 },
  connectedBadge: { backgroundColor: '#E8F5E9', padding: 8, borderRadius: 20 },
  connectedText: { fontSize: 12 },
  emptyText: { fontSize: 16, color: '#999' }
});