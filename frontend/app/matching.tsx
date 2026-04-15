import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import axios from 'axios';
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function Matching() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('searching');
  const [matchedRideId, setMatchedRideId] = useState<string | null>(null);

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startPulseAnimation();
    const interval = setInterval(checkMatch, 5000);
    checkMatch();
    return () => clearInterval(interval);
  }, []);

  const startPulseAnimation = () => {
    const createPulse = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          ]),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    };
    createPulse(pulse1, 0).start();
    createPulse(pulse2, 600).start();
    createPulse(pulse3, 1200).start();
  };

  const checkMatch = async () => {
    if (!rideId) return;
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/rides/${rideId}/check-match`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(data.status);
      if (data.status === 'matched' && data.matched_ride_id) {
        setMatchedRideId(data.matched_ride_id);
        playNotificationSound();
      }
    } catch {}
  };

  const playNotificationSound = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
          { shouldPlay: true, volume: 1.0 }
        );
        await sound.playAsync();
      }
    } catch {}
  };

  const getPulseStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.5] }) }],
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
  });

  if (status === 'matched') {
    return (
      <SafeAreaView style={[styles.safe, styles.matchedBg]}>
        <View style={styles.center}>
          <View style={styles.matchIcon}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.matchTitle}>MATCH FOUND!</Text>
          <Text style={styles.matchSub}>A rider is heading to the same airport</Text>

          <TouchableOpacity
            testID="open-chat-btn"
            style={styles.chatBtn}
            onPress={() => router.replace({ pathname: '/chat/[rideId]', params: { rideId: rideId! } })}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles" size={22} color="#09090B" />
            <Text style={styles.chatBtnText}>OPEN CHAT</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, styles.darkBg]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={styles.radarContainer}>
          <Animated.View style={[styles.pulse, getPulseStyle(pulse1)]} />
          <Animated.View style={[styles.pulse, getPulseStyle(pulse2)]} />
          <Animated.View style={[styles.pulse, getPulseStyle(pulse3)]} />
          <View style={styles.radarCenter}>
            <Ionicons name="airplane" size={32} color="#09090B" />
          </View>
        </View>

        <Text style={styles.searchingTitle}>
          {status === 'waiting' ? 'ON WAITING LIST' : 'SEARCHING'}
        </Text>
        <Text style={styles.searchingSubtitle}>WITHIN 15KM RADIUS</Text>
        <Text style={styles.searchingDetail}>
          {status === 'waiting'
            ? "You'll be notified with a sound when a match is found"
            : 'Looking for riders heading to the same airport...'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  darkBg: { backgroundColor: '#09090B' },
  matchedBg: { backgroundColor: '#16A34A' },
  backBtn: { padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  radarContainer: {
    width: 200, height: 200, alignItems: 'center', justifyContent: 'center',
    marginBottom: 48,
  },
  pulse: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: '#FDE047',
  },
  radarCenter: {
    width: 64, height: 64, backgroundColor: '#FDE047', borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  searchingTitle: {
    fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3,
  },
  searchingSubtitle: {
    fontSize: 12, fontWeight: '700', color: '#FDE047', letterSpacing: 4, marginTop: 8,
  },
  searchingDetail: {
    fontSize: 14, color: '#71717A', textAlign: 'center', marginTop: 16, lineHeight: 22,
  },
  matchIcon: {
    width: 80, height: 80, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  matchTitle: {
    fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2,
  },
  matchSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8,
  },
  chatBtn: {
    height: 56, backgroundColor: '#FDE047', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingHorizontal: 32, marginTop: 32, borderWidth: 2, borderColor: '#09090B',
  },
  chatBtnText: { fontSize: 15, fontWeight: '900', color: '#09090B', letterSpacing: 3 },
});
