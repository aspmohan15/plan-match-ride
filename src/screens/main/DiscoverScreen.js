import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CONFIG } from '../../constants/config';

export default function DiscoverScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [uiState, setUiState] = useState('empty');
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    // If we came from HomeScreen search
    if (route.params?.showResults) {
      setUiState('loading');

      const { from, to, date } = route.params.searchQuery || {};

      // Actually call your Fastify Matches Engine
      fetch(`${CONFIG.API_URL}/matches?from=${from}&to=${to}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
               setMatches(data);
               setUiState('populated');
            } else {
               setUiState('empty');
            }
        })
        .catch(err => {
            console.error("Failed to fetch matches", err);
            setUiState('error');
        });
    }
  }, [route.params]);

  const renderMatchCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#007bff' }]}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
              {item.name ? item.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.riderName}>{item.name}</Text>
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, index) => (
              <View key={index} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.detailText}><Text style={styles.bold}>Route:</Text> {item.route}</Text>
        <Text style={styles.detailText}><Text style={styles.bold}>When:</Text> {item.date} at {item.time}</Text>
        <Text style={styles.detailText}><Text style={styles.bold}>Bike:</Text> {item.bike}</Text>
        <Text style={styles.detailText}><Text style={styles.bold}>Style:</Text> {item.style}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.connectButton} onPress={() => {}}>
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('RiderProfile', { rider: item })}>
          <Text style={styles.profileButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (uiState) {
      case 'loading':
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>🔍 Finding matches...</Text>
          </View>
        );
      case 'empty':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyTitle}>🏜️ No Matches Yet</Text>
            <Text style={styles.emptyText}>Nobody is planning this ride yet. Keep your Trip Radar on!</Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.actionButtonText}>✏️ Update Trip Details</Text>
            </TouchableOpacity>
          </View>
        );
      case 'error':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.errorTitle}>🚨 Oops! Something went wrong.</Text>
            <Text style={styles.errorText}>We couldn't load your matches. Please try again.</Text>
            <TouchableOpacity style={styles.actionButton} onPress={() => setUiState('loading')}>
              <Text style={styles.actionButtonText}>🔄 Retry</Text>
            </TouchableOpacity>
          </View>
        );
      case 'populated':
      default:
        return (
          <View style={{ flex: 1 }}>
            {route.params?.showResults && (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsHeaderText}>
                  🎉 Found {matches.length} riders matching your trip to {route.params?.searchQuery?.to}!
                </Text>
              </View>
            )}
            <FlatList
              data={matches}
              keyExtractor={item => item.id}
              renderItem={renderMatchCard}
              contentContainerStyle={styles.listContainer}
            />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#555',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d9534f',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  resultsHeader: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  resultsHeaderText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ccc',
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagBadge: {
    backgroundColor: '#e0f7fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#00796b',
    fontWeight: '600',
  },
  detailsContainer: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: '#222',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  connectButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  profileButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#495057',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
