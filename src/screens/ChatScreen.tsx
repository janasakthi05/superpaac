// src/screens/ChatScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../src/firebase";

// correct relative import
import MessageOptionsModal from "../components/MessageOptionsModal";

export const ChatScreen = ({ route }: any) => {
  const { anonId, role } = route.params || { anonId: "0", role: "student" };

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [someoneTyping, setSomeoneTyping] = useState(false);

  // modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const listRef = useRef<FlatList<any> | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const userKey = `${role}_${anonId}`;
  const typingDocRef = doc(db, "typingStatus", "globalRoom");

  // messages realtime
  useEffect(() => {
    const q = query(collection(db, "groupChatMessages"), orderBy("timestamp", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            text: data.text,
            anonId: data.anonId,
            isAdmin: data.isAdmin,
            time:
              data.timestamp?.toDate?.().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "",
          };
        })
      );
    });

    return () => unsub();
  }, []);

  // typing listener
  useEffect(() => {
    const unsub = onSnapshot(typingDocRef, (snap) => {
      const data = snap.data() || {};
      const someoneElseTyping = Object.entries(data).some(
        ([key, value]) => key !== userKey && value === true
      );
      setSomeoneTyping(someoneElseTyping);
    });

    return () => {
      setDoc(typingDocRef, { [userKey]: false }, { merge: true });
      typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // autoscroll
  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const setTyping = async (typing: boolean) => {
    await setDoc(typingDocRef, { [userKey]: typing }, { merge: true });
  };

  const handleChangeText = (txt: string) => {
    setInput(txt);

    if (txt.trim().length > 0) {
      setTyping(true);
      typingTimeoutRef.current && clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 1500);
    } else {
      setTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    await addDoc(collection(db, "groupChatMessages"), {
      text: input,
      anonId,
      isAdmin: role === "admin",
      timestamp: serverTimestamp(),
    });

    setInput("");
    setTyping(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient colors={["#1C1E2E", "#221F41", "#6A5AE0"]} style={styles.container}>
        {/* HEADER */}
        <LinearGradient colors={["#6A5AE0", "#A879FF", "#221F41"]} style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.avatarCircle}>
              <Ionicons name="sparkles" size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>SuperPaac Space</Text>
              <Text style={styles.headerSubtitle}>
                {role === "admin" ? "You’re chatting as Mentor" : `Anonymous #${anonId}`}
              </Text>
            </View>
          </View>

          <View style={styles.safeBadge}>
            <Ionicons name="lock-closed" size={14} color="#fff" />
            <Text style={styles.safeText}>Safe Chat</Text>
          </View>
        </LinearGradient>

        {/* MESSAGES */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => {
            const isMentorMsg = item.isAdmin;
            const isMine = isMentorMsg ? role === "admin" : item.anonId == anonId;

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onLongPress={() => {
                  console.log("LONG PRESS -> open modal for", item.id);
                  setSelectedMessage(item);
                  setModalVisible(true);
                }}
                delayLongPress={250}
                style={[styles.bubbleRow, isMine ? styles.rightAlign : styles.leftAlign]}
              >
                <LinearGradient
                  colors={isMentorMsg ? ["#E4D5FF", "#B89AFF"] : ["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]}
                  style={[styles.bubble, isMentorMsg && styles.mentorGlow]}
                >
                  <Text style={styles.name}>
                    {isMentorMsg ? "SuperPaac Mentor" : `Anonymous #${item.anonId}`}
                  </Text>
                  <Text style={styles.msg}>{item.text}</Text>
                  <Text style={styles.time}>{item.time}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          }}
        />

        {someoneTyping && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>typing…</Text>
          </View>
        )}

        {/* INPUT */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#b9b9c9"
            value={input}
            onChangeText={handleChangeText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} accessibilityLabel="Send message">
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* MESSAGE OPTIONS MODAL */}
        <MessageOptionsModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onReply={() => {
            console.log("Reply pressed for:", selectedMessage);
            setModalVisible(false);
          }}
          onReact={() => {
            console.log("React pressed for:", selectedMessage);
            setModalVisible(false);
          }}
          onEdit={() => {
            console.log("Edit pressed for:", selectedMessage);
            setModalVisible(false);
          }}
          onDelete={() => {
            console.log("Delete pressed for:", selectedMessage);
            setModalVisible(false);
          }}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderBottomWidth: 0.6,
    borderColor: "#6A5AE0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#8F7EFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  headerTitle: { fontSize: 18, color: "#fff", fontWeight: "700" },
  headerSubtitle: { fontSize: 12, color: "#D1D5DB" },

  safeBadge: {
    flexDirection: "row",
    backgroundColor: "#6A5AE0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: "center",
  },
  safeText: { fontSize: 11, color: "#fff", marginLeft: 4 },

  bubbleRow: { marginVertical: 6 },
  rightAlign: { alignSelf: "flex-end" },
  leftAlign: { alignSelf: "flex-start" },

  bubble: {
    maxWidth: "78%",
    padding: 12,
    borderRadius: 16,
  },

  mentorGlow: {
    shadowColor: "#6A5AE0",
    shadowOpacity: 0.45,
    shadowRadius: 9,
    elevation: 7,
  },

  name: {
    fontSize: 11,
    color: "#493C77",
    fontWeight: "600",
  },
  msg: {
    fontSize: 14,
    color: "#fff",
    marginTop: 2,
  },
  time: {
    fontSize: 10,
    color: "#E0E0E0",
    alignSelf: "flex-end",
    marginTop: 4,
  },

  typingRow: { paddingLeft: 20, marginBottom: 4 },
  typingText: { color: "#C5C6D2", fontSize: 11 },

  inputBar: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "#fff",
  },

  sendBtn: {
    marginLeft: 10,
    backgroundColor: "#6A5AE0",
    padding: 12,
    borderRadius: 14,
  },
});

export default ChatScreen;
