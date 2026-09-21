import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal, FlatList, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { ERROR_MESSAGES } from '../../constants/errors';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CreateTripScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [tripData, setTripData] = useState({
    startLocation: '',
    destination: '',
    date: '',
    time: '',
    tripType: 'Weekend',
    ridingStyle: 'Cruising',
    groupSize: '1-5',
  });

  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectingField, setSelectingField] = useState(null);

  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [timeObj, setTimeObj] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoadingLocations(true);
    setLocationError(null);
    try {
      const response = await fetch('http://192.168.1.4:3000/api/v1/locations');
      const json = await response.json();
      if (json.success && json.data && json.data.locations) {
        setLocations(json.data.locations);
      } else {
        throw new Error('Invalid format');
      }
    } catch (error) {
      console.warn("Failed to fetch locations", error);
      setLocationError("Could not load from backend. Using offline data.");
      setLocations([
        { id: "1", name: "Chennai", code: "MAA", enabled: true },
        { id: "2", name: "Coimbatore", code: "CJB", enabled: true },
        { id: "3", name: "Bangalore", code: "BLR", enabled: true },
        { id: "4", name: "Ooty", code: "OTY", enabled: true },
        { id: "5", name: "Mysore", code: "MYS", enabled: true }
      ]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const updateData = (key, value) => setTripData({ ...tripData, [key]: value });

  const handleLocationSelect = (locName) => {
    if (selectingField === 'startLocation') updateData('startLocation', locName);
    if (selectingField === 'destination') updateData('destination', locName);
    setModalVisible(false);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateObj(selectedDate);
      updateData('date', selectedDate.toLocaleDateString());
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTimeObj(selectedTime);
      updateData('time', selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!tripData.startLocation.trim() || !tripData.destination.trim()) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.LOCATION_REQUIRED });
        return;
      }
    } else if (step === 2) {
      if (!tripData.date.trim() || !tripData.time.trim()) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.DATETIME_REQUIRED });
        return;
      }
    } else if (step === 3) {
      if (!tripData.tripType || !tripData.ridingStyle || !tripData.groupSize) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.PREFERENCES_REQUIRED });
        return;
      }
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const publishTrip = async () => {
    if (!tripData.startLocation.trim() || !tripData.destination.trim() || !tripData.date.trim() || !tripData.time.trim() || !tripData.tripType || !tripData.ridingStyle || !tripData.groupSize) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: ERROR_MESSAGES.COMPLETE_ALL });
      return;
    }

    setIsPublishing(true);

    try {
      const combinedDate = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        timeObj.getHours(),
        timeObj.getMinutes(),
        timeObj.getSeconds()
      );

      const payload = {
        title: `${tripData.startLocation} to ${tripData.destination}`,
        start_location: tripData.startLocation,
        end_location: tripData.destination,
        start_time: combinedDate.toISOString(),
        description: `Type: ${tripData.tripType}, Style: ${tripData.ridingStyle}, Size: ${tripData.groupSize}`,
        status: 'planned'
      };

      const response = await fetch('http://192.168.1.4:3000/api/v1/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to create trip on backend");

      Alert.alert('Trip Published!', 'Your trip has been created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.warn("Backend error:", err);
      Alert.alert('Error', 'Failed to publish trip. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3, 4].map(s => (
        <View key={s} style={[styles.stepDot, step >= s ? styles.stepDotActive : null]} />
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text style={styles.sectionTitle}>📍 Where are you going?</Text>
            <Text style={styles.label}>Starting Location</Text>
            <TouchableOpacity
              style={styles.inputPicker}
              onPress={() => { setSelectingField('startLocation'); setModalVisible(true); }}
            >
              <Text style={tripData.startLocation ? styles.inputTextValue : styles.inputTextPlaceholder}>
                {tripData.startLocation || 'Select Starting Location'}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Destination</Text>
            <TouchableOpacity
              style={styles.inputPicker}
              onPress={() => { setSelectingField('destination'); setModalVisible(true); }}
            >
              <Text style={tripData.destination ? styles.inputTextValue : styles.inputTextPlaceholder}>
                {tripData.destination || 'Select Destination'}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.sectionTitle}>🕒 When is the ride?</Text>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.inputPicker}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={tripData.date ? styles.inputTextValue : styles.inputTextPlaceholder}>
                {tripData.date || 'Select Date'}
              </Text>
              <Text style={styles.dropdownIcon}>📅</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.inputPicker}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={tripData.time ? styles.inputTextValue : styles.inputTextPlaceholder}>
                {tripData.time || 'Select Time'}
              </Text>
              <Text style={styles.dropdownIcon}>🕒</Text>
            </TouchableOpacity>
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={styles.sectionTitle}>🏍️ Ride Details</Text>
            <Text style={styles.label}>Trip Type</Text>
            <View style={styles.optionsContainer}>
              {['🏖️ Weekend', '🛣️ Touring', '🏜️ Off-road', '🏁 Track'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionChip, tripData.tripType === type && styles.optionChipActive]}
                  onPress={() => updateData('tripType', type)}
                >
                  <Text style={[styles.optionText, tripData.tripType === type && styles.optionTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Riding Style</Text>
            <View style={styles.optionsContainer}>
              {['😎 Cruising', '🚀 Fast-paced', '📸 Scenic', '🔥 Aggressive'].map(style => (
                <TouchableOpacity
                  key={style}
                  style={[styles.optionChip, tripData.ridingStyle === style && styles.optionChipActive]}
                  onPress={() => updateData('ridingStyle', style)}
                >
                  <Text style={[styles.optionText, tripData.ridingStyle === style && styles.optionTextActive]}>{style}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Group Size</Text>
            <View style={styles.optionsContainer}>
              {['👤 1-5', '👥 6-10', '🔥 10+'].map(size => (
                <TouchableOpacity
                  key={size}
                  style={[styles.optionChip, tripData.groupSize === size && styles.optionChipActive]}
                  onPress={() => updateData('groupSize', size)}
                >
                  <Text style={[styles.optionText, tripData.groupSize === size && styles.optionTextActive]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 4:
        return (
          <View>
            <Text style={styles.sectionTitle}>✅ Review & Publish</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewText}><Text style={styles.bold}>📍 Route:</Text> {tripData.startLocation || 'N/A'} → {tripData.destination || 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.bold}>📅 Date:</Text> {tripData.date || 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.bold}>🕒 Time:</Text> {tripData.time || 'N/A'}</Text>
              <Text style={styles.reviewText}><Text style={styles.bold}>🏍️ Type:</Text> {tripData.tripType}</Text>
              <Text style={styles.reviewText}><Text style={styles.bold}>🔥 Style:</Text> {tripData.ridingStyle}</Text>
              <Text style={styles.reviewText}><Text style={styles.bold}>👥 Size:</Text> {tripData.groupSize} riders</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {renderStepIndicator()}

        <View style={styles.contentCard}>
          {renderStepContent()}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
          {step > 1 ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}

          {step < totalSteps ? (
            <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.publishButton, isPublishing && { opacity: 0.7 }]}
              onPress={publishTrip}
              disabled={isPublishing}
            >
              <Text style={styles.primaryButtonText}>
                {isPublishing ? 'Publishing...' : 'Publish Trip'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Location Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location</Text>
            {loadingLocations && <ActivityIndicator size="small" color="#FF5722" />}
            {locationError && <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>{locationError}</Text>}
            <FlatList
              data={locations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleLocationSelect(item.name)}>
                  <Text style={styles.modalItemText}>{item.name}</Text>
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
          value={dateObj}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onDateChange}
          accentColor="#FF5722"
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={timeObj}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    padding: 20,
    flexGrow: 1,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
  },
  stepDotActive: {
    backgroundColor: '#FF5722',
    width: 24,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputPicker: {
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownIcon: {
    color: '#999',
    fontSize: 14,
  },
  inputTextPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  inputTextValue: {
    color: '#333',
    fontSize: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  optionChip: {
    backgroundColor: '#F0F2F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionChipActive: {
    backgroundColor: '#FFF0ED',
    borderColor: '#FF5722',
  },
  optionText: {
    color: '#666',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#FF5722',
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#333',
  },
  publishButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#FF5722',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
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
