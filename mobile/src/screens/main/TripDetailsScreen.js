import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';

export default function TripDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { tripId } = route.params;
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTripDetails();
  }, []);

  const fetchTripDetails = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/trips/${tripId}`);
      setTrip(data);

      // Fetch participants (squad members)
      const parts = await api.get(`/trips/${tripId}/participants`);
      setParticipants(parts || []);

      // If user is the creator, fetch the pending join requests
      if (user && user.id === data.creator_id) {
        const reqs = await api.get(`/trips/${tripId}/requests`);
        setPendingRequests(reqs || []);
      }
    } catch (err) {
      console.warn(err);
      Alert.alert('Error', 'Failed to load trip details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTrip = async () => {
    setActionLoading(true);
    try {
      await api.post(`/trips/${tripId}/join`);
      Toast.show({ type: 'success', text1: 'Request Sent', text2: 'Your request to join has been sent.' });
      fetchTripDetails();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not send join request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setActionLoading(true);
    try {
      await api.post(`/trips/requests/${trip.join_request.id}/cancel`);
      Toast.show({ type: 'info', text1: 'Cancelled', text2: 'Your request was cancelled.' });
      fetchTripDetails();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    setActionLoading(true);
    try {
      await api.post(`/trips/requests/${requestId}/${action}`);
      Toast.show({ type: 'success', text1: 'Success', text2: `Request ${action}ed.` });
      fetchTripDetails(); // Refresh to update squad list and requests list
    } catch (err) {
      Alert.alert('Error', err.message || `Could not ${action} request`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !trip) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  const isCreator = user && user.id === trip.creator_id;
  const dateString = new Date(trip.start_time).toLocaleDateString();
  const timeString = new Date(trip.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.routeText}>{trip.start_location} → {trip.end_location}</Text>
        <Text style={styles.dateText}>📅 {dateString} • 🕒 {timeString}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{trip.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Creator</Text>
        <TouchableOpacity
          style={styles.creatorCard}
          onPress={() => navigation.navigate('RiderProfile', {
            rider: {
              id: trip.creator_id,
              name: trip.user_name || 'Anonymous',
              profileImage: trip.profile_image_url,
              bike: trip.bike_model || 'Unknown',
            }
          })}
        >
          {trip.profile_image_url ? (
            <Image source={{ uri: trip.profile_image_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{trip.user_name ? trip.user_name.charAt(0) : '?'}</Text>
            </View>
          )}
          <View>
            <Text style={styles.creatorName}>{trip.user_name || 'Anonymous'}</Text>
            <Text style={styles.creatorBike}>{trip.bike_model || 'Unknown Bike'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <Text style={styles.detailText}>{trip.description || 'No description provided.'}</Text>
        <Text style={styles.detailText}><Text style={{fontWeight: 'bold'}}>Participants:</Text> {participants.length + 1} Riders</Text>
      </View>

      {/* Squad Members Section */}
      {(participants.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Squad Members ({participants.length})</Text>
          {participants.map(p => (
            <TouchableOpacity
              key={p.id}
              style={styles.participantCard}
              onPress={() => navigation.navigate('RiderProfile', {
                rider: { id: p.id, name: p.name, profileImage: p.profile_image_url, bike: p.bike_model }
              })}
            >
              {p.profile_image_url ? (
                <Image source={{ uri: p.profile_image_url }} style={styles.avatarSmall} />
              ) : (
                <View style={styles.avatarPlaceholderSmall}>
                  <Text style={styles.avatarTextSmall}>{p.name ? p.name.charAt(0) : '?'}</Text>
                </View>
              )}
              <View>
                <Text style={styles.participantName}>{p.name}</Text>
                <Text style={styles.participantBike}>{p.bike_model || 'Unknown Bike'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Pending Requests Section (Creator Only) */}
      {isCreator && pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Join Requests ({pendingRequests.length})</Text>
          {pendingRequests.map(req => (
            <View key={req.request_id} style={styles.requestCard}>
              <TouchableOpacity
                style={styles.requestInfo}
                onPress={() => navigation.navigate('RiderProfile', {
                  rider: { id: req.user_id, name: req.requester_name, profileImage: req.profile_image_url, bike: req.bike_model }
                })}
              >
                {req.profile_image_url ? (
                  <Image source={{ uri: req.profile_image_url }} style={styles.avatarSmall} />
                ) : (
                  <View style={styles.avatarPlaceholderSmall}>
                    <Text style={styles.avatarTextSmall}>{req.requester_name ? req.requester_name.charAt(0) : '?'}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.participantName}>{req.requester_name}</Text>
                  <Text style={styles.participantBike}>{req.bike_model || 'Unknown Bike'}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.actionBtnAccept} onPress={() => handleRequestAction(req.request_id, 'accept')}>
                  <Text style={styles.actionBtnText}>✅</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnDecline} onPress={() => handleRequestAction(req.request_id, 'decline')}>
                  <Text style={styles.actionBtnText}>❌</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons for non-creators */}
      {!isCreator && (
        <View style={styles.actionContainer}>
          {trip.join_request ? (
            trip.join_request.status === 'pending' ? (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest} disabled={actionLoading}>
                <Text style={styles.cancelButtonText}>{actionLoading ? 'Cancelling...' : 'Cancel Request'}</Text>
              </TouchableOpacity>
            ) : trip.join_request.status === 'accepted' ? (
              <View style={styles.acceptedBadge}>
                <Text style={styles.acceptedText}>✅ You are going on this trip!</Text>
              </View>
            ) : (
              <View style={styles.declinedBadge}>
                <Text style={styles.declinedText}>❌ Request Declined</Text>
              </View>
            )
          ) : (
            <TouchableOpacity
              style={[styles.joinButton, (trip.status !== 'planned' || actionLoading) && styles.disabledButton]}
              onPress={handleJoinTrip}
              disabled={trip.status !== 'planned' || actionLoading}
            >
              <Text style={styles.joinButtonText}>{actionLoading ? 'Requesting...' : 'Request to Join Trip'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  routeText: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  dateText: { fontSize: 16, color: '#666', marginBottom: 12 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold' },
  section: { padding: 20, backgroundColor: '#fff', marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
  creatorCard: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#FF5722', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  creatorName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  creatorBike: { fontSize: 14, color: '#666' },
  detailText: { fontSize: 16, color: '#444', lineHeight: 24, marginBottom: 8 },

  participantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholderSmall: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#FF5722', justifyContent: 'center', alignItems: 'center' },
  avatarTextSmall: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  participantName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  participantBike: { fontSize: 13, color: '#666' },

  requestCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  requestInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  requestActions: { flexDirection: 'row', gap: 8 },
  actionBtnAccept: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8 },
  actionBtnDecline: { backgroundColor: '#FFEBEE', padding: 10, borderRadius: 8 },
  actionBtnText: { fontSize: 16 },

  actionContainer: { padding: 20 },
  joinButton: { backgroundColor: '#FF5722', padding: 16, borderRadius: 12, alignItems: 'center' },
  joinButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#FFF0F0', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2' },
  cancelButtonText: { color: '#D32F2F', fontSize: 18, fontWeight: 'bold' },
  disabledButton: { backgroundColor: '#CCC' },
  acceptedBadge: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12, alignItems: 'center' },
  acceptedText: { color: '#2E7D32', fontSize: 16, fontWeight: 'bold' },
  declinedBadge: { backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12, alignItems: 'center' },
  declinedText: { color: '#C62828', fontSize: 16, fontWeight: 'bold' },
});
