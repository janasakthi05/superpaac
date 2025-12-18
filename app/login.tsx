// app/login.tsx
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Dimensions,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import FireSparks from "../src/components/FireSparks";

import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../src/firebase";
import { registerForPushToken } from "../src/notifications";

import AnimatedBackground from "../src/components/AnimatedBackground";
import { showToast } from "../src/components/VibeToast";

const FALLBACK_ADMIN_PASSWORD = "SuperPaac@2025";

function getDefaultStudentPassword(rollUpper: string): string {
  const dept = rollUpper.slice(2, 5);
  const num = rollUpper.slice(5);
  return (dept + num).toLowerCase();
}

export default function LoginScreen() {
  const router = useRouter();

  const [roll, setRoll] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const rollRef = useRef<RNTextInput | null>(null);
  const passRef = useRef<RNTextInput | null>(null);

  const entrance = useRef(new Animated.Value(0)).current;
  const ctaShine = useRef(new Animated.Value(-1)).current;
  const focusScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
    Animated.loop(Animated.timing(ctaShine, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.linear })).start();
  }, []);

  function animateFocus(isFocused: boolean) {
    Animated.timing(focusScale, { toValue: isFocused ? 1.01 : 1, duration: 160, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
  }

  const handleLogin = async () => {
    const trimmedRoll = roll.trim();
    const trimmedPass = password.trim();

  if (!trimmedRoll && !trimmedPass) {
  showToast("Enter Roll Number and Password", { type: "info" });
  return;
}

if (!trimmedRoll) {
  showToast("Enter Roll Number", { type: "info" });
  return;
}

if (!trimmedPass) {
  showToast("Enter Password", { type: "info" });
  return;
}



    if (trimmedRoll.toLowerCase() === "admin") {
      try {
        setLoading(true);
        const adminRef = doc(db, "appConfig", "adminAuth");
        const snap = await getDoc(adminRef);
        const savedPasswordRaw = snap.exists()
          ? (snap.data() as any).password ?? ""
          : FALLBACK_ADMIN_PASSWORD;

        const savedPassword = String(savedPasswordRaw).trim();

        if (trimmedPass !== savedPassword) {
          showToast("Wrong admin password", { type: "error" });
          return;
        }

        rollRef.current?.blur();
        passRef.current?.blur();
        await new Promise((r) => setTimeout(r, 200));

        router.replace({
          pathname: "/(tabs)",
          params: { rollNo: "admin", role: "admin", anonId: "0" },
        });
      } catch (e) {
        console.log("Admin login error:", e);
        showToast("Admin login failed. Try again.", { type: "error" });
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);

      const rollUpper = trimmedRoll.toUpperCase();
      const enrolledRef = doc(db, "enrolledStudents", rollUpper);
      const enrolledSnap = await getDoc(enrolledRef);

      if (!enrolledSnap.exists() || enrolledSnap.data()?.valid !== true) {
        showToast("This Student is not in the SuperPaac.", { type: "error", duration: 4200 });
        return;
      }

      const authRef = doc(db, "studentAuth", rollUpper);
      const authSnap = await getDoc(authRef);

      let expectedPassword: string;

      if (authSnap.exists()) {
        const saved = String((authSnap.data() as any).password ?? "").trim();
        expectedPassword = saved;
      } else {
        const generated = getDefaultStudentPassword(rollUpper);
        expectedPassword = generated;
        await setDoc(authRef, { password: generated }, { merge: true });
      }

      if (trimmedPass !== expectedPassword) {
        showToast("Wrong password", { type: "error" });
        return;
      }

      const studentRef = doc(db, "students", rollUpper);
      const studentSnap = await getDoc(studentRef);

      let anonId: number;

      if (studentSnap.exists()) {
        const data: any = studentSnap.data();
        anonId = data.anonId || 0;
      } else {
        const allStudentsSnap = await getDocs(collection(db, "students"));
        anonId = allStudentsSnap.size + 1;

        await setDoc(studentRef, {
          rollNo: rollUpper,
          anonId,
          createdAt: new Date(),
        });
      }

      try {
        await registerForPushToken(rollUpper);
      } catch (err) {
        console.log("registerForPushToken failed:", err);
      }

      rollRef.current?.blur();
      passRef.current?.blur();
      await new Promise((r) => setTimeout(r, 200));

      router.replace({
        pathname: "/(tabs)",
        params: { rollNo: rollUpper, role: "student", anonId: String(anonId) },
      });
    } catch (e) {
      console.log("Student login error:", e);
      showToast("Login failed. Check your internet and try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const { width } = Dimensions.get("window");

  const entranceStyle = {
    opacity: entrance,
    transform: [
      { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
      { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.995, 1] }) },
    ],
  };

  const shineX = ctaShine.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#041025", "#07102A", "#081226"]} style={styles.background} />
      <AnimatedBackground />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <Animated.View style={[styles.center, entranceStyle]}>
          <Animated.View style={{ alignItems: "center", marginBottom: 14 }}>
            <View style={styles.pulseBadge}>
  <LinearGradient
    colors={["rgba(255,215,120,0.22)", "rgba(255,255,255,0.06)"]}
    style={styles.pulseInner}
  >
    {/* 🔥 FIRE SPARKS */}
    <FireSparks />

    {/* TEXT ABOVE SPARKS */}
    <Text style={styles.pulseText}>SP</Text>
  </LinearGradient>
</View>


            <Text style={styles.title}>SuperPaac</Text>
            <Text style={styles.subtitle}>Anonymous • Safe • Supportive</Text>
          </Animated.View>

          <Animated.View style={[styles.card, width > 420 ? styles.cardWide : null, { transform: [{ scale: focusScale }] }]}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to continue</Text>

            <View style={styles.field}>
              <TextInput
                ref={rollRef}
                style={styles.input}
                placeholder="Roll Number"
                placeholderTextColor="#9AA8B6"
                autoCapitalize="characters"
                value={roll}
                onChangeText={setRoll}
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
                onFocus={() => animateFocus(true)}
                onBlur={() => animateFocus(false)}
              />
            </View>

            <View style={styles.field}>
              <TextInput
                ref={passRef}
                style={styles.input}
                placeholder="Password (e.g cdr001)"
                placeholderTextColor="#9AA8B6"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => animateFocus(true)}
                onBlur={() => animateFocus(false)}
              />
            </View>

            <Pressable onPress={handleLogin} style={({ pressed }) => [styles.ctaWrap, pressed && { opacity: 0.92 }, loading && { opacity: 0.7 }]} disabled={loading}>
              <LinearGradient colors={["#FFE3A8", "#FFC857"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                <Animated.View pointerEvents="none" style={[styles.ctaShine, { transform: [{ translateX: shineX }] }]} />
                <Text style={styles.ctaText}>{loading ? "Checking..." : "Enter SuperPaac"}</Text>
              </LinearGradient>
            </Pressable>

            <View style={styles.linksRow}>
              <TouchableOpacity onPress={() => router.push("/admin-change-password")}>
                <Text style={styles.link}>Admin: change password</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/student-change-password")}>
                <Text style={styles.link}>Student: change password</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Text style={styles.footer}>Your messages are anonymous to other students.</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFillObject },
  container: { flex: 1, zIndex: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  pulseBadge: { width: 96, height: 96, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
pulseInner: {
  width: 84,
  height: 84,
  borderRadius: 22,
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden", // ⬅️ REQUIRED
},

pulseText: {
  color: "#FFFFFF",
  fontSize: 32,
  fontWeight: "900",
  letterSpacing: 1,
  zIndex: 10,
  textShadowColor: "rgba(255,255,255,0.7)",
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 8,
},


  title: { color: "#F8FAFC", fontSize: 34, fontWeight: "900", marginTop: 4 },
  subtitle: { color: "#97A6B8", marginTop: 6 },
  card: { width: "100%", maxWidth: 640, backgroundColor: "rgba(12,18,32,0.66)", borderRadius: 18, padding: 22, marginTop: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)", shadowColor: "#000", shadowOpacity: 0.36, shadowRadius: 28, shadowOffset: { width: 0, height: 18 }, elevation: 18, overflow: "hidden" },
  cardWide: { padding: 28 },
  cardTitle: { color: "#F9FAFB", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  cardSubtitle: { color: "#9CA3AF", fontSize: 13, marginBottom: 12 },
  field: { marginBottom: 12 },
  input: { backgroundColor: "rgba(2,6,23,0.84)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, color: "#F9FAFB", borderWidth: 1, borderColor: "rgba(255,255,255,0.03)", fontSize: 15 },
  ctaWrap: { marginTop: 6, borderRadius: 999, overflow: "hidden" },
  cta: { paddingVertical: 14, borderRadius: 999, alignItems: "center", justifyContent: "center", position: "relative" },
  ctaText: { fontWeight: "900", color: "#111827", fontSize: 16 },
  ctaShine: { position: "absolute", left: -80, top: -6, width: 140, height: 48, backgroundColor: "rgba(255,255,255,0.55)", opacity: 0.22, transform: [{ rotate: "20deg" }], borderRadius: 32 },
  linksRow: { marginTop: 12, flexDirection: "row", justifyContent: "space-between" },
  link: { color: "#BEDBFF", fontSize: 13 },
  footer: { marginTop: 18, color: "#94A3B8", fontSize: 12, textAlign: "center" },
});
