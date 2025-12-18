import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

type SparkProps = {
  delay: number;
  size: number;
  left: number;
};

function Spark({ delay, size, left }: SparkProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      // 🔁 RESET VALUES (THIS IS THE KEY)
      translateY.setValue(0);
      translateX.setValue(0);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -34, // 🔥 float upward from top
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: Math.random() > 0.5 ? 6 : -6,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // ♾️ RESTART FOREVER
        run();
      });
    };

    run();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.spark,
        {
          width: size,
          height: size,
          left,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
}

export default function FireSparks() {
  return (
    <View style={styles.container} pointerEvents="none">
      <Spark delay={0} size={4} left={18} />
      <Spark delay={500} size={3} left={34} />
      <Spark delay={900} size={5} left={52} />
      <Spark delay={1300} size={3} left={28} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  spark: {
    position: "absolute",
    top: 6, // 🔥 emit from TOP
    borderRadius: 99,
    backgroundColor: "rgba(255,200,120,0.95)",
    shadowColor: "#FFD166",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
