import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Platform, TextInput, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
}

export default function Home() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const [airports, setAirports] = useState<Airport[]>([]);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [showAirportModal, setShowAirportModal] = useState(false);
  const [airportSearch, setAirportSearch] = useState('');

  const [flightDate, setFlightDate] = useState('');
  const [flightTime, setFlightTime] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAirports();
  }, []);

  const fetchAirports = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/airports`);
      setAirports(data);
    } catch {}
  };

  const getGPSLocation = async () => {
    setGpsLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setGpsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      // Reverse geocode
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geo) {
          const parts = [geo.street, geo.city, geo.region, geo.postalCode].filter(Boolean);
          setAddress(parts.join(', ') || `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
        }
      } catch {
        setAddress(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch {
      setError('Failed to get location');
    } finally {
      setGpsLoading(false);
    }
  };

  const filteredAirports = airports.filter(
    (a) =>
      a.name.toLowerCase().includes(airportSearch.toLowerCase()) ||
      a.code.toLowerCase().includes(airportSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!location) { setError('Please set your location'); return; }
    if (!selectedAirport) { setError('Please select an airport'); return; }
    if (!flightDate || !flightTime) { setError('Please enter flight date and time'); return; }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(flightDate)) { setError('Date format: YYYY-MM-DD'); return; }
    if (!timeRegex.test(flightTime)) { setError('Time format: HH:MM'); return; }

    const flightDateTime = `${flightDate}T${flightTime}:00Z`;

    setSubmitting(true);
    setError('');
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/rides`,
        {
          origin_lat: location.lat,
          origin_lng: location.lng,
          origin_address: address,
          airport_code: selectedAirport.code,
          airport_name: selectedAirport.name,
          flight_time: flightDateTime,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Navigate to payment
      router.push({ pathname: '/payment', params: { rideId: data.ride_id } });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to create ride');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.greeting}>HELLO,</Text>
          <Text style={styles.name}>{user?.name?.toUpperCase() || 'RIDER'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR LOCATION</Text>
          <TouchableOpacity
            testID="gps-location-btn"
            style={styles.locationBtn}
            onPress={getGPSLocation}
            disabled={gpsLoading}
            activeOpacity={0.7}
          >
            {gpsLoading ? (
              <ActivityIndicator color="#09090B" />
            ) : (
              <>
                <Ionicons name="locate" size={22} color="#09090B" />
                <Text style={styles.locationBtnText}>
                  {address || 'TAP TO DETECT LOCATION'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {location && (
            <Text style={styles.coordText}>
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DESTINATION AIRPORT</Text>
          <TouchableOpacity
            testID="airport-select-btn"
            style={styles.selectBtn}
            onPress={() => setShowAirportModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="airplane" size={20} color="#09090B" />
            <Text style={styles.selectBtnText}>
              {selectedAirport ? `${selectedAirport.code} — ${selectedAirport.name}` : 'SELECT AIRPORT'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#71717A" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FLIGHT DATE & TIME</Text>
          <View style={styles.dateTimeRow}>
            <TextInput
              testID="flight-date-input"
              style={[styles.input, styles.dateInput]}
              value={flightDate}
              onChangeText={setFlightDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#A1A1AA"
              maxLength={10}
            />
            <TextInput
              testID="flight-time-input"
              style={[styles.input, styles.timeInput]}
              value={flightTime}
              onChangeText={setFlightTime}
              placeholder="HH:MM"
              placeholderTextColor="#A1A1AA"
              maxLength={5}
            />
          </View>
        </View>

        {error ? <Text testID="home-error" style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          testID="find-ride-btn"
          style={[styles.mainBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#09090B" />
          ) : (
            <>
              <Text style={styles.mainBtnText}>FIND A RIDE SHARE</Text>
              <Text style={styles.mainBtnSub}>£1.99 MATCH FEE</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Non-refundable fee to access ride matching within 15km & 60min window
        </Text>
      </ScrollView>

      {/* Airport Selection Modal */}
      <Modal visible={showAirportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT AIRPORT</Text>
              <TouchableOpacity testID="close-airport-modal" onPress={() => setShowAirportModal(false)}>
                <Ionicons name="close" size={28} color="#09090B" />
              </TouchableOpacity>
            </View>
            <TextInput
              testID="airport-search-input"
              style={styles.searchInput}
              value={airportSearch}
              onChangeText={setAirportSearch}
              placeholder="Search airports..."
              placeholderTextColor="#A1A1AA"
            />
            <FlatList
              data={filteredAirports}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`airport-option-${item.code}`}
                  style={[
                    styles.airportItem,
                    selectedAirport?.code === item.code && styles.airportItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedAirport(item);
                    setShowAirportModal(false);
                    setAirportSearch('');
                  }}
                >
                  <View>
                    <Text style={styles.airportCode}>{item.code}</Text>
                    <Text style={styles.airportName}>{item.name}</Text>
                  </View>
                  <Text style={styles.airportCountry}>{item.country}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 32 },
  greeting: { fontSize: 14, fontWeight: '600', color: '#71717A', letterSpacing: 3 },
  name: { fontSize: 36, fontWeight: '900', color: '#09090B', letterSpacing: -2, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#71717A', letterSpacing: 3, marginBottom: 10 },
  locationBtn: {
    height: 56, backgroundColor: '#F4F4F5', borderWidth: 2, borderColor: '#E4E4E7',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12,
  },
  locationBtnText: { fontSize: 14, fontWeight: '600', color: '#09090B', flex: 1 },
  coordText: { fontSize: 11, color: '#71717A', marginTop: 6, letterSpacing: 1 },
  selectBtn: {
    height: 56, backgroundColor: '#F4F4F5', borderWidth: 2, borderColor: '#E4E4E7',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12,
  },
  selectBtnText: { fontSize: 14, fontWeight: '600', color: '#09090B', flex: 1 },
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  input: {
    height: 56, backgroundColor: '#F4F4F5', borderWidth: 2, borderColor: '#E4E4E7',
    paddingHorizontal: 16, fontSize: 16, color: '#09090B',
  },
  dateInput: { flex: 2 },
  timeInput: { flex: 1 },
  error: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  mainBtn: {
    height: 64, backgroundColor: '#FDE047', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#09090B', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  mainBtnText: { fontSize: 16, fontWeight: '900', color: '#09090B', letterSpacing: 3 },
  mainBtnSub: { fontSize: 11, fontWeight: '600', color: '#71717A', letterSpacing: 2, marginTop: 2 },
  disclaimer: { fontSize: 11, color: '#A1A1AA', textAlign: 'center', marginTop: 12, lineHeight: 16 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF', borderTopWidth: 2, borderColor: '#09090B',
    maxHeight: '80%', padding: 24, paddingTop: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#09090B', letterSpacing: 2 },
  searchInput: {
    height: 48, backgroundColor: '#F4F4F5', borderWidth: 2, borderColor: '#E4E4E7',
    paddingHorizontal: 16, fontSize: 15, color: '#09090B', marginBottom: 12,
  },
  airportItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#E4E4E7',
  },
  airportItemSelected: { backgroundColor: '#FDE047' },
  airportCode: { fontSize: 16, fontWeight: '900', color: '#09090B', letterSpacing: 2 },
  airportName: { fontSize: 13, color: '#71717A', marginTop: 2 },
  airportCountry: { fontSize: 12, fontWeight: '700', color: '#A1A1AA', letterSpacing: 2 },
});
