import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';

export default function GroupsScreen({ navigation }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeGroups, setActiveGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGroupsAndConnections();
  }, []);

  const fetchGroupsAndConnections = async () => {
    setLoading(true);
    try {
      // Fetch from the newly created backend routes!
      const groupsRes = await fetch('http://192.168.1.4:3000/api/v1/groups');
      const connectionsRes = await fetch('http://192.168.1.4:3000/api/v1/groups/connections/pending');

      if (groupsRes.ok && connectionsRes.ok) {
        const groupsData = await groupsRes.json();
        const connectionsData = await connectionsRes.json();

        // Map backend group data to frontend format
        const formattedGroups = groupsData.map(g => ({
          id: g.id.toString(),
          name: g.name,
          members: Math.floor(Math.random() * 20) + 5 // Simulate member count for UI
        }));

        setActiveGroups(formattedGroups);
        setPendingRequests(connectionsData);
      } else {
        throw new Error("Failed to fetch");
      }
    } catch (error) {
      console.error("Failed to fetch groups", error);
      Alert.alert("Error", "Could not load groups.");
    } finally {
      setLoading(false);
    }
  };
  const handleConnectionRequest = async (requestId, action) => {
    // 1. Optimistically remove the request from the UI
    setPendingRequests(prevRequests => prevRequests.filter(req => req.id !== requestId));

    // 2. Fire the real API call
    try {
      const endpoint = action === 'accept'
        ? `http://192.168.1.4:3000/api/v1/groups/connections/${requestId}/accept`
        : `http://192.168.1.4:3000/api/v1/groups/connections/${requestId}/decline`;

      const response = await fetch(endpoint, { method: 'POST' });

      if (response.ok) {
        if (action === 'accept') {
          Alert.alert("Success", "You are now connected!");
        } else {
          Alert.alert("Declined", "Connection request removed.");
        }
      } else {
        throw new Error('Backend failed');
      }
    } catch (err) {
      console.error("Connection action failed:", err);
      // In a real app, you would roll back the optimistic UI update here
    }
  };

  const renderPendingRequest = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>👤 {item.name}</Text>
        <Text style={styles.requestMutual}>🤝 {item.mutual}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleConnectionRequest(item.id, 'accept')}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleConnectionRequest(item.id, 'decline')}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleLeaveGroup = (groupId, groupName) => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${groupName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            // Optimistically update the UI to remove the group
            setActiveGroups(prevGroups => prevGroups.filter(g => g.id !== groupId));

            // Fire the real API call
            try {
               await fetch(`http://192.168.1.4:3000/api/v1/groups/${groupId}/leave`, { method: 'POST' });
               Alert.alert("Success", `You have left ${groupName}.`);
            } catch (err) {
               console.error("Failed to leave group", err);
            }
          }
        }
      ]
    );
  };

  const renderActiveGroup = ({ item }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupChat', { groupName: item.name })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupMembers}>👥 {item.members} members</Text>
      </View>
      <TouchableOpacity
        style={styles.leaveButton}
        onPress={() => handleLeaveGroup(item.id, item.name)}
      >
        <Text style={styles.leaveButtonText}>Leave 🚪</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#FF5722" style={{ marginTop: 50 }} />
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤝 Pending Connection Requests</Text>
            {pendingRequests.length === 0 ? (
              <Text style={styles.emptyText}>🏜️ No pending requests.</Text>
            ) : (
              <FlatList
                data={pendingRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderPendingRequest}
                scrollEnabled={false}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Active Riding Groups</Text>
            {activeGroups.length === 0 ? (
              <View style={styles.emptyGroupContainer}>
                <Text style={styles.emptyText}>🏜️ You are not in any groups yet.</Text>
                <Text style={styles.helperText}>
                  Groups are created automatically when you connect with matching riders on the Discover tab!
                </Text>
                <TouchableOpacity
                  style={styles.findRidersButton}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Text style={styles.findRidersButtonText}>🏍️ Plan a Ride to match</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={activeGroups}
                keyExtractor={(item) => item.id}
                renderItem={renderActiveGroup}
                scrollEnabled={false}
              />
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
    backgroundColor: '#F5F5F5',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  requestMutual: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#FF5722',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  declineButton: {
    backgroundColor: '#E0E0E0',
  },
  declineButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  groupMembers: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  leaveButton: {
    backgroundColor: '#FFF0ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFCCBC',
  },
  leaveButtonText: {
    color: '#D84315',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  emptyGroupContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  helperText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  findRidersButton: {
    marginTop: 24,
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  findRidersButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
