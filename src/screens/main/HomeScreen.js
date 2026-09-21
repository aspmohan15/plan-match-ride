import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { ERROR_MESSAGES } from '../../constants/errors';
import { registerForPushNotificationsAsync } from '../../services/notifications.service';

const LOCATIONS = ["Bangalore", "Mysore", "Coorg", "Chikmagalur", "Nandi Hills", "Ooty", "Kodaikanal", "Yercaud", "Chennai", "Coimbatore"];

export default function HomeScreen({ navigation }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [date, setDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [time, setTime] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectingField, setSelectingField] = useState(null); // 'from' or 'to'

  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // Fetch upcoming trips when the screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUpcomingTrips();
    });

    // Return the function to unsubscribe from the event so it gets removed on unmount
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      console.log("Push Token:", token);
    });
    // Initial fetch
    fetchUpcomingTrips();
  }, []);

  const fetchUpcomingTrips = async () => {
    setLoadingTrips(true);
    try {
      const response = await fetch('http://192.168.1.4:3000/api/v1/trips');
      if (response.ok) {
        const data = await response.json();
        // Map backend keys to frontend keys if necessary
        const formattedTrips = data
          .filter(trip => trip.status === 'planned') // ONLY SHOW UPCOMING TRIPS ON HOME SCREEN
          .map(trip => ({
            id: trip.id.toString(),
            from: trip.start_location,
            to: trip.end_location || 'TBD',
            date: new Date(trip.start_time).toLocaleDateString(),
            riders: trip.riders_count || 1,
            compatibility: 'High compatibility'
          }));
        setTrips(formattedTrips);
      }
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

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) setTime(selectedTime);
  };

  const handleFindRiders = () => {
    if (!date || !time) {
        Toast.show({ type: 'error', text1: 'Missing info', text2: 'Please select a Date and Time.' });
        return;
    }

    const combinedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      time.getSeconds()
    );

    if (combinedDate <= new Date()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.DATETIME_PAST });
      return;
    }

    if (!from || !to) {
        Toast.show({ type: 'error', text1: 'Missing info', text2: 'Please select From and To locations.' });
        return;
    }

    Toast.show({ type: 'success', text1: 'Searching', text2: 'Looking for riders...' });

    // Attempt to hit the matching API using local IP
    fetch('http://192.168.1.4:3000/api/v1/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, date: combinedDate.toISOString() })
    })
      .then(res => res.json())
      .then(data => {
        // Navigate to DiscoverScreen and pass the dummy matches flag
        navigation.navigate('Discover', {
          searchQuery: { from, to, date: combinedDate.toISOString() },
          showResults: true
        });
      })
      .catch(err => {
        console.log('Match API fallback:', err);
        // Even if offline/failed, navigate to show the dummy match results
        navigation.navigate('Discover', {
          searchQuery: { from, to, date: combinedDate.toISOString() },
          showResults: true
        });
      });

    // Navigate first, then clear inputs using React Navigation listener
    // This ensures data is passed correctly and inputs are clean when returning
    const unsubscribe = navigation.addListener('blur', () => {
      setFrom('');
      setTo('');
      setDate(null);
      setTime(null);
      unsubscribe(); // remove listener after it runs once
    });
  };

  const renderTrip = ({ item }) => (
    <View style={styles.tripCard}>
      <Text style={styles.tripRoute}>📍 {item.from} → 🏁 {item.to}</Text>
      <Text style={styles.tripDetails}>📅 {item.date} • 🏍️ {item.riders} riders</Text>
      <View style={styles.compatibilityBadge}>
        <Text style={styles.compatibilityText}>✨ {item.compatibility}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
              <Text style={date ? styles.pickerTextValue : styles.pickerTextPlaceholder}>
                {date ? `📅 ${date.toLocaleDateString()}` : '📅 DATE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
              <Text style={time ? styles.pickerTextValue : styles.pickerTextPlaceholder}>
                {time ? `🕒 ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '🕒 TIME'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleFindRiders}>
            <Text style={styles.primaryButtonText}>🔍 Find Riders</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionContainer}>
           <Text style={styles.sectionTitle}>📅 Upcoming Trips</Text>
           <TouchableOpacity onPress={() => navigation.navigate('CreateTrip')}>
             <Text style={styles.createTripText}>➕ Create Trip</Text>
           </TouchableOpacity>
        </View>

        {loadingTrips ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>Loading trips...</Text>
        ) : trips.length === 0 ? (
          <View style={styles.emptyTripsContainer}>
             <Text style={{fontSize: 40, marginBottom: 10}}>🏍️</Text>
             <Text style={styles.emptyTripsTitle}>No upcoming trips</Text>
             <Text style={styles.emptyTripsText}>You haven't planned any rides yet. Click 'Create Trip' above to get started!</Text>
          </View>
        ) : (
          trips.map(item => (
            <View key={item.id}>
              {renderTrip({ item })}
            </View>
          ))
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

      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onDateChange}
          accentColor="#FF5722" // Works on iOS; Android requires modifying styles.xml
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={time || new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={onTimeChange}
          accentColor="#FF5722"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
  container: { padding: 16 },
  heroCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 24,
  },
  heroTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  inputContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pickerButton: {
    flex: 1, backgroundColor: '#F0F2F5', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 14, marginHorizontal: 4,
  },
  pickerTextPlaceholder: { color: '#999', fontSize: 14 },
  pickerTextValue: { color: '#333', fontSize: 14 },
  primaryButton: {
    backgroundColor: '#FF5722', borderRadius: 8, paddingVertical: 14,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyTripsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  tripCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2,
  },
  tripRoute: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  tripDetails: { fontSize: 14, color: '#666', marginBottom: 12 },
  compatibilityBadge: {
    alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 4,
  },
  compatibilityText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold' },

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