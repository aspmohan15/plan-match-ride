import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ERROR_MESSAGES } from '../../constants/errors';
import { registerForPushNotificationsAsync } from '../../services/notifications.service';
import api from '../../services/api';
import { AuthService } from '../../services/auth.service';

const LOCATIONS = ["Bangalore", "Mysore", "Coorg", "Chikmagalur", "Nandi Hills", "Ooty", "Kodaikanal", "Yercaud", "Chennai", "Coimbatore"];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function HomeScreen({ navigation }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectingField, setSelectingField] = useState(null); // 'from' or 'to'

  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [myDestination, setMyDestination] = useState(null);

  // Fetch upcoming trips when the screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUpcomingTrips();
      fetchDiscoverData();
    });

    // Return the function to unsubscribe from the event so it gets removed on unmount
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      console.log("Push Token:", token);
    });
    // Initial fetch
    fetchUserProfile();
    fetchUpcomingTrips();
    fetchDiscoverData();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const json = await AuthService.getCurrentUser();
      if (json.success) {
        setUserProfile(json.data.user || json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch user profile", err);
    }
  };

  const fetchDiscoverData = async () => {
    try {
      const myDestRes = await api.get('/discover/my-destination');
      if (myDestRes && myDestRes.destination) {
        setMyDestination(myDestRes);
      } else {
        setMyDestination(null);
      }
    } catch (err) {
      console.warn("Failed to fetch my destination", err);
    }
  };

  const fetchUpcomingTrips = async () => {
    setLoadingTrips(true);
    try {
      const data = await api.get('/trips/my-trips');

      // Map backend keys to frontend keys if necessary
      const formattedTrips = data
        .filter(trip => {
           if (trip.status !== 'planned') return false;

           // Compare dates ignoring time to avoid timezone edge cases hiding today's trips
           const tripDate = new Date(trip.start_time);
           tripDate.setHours(0, 0, 0, 0);
           const today = new Date();
           today.setHours(0, 0, 0, 0);

           return tripDate >= today;
        })
        .map(trip => ({
            id: trip.id.toString(),
            from: trip.start_location,
            to: trip.end_location || 'TBD',
            date: new Date(trip.start_time).toLocaleDateString(),
            time: new Date(trip.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateObj: new Date(trip.start_time),
            riders: trip.riders_count || 1
          }))
        .sort((a, b) => a.dateObj - b.dateObj)
        .slice(0, 3); // Max 2-3 upcoming trips
      setTrips(formattedTrips);
    } catch (error) {
      console.warn("Failed to fetch trips from backend:", error);
      setTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleLocationSelect = (location) => {
    if (selectingField === 'from') setFrom(location);
    if (selectingField === 'to') setTo(location);
    setModalVisible(false);
  };

  const handleFindRiders = () => {
    if (!from || !to) {
        Toast.show({ type: 'error', text1: 'Missing info', text2: 'Please select From and To locations.' });
        return;
    }

    if (from === to) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.SAME_LOCATION });
        return;
    }

    Toast.show({ type: 'success', text1: 'Searching', text2: 'Looking for riders...' });

    // Navigate directly to DiscoverScreen with the search query
    navigation.navigate('Discover', {
      searchQuery: { from, to },
      showResults: true
    });

    // Clear inputs when leaving the screen
    const unsubscribe = navigation.addListener('blur', () => {
      setFrom('');
      setTo('');
      unsubscribe(); // remove listener after it runs once
    });
  };

  const renderTrip = ({ item }) => (
    <View style={styles.tripCard}>
      <Text style={styles.tripRoute}>📍 {item.from} → 🏁 {item.to}</Text>
      <Text style={styles.tripDetails}>📅 {item.date} • 🕒 {item.time} • 👥 {item.riders} riders</Text>
      <TouchableOpacity
        style={styles.viewTripButton}
        onPress={() => navigation.navigate('My Trips')}
      >
        <Text style={styles.viewTripText}>View Trip</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.greetingTitle}>{getGreeting()}, {userProfile?.name || 'Rider'} 👋</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>🏍️ Where are you riding next?</Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => { setSelectingField('from'); setModalVisible(true); }}
            >
              <Text style={from ? styles.pickerTextValue : styles.pickerTextPlaceholder}>
                {from ? `📍 ${from}` : '📍 FROM'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => { setSelectingField('to'); setModalVisible(true); }}
            >
              <Text style={to ? styles.pickerTextValue : styles.pickerTextPlaceholder}>
                {to ? `🏁 ${to}` : '🏁 TO'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleFindRiders}>
            <Text style={styles.primaryButtonText}>🔍 Find Riders</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionContainer}>
           <Text style={styles.sectionTitle}>🏍️ Your Upcoming Rides</Text>
        </View>

        {loadingTrips ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>Loading trips...</Text>
        ) : trips.length === 0 ? (
          <View style={styles.emptyTripsContainer}>
             <Text style={styles.emptyTripsTitle}>No upcoming rides yet.</Text>
             <Text style={styles.emptyTripsText}>Find riders going where you want to ride.</Text>
             <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('CreateTrip')}>
               <Text style={styles.emptyButtonText}>➕ Create Trip</Text>
             </TouchableOpacity>
          </View>
        ) : (
          <View>
            {trips.map(item => (
              <View key={item.id}>
                {renderTrip({ item })}
              </View>
            ))}
            <TouchableOpacity onPress={() => navigation.navigate('My Trips')}>
              <Text style={styles.viewAllText}>View all →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionContainer}>
           <Text style={styles.sectionTitle}>🔥 Riders Going Where You Go</Text>
        </View>
        {myDestination ? (
          <View style={styles.heroCard}>
            <Text style={styles.myDestinationTitle}>{myDestination.destination.name}</Text>
            <Text style={styles.myDestinationSub}>{myDestination.riderCount} {myDestination.riderCount === 1 ? 'rider is' : 'riders are'} planning to go</Text>
            <Text style={{fontSize: 24, marginBottom: 16}}>👤 👤 👤 {myDestination.riderCount > 3 ? `+${myDestination.riderCount - 3}` : ''}</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('Discover')}
            >
              <Text style={styles.seeAllText}>Discover Riders →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyTripsContainer}>
             <Text style={styles.emptyTripsTitle}>No upcoming trip yet.</Text>
             <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Discover')}>
               <Text style={styles.emptyButtonText}>🔍 Find Riders</Text>
             </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Location Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <FlatList
              data={LOCATIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleLocationSelect(item)}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
  container: { padding: 16 },
  greetingTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 20 },
  heroCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 24,
  },
  heroTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  inputContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pickerButton: {
    flex: 1, backgroundColor: '#F0F3F6', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 14, marginHorizontal: 4,
  },
  pickerTextPlaceholder: { color: '#999', fontSize: 14 },
  pickerTextValue: { color: '#333', fontSize: 14 },
  primaryButton: {
    backgroundColor: '#1A1A1A', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actionContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
  createTripText: { color: '#FF5722', fontSize: 16, fontWeight: '600' },
  emptyTripsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed'
  },
  emptyTripsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyTripsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyButton: {
    backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 8
  },
  emptyButtonText: {
    color: '#fff', fontWeight: 'bold'
  },
  viewAllText: {
    color: '#FF5722', fontWeight: 'bold', fontSize: 16, textAlign: 'right', marginBottom: 20
  },
  myDestinationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 4,
  },
  myDestinationSub: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  seeAllButton: {
    backgroundColor: '#E8F0FE',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  seeAllText: {
    color: '#1A73E8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  viewTripButton: {
    backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start'
  },
  viewTripText: {
    color: '#2E7D32', fontWeight: 'bold', fontSize: 14
  },
  tripCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2,
  },
  tripRoute: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  tripDetails: { fontSize: 14, color: '#666', marginBottom: 12 },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, maxHeight: '60%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalCloseButton: { marginTop: 16, padding: 14, alignItems: 'center', backgroundColor: '#F0F2F5', borderRadius: 8 },
  modalCloseText: { fontSize: 16, color: '#FF5722', fontWeight: 'bold' }
});