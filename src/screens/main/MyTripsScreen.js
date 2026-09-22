import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { CONFIG } from '../../constants/config';

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
      // Assuming GET /api/v1/trips returns all trips, and we filter them locally
      // In a real app, you would pass the status as a query param (e.g. ?status=planned)
      const response = await fetch(`${CONFIG.API_URL}/trips`);
      if (response.ok) {
        const data = await response.json();

        // Map backend keys to frontend keys, handling 'planned' vs 'Upcoming' statuses
        const mappedTrips = data.map(t => {
          let frontendStatus = t.status;
          if (t.status === 'planned') frontendStatus = 'Upcoming';
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
      } else {
        throw new Error('Server returned ' + response.status);
      }
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

      const response = await fetch(`${CONFIG.API_URL}/trips/${tripId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: backendStatus })
      });

      if (response.ok) {
        Toast.show({ type: 'success', text1: 'Success', text2: `Trip moved to ${newStatus}` });
        fetchTrips(); // Refresh the list
      } else {
        throw new Error('Failed to update');
      }
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
              const response = await fetch(`${CONFIG.API_URL}/trips/${tripId}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                Toast.show({ type: 'success', text1: 'Deleted', text2: 'Trip removed successfully.' });
                fetchTrips(); // Refresh the list
              } else {
                throw new Error('Failed to delete');
              }
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
    backgroundColor: '#F5F5F5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF5722',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#FF5722',
  },
  listContainer: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
