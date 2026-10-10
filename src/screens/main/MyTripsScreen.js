import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { CONFIG } from '../../constants/config';
import api from '../../services/api';

const TABS = ['Upcoming', 'Active', 'Completed', 'Cancelled'];
const TAB_ICONS = { Upcoming: '📅', Active: '🏍️', Completed: '✅', Cancelled: '❌' };

export default function MyTripsScreen() {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // Fetch from the real backend instead of using Mock Data
  useEffect(() => {
    fetchTrips();
  }, [activeTab]);

  // Also fetch when screen comes into focus, in case a trip was just created
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTrips();
    });
    return unsubscribe;
  }, [navigation, activeTab]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      // Fetch only the authenticated user's trips from the backend
      const data = await api.get('/trips/my-trips');

      // Map backend keys to frontend keys, handling 'planned' vs 'Upcoming' statuses
      const mappedTrips = data.map(t => {
          let frontendStatus = t.status;

          // Compare dates ignoring time to avoid timezone edge cases hiding today's trips
          const tripDate = new Date(t.start_time);
          tripDate.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isPast = tripDate < today;

          if (t.status === 'planned') {
              frontendStatus = isPast ? 'Completed' : 'Upcoming';
          }
          else if (t.status === 'in_progress' || t.status === 'active') frontendStatus = 'Active';
          else if (t.status === 'completed') frontendStatus = 'Completed';
          else if (t.status === 'cancelled') frontendStatus = 'Cancelled';

          return {
            id: t.id.toString(),
            title: t.title || `${t.start_location} to ${t.end_location || 'Unknown'}`,
            status: frontendStatus,
            date: new Date(t.start_time).toLocaleDateString()
          };
        });

        setTrips(mappedTrips);
    } catch (error) {
      console.warn("Failed to fetch My Trips from backend:", error);
      Alert.alert("Error", "Could not load trips. Please check your connection.");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (tripId, newStatus) => {
    try {
      // For backend 'Upcoming' is stored as 'planned'
      const backendStatus = newStatus === 'Upcoming' ? 'planned' : newStatus.toLowerCase();

      await api.patch(`/trips/${tripId}/status`, { status: backendStatus });

      Toast.show({ type: 'success', text1: 'Success', text2: `Trip moved to ${newStatus}` });
      fetchTrips(); // Refresh the list
    } catch (error) {
      console.warn('Update failed:', error);
      Alert.alert('Error', 'Failed to update trip status.');
    }
  };

  const handleDeleteTrip = (tripId) => {
    Alert.alert(
      "Delete Trip",
      "Are you sure you want to delete this trip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.request('DELETE', `/trips/${tripId}`);
              Toast.show({ type: 'success', text1: 'Deleted', text2: 'Trip removed successfully.' });
              fetchTrips(); // Refresh the list
            } catch (error) {
              console.warn('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete trip.');
            }
          }
        }
      ]
    );
  };

  const filteredTrips = trips.filter((trip) => trip.status === activeTab);

  const renderTrip = ({ item }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripCardHeader}>
        <View>
          <Text style={styles.tripTitle}>📍 {item.title}</Text>
          <Text style={styles.tripDate}>🕒 {item.date}</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteTrip(item.id)}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{TAB_ICONS[item.status]} {item.status}</Text>
        </View>

        {/* Action Buttons to move trip between states */}
        {activeTab === 'Upcoming' && (
           <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.actionBtnActive} onPress={() => handleUpdateStatus(item.id, 'Active')}>
                 <Text style={styles.actionBtnText}>🏍️ Start Ride</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnCancel} onPress={() => handleUpdateStatus(item.id, 'Cancelled')}>
                 <Text style={styles.actionBtnText}>❌ Cancel</Text>
              </TouchableOpacity>
           </View>
        )}
        {activeTab === 'Active' && (
           <TouchableOpacity style={styles.actionBtnComplete} onPress={() => handleUpdateStatus(item.id, 'Completed')}>
              <Text style={styles.actionBtnText}>🏁 Finish Ride</Text>
           </TouchableOpacity>
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
              {TAB_ICONS[tab]} {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTextTitle}>You haven't created any trips yet.</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateTrip')}>
            <Text style={styles.createButtonText}>Create Trip</Text>
          </TouchableOpacity>
        </View>
      ) : filteredTrips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🏜️ No {activeTab.toLowerCase()} trips found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#1A1A1A',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  tripDate: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    marginBottom: 12,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#333',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
  },
  actionBtnActive: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  actionBtnCancel: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnComplete: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  createButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
