import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function PaymentSuccess() {
  const { session_id, ride_id } = useLocalSearchParams<{ session_id: string; ride_id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (session_id) {
      pollPaymentStatus();
    }
  }, [session_id]);

  const pollPaymentStatus = async () => {
    if (attempts >= 10) {
      setStatus('timeout');
      return;
    }
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/payments/status/${session_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.payment_status === 'paid') {
        setStatus('paid');
        // Navigate to matching after short delay
        setTimeout(() => {
          router.replace({ pathname: '/matching', params: { rideId: data.ride_id || ride_id } });
        }, 1500);
      } else if (data.payment_status === 'expired') {
        setStatus('expired');
      } else {
        setAttempts((a) => a + 1);
        setTimeout(pollPaymentStatus, 2000);
      }
    } catch {
      setAttempts((a) => a + 1);
      setTimeout(pollPaymentStatus, 2000);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        {status === 'checking' && (
          <>
            <ActivityIndicator size="large" color="#09090B" />
            <Text style={styles.title}>VERIFYING PAYMENT</Text>
            <Text style={styles.sub}>Please wait...</Text>
          </>
        )}
        {status === 'paid' && (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>PAYMENT CONFIRMED</Text>
            <Text style={styles.sub}>Redirecting to ride matching...</Text>
          </>
        )}
        {status === 'expired' && (
          <>
            <Ionicons name="close-circle" size={64} color="#DC2626" />
            <Text style={styles.title}>PAYMENT EXPIRED</Text>
            <Text style={styles.sub}>Please try again</Text>
          </>
        )}
        {status === 'timeout' && (
          <>
            <Ionicons name="time-outline" size={64} color="#F59E0B" />
            <Text style={styles.title}>VERIFICATION TIMEOUT</Text>
            <Text style={styles.sub}>Check My Rides for status</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  successIcon: {
    width: 80, height: 80, backgroundColor: '#16A34A',
    borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#09090B', letterSpacing: 2, marginTop: 16 },
  sub: { fontSize: 14, color: '#71717A', marginTop: 8 },
});
