import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentCancel() {
  const { ride_id } = useLocalSearchParams<{ ride_id: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Ionicons name="close-circle-outline" size={80} color="#DC2626" />
        <Text style={styles.title}>PAYMENT CANCELLED</Text>
        <Text style={styles.sub}>No charge was made. You can try again anytime.</Text>

        <TouchableOpacity
          testID="retry-payment-btn"
          style={styles.retryBtn}
          onPress={() => {
            if (ride_id) {
              router.replace({ pathname: '/payment', params: { rideId: ride_id } });
            } else {
              router.replace('/(tabs)/home');
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.retryBtnText}>TRY AGAIN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="cancel-go-home-btn"
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text style={styles.homeBtnText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '900', color: '#09090B', letterSpacing: 2, marginTop: 24 },
  sub: { fontSize: 14, color: '#71717A', marginTop: 8, textAlign: 'center' },
  retryBtn: {
    height: 56, backgroundColor: '#09090B', alignItems: 'center', justifyContent: 'center',
    width: '100%', marginTop: 32,
  },
  retryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 3 },
  homeBtn: {
    height: 56, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    width: '100%', marginTop: 12, borderWidth: 2, borderColor: '#E4E4E7',
  },
  homeBtnText: { fontSize: 15, fontWeight: '800', color: '#71717A', letterSpacing: 3 },
});
