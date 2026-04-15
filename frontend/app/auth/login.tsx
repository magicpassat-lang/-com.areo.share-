import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import FlightMap from '../../src/components/FlightMap';
import { useAudioPlayer } from 'expo-audio';

// Ambient background music URL (royalty-free looping pad)
const AMBIENT_URL = 'https://cdn.pixabay.com/audio/2024/11/26/audio_d60e4ac1f3.mp3';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Background music
  const player = useAudioPlayer(AMBIENT_URL);

  useEffect(() => {
    if (player && !musicStarted) {
      try {
        player.volume = 0.15;
        player.loop = true;
        player.play();
        setMusicStarted(true);
      } catch {}
    }
    return () => {
      if (player) {
        try { player.pause(); } catch {}
      }
    };
  }, [player]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (player) { try { player.pause(); } catch {} }
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.darkBg}>
      {/* Animated flight map background */}
      <FlightMap />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.logo}>AERO</Text>
              <Text style={styles.logoAccent}>SHARE</Text>
              <Text style={styles.subtitle}>SPLIT YOUR AIRPORT RIDE</Text>

              {/* Music indicator */}
              <TouchableOpacity
                testID="music-toggle-btn"
                style={styles.musicBtn}
                onPress={() => {
                  if (player) {
                    try {
                      if (musicStarted) {
                        player.pause();
                        setMusicStarted(false);
                      } else {
                        player.play();
                        setMusicStarted(true);
                      }
                    } catch {}
                  }
                }}
              >
                <Ionicons
                  name={musicStarted ? 'volume-high' : 'volume-mute'}
                  size={18}
                  color="#FDE047"
                />
                <Text style={styles.musicLabel}>
                  {musicStarted ? 'AMBIENT ON' : 'SOUND OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                testID="login-email-input"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor="#52525B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  testID="login-password-input"
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#52525B"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  testID="toggle-password-btn"
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#71717A" />
                </TouchableOpacity>
              </View>

              {error ? <Text testID="login-error" style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                testID="login-submit-btn"
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#09090B" />
                ) : (
                  <Text style={styles.btnText}>SIGN IN</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                testID="go-to-register-btn"
                style={styles.linkBtn}
                onPress={() => router.push('/auth/register')}
              >
                <Text style={styles.linkText}>
                  NEW HERE? <Text style={styles.linkBold}>CREATE ACCOUNT</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stats banner */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>17</Text>
                <Text style={styles.statLabel}>AIRPORTS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>15km</Text>
                <Text style={styles.statLabel}>RADIUS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>£1.99</Text>
                <Text style={styles.statLabel}>MATCH FEE</Text>
              </View>
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
  logo: { fontSize: 56, fontWeight: '900', color: '#FFFFFF', letterSpacing: -3 },
  logoAccent: { fontSize: 56, fontWeight: '900', color: '#FDE047', letterSpacing: -3, marginTop: -18 },
  subtitle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 5, marginTop: 14 },
  musicBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(253, 224, 71, 0.1)', borderRadius: 20,
  },
  musicLabel: { fontSize: 9, fontWeight: '700', color: '#FDE047', letterSpacing: 2 },
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
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 32, gap: 0,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 18, fontWeight: '900', color: '#FDE047' },
  statLabel: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
});
