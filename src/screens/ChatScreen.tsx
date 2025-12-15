import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  StyleSheet,
  Alert,
  SafeAreaView,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useFocusEffect } from "expo-router";
import { db } from "../firebase";
// ✅ CORRECT
import MessageOptionsModal from "../../src/components/MessageOptionsModal";


const LinearGradientAny = LinearGradient as unknown as React.ComponentType<any>;

export default function ChatScreen({ route }: any) {
  const { anonId = "0", role = "student" } = route?.params || {};

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const q = query(
      collection(db, "groupChatMessages"),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          time:
            d.data().timestamp?.toDate?.().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) || "",
        }))
      );
    });
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    await addDoc(collection(db, "groupChatMessages"), {
      text: input,
      anonId,
      isAdmin: role === "admin",
      timestamp: serverTimestamp(),
    });

    setInput("");
  };

  const handleDelete = async (msg: any) => {
    try {
      await deleteDoc(doc(db, "groupChatMessages", msg.id));
    } catch {
      Alert.alert("Error", "Failed to delete message");
    }
  };

  const renderItem = ({ item }: any) => {
    const isMine = item.isAdmin
      ? role === "admin"
      : item.anonId == anonId;

    return (
      <TouchableOpacity
        onLongPress={() => {
          setSelectedMessage(item);
          setModalVisible(true);
        }}
        style={[styles.row, isMine ? styles.right : styles.left]}
      >
        <LinearGradientAny
          colors={
            item.isAdmin
              ? ["#E4D5FF", "#B89AFF"]
              : ["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]
          }
          style={styles.bubble}
        >
          <Text style={styles.name}>
            {item.isAdmin ? "SuperPaac Mentor" : "Anonymous"}
          </Text>
          <Text style={styles.msg}>{item.text}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </LinearGradientAny>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <LinearGradientAny
          colors={["#1C1E2E", "#221F41", "#6A5AE0"]}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#b9b9c9"
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <MessageOptionsModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            message={selectedMessage}
            currentAnonId={anonId}
            currentRole={role}
            onDelete={handleDelete}
          />
        </LinearGradientAny>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 6 },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end" },

  bubble: { maxWidth: "78%", padding: 12, borderRadius: 16 },
  name: { fontSize: 11, fontWeight: "600", color: "#493C77" },
  msg: { fontSize: 14, color: "#fff", marginTop: 2 },
  time: { fontSize: 10, color: "#E0E0E0", alignSelf: "flex-end" },

  inputBar: {
    position: "absolute",
    bottom: 18,
    left: 12,
    right: 12,
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    padding: 10,
  },
  input: { flex: 1, color: "#fff" },
  sendBtn: {
    backgroundColor: "#6A5AE0",
    padding: 12,
    borderRadius: 14,
  },
});
