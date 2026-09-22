import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SMS from 'expo-sms';
import { CONFIG } from '../../constants/config';
import Toast from 'react-native-toast-message';

export default function GroupChatScreen({ route }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Add Rider Modal State
  const [addRiderModalVisible, setAddRiderModalVisible] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundRider, setFoundRider] = useState(null);

  const ws = useRef(null);

  // Use the actual group ID from route params, or fallback to '1' for safety
  const groupId = route?.params?.groupId || '1';
  const currentUser = 'You';

  useEffect(() => {
    fetchGroupMembers();

    // Initialize WebSocket connection using config
    ws.current = new WebSocket(`${CONFIG.WS_URL}/chat/group/${groupId}`);

    ws.current.onopen = () => {
      console.log('Connected to group chat:', groupId);
      setIsConnected(true);
    };

    ws.current.onmessage = (e) => {
      try {
        const incomingMessage = JSON.parse(e.data);
        // Only append if it's not our own message (since we optimistically add our own)
        // Or handle it based on a unique ID if the server echoes it back
        setMessages((prevMessages) => {
          // Prevent duplicates if server echoes our message
          if (prevMessages.some(m => m.id === incomingMessage.id)) return prevMessages;
          return [...prevMessages, incomingMessage];
        });
      } catch (err) {
        console.error('Failed to parse incoming message:', err);
      }
    };

    ws.current.onerror = (e) => {
      console.log('WebSocket Error: ', e.message);
    };

    ws.current.onclose = (e) => {
      console.log('WebSocket Closed: ', e.code, e.reason);
      setIsConnected(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [groupId]);

  const fetchGroupMembers = async () => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/groups/${groupId}/members`);
      if (response.ok) {
        const data = await response.json();
        setGroupMembers(data);
      }
    } catch (err) {
      console.warn("Could not load group members", err);
    }
  };

  const sendMessage = () => {
    if (inputText.trim().length > 0) {
      const newMessage = {
        id: Date.now().toString(),
        text: inputText.trim(),
        sender: currentUser,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
      };

      // Optimistically add to UI
      setMessages([...messages, newMessage]);

      // Send to WebSocket server
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        // We set isOwn to false for other clients when broadcasting
        ws.current.send(JSON.stringify({ ...newMessage, isOwn: false }));
      } else {
        console.warn("WebSocket is not connected");
      }

      setInputText('');
    }
  };

  const handleSearchRider = async () => {
    if (!searchPhone.trim() || searchPhone.length < 10) {
       Toast.show({ type: 'error', text1: 'Invalid Number', text2: 'Please enter a valid 10-digit mobile number.' });
       return;
    }

    setIsSearching(true);
    setFoundRider(null);

    try {
      const response = await fetch(`${CONFIG.API_URL}/users/search?phone=${searchPhone}`);
      if (response.ok) {
        const data = await response.json();
        setFoundRider(data);
      } else if (response.status === 404) {
        setFoundRider({ notFound: true });
      } else {
        throw new Error('Failed to search');
      }
    } catch (err) {
      console.warn(err);
      Alert.alert('Error', 'Failed to search for rider. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddRiderToGroup = async () => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/groups/${groupId}/add_member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: foundRider.id })
      });

      if (response.ok) {
        Toast.show({ type: 'success', text1: 'Rider Added! 🏍️', text2: `${foundRider.full_name} has joined the group.` });
        setAddRiderModalVisible(false);
        setSearchPhone('');
        setFoundRider(null);
        fetchGroupMembers(); // Refresh the members list!
      } else {
        throw new Error('Failed to add');
      }
    } catch (err) {
      console.warn(err);
      Alert.alert('Error', 'Could not add rider to the group.');
    }
  };

  const handleInviteViaSMS = async () => {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync(
        [searchPhone],
        `Hey! I'm planning a ride on TripMates and want you in my group. Download the app and let's roll! 🏍️💨`
      );
      setAddRiderModalVisible(false);
    } else {
      Alert.alert("Error", "SMS is not available on this device");
    }
  };

  const handleCallRider = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(err => console.error("Couldn't make call", err));
  };

  const renderMessage = ({ item }) => {
    return (
      <View style={[styles.messageBubble, item.isOwn ? styles.ownMessageBubble : styles.otherMessageBubble]}>
        {!item.isOwn && <Text style={styles.senderName}>{item.sender}</Text>}
        <Text style={[styles.messageText, item.isOwn ? styles.ownMessageText : styles.otherMessageText]}>
          {item.text}
        </Text>
        <Text style={[styles.timestamp, item.isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
          {item.timestamp}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
      >
        <View style={styles.headerBar}>
           <TouchableOpacity onPress={() => setShowMembersModal(true)}>
             <Text style={styles.headerTitle}>{route.params?.groupName || 'Group Chat'} 👥</Text>
             <Text style={styles.headerSubtitle}>{groupMembers.length} Riders</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.addRiderButton} onPress={() => setAddRiderModalVisible(true)}>
              <Text style={styles.addRiderText}>➕ Add Rider</Text>
           </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContainer}
        />

        <View style={styles.typingIndicatorContainer}>
          {isConnected ? (
             <Text style={styles.typingText}>🟢 Connected to {groupId}</Text>
          ) : (
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <ActivityIndicator size="small" color="#666" style={{ marginRight: 6 }} />
               <Text style={styles.typingText}>Connecting...</Text>
             </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send 🚀</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Add Rider Modal */}
      <Modal visible={addRiderModalVisible} animationType="slide" transparent={true} onRequestClose={() => setAddRiderModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => {
            setAddRiderModalVisible(false);
            setSearchPhone('');
            setFoundRider(null);
          }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>➕ Add Rider to Group</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddRiderModalVisible(false);
                  setSearchPhone('');
                  setFoundRider(null);
                }}
                style={styles.closeIconBtn}
              >
                <Text style={styles.closeIconText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Rider's Mobile Number</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              maxLength={10}
              value={searchPhone}
              onChangeText={(text) => {
                 setSearchPhone(text);
                 setFoundRider(null); // Reset search if they type a new number
              }}
            />

            <TouchableOpacity
              style={[styles.searchButton, isSearching && { opacity: 0.7 }]}
              onPress={handleSearchRider}
              disabled={isSearching}
            >
              <Text style={styles.searchButtonText}>
                {isSearching ? 'Searching...' : '🔍 Search Database'}
              </Text>
            </TouchableOpacity>

            {foundRider && !foundRider.notFound && (
               <View style={styles.riderResultCard}>
                  <View style={styles.avatarPlaceholder}>
                     <Text style={{fontSize: 24}}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.riderName}>{foundRider.full_name}</Text>
                     <Text style={styles.riderBike}>🏍️ {foundRider.make} {foundRider.model}</Text>
                  </View>
               </View>
            )}

            {foundRider && foundRider.notFound && (
               <View style={styles.riderResultCardError}>
                  <Text style={styles.riderNotFoundText}>This biker isn't on TripMates yet!</Text>
               </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                   setAddRiderModalVisible(false);
                   setSearchPhone('');
                   setFoundRider(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {foundRider && !foundRider.notFound && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddRiderToGroup}>
                  <Text style={styles.addButtonText}>Add to Group</Text>
                </TouchableOpacity>
              )}

              {foundRider && foundRider.notFound && (
                <TouchableOpacity style={styles.inviteButton} onPress={handleInviteViaSMS}>
                  <Text style={styles.inviteButtonText}>Invite via SMS 💬</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* View Members Modal */}
      <Modal visible={showMembersModal} animationType="slide" transparent={true} onRequestClose={() => setShowMembersModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowMembersModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>👥 Group Members</Text>
              <TouchableOpacity onPress={() => setShowMembersModal(false)} style={styles.closeIconBtn}>
                <Text style={styles.closeIconText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={groupMembers}
              keyExtractor={(item) => item.phone_number}
              renderItem={({ item }) => (
                <View style={styles.riderResultCard}>
                  <View style={styles.avatarPlaceholder}>
                     <Text style={{fontSize: 24}}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.riderName}>{item.full_name || item.phone_number}</Text>
                     <Text style={styles.riderBike}>🏍️ {item.make || 'Unknown'} {item.model || 'Bike'}</Text>
                     <TouchableOpacity onPress={() => handleCallRider(item.phone_number)}>
                        <Text style={styles.riderPhone}>📞 {item.phone_number}</Text>
                     </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={{textAlign: 'center', color: '#666'}}>No members found.</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContainer: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  ownMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF5722',
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownTimestamp: {
    color: '#FFCCBC',
  },
  otherTimestamp: {
    color: '#999',
  },
  typingIndicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  addRiderButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addRiderText: {
    color: '#1976D2',
    fontWeight: 'bold',
    fontSize: 14,
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeIconBtn: {
    padding: 8,
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
  },
  closeIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  inputModal: {
    backgroundColor: '#F0F2F5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16
  },
  searchButton: { backgroundColor: '#333', paddingVertical: 14, alignItems: 'center', borderRadius: 8, marginBottom: 20 },
  searchButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  riderResultCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20
  },
  avatarPlaceholder: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  riderName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  riderBike: { fontSize: 14, color: '#666', marginBottom: 6 },
  riderPhone: { fontSize: 14, color: '#1976D2', fontWeight: 'bold' },
  riderResultCardError: {
    backgroundColor: '#FFF0ED', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FFCCBC', marginBottom: 20, alignItems: 'center'
  },
  riderNotFoundText: { color: '#D84315', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, paddingVertical: 14, alignItems: 'center', marginRight: 10, borderRadius: 8, backgroundColor: '#E5E7EB' },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: '#4B5563' },
  addButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#4CAF50' },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  inviteButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#2196F3' },
  inviteButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});
