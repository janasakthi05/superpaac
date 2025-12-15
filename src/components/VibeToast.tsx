// src/components/VibeToast.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Easing,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ToastOptions = {
  type?: "success" | "error" | "info" | "neutral";
  duration?: number;
};

const { width } = Dimensions.get("window");

let globalShow: ((msg: string, opts?: ToastOptions) => void) | null = null;
export function showToast(msg: string, opts?: ToastOptions) {
  globalShow?.(msg, opts);
}

export default function VibeToast() {
  const [queue, setQueue] = useState<
    Array<{ id: number; text: string; opts?: ToastOptions }>
  >([]);
  const idRef = useRef(1);

  const animY = useRef(new Animated.Value(80)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const [current, setCurrent] = useState<null | {
    id: number;
    text: string;
    opts?: ToastOptions;
  }>(null);

  useEffect(() => {
    globalShow = (text: string, opts?: ToastOptions) => {
      const id = idRef.current++;
      setQueue((q) => [...q, { id, text, opts }]);
    };
    return () => {
      globalShow = null;
    };
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const next = queue[0];
      setQueue((q) => q.slice(1));
      setCurrent(next);

      animY.setValue(80);
      animOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(animY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.sequence([
          Animated.timing(shake, {
            toValue: 1,
            duration: 250,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
          Animated.timing(shake, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // ✅ AUTO DISMISS AFTER 3 SECONDS
      const dur = next.opts?.duration ?? 3000;
      const t = setTimeout(() => {
        hideCurrent();
      }, dur);
      return () => clearTimeout(t);
    }
  }, [queue, current]);

  function hideCurrent() {
    Animated.parallel([
      Animated.timing(animY, {
        toValue: 80,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrent(null);
    });
  }

  if (!current) return null;

  const type = current.opts?.type ?? "neutral";
  const colors = {
    success: {
      bg: "rgba(16,185,129,0.14)",
      border: "rgba(16,185,129,0.24)",
      icon: "#10B981",
    },
    error: {
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.22)",
      icon: "#EF4444",
    },
    info: {
      bg: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.22)",
      icon: "#3B82F6",
    },
    neutral: {
      bg: "rgba(148,163,184,0.10)",
      border: "rgba(148,163,184,0.16)",
      icon: "#94A3B8",
    },
  }[type];

  const shakeX = shake.interpolate({
    inputRange: [0, 1],
    outputRange: [0, type === "error" ? -6 : -2],
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          transform: [{ translateY: animY }, { translateX: shakeX }],
          opacity: animOpacity,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: colors.bg, borderColor: colors.border },
        ]}
      >
        <View style={styles.iconBox}>
          <Ionicons
            name={
              type === "success"
                ? "checkmark-circle"
                : type === "error"
                ? "alert-circle"
                : type === "info"
                ? "information-circle"
                : "ellipse"
            }
            size={22}
            color={colors.icon}
          />
        </View>

        <View style={styles.textWrap}>
          <Text numberOfLines={2} style={styles.text}>
            {current.text}
          </Text>
        </View>

        <TouchableOpacity
          onPress={hideCurrent}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 42,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  toast: {
    width: Math.min(900, width - 28),
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    backdropFilter: Platform.OS === "web" ? "blur(3px)" : undefined,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
    paddingRight: 6,
  },
  text: {
    color: "#E6EEF8",
    fontSize: 14,
    fontWeight: "600",
  },
  closeBtn: {
    marginLeft: 6,
    padding: 8,
    borderRadius: 8,
  },
});
