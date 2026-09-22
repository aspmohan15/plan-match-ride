import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { CONFIG } from '../../constants/config';
import Toast from 'react-native-toast-message';

export default function GroupsScreen({ navigation }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeGroups, setActiveGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create Group Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchGroupsAndConnections();
  }, []);

  const fetchGroupsAndConnections = async () => {
    setLoading(true);
    try {
      // Fetch from the newly created backend routes!
      const groupsRes = await fetch(`${CONFIG.API_URL}/groups`);
      const connectionsRes = await fetch(`${CONFIG.API_URL}/groups/connections/pending`);

      if (groupsRes.ok && connectionsRes.ok) {
        const groupsData = await groupsRes.json();
        const connectionsData = await connectionsRes.json();

        // Map backend group data to frontend format
        const formattedGroups = groupsData.map(g => ({
          id: g.id.toString(),
          name: g.name,
          members: g.member_count || 1 // Show actual member count from database
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
        ? `${CONFIG.API_URL}/groups/connections/${requestId}/accept`
        : `${CONFIG.API_URL}/groups/connections/${requestId}/decline`;

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
               await fetch(`${CONFIG.API_URL}/groups/${groupId}/leave`, { method: 'POST' });
               Alert.alert("Success", `You have left ${groupName}.`);
            } catch (err) {
               console.error("Failed to leave group", err);
            }
          }
        }
      ]
    );
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a group name.' });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${CONFIG.API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc })
      });

      if (response.ok) {
        Toast.show({ type: 'success', text1: 'Group Created', text2: `Welcome to ${newGroupName}!` });
        setCreateModalVisible(false);
        setNewGroupName('');
        setNewGroupDesc('');
        fetchGroupsAndConnections(); // Refresh list
      } else {
        throw new Error('Failed to create group');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderActiveGroup = ({ item }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })}
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
    <>
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
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>👥 Active Riding Groups</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
                  <Text style={styles.createGroupText}>➕ Create</Text>
                </TouchableOpacity>
              </View>

              {activeGroups.length === 0 ? (
                <View style={styles.emptyGroupContainer}>
                  <Text style={styles.emptyText}>🏜️ You are not in any groups yet.</Text>
                  <Text style={styles.helperText}>
                    Groups are created automatically when you connect with matching riders on the Discover tab, or you can create one manually!
                  </Text>
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
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>➕ Create Riding Group</Text>

            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Weekend Track Boys"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="What is this group about?"
              multiline
              value={newGroupDesc}
              onChangeText={setNewGroupDesc}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, isCreating && { opacity: 0.7 }]}
                onPress={handleCreateGroup}
                disabled={isCreating}
              >
                <Text style={styles.createButtonText}>
                  {isCreating ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  createGroupText: {
    color: '#FF5722',
    fontSize: 16,
    fontWeight: 'bold',
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
  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  input: {
    backgroundColor: '#F0F2F5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, paddingVertical: 14, alignItems: 'center', marginRight: 10, borderRadius: 8, backgroundColor: '#E5E7EB' },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: '#4B5563' },
  createButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#FF5722' },
  createButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});
