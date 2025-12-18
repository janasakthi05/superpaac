// src/components/AnimatedBackground.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const useDriver = Platform.OS !== "web";

type Bubble = {
  id: string;
  size: number;
  left: number;
  duration: number;
  opacity: number;
  colorIndex: number;
  startScale: number;
};

const NUM_BUBBLES = 12;

const COLORS = [
  "rgba(255,200,87,0.18)",
  "rgba(125,211,252,0.14)",
  "rgba(168,85,247,0.12)",
  "rgba(99,102,241,0.14)",
  "rgba(6,182,212,0.12)",
];

const random = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export default function AnimatedBackground({ style }: { style?: any }) {
  /** 🔒 Stable bubbles (never recreated) */
  const bubbles = useMemo<Bubble[]>(
    () =>
      Array.from({ length: NUM_BUBBLES }).map((_, i) => ({
        id: `b-${i}`,
        size: random(60, 160),
        left: random(-30, width - 30),
        duration: random(14000, 24000),
        opacity: random(0.18, 0.28),
        colorIndex: Math.floor(random(0, COLORS.length)),
        startScale: random(0.9, 1.1),
      })),
    []
  );

  const animsRef = useRef(
    bubbles.reduce((acc, b) => {
      acc[b.id] = {
        translateY: new Animated.Value(random(height * 0.15, height * 0.9)),
        translateX: new Animated.Value(b.left),
        opacity: new Animated.Value(b.opacity),
        scale: new Animated.Value(b.startScale),
        rotate: new Animated.Value(random(0, 360)),
      };
      return acc;
    }, {} as Record<string, any>)
  ).current;

  const ribbonRot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    bubbles.forEach((b) => {
      const ref = animsRef[b.id];

      /** 🌊 Vertical float (continuous loop, no dead reset) */
      Animated.loop(
        Animated.sequence([
          Animated.timing(ref.translateY, {
            toValue: -b.size,
            duration: b.duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.translateY, {
            toValue: height + b.size,
            duration: 0,
            useNativeDriver: useDriver,
          }),
        ])
      ).start();

      /** ↔ Horizontal drift */
      Animated.loop(
        Animated.sequence([
          Animated.timing(ref.translateX, {
            toValue: b.left + random(-60, 60),
            duration: b.duration * 0.5,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.translateX, {
            toValue: b.left,
            duration: b.duration * 0.5,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: useDriver,
          }),
        ])
      ).start();

      /** 🫁 Breathing scale */
      Animated.loop(
        Animated.sequence([
          Animated.timing(ref.scale, {
            toValue: b.startScale * 1.25,
            duration: b.duration * 0.4,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.scale, {
            toValue: b.startScale,
            duration: b.duration * 0.6,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: useDriver,
          }),
        ])
      ).start();

      /** ✨ Opacity pulse (never invisible) */
      Animated.loop(
        Animated.sequence([
          Animated.timing(ref.opacity, {
            toValue: Math.min(0.4, b.opacity * 1.6),
            duration: b.duration * 0.45,
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.opacity, {
            toValue: b.opacity,
            duration: b.duration * 0.55,
            useNativeDriver: useDriver,
          }),
        ])
      ).start();

      /** 🔄 Rotation */
      Animated.loop(
        Animated.timing(ref.rotate, {
          toValue: 360,
          duration: b.duration * 2.5,
          easing: Easing.linear,
          useNativeDriver: useDriver,
        })
      ).start();
    });

    /** 🎀 Ribbon rotation */
    Animated.loop(
      Animated.timing(ribbonRot, {
        toValue: 1,
        duration: 32000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const ribbonRotate = ribbonRot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <LinearGradient
        colors={["rgba(10,18,28,0.85)", "rgba(4,10,18,0.95)"]}
        style={StyleSheet.absoluteFill}
      />

      {bubbles.map((b) => {
        const anim = animsRef[b.id];
        const rotate = anim.rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
        });

        return (
          <Animated.View
            key={b.id}
            style={[
              styles.blob,
              {
                width: b.size,
                height: b.size,
                borderRadius: b.size / 2,
                backgroundColor: COLORS[b.colorIndex],
                opacity: anim.opacity,
                transform: [
                  { translateY: anim.translateY },
                  { translateX: anim.translateX },
                  { scale: anim.scale },
                  { rotate },
                ],
              },
            ]}
          />
        );
      })}

      <Animated.View
        style={[
          styles.ribbon,
          { transform: [{ rotate: ribbonRotate }, { translateY: height * 0.05 }] },
        ]}
      >
        <LinearGradient
          colors={[
            "rgba(255,200,87,0.10)",
            "rgba(168,85,247,0.08)",
            "rgba(125,211,252,0.08)",
          ]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />
      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  ribbon: {
    position: "absolute",
    left: -width * 0.35,
    width: width * 1.7,
    height: height * 0.24,
    borderRadius: 1000,
    top: height * 0.12,
    opacity: 0.75,
  },
  glowTopLeft: {
    position: "absolute",
    left: -width * 0.12,
    top: -height * 0.06,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: "rgba(99,102,241,0.10)",
  },
  glowBottomRight: {
    position: "absolute",
    right: -width * 0.12,
    bottom: -height * 0.06,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: "rgba(255,200,87,0.08)",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
    opacity: 0.22,
  },
});
