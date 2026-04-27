import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import * as WebBrowser from 'expo-web-browser';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.name}>{user?.name?.toUpperCase() || 'USER'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ACCOUNT</Text>
          <View style={styles.cardRow}>
            <Ionicons name="mail-outline" size={20} color="#71717A" />
            <Text style={styles.cardText}>{user?.email}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#71717A" />
            <Text style={styles.cardText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ABOUT AEROSHARE</Text>
          <Text style={styles.aboutText}>
            Share airport taxi rides with fellow travelers. Save money and reduce emissions by splitting rides to the airport.
          </Text>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>15km</Text>
              <Text style={styles.statLabel}>MATCH RADIUS</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>60min</Text>
              <Text style={styles.statLabel}>TIME WINDOW</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>£1.99</Text>
              <Text style={styles.statLabel}>MATCH FEE</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          testID="privacy-policy-btn"
          style={styles.privacyBtn}
          onPress={() => WebBrowser.openBrowserAsync(`${BACKEND_URL}/api/privacy`)}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={20} color="#71717A" />
          <Text style={styles.privacyText}>PRIVACY POLICY</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="delete-account-btn"
          style={styles.deleteBtn}
          onPress={() => WebBrowser.openBrowserAsync(`${BACKEND_URL}/api/delete-account`)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
          <Text style={styles.deleteText}>DELETE ACCOUNT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="logout-btn"
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80, height: 80, backgroundColor: '#09090B', alignItems: 'center',
    justifyContent: 'center', marginBottom: 16,
  },
  name: { fontSize: 24, fontWeight: '900', color: '#09090B', letterSpacing: -1 },
  email: { fontSize: 14, color: '#71717A', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#09090B',
    padding: 20, marginBottom: 16,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#71717A', letterSpacing: 3, marginBottom: 16 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E4E4E7',
  },
  cardText: { fontSize: 14, fontWeight: '600', color: '#09090B' },
  aboutText: { fontSize: 14, color: '#71717A', lineHeight: 22, marginBottom: 16 },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1, backgroundColor: '#F4F4F5', padding: 12, alignItems: 'center',
  },
  statNum: { fontSize: 18, fontWeight: '900', color: '#09090B' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#71717A', letterSpacing: 2, marginTop: 4 },
  deleteBtn: {
    height: 56, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#DC2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  deleteText: { fontSize: 14, fontWeight: '800', color: '#DC2626', letterSpacing: 3 },
  privacyBtn: {
    height: 56, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E4E4E7',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  privacyText: { fontSize: 14, fontWeight: '800', color: '#71717A', letterSpacing: 3 },
  logoutBtn: {
    height: 56, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#DC2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8,
  },
  logoutText: { fontSize: 14, fontWeight: '800', color: '#DC2626', letterSpacing: 3 },
});
