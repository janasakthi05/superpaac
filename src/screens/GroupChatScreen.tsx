// src/screens/GroupChatScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db } from "../../src/firebase";
// use theme for readable colors in light/dark modes
import { useTheme } from "../contexts/ThemeContext";

export default function GroupChatScreen({ route }: any) {
  const { anonId, role } = route.params;
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  
  // Typing indicator state
  const [someoneTyping, setSomeoneTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  
  // FlatList ref for auto-scroll
  const listRef = useRef<FlatList<any> | null>(null);
  
  // Unique key for this user in typing status
  const userKey = `${role || "student"}_${anonId || "0"}`;
  const typingDocRef = doc(db, "typingStatus", "globalRoom");

  useEffect(() => {
    const q = query(collection(db, "groupChatMessages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data: any = d.data();
        const time = data.timestamp?.toDate ? data.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
        return { id: d.id, text: data.text, anonId: data.anonId, isAdmin: data.isAdmin, time };
      });
      setMessages(list);
    });
    return () => unsub();
  }, []);

  // Listen to typing status of ALL users
  useEffect(() => {
    const unsub = onSnapshot(typingDocRef, (snap) => {
      const data = (snap.data() as any) || {};
      const someoneElseTyping = Object.entries(data).some(
        ([key, value]) => key !== userKey && value === true
      );
      setSomeoneTyping(someoneElseTyping);
    });

    // when leaving screen, mark myself as not typing
    return () => {
      setDoc(
        typingDocRef,
        { [userKey]: false },
        { merge: true }
      ).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (!listRef.current || messages.length === 0) return;
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [messages]);

  // Helper to update typing status in Firestore
  const setTyping = async (isTyping: boolean) => {
    try {
      await setDoc(
        typingDocRef,
        { [userKey]: isTyping },
        { merge: true }
      );
    } catch (e) {
      console.log("Typing status error:", e);
    }
  };

  // Called whenever text changes
  const handleChangeText = (text: string) => {
    setInput(text);

    const hasText = text.trim().length > 0;

    if (hasText) {
      // user is typing
      setTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // if no typing for 1.5s → set false
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
        typingTimeoutRef.current = null;
      }, 1500);
    } else {
      // input cleared
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    await addDoc(collection(db, "groupChatMessages"), {
      text: input.trim(),
      anonId,
      isAdmin: role === "admin",
      timestamp: serverTimestamp(),
    });
    
    // after sending, clear input & typing status
    setInput("");
    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SuperPaac Group Chat</Text>
          <Text style={styles.headerSubtitle}>{role === "admin" ? "Mentor view" : `You are Anonymous #${anonId}`}</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="people" size={16} color="#E5E7EB" />
          <Text style={styles.badgeText}>Everyone</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(it) => it.id}
        style={styles.list}
        renderItem={({ item }) => {
          const mine = role === "admin" ? item.isAdmin === true : item.anonId == anonId;
          // colored bubble when mentor or my message — use white text on these
          const bubbleIsColored = item.isAdmin || mine;
          return (
            <View style={[styles.wrap, mine ? styles.rightWrap : styles.leftWrap]}>
              <View style={[styles.bubble, mine ? styles.myBubble : styles.otherBubble]}>
                <Text style={[styles.nameText, bubbleIsColored ? { color: "#FFFFFF" } : { color: colors.text }]}>{item.isAdmin ? "Mentor" : `Anonymous #${item.anonId}`}</Text>
                <Text style={[styles.msgText, bubbleIsColored ? { color: "#FFFFFF" } : { color: colors.text }]}>{item.text}</Text>
                <Text style={[styles.timeText, bubbleIsColored ? { color: "#E5E7EB" } : { color: isDark ? "#E5E7EB" : colors.textSecondary }]}>{item.time}</Text>
              </View>
            </View>
          );
        }}
        // ensure list can scroll when keyboard is open
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      />

      {/* Typing indicator */}
      {someoneTyping && (
        <View style={styles.typingRow}>
          <View style={styles.typingDots}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
          </View>
          <Text style={styles.typingText}>Someone is typing…</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Say something anonymously…"
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={handleChangeText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={20} color="#050816" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#11270cff" },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#F9FAFB" },
  headerSubtitle: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", backgroundColor: "#111827", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: "#E5E7EB", marginLeft: 6, fontSize: 12 },
  list: { flex: 1, paddingHorizontal: 12 },
  wrap: { marginVertical: 6, flexDirection: "row" },
  leftWrap: { justifyContent: "flex-start" },
  rightWrap: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  myBubble: { backgroundColor: "#6C5CE7" },
  otherBubble: { backgroundColor: "#111827" },
  nameText: { fontSize: 11, fontWeight: "600", color: "#D1D5DB" },
  msgText: { fontSize: 14, color: "#F9FAFB", marginTop: 6 },
  timeText: { fontSize: 10, color: "#E5E7EB", marginTop: 8, alignSelf: "flex-end" },
  inputRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, alignItems: "flex-end" },
  input: { flex: 1, maxHeight: 120, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#111827", color: "#F9FAFB" },
  sendBtn: { marginLeft: 8, width: 44, height: 44, borderRadius: 999, backgroundColor: "#FFC857", alignItems: "center", justifyContent: "center" },
  
  // typing indicator styles
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  typingDots: {
    flexDirection: "row",
    marginRight: 6,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 1,
  },
  typingText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
