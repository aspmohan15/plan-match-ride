import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RiderProfileScreen({ route, navigation }) {
  const { rider } = route.params;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          {rider.profileImage ? (
            <Image source={{ uri: rider.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {rider.name ? rider.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{rider.name}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Bike</Text>
          <Text style={styles.sectionText}>{rider.bike || 'Unknown Bike'}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Riding Style</Text>
          <Text style={styles.sectionText}>{rider.ridingStyle || 'Any'}</Text>
        </View>

        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => {
            // Placeholder for connect action
            alert(`Connect request sent to ${rider.name}!`);
          }}
        >
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  connectButton: {
    width: '100%',
    backgroundColor: '#FF5722',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
