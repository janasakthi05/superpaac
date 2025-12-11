// app/(tabs)/explore.tsx
import { useGlobalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../src/firebase";

type StudentRecord = {
  id: string;
  rollNo: string;
  anonId: number;
};

type ChatMessage = {
  id: string;
  text: string;
  isAdmin: boolean;
  anonId: string;
  time: string;
  type?: "text" | "image" | "file";
  mediaUrl?: string;
  mediaName?: string;
  reactions?: { [emoji: string]: string[] };
  isBroadcast?: boolean;
};

export default function ExploreScreen() {
  const { role, rollNo } = useGlobalSearchParams<{
    role?: string;
    rollNo?: string;
  }>();

  const isAdminUser =
    role === "admin" || (rollNo && rollNo.toLowerCase() === "admin");

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load students
  useEffect(() => {
    if (!isAdminUser) return;

    const loadStudents = async () => {
      try {
        const qStudents = query(
          collection(db, "students"),
          orderBy("anonId", "asc")
        );
        const snap = await getDocs(qStudents);

        const list: StudentRecord[] = snap.docs.map((docSnap) => {
          const data: any = docSnap.data();
          return {
            id: docSnap.id,
            rollNo: data.rollNo || docSnap.id,
            anonId: data.anonId || 0,
          };
        });

        setStudents(list);
      } catch (e) {
        console.log("Error loading students:", e);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [isAdminUser]);

  // Load conversation for selected anonId
  useEffect(() => {
    if (!isAdminUser || !selectedStudent) return;

    setLoadingMessages(true);

    const qMsgs = query(
      collection(db, "groupChatMessages"),
      where("anonId", "==", String(selectedStudent.anonId)),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      qMsgs,
      (snapshot) => {
        const loaded: ChatMessage[] = snapshot.docs.map((docSnap) => {
          const data: any = docSnap.data();
          const createdAt = data.timestamp?.toDate
            ? data.timestamp.toDate().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          return {
            id: docSnap.id,
            text: data.text || "",
            isAdmin: !!data.isAdmin,
            anonId: String(data.anonId ?? ""),
            time: createdAt,
            type: data.type || "text",
            mediaUrl: data.mediaUrl,
            mediaName: data.mediaName,
            reactions: data.reactions || {},
            isBroadcast: !!data.isBroadcast,
          };
        });

        setMessages(loaded);
        setLoadingMessages(false);
      },
      (error) => {
        console.log("Error loading messages:", error);
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [isAdminUser, selectedStudent]);

  // Not admin → show locked screen
  if (!isAdminUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Mentor Area 🔒</Text>
        <Text style={styles.text}>
          This section is only visible to SuperPaac mentors.
        </Text>
        <Text style={styles.textSmall}>
          If you’re a student, you can use the Chat tab to ask doubts
          anonymously.
        </Text>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const reactions = item.reactions || {};

    return (
      <View
        style={[
          styles.msgBubble,
          item.isAdmin ? styles.msgAdmin : styles.msgStudent,
        ]}
      >
        {item.isBroadcast && (
          <Text style={styles.broadcastLabel}>Broadcast</Text>
        )}

        <Text style={styles.msgFrom}>
          {item.isAdmin
            ? "SuperPaac Mentor"
            : `Anonymous #${item.anonId}`}
        </Text>

        {/* TEXT */}
        {(!item.type || item.type === "text") && !!item.text && (
          <Text style={styles.msgText}>{item.text}</Text>
        )}

        {/* IMAGE */}
        {item.type === "image" && item.mediaUrl && (
          <Image
            source={{ uri: item.mediaUrl }}
            style={styles.msgImage}
          />
        )}

        {/* FILE */}
        {item.type === "file" && item.mediaUrl && (
          <View style={styles.msgFileRow}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color="#E5E7EB"
            />
            <Text style={styles.msgFileName} numberOfLines={1}>
              {item.mediaName || "Attachment"}
            </Text>
          </View>
        )}

        {/* REACTIONS */}
        {Object.keys(reactions).length > 0 && (
          <View style={styles.reactionsRow}>
            {Object.entries(reactions).map(([emoji, users]) => {
              const arr = Array.isArray(users) ? users : [];
              return (
                <View key={emoji} style={styles.reactionBadge}>
                  <Text style={styles.reactionText}>
                    {emoji} {arr.length > 1 ? arr.length : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.msgTime}>{item.time}</Text>
      </View>
    );
  };

  // Admin Screen
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mentor Panel</Text>
      <Text style={styles.textSmall}>
        Tap an Anonymous ID to see all messages that student posted in the
        group chat.
      </Text>

      {loadingStudents ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <View style={{ flexDirection: "row", marginTop: 16, flex: 1 }}>
          {/* Left: student list */}
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.sectionTitle}>Students</Text>
            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setSelectedStudent(item)}
                  style={[
                    styles.studentRow,
                    selectedStudent?.id === item.id &&
                      styles.studentRowActive,
                  ]}
                >
                  <Text style={styles.anonText}>
                    Anonymous #{item.anonId}
                  </Text>
                  <Text style={styles.rollHint}>
                    Tap to view conversation
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Right: messages */}
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.sectionTitle}>Conversation</Text>

            {!selectedStudent ? (
              <Text style={styles.textSmall}>
                Select a student on the left to view their messages.
              </Text>
            ) : (
              <>
                <View style={styles.conversationHeader}>
                  <Text style={styles.convTitle}>
                    Anonymous #{selectedStudent.anonId}
                  </Text>
                  <Text style={styles.convSubtitle}>
                    Messages this student posted in SuperPaac Space
                  </Text>
                </View>

                {loadingMessages ? (
                  <ActivityIndicator style={{ marginTop: 16 }} />
                ) : (
                  <FlatList
                    style={{ flex: 1 }}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                  />
                )}
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  title: {
    color: "#F9FAFB",
    fontSize: 22,
    fontWeight: "700",
  },

  text: {
    color: "#D1D5DB",
    marginTop: 8,
    fontSize: 14,
  },

  textSmall: {
    color: "#9CA3AF",
    marginTop: 4,
    fontSize: 12,
  },

  sectionTitle: {
    color: "#E5E7EB",
    fontWeight: "600",
    marginBottom: 8,
  },

  studentRow: {
    backgroundColor: "#0B1220",
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#111827",
  },

  studentRowActive: {
    borderColor: "#4F46E5",
  },

  anonText: {
    color: "#F9FAFB",
    fontWeight: "600",
  },

  rollHint: {
    color: "#9CA3AF",
    fontSize: 12,
  },

  conversationHeader: {
    marginBottom: 8,
  },

  convTitle: {
    color: "#F9FAFB",
    fontWeight: "700",
  },

  convSubtitle: {
    color: "#9CA3AF",
    fontSize: 12,
  },

  msgBubble: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    maxWidth: "100%",
  },

  msgStudent: {
    backgroundColor: "rgba(15,23,42,0.9)",
    alignSelf: "flex-start",
  },

  msgAdmin: {
    backgroundColor: "#4F46E5",
    alignSelf: "flex-end",
  },

  msgFrom: {
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "600",
  },

  msgText: {
    color: "#F9FAFB",
    fontSize: 13,
    marginTop: 2,
  },

  msgTime: {
    color: "#CBD5F5",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },

  msgImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginTop: 6,
  },

  msgFileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  msgFileName: {
    color: "#E5E7EB",
    fontSize: 12,
    marginLeft: 6,
    maxWidth: 200,
  },

  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 4,
  },

  reactionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.6)",
  },

  reactionText: {
    fontSize: 11,
    color: "#F9FAFB",
  },

  broadcastLabel: {
    fontSize: 10,
    color: "#FACC15",
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase",
  },
});
