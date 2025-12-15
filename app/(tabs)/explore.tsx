import { useGlobalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "../../src/firebase";
import { useTheme } from "../../src/contexts/ThemeContext";

/* ---------------- TYPES ---------------- */
type StudentRecord = {
  id: string;
  anonId: string;
};

type ChatMessage = {
  id: string;
  text?: string;
  isAdmin: boolean;
  anonId: string;
  time: string;
  type?: "text" | "image" | "file" | "link";
  mediaUrl?: string;
  mediaName?: string;
};

/* ---------------- SCREEN ---------------- */
export default function ExploreScreen() {
  const { role, rollNo } =
    useGlobalSearchParams<{ role?: string; rollNo?: string }>();
  const { colors } = useTheme();

  const isAdminUser =
    role === "admin" ||
    (rollNo && String(rollNo).toLowerCase() === "admin");

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentRecord | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [layoutWidth, setLayoutWidth] = useState(
    Dimensions.get("window").width
  );

  const topPad =
    Platform.OS === "android"
      ? Math.max(StatusBar.currentHeight ?? 18, 14)
      : 14;

  /* ---------------- RESPONSIVE ---------------- */
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setLayoutWidth(window.width);
    });
    return () => sub?.remove?.();
  }, []);

  /* ---------------- STUDENTS ---------------- */
  useEffect(() => {
    if (!isAdminUser) return;

    setLoadingStudents(true);

    const q = query(
      collection(db, "groupChatMessages"),
      where("isAdmin", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      const map = new Map<string, StudentRecord>();

      snap.docs.forEach((d) => {
        const data: any = d.data();
        const cid = String(data.conversationId ?? data.anonId);
        if (!cid) return;

        if (!map.has(cid)) {
          map.set(cid, { id: cid, anonId: cid });
        }
      });

      setStudents(Array.from(map.values()));
      setLoadingStudents(false);
    });

    return () => unsub();
  }, [isAdminUser]);

  /* ---------------- MESSAGES ---------------- */
  useEffect(() => {
    if (!isAdminUser || !selectedStudent) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);

    const anonId = String(selectedStudent.anonId);

    const q = query(
      collection(db, "groupChatMessages"),
      where("anonId", "==", anonId),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((doc) => {
          const d: any = doc.data();
          return {
            id: doc.id,
            text: d.text,
            isAdmin: !!d.isAdmin,
            anonId: String(d.anonId),
            type: d.type ?? "text",
            mediaUrl: d.mediaUrl,
            mediaName: d.mediaName,
            time: d.timestamp?.toDate
              ? d.timestamp.toDate().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
          };
        })
      );
      setLoadingMessages(false);
    });

    return () => unsub();
  }, [isAdminUser, selectedStudent]);

  if (!isAdminUser) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ textAlign: "center", marginTop: 40 }}>
          Mentor Access Only
        </Text>
      </SafeAreaView>
    );
  }

  const isWide = layoutWidth >= 900;
  const showStudentList = !(!isWide && selectedStudent);
  const showConversation = isWide || !!selectedStudent;

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={[styles.header, { paddingTop: topPad }]}
      >
        <Text style={styles.headerTitle}>Mentor Panel</Text>
        {selectedStudent && !isWide && (
          <TouchableOpacity onPress={() => setSelectedStudent(null)}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <View style={[styles.main, { flexDirection: isWide ? "row" : "column" }]}>
        {/* STUDENTS */}
        {showStudentList && (
          <View style={[styles.left, isWide && styles.leftWide]}>
            <Text style={styles.sectionTitle}>Students</Text>

            {loadingStudents ? (
              <ActivityIndicator />
            ) : (
              <FlatList
                data={students}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedStudent(item)}
                    style={styles.studentCard}
                  >
                    <Ionicons name="person" size={16} color="#fff" />
                    <Text style={styles.studentName}>
                      Anonymous #{item.anonId}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {/* CONVERSATION */}
        {showConversation && (
          <View style={styles.right}>
            {loadingMessages ? (
              <ActivityIndicator />
            ) : (
              <FlatList
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.bubble,
                      item.isAdmin ? styles.admin : styles.student,
                    ]}
                  >
                    {/* TEXT */}
                    {item.type === "text" && (
                      <Text style={{ fontSize: 14, lineHeight: 20, color: "#111827" }}>
  {item.text}
</Text>

                    )}

                    {/* IMAGE */}
                    {item.type === "image" && item.mediaUrl && (
                      <Image
                        source={{ uri: item.mediaUrl }}
                        style={styles.image}
                      />
                    )}

                    {/* FILE / LINK */}
                   {item.type === "file" && item.mediaUrl && (
  <TouchableOpacity
    onPress={() => Linking.openURL(item.mediaUrl!)}
    style={styles.fileBox}
  >
    <Ionicons name="document" size={16} />
    <Text
      numberOfLines={1}
      style={{ fontSize: 13, fontWeight: "600", color: "#1e293b" }}
    >
      {item.mediaName || "Open file"}
    </Text>
  </TouchableOpacity>
)}


                    <Text style={styles.time}>{item.time}</Text>
                  </View>
                )}
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0b1020",
  },

  header: {
    minHeight: 76,
    paddingHorizontal: 22,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  headerTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  main: {
    flex: 1,
    padding: 16,
    gap: 14,
  },

  left: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderRadius: 22,
    padding: 16,
  },

  leftWide: {
    width: "32%",
  },

  right: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 22,
    padding: 16,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#a5b4fc",
    marginBottom: 16,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: "#111827",
    gap: 10,
  },

  studentName: {
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: "600",
  },

  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginVertical: 8,
    maxWidth: "78%",
  },

  admin: {
    backgroundColor: "#6366f1",
    alignSelf: "flex-end",
    borderTopRightRadius: 6,
  },

  student: {
    backgroundColor: "#e5e7eb",
    alignSelf: "flex-start",
    borderTopLeftRadius: 6,
  },

  time: {
    fontSize: 10,
    opacity: 0.55,
    marginTop: 6,
    alignSelf: "flex-end",
  },

  image: {
    width: 220,
    height: 220,
    borderRadius: 16,
    marginTop: 8,
    backgroundColor: "#c7d2fe",
  },

  fileBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
});

