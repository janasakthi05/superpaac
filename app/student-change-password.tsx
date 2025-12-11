// app/student-change-password.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../src/firebase";

// helper: default student password from roll number
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

  const handleChangePassword = async () => {
    const rollTrim = roll.trim();
    const curTrim = current.trim();
    const nextTrim = next.trim();
    const confirmTrim = confirm.trim();

    if (!rollTrim || !curTrim || !nextTrim || !confirmTrim) {
      Alert.alert("Error", "Fill all fields");
      return;
    }

    if (nextTrim !== confirmTrim) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (nextTrim.length < 6) {
      Alert.alert(
        "Weak password",
        "New password should be at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const rollUpper = rollTrim.toUpperCase();

      // 1) ensure roll is whitelisted
      const enrolledRef = doc(db, "enrolledStudents", rollUpper);
      const enrolledSnap = await getDoc(enrolledRef);

      if (!enrolledSnap.exists() || enrolledSnap.data()?.valid !== true) {
        Alert.alert(
          "Not allowed",
          "This roll number is not in the SuperPaac list."
        );
        return;
      }

      // 2) get studentAuth doc or compute default
      const authRef = doc(db, "studentAuth", rollUpper);
      const authSnap = await getDoc(authRef);

      let expectedPassword: string;

      if (authSnap.exists()) {
        expectedPassword = String(
          (authSnap.data() as any).password ?? ""
        ).trim();
      } else {
        // default pattern (dept + number, lowercase)
        expectedPassword = getDefaultStudentPassword(rollUpper);
        await setDoc(authRef, { password: expectedPassword }, { merge: true });
      }

      if (curTrim !== expectedPassword) {
        Alert.alert("Error", "Current password is wrong");
        return;
      }

      // 3) update to new password
      await setDoc(authRef, { password: nextTrim }, { merge: true });

      Alert.alert("Success", "Password updated.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (e) {
      console.log("Student change password error:", e);
      Alert.alert("Error", "Could not update password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#020617", "#0F172A", "#020617"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Student password</Text>
          <Text style={styles.subTitle}>
            Change your SuperPaac login password.
          </Text>

          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Roll number (e.g. 23CDR061)"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
              value={roll}
              onChangeText={setRoll}
            />

            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={current}
              onChangeText={setCurrent}
            />

            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={next}
              onChangeText={setNext}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Saving..." : "Update password"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.backLink}>← Back to login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subTitle: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
  },
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
  backLink: {
    color: "#818CF8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
