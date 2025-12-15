// src/components/AnimatedBackground.tsx
import React, { useEffect, useRef } from "react";
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
  delay: number;
  duration: number;
  opacity: number;
  colorIndex: number;
  startScale: number;
};

const NUM_BUBBLES = 12;

const COLORS = [
  "rgba(255,200,87,0.18)",
  "rgba(125,211,252,0.12)",
  "rgba(168,85,247,0.10)",
  "rgba(99,102,241,0.10)",
  "rgba(6,182,212,0.08)",
];

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createBubbles(count: number): Bubble[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `b-${i}`,
    size: random(48, 160),
    left: random(-40, width - 40),
    delay: random(0, 4500),
    duration: random(9000, 20000),
    opacity: random(0.04, 0.22),
    colorIndex: Math.floor(random(0, COLORS.length)),
    startScale: random(0.75, 1.05),
  }));
}

export default function AnimatedBackground({ style }: { style?: any }) {
  const bubbles = createBubbles(NUM_BUBBLES);

  const animsRef = useRef(
    bubbles.reduce((acc, b) => {
      acc[b.id] = {
        translateY: new Animated.Value(random(height * 0.25, height * 0.9)),
        translateX: new Animated.Value(b.left),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(b.startScale),
        rotate: new Animated.Value(random(0, 360)),
      };
      return acc;
    }, {} as Record<string, any>)
  ).current;

  const ribbonRot = useRef(new Animated.Value(0)).current;
  const vignetteOpacity = 0.18;

  useEffect(() => {
    bubbles.forEach((b) => {
      const ref = animsRef[b.id];

      const floatUp = Animated.timing(ref.translateY, {
        toValue: -Math.max(220, b.size),
        duration: b.duration * 1.2,
        delay: b.delay,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: useDriver,
      });

      const resetY = Animated.timing(ref.translateY, {
        toValue: height * 0.6,
        duration: 0,
        useNativeDriver: useDriver,
      });

      const moveX = Animated.loop(
        Animated.sequence([
          Animated.timing(ref.translateX, {
            toValue: b.left + random(-50, 50),
            duration: b.duration * 0.6,
            delay: b.delay * 0.5,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.translateX, {
            toValue: b.left + random(-50, 50),
            duration: b.duration * 0.6,
            useNativeDriver: useDriver,
          }),
        ])
      );

      const breathe = Animated.loop(
        Animated.sequence([
          Animated.timing(ref.scale, {
            toValue: b.startScale * 1.22,
            duration: b.duration * 0.45,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.scale, {
            toValue: b.startScale,
            duration: b.duration * 0.55,
            useNativeDriver: useDriver,
          }),
        ])
      );

      const fade = Animated.loop(
        Animated.sequence([
          Animated.timing(ref.opacity, {
            toValue: Math.min(0.35, b.opacity * 2.2),
            duration: b.duration * 0.45,
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.opacity, {
            toValue: Math.max(0.02, b.opacity * 0.2),
            duration: b.duration * 0.55,
            useNativeDriver: useDriver,
          }),
        ])
      );

      const rotateLoop = Animated.loop(
        Animated.timing(ref.rotate, {
          toValue: 360,
          duration: b.duration * 2.5,
          easing: Easing.linear,
          useNativeDriver: useDriver,
        })
      );

      moveX.start();
      breathe.start();
      fade.start();
      rotateLoop.start();

      const sequence = Animated.loop(Animated.sequence([floatUp, resetY]));
      sequence.start();
    });

    Animated.loop(
      Animated.timing(ribbonRot, {
        toValue: 1,
        duration: 32000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  const ribbonRotate = ribbonRot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <LinearGradient colors={["rgba(10,18,28,0.8)", "rgba(4,10,18,0.9)"]} style={StyleSheet.absoluteFill} />

      {bubbles.map((b) => {
        const anim = animsRef[b.id];
        const rotate = anim.rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
        });

        const color = COLORS[b.colorIndex % COLORS.length];

        return (
          <Animated.View
            key={b.id}
            style={[
              styles.blob,
              {
                width: b.size,
                height: b.size,
                borderRadius: b.size / 2,
                left: 0,
                backgroundColor: color,
                opacity: anim.opacity,
                transform: [{ translateY: anim.translateY }, { translateX: anim.translateX }, { scale: anim.scale }, { rotate }],
              },
            ]}
          />
        );
      })}

      <Animated.View pointerEvents="none" style={[styles.ribbon, { transform: [{ rotate: ribbonRotate }, { translateY: height * 0.05 }] }]}>
        <LinearGradient colors={["rgba(255,200,87,0.08)", "rgba(168,85,247,0.06)", "rgba(125,211,252,0.06)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      <View style={[styles.vignette, { opacity: vignetteOpacity }]} />
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
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    top: height * 0.4,
  },
  ribbon: {
    position: "absolute",
    left: -width * 0.35,
    width: width * 1.7,
    height: height * 0.24,
    opacity: 0.7,
    borderRadius: 1000,
    top: height * 0.12,
  },
  glowTopLeft: {
    position: "absolute",
    left: -width * 0.12,
    top: -height * 0.06,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  glowBottomRight: {
    position: "absolute",
    right: -width * 0.12,
    bottom: -height * 0.06,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: "rgba(255,200,87,0.06)",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
});
