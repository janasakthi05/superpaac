// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Tabs, useGlobalSearchParams, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../src/firebase";

type ChatMsg = {
  timestamp?: any;
};

export default function TabLayout() {
  const { role, anonId } = useGlobalSearchParams<{
    role?: string;
    anonId?: string;
  }>();
  const pathname = usePathname();

  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null);

  const onChatTab =
    pathname === "/(tabs)" ||
    pathname === "/(tabs)/" ||
    pathname === "/" ||
    pathname === "/index";

  const storageKey =
    role && anonId ? `superpaac_lastRead_${role}_${anonId}` : null;

  // 1️⃣ Load lastReadAt once from AsyncStorage
  useEffect(() => {
    if (!storageKey) return;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          setLastReadAt(new Date(stored));
        }
      } catch (e) {
        console.log("Tabs: error reading lastReadAt", e);
      }
    })();
  }, [storageKey]);

  // 2️⃣ Whenever Chat tab is focused, mark everything as read
  useEffect(() => {
    if (!storageKey || !onChatTab) return;

    const now = new Date();

    (async () => {
      try {
        await AsyncStorage.setItem(storageKey, now.toISOString());
        setLastReadAt(now);
        setUnreadCount(0); // instantly clear badge
      } catch (e) {
        console.log("Tabs: error writing lastReadAt", e);
      }
    })();
  }, [onChatTab, storageKey]);

  // 3️⃣ Listen to messages and compute unread > lastReadAt
  useEffect(() => {
    if (!role || !anonId) return;

    const q = query(
      collection(db, "groupChatMessages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => d.data() as ChatMsg);

      // If we never stored lastReadAt yet:
      if (!lastReadAt) {
        // If user is currently on Chat, treat as all read.
        if (onChatTab) {
          setUnreadCount(0);
        } else {
          setUnreadCount(all.length);
        }
        return;
      }

      const unread = all.filter((m) => {
        const ts = m.timestamp?.toDate?.();
        if (!ts) return false;
        return ts > lastReadAt;
      }).length;

      setUnreadCount(unread);
    });

    return () => unsub();
  }, [role, anonId, lastReadAt, onChatTab]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#FACC15",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#242627ff",
          borderTopColor: "#ffe100ff",
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons
                name="chatbubble-ellipses"
                size={size}
                color={color}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Mentor Panel",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="shield-checkmark"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -6,
    top: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#d97025ff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FEFCE8",
    fontSize: 10,
    fontWeight: "700",
  },
});
