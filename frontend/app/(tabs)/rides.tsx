import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Ride {
  id: string;
  origin_address: string;
  airport_code: string;
  airport_name: string;
  flight_time: string;
  status: string;
  payment_status: string;
  matched_ride_id: string | null;
  created_at: string;
}

export default function Rides() {
  const { token } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRides = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/rides/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRides(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchRides();
    }, [token])
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'matched': return { bg: '#16A34A', text: '#FFFFFF' };
      case 'waiting': return { bg: '#FDE047', text: '#09090B' };
      case 'searching': return { bg: '#F4F4F5', text: '#09090B' };
      case 'pending_payment': return { bg: '#F59E0B', text: '#09090B' };
      default: return { bg: '#E4E4E7', text: '#71717A' };
    }
  };

  const handleRidePress = (ride: Ride) => {
    if (ride.status === 'pending_payment') {
      router.push({ pathname: '/payment', params: { rideId: ride.id } });
    } else if (ride.status === 'matched') {
      router.push({ pathname: '/chat/[rideId]', params: { rideId: ride.id } });
    } else if (ride.status === 'searching' || ride.status === 'waiting') {
      router.push({ pathname: '/matching', params: { rideId: ride.id } });
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const renderRide = ({ item }: { item: Ride }) => {
    const statusStyle = getStatusStyle(item.status);
    return (
      <TouchableOpacity
        testID={`ride-item-${item.id}`}
        style={styles.rideCard}
        onPress={() => handleRidePress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.rideHeader}>
          <View style={styles.airportBadge}>
            <Text style={styles.airportBadgeText}>{item.airport_code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.rideAirport}>{item.airport_name}</Text>
        <Text style={styles.rideOrigin} numberOfLines={1}>{item.origin_address}</Text>
        <View style={styles.rideFooter}>
          <Text style={styles.rideDate}>{formatDate(item.flight_time)}</Text>
          <Text style={styles.rideTime}>{formatTime(item.flight_time)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#09090B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>MY RIDES</Text>
        <Text style={styles.count}>{rides.length}</Text>
      </View>

      {rides.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={64} color="#E4E4E7" />
          <Text style={styles.emptyTitle}>NO RIDES YET</Text>
          <Text style={styles.emptyText}>Book your first airport ride share</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={renderRide}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRides(); }} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#09090B', letterSpacing: -1 },
  count: {
    fontSize: 14, fontWeight: '800', color: '#09090B', backgroundColor: '#FDE047',
    paddingHorizontal: 12, paddingVertical: 4, letterSpacing: 1,
  },
  list: { padding: 24, paddingTop: 0, gap: 16 },
  rideCard: {
    backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#09090B',
    padding: 16, marginBottom: 12,
  },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  airportBadge: {
    backgroundColor: '#09090B', paddingHorizontal: 10, paddingVertical: 4,
  },
  airportBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  rideAirport: { fontSize: 16, fontWeight: '800', color: '#09090B', marginBottom: 4 },
  rideOrigin: { fontSize: 13, color: '#71717A', marginBottom: 8 },
  rideFooter: { flexDirection: 'row', gap: 16 },
  rideDate: { fontSize: 12, fontWeight: '600', color: '#71717A', letterSpacing: 1 },
  rideTime: { fontSize: 12, fontWeight: '700', color: '#09090B', letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#A1A1AA', letterSpacing: 3 },
  emptyText: { fontSize: 14, color: '#A1A1AA' },
});
