import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';

export default function DestinationDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { destinationId, destinationName } = route.params;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDestinationDetails();
  }, []);

  const fetchDestinationDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/discover/destinations/${encodeURIComponent(destinationId)}`);
      setData(response);
    } catch (err) {
      setError('Failed to load destination details.');
    } finally {
      setLoading(false);
    }
  };

  const renderTripCard = ({ item }) => {
    // Assuming backend returns item like:
    // { id, user_name, profile_image_url, start_location, end_location, start_time, bike_model, bike_image_url }
    const date = new Date(item.start_time);
    const dateString = date.toLocaleDateString();
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {item.profile_image_url ? (
            <Image source={{ uri: item.profile_image_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF5722' }]}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                {item.user_name ? item.user_name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.riderName}>{item.user_name || 'Anonymous Rider'}</Text>
            <Text style={styles.tripRoute}>{item.start_location} → {item.end_location}</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>🗓️ {dateString} • ⏰ {timeString}</Text>
          {item.bike_model && (
            <Text style={styles.detailText}>🏍️ {item.bike_model}</Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.viewTripButton, { flex: 1 }]}
            onPress={() => navigation.navigate('RiderProfile', {
              rider: {
                id: item.user_id,
                name: item.user_name || 'Anonymous Rider',
                profileImage: item.profile_image_url,
                bike: item.bike_model || 'Unknown Bike',
                ridingStyle: item.description || 'Any'
              }
            })}
          >
            <Text style={styles.viewTripButtonText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewTripButton, { flex: 1, backgroundColor: '#FF5722' }]}
            onPress={() => navigation.navigate('TripDetails', { tripId: item.id })}
          >
            <Text style={[styles.viewTripButtonText, { color: '#fff' }]}>View Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>Loading riders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDestinationDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{destinationName || destinationId} 🏔️</Text>
        <Text style={styles.headerSubtitle}>
          {data?.riderCount || 0} {data?.riderCount === 1 ? 'rider is' : 'riders are'} planning to go
        </Text>
      </View>
      <FlatList
        data={data?.trips || []}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTripCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No riders found for this destination.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d9534f',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  riderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tripRoute: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  viewTripButton: {
    backgroundColor: '#E8F0FE',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewTripButtonText: {
    color: '#1A73E8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  }
});
