// app/student-change-password.tsx
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

function getDefaultStudentPassword(rollUpper: string): string {
  const dept = rollUpper.slice(2, 5);
  const num = rollUpper.slice(5);
  return (dept + num).toLowerCase();
}

export default function StudentChangePasswordScreen() {
  const router = useRouter();

  const [roll, setRoll] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const rollRef = useRef<RNTextInput | null>(null);
  const curRef = useRef<RNTextInput | null>(null);
  const nextRef = useRef<RNTextInput | null>(null);
  const confirmRef = useRef<RNTextInput | null>(null);

  const rollAnim = useRef(new Animated.Value(roll ? 1 : 0)).current;
  const curAnim = useRef(new Animated.Value(current ? 1 : 0)).current;
  const nextAnim = useRef(new Animated.Value(next ? 1 : 0)).current;
  const confirmAnim = useRef(new Animated.Value(confirm ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rollAnim, { toValue: roll ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [roll]);
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
    const rollTrim = roll.trim();
    const curTrim = current.trim();
    const nextTrim = next.trim();
    const confirmTrim = confirm.trim();

    if (!rollTrim || !curTrim || !nextTrim || !confirmTrim) {
      showToast("Fill all fields", { type: "info" });
      return;
    }

    if (nextTrim !== confirmTrim) {
      showToast("New passwords do not match", { type: "error" });
      return;
    }

    if (nextTrim.length < 6) {
      showToast("New password should be at least 6 characters.", { type: "info" });
      return;
    }

    try {
      setLoading(true);

      const rollUpper = rollTrim.toUpperCase();

      const enrolledRef = doc(db, "enrolledStudents", rollUpper);
      const enrolledSnap = await getDoc(enrolledRef);

      if (!enrolledSnap.exists() || enrolledSnap.data()?.valid !== true) {
        showToast("This roll number is not in the SuperPaac list.", { type: "error" });
        return;
      }

      const authRef = doc(db, "studentAuth", rollUpper);
      const authSnap = await getDoc(authRef);

      let expectedPassword: string;

      if (authSnap.exists()) {
        expectedPassword = String((authSnap.data() as any).password ?? "").trim();
      } else {
        expectedPassword = getDefaultStudentPassword(rollUpper);
        await setDoc(authRef, { password: expectedPassword }, { merge: true });
      }

      if (curTrim !== expectedPassword) {
        showToast("Current password is wrong", { type: "error" });
        return;
      }

      await setDoc(authRef, { password: nextTrim }, { merge: true });

      showToast("Password updated.", { type: "success" });
      router.replace("/login");
    } catch (e) {
      console.log("Student change password error:", e);
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
            <Text style={styles.title}>Student password</Text>
            <Text style={styles.subtitle}>Change your SuperPaac login password.</Text>

            <View style={styles.inputWrapper}>
              <Animated.Text style={[styles.floatingLabel, { transform: [{ translateY: rollAnim.interpolate({ inputRange: [0, 1], outputRange: [12, -10] }) }, { scale: rollAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) }], opacity: rollAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }]}>
                Roll number (e.g. 23CDR061)
              </Animated.Text>

              <TextInput ref={rollRef} style={styles.input} placeholder="" placeholderTextColor="#94A3B8" autoCapitalize="characters" value={roll} onChangeText={setRoll} onFocus={() => setCardFocus(true)} onBlur={() => setCardFocus(false)} returnKeyType="next" onSubmitEditing={() => curRef.current?.focus()} />
            </View>

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
  cardContainer: { width: "100%", maxWidth: 640, backgroundColor: "rgba(12,18,32,0.72)", borderRadius: 16, padding: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)", shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
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
