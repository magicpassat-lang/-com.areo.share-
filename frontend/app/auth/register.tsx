import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import FlightMap from '../../src/components/FlightMap';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.darkBg}>
      <FlightMap />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.logo}>AERO</Text>
              <Text style={styles.logoAccent}>SHARE</Text>
              <Text style={styles.subtitle}>JOIN THE RIDE</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                testID="register-name-input"
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor="#52525B"
              />

              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                testID="register-email-input"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor="#52525B"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  testID="register-password-input"
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#52525B"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#71717A" />
                </TouchableOpacity>
              </View>

              {error ? <Text testID="register-error" style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                testID="register-submit-btn"
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#09090B" />
                ) : (
                  <Text style={styles.btnText}>CREATE ACCOUNT</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                testID="go-to-login-btn"
                style={styles.linkBtn}
                onPress={() => router.back()}
              >
                <Text style={styles.linkText}>
                  HAVE AN ACCOUNT? <Text style={styles.linkBold}>SIGN IN</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  darkBg: { flex: 1, backgroundColor: '#09090B' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', letterSpacing: -3 },
  logoAccent: { fontSize: 52, fontWeight: '900', color: '#FDE047', letterSpacing: -3, marginTop: -16 },
  subtitle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 5, marginTop: 14 },
  formCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.85)', borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.15)', padding: 24,
  },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginBottom: 8, marginTop: 16 },
  input: {
    height: 56, backgroundColor: 'rgba(39, 39, 42, 0.8)', borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.3)', paddingHorizontal: 16,
    fontSize: 16, color: '#FFFFFF',
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeBtn: { position: 'absolute', right: 16, top: 17 },
  error: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginTop: 12 },
  btn: {
    height: 56, backgroundColor: '#FDE047', alignItems: 'center', justifyContent: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#09090B', fontSize: 15, fontWeight: '900', letterSpacing: 3 },
  linkBtn: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
  linkBold: { color: '#FDE047', fontWeight: '800' },
});
