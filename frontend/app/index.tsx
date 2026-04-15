import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/auth/login');
    }
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>AERO</Text>
      <Text style={styles.logoAccent}>SHARE</Text>
      <ActivityIndicator size="large" color="#09090B" style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#09090B',
    letterSpacing: -2,
  },
  logoAccent: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: -2,
    marginTop: -12,
  },
});
