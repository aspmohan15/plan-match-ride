import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupChatScreen({ route }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  // Use a default group ID if not provided via route params
  const groupId = route?.params?.groupId || 'default-group-123';
  const currentUser = 'You';

  useEffect(() => {
    // Initialize WebSocket connection using local IP
    ws.current = new WebSocket(`ws://192.168.1.4:3000/api/v1/chat/group/${groupId}`);

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
});
