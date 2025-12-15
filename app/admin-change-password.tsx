// app/admin-change-password.tsx
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  TextInput as RNTextInput,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../src/firebase";

import AnimatedBackground from "../src/components/AnimatedBackground";
import { showToast } from "../src/components/VibeToast";

const FALLBACK_ADMIN_PASSWORD = "SuperPaac@2025";

export default function AdminChangePasswordScreen() {
  const router = useRouter();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const curRef = useRef<RNTextInput | null>(null);
  const nextRef = useRef<RNTextInput | null>(null);
  const confirmRef = useRef<RNTextInput | null>(null);

  const curAnim = useRef(new Animated.Value(current ? 1 : 0)).current;
  const nextAnim = useRef(new Animated.Value(next ? 1 : 0)).current;
  const confirmAnim = useRef(new Animated.Value(confirm ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(curAnim, { toValue: current ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [current]);
  useEffect(() => {
    Animated.timing(nextAnim, { toValue: next ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [next]);
  useEffect(() => {
    Animated.timing(confirmAnim, { toValue: confirm ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [confirm]);

  const focusScale = useRef(new Animated.Value(1)).current;
  function setCardFocus(focused: boolean) {
    Animated.timing(focusScale, { toValue: focused ? 1.01 : 1, duration: 140, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
  }

  const handleChangePassword = async () => {
    const curTrim = current.trim();
    const nextTrim = next.trim();
    const confirmTrim = confirm.trim();

    if (!curTrim || !nextTrim || !confirmTrim) {
      showToast("Fill all fields", { type: "info" });
      return;
    }

    if (nextTrim !== confirmTrim) {
      showToast("New passwords do not match", { type: "error" });
      return;
    }

    if (nextTrim.length < 8) {
      showToast("New password should be at least 8 characters.", { type: "info" });
      return;
    }

    try {
      setLoading(true);

      const adminRef = doc(db, "appConfig", "adminAuth");
      const snap = await getDoc(adminRef);

      let savedPasswordRaw = snap.exists() ? (snap.data() as any).password ?? "" : FALLBACK_ADMIN_PASSWORD;

      const savedPassword = String(savedPasswordRaw).trim();

      if (curTrim !== savedPassword) {
        showToast("Current password is wrong", { type: "error" });
        return;
      }

      await setDoc(adminRef, { password: nextTrim }, { merge: true });

      showToast("Admin password updated.", { type: "success" });
      router.replace("/login");
    } catch (e) {
      console.log("Change password error:", e);
      showToast("Could not update password. Try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#041025", "#07102A", "#081226"]} style={StyleSheet.absoluteFill} />
      <AnimatedBackground />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Animated.View style={[styles.cardContainer, { transform: [{ scale: focusScale }] }]}>
            <Text style={styles.title}>Admin password</Text>
            <Text style={styles.subtitle}>Change the SuperPaac admin login password.</Text>

            <View style={styles.inputWrapper}>
              <Animated.Text style={[styles.floatingLabel, { transform: [{ translateY: curAnim.interpolate({ inputRange: [0, 1], outputRange: [12, -10] }) }, { scale: curAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }], opacity: curAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }]}>
                Current password
              </Animated.Text>

              <TextInput ref={curRef} style={styles.input} placeholder="" placeholderTextColor="#94A3B8" secureTextEntry value={current} onChangeText={setCurrent} onFocus={() => setCardFocus(true)} onBlur={() => setCardFocus(false)} returnKeyType="next" onSubmitEditing={() => nextRef.current?.focus()} />
            </View>

            <View style={styles.inputWrapper}>
              <Animated.Text style={[styles.floatingLabel, { transform: [{ translateY: nextAnim.interpolate({ inputRange: [0, 1], outputRange: [12, -10] }) }, { scale: nextAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }], opacity: nextAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }]}>
                New password
              </Animated.Text>

              <TextInput ref={nextRef} style={styles.input} placeholder="" placeholderTextColor="#94A3B8" secureTextEntry value={next} onChangeText={setNext} onFocus={() => setCardFocus(true)} onBlur={() => setCardFocus(false)} returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} />
            </View>

            <View style={styles.inputWrapper}>
              <Animated.Text style={[styles.floatingLabel, { transform: [{ translateY: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [12, -10] }) }, { scale: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }], opacity: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }]}>
                Confirm new password
              </Animated.Text>

              <TextInput ref={confirmRef} style={styles.input} placeholder="" placeholderTextColor="#94A3B8" secureTextEntry value={confirm} onChangeText={setConfirm} onFocus={() => setCardFocus(true)} onBlur={() => setCardFocus(false)} returnKeyType="done" onSubmitEditing={handleChangePassword} />
            </View>

            <Pressable onPress={handleChangePassword} disabled={loading} style={({ pressed }) => [styles.ctaWrap, pressed && { opacity: 0.9 }, loading && { opacity: 0.6 }]}>
              <LinearGradient colors={["#FFE3A8", "#FFC857"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>{loading ? "Saving..." : "Update password"}</Text>
              </LinearGradient>
            </Pressable>

            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 10 }}>
              <Text style={styles.backLink}>← Back to login</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, alignItems: "center" },
  cardContainer: { width: "100%", maxWidth: 560, backgroundColor: "rgba(12,18,32,0.72)", borderRadius: 16, padding: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)", shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
  title: { fontSize: 22, fontWeight: "800", color: "#F9FAFB", marginBottom: 4 },
  subtitle: { color: "#9CA3AF", marginBottom: 12 },
  inputWrapper: { marginBottom: 12, position: "relative" },
  floatingLabel: { position: "absolute", left: 14, top: 12, color: "#C7D2DA", fontSize: 13, zIndex: 10 },
  input: { backgroundColor: "rgba(2,6,23,0.86)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, color: "#F9FAFB", borderWidth: 1, borderColor: "rgba(255,255,255,0.03)", fontSize: 15 },
  ctaWrap: { marginTop: 8, borderRadius: 999, overflow: "hidden" },
  cta: { paddingVertical: 14, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  ctaText: { fontWeight: "800", fontSize: 16, color: "#111827" },
  backLink: { color: "#BEDBFF", fontSize: 13, textAlign: "center", marginTop: 8 },
});
