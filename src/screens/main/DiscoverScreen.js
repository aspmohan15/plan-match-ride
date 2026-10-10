import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput, ScrollView } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import api from '../../services/api';

export default function DiscoverScreen({ route }) {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [myDestination, setMyDestination] = useState(null);
  const [popularDestinations, setPopularDestinations] = useState([]);
  const [upcomingPublicTrips, setUpcomingPublicTrips] = useState([]);
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    if (isFocused) {
      if (route.params?.showResults && route.params?.searchQuery?.to) {
        setSearchQuery(route.params.searchQuery.to);
        navigation.setParams({ showResults: false, searchQuery: null }); // clear so it doesn't trigger again
      } else if (!route.params?.showResults) {
        fetchDiscoverData();
      }
    }
  }, [isFocused, route.params]);

  // Handle debounced search whenever searchQuery changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery);
      } else {
        setSearchResults(null);
      }
    }, 400); // 400ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchDiscoverData = async () => {
    setLoading(true);
    try {
      const [destinationsRes, myDestRes, publicTripsRes] = await Promise.all([
        api.get('/discover/destinations'),
        api.get('/discover/my-destination'),
        api.get('/trips')
      ]);

      if (destinationsRes && destinationsRes.destinations) {
        setPopularDestinations(destinationsRes.destinations);
      }

      if (myDestRes && myDestRes.destination) {
        setMyDestination(myDestRes);
      } else {
        setMyDestination(null);
      }

      if (publicTripsRes) {
        setUpcomingPublicTrips(publicTripsRes);
      }
    } catch (err) {
      console.warn("Failed to fetch discover data", err);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (text) => {
    try {
      const res = await api.get(`/discover/search?q=${encodeURIComponent(text)}`);
      if (res && res.trips) {
        setSearchResults({
          query: text,
          riderCount: res.riderCount,
          trips: res.trips
        });
      } else {
        setSearchResults({
          query: text,
          riderCount: 0,
          trips: []
        });
      }
    } catch (err) {
      console.warn("Failed to search", err);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text); // UI updates instantly, useEffect handles the API debounce
  };

  const renderRiderCard = (item) => {
    const date = new Date(item.start_time);
    const dateString = date.toLocaleDateString();
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.riderCard}
        onPress={() => navigation.navigate('RiderProfile', {
          rider: {
            name: item.user_name || 'Anonymous Rider',
            profileImage: item.profile_image_url,
            bike: item.bike_model || 'Unknown Bike',
            ridingStyle: item.description || 'Any'
          }
        })}
      >
        <View style={styles.riderCardHeader}>
          {item.profile_image_url ? (
            <Image source={{ uri: item.profile_image_url }} style={styles.avatarSmall} />
          ) : (
            <View style={[styles.avatarSmall, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF5722' }]}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {item.user_name ? item.user_name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.riderNameSmall}>{item.user_name || 'Anonymous'}</Text>
            <Text style={styles.routeSmall}>{item.start_location} → {item.end_location}</Text>
          </View>
        </View>
        <Text style={styles.detailSmall}>{dateString} • {timeString}</Text>
        {item.bike_model && <Text style={styles.detailSmall}>{item.bike_model}</Text>}
      </TouchableOpacity>
    );
  };

  const renderDestinationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.destinationItem}
      onPress={() => navigation.navigate('DestinationDetails', { destinationId: item.destinationId, destinationName: item.name })}
    >
      <View style={styles.destinationInfo}>
        <Text style={styles.destinationName}>{item.name}</Text>
        <Text style={styles.destinationStats}>
          {item.riderCount} {item.riderCount === 1 ? 'rider' : 'riders'} • {item.tripCount} {item.tripCount === 1 ? 'trip' : 'trips'}
        </Text>
      </View>
      <Text style={styles.arrowIcon}>›</Text>
    </TouchableOpacity>
  );

  const renderPublicTrip = ({ item }) => {
    const date = new Date(item.start_time);
    const dateString = date.toLocaleDateString();
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.publicTripCard}>
        <Text style={styles.publicTripUser}>👤 {item.user_name || 'Anonymous Rider'}</Text>
        <Text style={styles.publicTripRoute}>{item.start_location} → {item.end_location}</Text>
        <Text style={styles.publicTripDate}>📅 {dateString} • 🕒 {timeString}</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity
            style={[styles.primaryButton, { marginRight: 8, flex: 1, alignItems: 'center' }]}
            onPress={() => navigation.navigate('RiderProfile', {
              rider: {
                name: item.user_name || 'Anonymous Rider',
                profileImage: item.profile_image_url,
                bike: item.bike_model || 'Unknown Bike',
                ridingStyle: item.description || 'Any'
              }
            })}
          >
            <Text style={styles.primaryButtonText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.seeAllButton, { flex: 1 }]} onPress={() => navigation.navigate('DestinationDetails', { destinationId: item.end_location, destinationName: item.end_location })}>
            <Text style={styles.seeAllText}>View Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>Discovering riders...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search destination"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {searchQuery.trim().length > 0 && searchResults ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Riders going to {searchResults.query}</Text>
          <Text style={styles.myDestinationSub}>{searchResults.riderCount} riders found</Text>
          {searchResults.trips.length > 0 ? (
            <FlatList
              data={searchResults.trips}
              keyExtractor={item => item.id.toString()}
              renderItem={renderPublicTrip}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No riders found for this destination.</Text>
            </View>
          )}
        </View>
      ) : (
        <>
          {/* Section 1: Riders going where I am going */}
          {myDestination ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 People going where you're going</Text>
              <Text style={styles.myDestinationTitle}>{myDestination.destination.name}</Text>

              {myDestination.riderCount > 0 ? (
                <>
                  <Text style={styles.myDestinationSub}>{myDestination.riderCount} {myDestination.riderCount === 1 ? 'rider is' : 'riders are'} planning to go</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
                    {myDestination.trips.slice(0, 5).map(renderRiderCard)}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.seeAllButton}
                    onPress={() => navigation.navigate('DestinationDetails', { destinationId: myDestination.destination.id, destinationName: myDestination.destination.name })}
                  >
                    <Text style={styles.seeAllText}>See All Riders</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No other riders yet</Text>
                  <Text style={styles.emptyStateDesc}>You're the first rider planning this destination. Check back later.</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Riders going where you're going</Text>
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>Plan your next ride</Text>
                <Text style={styles.emptyStateDesc}>Create a trip to find riders heading to the same destination.</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('CreateTrip')}>
                  <Text style={styles.primaryButtonText}>Create Trip</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Section 2: Popular Destinations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Popular Destinations</Text>
            {popularDestinations.length > 0 ? (
              <FlatList
                data={popularDestinations}
                keyExtractor={item => item.destinationId}
                renderItem={renderDestinationItem}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No upcoming rides yet</Text>
                <Text style={styles.emptyStateDesc}>Be the first to plan a ride.</Text>
              </View>
            )}
          </View>

          {/* Section 3: Upcoming Public Rides */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Upcoming Public Rides</Text>
            {upcomingPublicTrips.length > 0 ? (
              <FlatList
                data={upcomingPublicTrips}
                keyExtractor={item => item.id.toString()}
                renderItem={renderPublicTrip}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No upcoming public rides yet</Text>
                <Text style={styles.emptyStateDesc}>Check back later for more public rides.</Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
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
  horizontalList: {
    marginBottom: 16,
  },
  riderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 220,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  riderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  riderNameSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  routeSmall: {
    fontSize: 12,
    color: '#666',
  },
  detailSmall: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
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
  destinationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  destinationStats: {
    fontSize: 14,
    color: '#666',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#ccc',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  publicTripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  publicTripRoute: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  publicTripDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  publicTripUser: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  }
});
