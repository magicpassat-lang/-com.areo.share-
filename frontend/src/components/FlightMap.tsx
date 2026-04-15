import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

// Flight routes between city coordinates (as % of screen)
const ROUTES = [
  { fx: 0.47, fy: 0.25, tx: 0.22, ty: 0.30, dur: 8000 },
  { fx: 0.49, fy: 0.28, tx: 0.62, ty: 0.36, dur: 7000 },
  { fx: 0.85, fy: 0.30, tx: 0.76, ty: 0.50, dur: 6000 },
  { fx: 0.12, fy: 0.31, tx: 0.47, ty: 0.25, dur: 9000 },
  { fx: 0.50, fy: 0.27, tx: 0.88, ty: 0.70, dur: 11000 },
  { fx: 0.49, fy: 0.24, tx: 0.85, ty: 0.30, dur: 10000 },
  { fx: 0.18, fy: 0.28, tx: 0.46, ty: 0.22, dur: 7500 },
  { fx: 0.62, fy: 0.36, tx: 0.76, ty: 0.50, dur: 5500 },
  { fx: 0.22, fy: 0.30, tx: 0.49, ty: 0.28, dur: 7000 },
  { fx: 0.88, fy: 0.70, tx: 0.12, ty: 0.31, dur: 12000 },
];

// City/airport dots
const CITIES = [
  { x: 0.47, y: 0.25, code: 'LHR' },
  { x: 0.22, y: 0.30, code: 'JFK' },
  { x: 0.12, y: 0.31, code: 'LAX' },
  { x: 0.49, y: 0.28, code: 'CDG' },
  { x: 0.50, y: 0.27, code: 'FRA' },
  { x: 0.62, y: 0.36, code: 'DXB' },
  { x: 0.76, y: 0.50, code: 'SIN' },
  { x: 0.85, y: 0.30, code: 'HND' },
  { x: 0.88, y: 0.70, code: 'SYD' },
  { x: 0.49, y: 0.24, code: 'AMS' },
  { x: 0.18, y: 0.28, code: 'ORD' },
  { x: 0.46, y: 0.22, code: 'EDI' },
];

function FlyingPlane({ route, delay }: { route: typeof ROUTES[0]; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: route.dur, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    ).start();
  }, []);

  const x1 = route.fx * SW;
  const y1 = route.fy * SH;
  const x2 = route.tx * SW;
  const y2 = route.ty * SH;
  const midY = Math.min(y1, y2) - 25; // arc upward

  return (
    <Animated.View
      style={[
        styles.plane,
        {
          opacity: anim.interpolate({ inputRange: [0, 0.03, 0.9, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            {
              translateX: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [x1, x2],
              }),
            },
            {
              translateY: anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [y1, midY, y2],
              }),
            },
          ],
        },
      ]}
    />
  );
}

function PulsingCity({ city }: { city: typeof CITIES[0] }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.cityWrap, { left: city.x * SW - 12, top: city.y * SH - 12 }]}>  
      <Animated.View
        style={[
          styles.cityRing,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }],
          },
        ]}
      />
      <View style={styles.cityDot} />
      <Text style={styles.cityLabel}>{city.code}</Text>
    </View>
  );
}

export default function FlightMap() {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Subtle grid lines */}
      {[0.2, 0.35, 0.5, 0.65, 0.8].map((y, i) => (
        <View key={`h${i}`} style={[styles.gridH, { top: y * SH }]} />
      ))}
      {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((x, i) => (
        <View key={`v${i}`} style={[styles.gridV, { left: x * SW }]} />
      ))}

      {/* City dots */}
      {CITIES.map((c, i) => (
        <PulsingCity key={i} city={c} />
      ))}

      {/* Flying planes */}
      {ROUTES.map((r, i) => (
        <FlyingPlane key={i} route={r} delay={i * 1500} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(253, 224, 71, 0.06)',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(253, 224, 71, 0.06)',
  },
  cityWrap: {
    position: 'absolute',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.5)',
  },
  cityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(253, 224, 71, 0.7)',
  },
  cityLabel: {
    position: 'absolute',
    top: 18,
    fontSize: 7,
    fontWeight: '700',
    color: 'rgba(253, 224, 71, 0.35)',
    letterSpacing: 1,
  },
  plane: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FDE047',
    shadowColor: '#FDE047',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
});
