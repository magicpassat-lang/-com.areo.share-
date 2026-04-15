import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import axios from 'axios';
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function Payment() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!rideId) return;
    setLoading(true);
    setError('');
    try {
      const originUrl = BACKEND_URL || (Platform.OS === 'web' ? window.location.origin : '');
      const { data } = await axios.post(
        `${BACKEND_URL}/api/payments/create-checkout`,
        { ride_id: rideId, origin_url: originUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.checkout_url) {
        if (Platform.OS === 'web') {
          window.location.href = data.checkout_url;
        } else {
          const result = await WebBrowser.openBrowserAsync(data.checkout_url);
          // After browser closes, navigate to matching
          if (result.type === 'cancel' || result.type === 'dismiss') {
            // User might have paid, check status
            try {
              const statusRes = await axios.get(
                `${BACKEND_URL}/api/payments/status/${data.session_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (statusRes.data.payment_status === 'paid') {
                router.replace({ pathname: '/matching', params: { rideId } });
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Payment failed to initialize');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity
          testID="payment-back-btn"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#09090B" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.priceBlock}>
            <Text style={styles.currency}>£</Text>
            <Text style={styles.price}>1.99</Text>
          </View>
          <Text style={styles.label}>NON-REFUNDABLE MATCH FEE</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              <Text style={styles.infoText}>Access ride matching within 15km radius</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              <Text style={styles.infoText}>60-minute flight time window</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              <Text style={styles.infoText}>Group chat with matched riders</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              <Text style={styles.infoText}>Waiting list with instant notifications</Text>
            </View>
          </View>

          <View style={styles.secureRow}>
            <Ionicons name="lock-closed" size={16} color="#71717A" />
            <Text style={styles.secureText}>SECURED BY STRIPE</Text>
          </View>
        </View>

        {error ? <Text testID="payment-error" style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          testID="pay-now-btn"
          style={[styles.payBtn, loading && styles.btnDisabled]}
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#09090B" />
          ) : (
            <Text style={styles.payBtnText}>PAY £1.99 & FIND MATCHES</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, padding: 24 },
  backBtn: { marginBottom: 16 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  priceBlock: { flexDirection: 'row', alignItems: 'flex-start' },
  currency: { fontSize: 32, fontWeight: '900', color: '#09090B', marginTop: 8 },
  price: { fontSize: 80, fontWeight: '900', color: '#09090B', letterSpacing: -4 },
  label: { fontSize: 12, fontWeight: '700', color: '#71717A', letterSpacing: 3, marginTop: 8 },
  infoCard: {
    width: '100%', backgroundColor: '#F4F4F5', borderWidth: 2, borderColor: '#E4E4E7',
    padding: 20, marginTop: 32, gap: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 14, color: '#09090B', flex: 1 },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  secureText: { fontSize: 11, fontWeight: '700', color: '#71717A', letterSpacing: 3 },
  error: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  payBtn: {
    height: 64, backgroundColor: '#FDE047', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#09090B',
  },
  btnDisabled: { opacity: 0.6 },
  payBtnText: { fontSize: 15, fontWeight: '900', color: '#09090B', letterSpacing: 2 },
});
