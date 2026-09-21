import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';

export default function ProfileScreen() {
  const user = {
    name: "Mohan",
    city: "Bangalore",
    bikeBrand: "Hero",
    bikeModel: "XPulse 210",
    ridingStyle: "Touring",
    verified: true,
    bikePhoto: null, // Imagine this is fetched from a global store or backend
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
          </View>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}</Text>
            {user.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.location}>📍 {user.city}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Garage</Text>
        <View style={styles.card}>
          {user.bikePhoto ? (
            <Image source={{ uri: user.bikePhoto }} style={styles.bikeImage} />
          ) : (
            <View style={[styles.bikeImage, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
               <Text style={{fontSize: 30}}>🏍️</Text>
            </View>
          )}
          <View style={styles.cardRight}>
            <Text style={styles.cardLabel}>Bike</Text>
            <Text style={styles.cardValue}>{user.bikeBrand} {user.bikeModel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Riding Preference</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Style</Text>
          <Text style={styles.cardValue}>{user.ridingStyle}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  verifiedBadge: {
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#137333',
    fontSize: 12,
    fontWeight: '600',
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  bikeImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  cardRight: {
    flex: 1,
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});
