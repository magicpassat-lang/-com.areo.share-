import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface RideInfo {
  id: string;
  airport_name: string;
  airport_code: string;
  flight_time: string;
  matched_users: { name: string; origin_address: string }[];
}

export default function Chat() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { user, token } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [rideInfo, setRideInfo] = useState<RideInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchRideInfo();
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchRideInfo = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/rides/${rideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRideInfo(data);
    } catch {}
  };

  const fetchMessages = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/rides/${rideId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(data);
    } catch {}
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      await axios.post(
        `${BACKEND_URL}/api/rides/${rideId}/messages`,
        { content: newMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      await fetchMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {}
    setSending(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.user_id === user?.id;
    return (
      <View
        testID={`message-${item.id}`}
        style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}
      >
        {!isMe && <Text style={styles.msgName}>{item.user_name}</Text>}
        <View style={[styles.msgBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
            {item.content}
          </Text>
        </View>
        <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="chat-back-btn" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#09090B" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {rideInfo && (
            <>
              <Text style={styles.headerTitle}>{rideInfo.airport_code} RIDE GROUP</Text>
              <Text style={styles.headerSub}>
                {rideInfo.matched_users.length + 1} riders
              </Text>
            </>
          )}
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="people" size={20} color="#09090B" />
        </View>
      </View>

      {/* Match info banner */}
      {rideInfo && rideInfo.matched_users.length > 0 && (
        <View style={styles.matchBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
          <Text style={styles.matchBannerText}>
            Matched with {rideInfo.matched_users.map(u => u.name).join(', ')}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#09090B" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={48} color="#E4E4E7" />
                <Text style={styles.emptyText}>Start coordinating your ride!</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            testID="chat-input"
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#A1A1AA"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            testID="send-message-btn"
            style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#09090B" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#09090B" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 2, borderColor: '#09090B', gap: 12,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#09090B', letterSpacing: 2 },
  headerSub: { fontSize: 12, color: '#71717A', marginTop: 2 },
  headerBadge: {
    width: 40, height: 40, backgroundColor: '#FDE047',
    alignItems: 'center', justifyContent: 'center',
  },
  matchBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#E4E4E7',
  },
  matchBannerText: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
  msgList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  msgRow: { marginBottom: 12 },
  msgRowLeft: { alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },
  msgName: { fontSize: 11, fontWeight: '700', color: '#71717A', letterSpacing: 1, marginBottom: 4, marginLeft: 4 },
  msgBubble: { maxWidth: '80%', padding: 14 },
  bubbleMe: { backgroundColor: '#09090B', borderRadius: 16, borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: '#F4F4F5', borderRadius: 16, borderTopLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgTextMe: { color: '#FFFFFF' },
  msgTextOther: { color: '#09090B' },
  msgTime: { fontSize: 10, color: '#A1A1AA', marginTop: 4, marginHorizontal: 4 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#A1A1AA' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8,
    borderTopWidth: 2, borderColor: '#E4E4E7', backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: '#F4F4F5',
    borderWidth: 2, borderColor: '#E4E4E7', paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 15, color: '#09090B',
  },
  sendBtn: {
    width: 44, height: 44, backgroundColor: '#FDE047',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
