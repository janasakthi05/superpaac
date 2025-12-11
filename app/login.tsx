// app/login.tsx
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
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

// ✅ Added (NO logic changes)
import AnimatedBackground from "../src/components/AnimatedBackground";

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

  const handleLogin = async () => {
    const trimmedRoll = roll.trim();
    const trimmedPass = password.trim();

    if (!trimmedRoll || !trimmedPass) {
      alert("Enter Roll Number & Password");
      return;
    }

    // --------------------
    // ADMIN LOGIN (unchanged)
    // --------------------
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
          alert("Wrong admin password");
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
        alert("Admin login failed. Try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // --------------------
    // STUDENT LOGIN (unchanged)
    // --------------------
    try {
      setLoading(true);

      const rollUpper = trimmedRoll.toUpperCase();
      const enrolledRef = doc(db, "enrolledStudents", rollUpper);
      const enrolledSnap = await getDoc(enrolledRef);

      if (!enrolledSnap.exists() || enrolledSnap.data()?.valid !== true) {
        alert(
          "This roll number is not in the SuperPaac list.\n\nOnly whitelisted students can log in."
        );
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
        alert("Wrong password");
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
      alert("Login failed. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#020617", "#0F172A", "#1E293B"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* ✅ Added — does NOT affect logic */}
      <AnimatedBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          <View style={styles.headerBlock}>
            <Text style={styles.logo}>SuperPaac</Text>
            <Text style={styles.tagline}>Anonymous • Safe • Supportive</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back 👋</Text>
            <Text style={styles.cardSubtitle}>
              Only SuperPaac students & mentors can enter.
            </Text>

            <TextInput
              ref={rollRef}
              style={styles.input}
              placeholder="Roll Number"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
              value={roll}
              onChangeText={setRoll}
              keyboardType="default"
              textContentType="username"
              autoComplete="username"
              importantForAutofill="yes"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
            />

            <TextInput
              ref={passRef}
              style={styles.input}
              placeholder="Password (e.g cdr001)"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              autoComplete="password"
              importantForAutofill="yes"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Checking..." : "Enter SuperPaac"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/admin-change-password")}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.adminLink}>Admin: change password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/student-change-password")}
              style={{ marginTop: 6 }}
            >
              <Text style={styles.studentLink}>Student: change password</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            Your messages are anonymous to other students.{"\n"}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24, zIndex: 2 },
  headerBlock: { marginBottom: 32 },
  logo: {
    color: "#F9FAFB",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  tagline: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
    zIndex: 3,
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 21,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardSubtitle: { color: "#9CA3AF", fontSize: 13, marginBottom: 18 },
  input: {
    backgroundColor: "#020617",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#F9FAFB",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#4F46E5",
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 8,
  },
  buttonText: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    color: "#F9FAFB",
  },
  adminLink: {
    color: "#A5B4FC",
    fontSize: 12,
    textAlign: "right",
  },
  studentLink: {
    color: "#38BDF8",
    fontSize: 12,
    textAlign: "right",
  },
  footerNote: {
    color: "#6B7280",
    fontSize: 11,
    textAlign: "center",
    marginTop: 18,
    lineHeight: 16,
  },
});
