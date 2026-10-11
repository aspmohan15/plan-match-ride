import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get('/notifications');
      setNotifications(data || []);
    } catch (err) {
      console.warn("Failed to fetch notifications", err);
      Alert.alert("Error", "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      Toast.show({ type: 'success', text1: 'Marked all as read' });
    } catch (err) {
      console.warn("Failed to mark all read", err);
    }
  };

  const handleNotificationTap = async (item) => {
    // Optimistically mark as read in UI
    if (!item.is_read) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
      // Call backend to mark read
      api.patch(`/notifications/${item.id}/read`).catch(err => console.warn(err));
    }

    // Navigate based on notification type
    if (item.type === 'TRIP_JOIN_REQUEST' || item.type === 'TRIP_JOIN_ACCEPTED') {
      navigation.navigate('TripDetails', { tripId: item.related_id });
    } else if (item.type === 'CONNECTION_REQUEST' || item.type === 'CONNECTION_ACCEPTED') {
      // For connections, related_id is the user ID. We can navigate to RiderProfile.
      navigation.navigate('RiderProfile', {
        rider: { id: item.related_id, name: 'Rider' } // Name will be fetched if missing or we just pass ID
      });
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.is_read;
    const date = new Date(item.created_at);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let icon = '🔔';
    if (item.type === 'CONNECTION_REQUEST' || item.type === 'CONNECTION_ACCEPTED') icon = '🤝';
    if (item.type === 'TRIP_JOIN_REQUEST' || item.type === 'TRIP_JOIN_ACCEPTED') icon = '🏍️';

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => handleNotificationTap(item)}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, isUnread && styles.unreadTitle]}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{dateStr}</Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length > 0 && (
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>Your Notifications</Text>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>📭 No notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  markAllText: { fontSize: 14, color: '#1A73E8', fontWeight: 'bold' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0'
  },
  unreadCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD'
  },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  iconText: { fontSize: 20 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  unreadTitle: { fontWeight: 'bold', color: '#000' },
  message: { fontSize: 14, color: '#555', marginBottom: 6 },
  time: { fontSize: 12, color: '#999' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', marginLeft: 10 },
  emptyText: { fontSize: 16, color: '#999' }
});