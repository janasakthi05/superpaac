import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Dimensions,
  FlatList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import {
  PinchGestureHandler,
  PanGestureHandler,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

interface ChatInfoModalProps {
  visible: boolean;
  onClose: () => void;
  isAdmin: boolean;
  anonId: string;
  totalMessages: number;
  totalParticipants: number;
  sharedMedia: any[];
}

export const ChatInfoModal: React.FC<ChatInfoModalProps> = ({
  visible,
  onClose,
  isAdmin,
  anonId,
  totalMessages,
  totalParticipants,
  sharedMedia,
}) => {
  const { colors, toggleTheme, isDark } = useTheme();

  /* ---------- MEDIA ---------- */
  const imageMedia = useMemo(
    () => sharedMedia.filter((m) => m.type === "image" && m.mediaUrl),
    [sharedMedia]
  );

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showAllMedia, setShowAllMedia] = useState(false);

  const viewerListRef = useRef<FlatList<any>>(null);

  /* ---------- GESTURES ---------- */
  const scale = useSharedValue(1);

  const pinchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPinch = (e: any) => {
    scale.value = e.nativeEvent.scale;
  };

  const onPinchEnd = () => {
    if (scale.value < 1) scale.value = withTiming(1);
    if (scale.value > 3) scale.value = withTiming(3);
  };

  /* ---------- VIEWER ---------- */
  const openViewer = (index: number) => {
    setViewerIndex(index);
    scale.value = 1;
    setViewerVisible(true);

    requestAnimationFrame(() => {
      viewerListRef.current?.scrollToOffset({
        offset: index * width,
        animated: false,
      });
    });
  };

  const closeViewer = () => {
    setViewerVisible(false);
    scale.value = 1;
  };

  /* ---------- UI ---------- */
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Chat Info
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* PROFILE / OVERVIEW */}
          <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Ionicons name="people" size={34} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              SuperPaac Group
            </Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              Anonymous learning community
            </Text>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {totalMessages}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Messages
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {totalParticipants}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Members
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    { color: colors.primary },
                  ]}
                >
                  {isAdmin ? "Mentor" : "Student"}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Role
                </Text>
              </View>
            </View>
          </View>

          {/* SHARED MEDIA */}
          {imageMedia.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Shared Media
                </Text>
                <TouchableOpacity onPress={() => setShowAllMedia(true)}>
                  <Text style={{ color: colors.primary }}>View all</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {imageMedia.slice(0, 10).map((item, index) => (
                  <TouchableOpacity
                    key={item.id ?? index}
                    style={styles.thumbWrap}
                    onPress={() => openViewer(index)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.mediaUrl }}
                      style={styles.thumb}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* SETTINGS */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={toggleTheme}
            >
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Ionicons
                  name={isDark ? "sunny" : "moon"}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.settingText, { color: colors.text }]}>
                {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* FULL SCREEN IMAGE VIEWER */}
        {viewerVisible && (
          <View style={styles.viewerOverlay}>
            <TouchableOpacity
              style={styles.viewerClose}
              onPress={closeViewer}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>

            <FlatList
              ref={viewerListRef}
              data={imageMedia}
              horizontal
              pagingEnabled
              keyExtractor={(item, idx) => item.id ?? String(idx)}
              renderItem={({ item }) => (
                <PanGestureHandler>
                  <PinchGestureHandler
                    onGestureEvent={onPinch}
                    onEnded={onPinchEnd}
                  >
                    <Animated.Image
                      source={{ uri: item.mediaUrl }}
                      style={[styles.viewerImage, pinchStyle]}
                      resizeMode="contain"
                    />
                  </PinchGestureHandler>
                </PanGestureHandler>
              )}
            />
          </View>
        )}

        {/* VIEW ALL MEDIA GRID */}
        {showAllMedia && (
          <Modal animationType="slide">
            <View
              style={[
                styles.container,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  All Media
                </Text>
                <TouchableOpacity onPress={() => setShowAllMedia(false)}>
                  <Ionicons name="close" size={26} color={colors.text} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={imageMedia}
                numColumns={3}
                keyExtractor={(item, idx) => item.id ?? String(idx)}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={styles.gridItem}
                    onPress={() => {
                      setShowAllMedia(false);
                      setTimeout(() => openViewer(index), 0);
                    }}
                  >
                    <Image
                      source={{ uri: item.mediaUrl }}
                      style={styles.gridImage}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  content: { padding: 16 },

  profileCard: {
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  title: { fontSize: 18, fontWeight: "700" },
  sub: { fontSize: 13, marginTop: 4 },

  statRow: {
    flexDirection: "row",
    marginTop: 18,
    width: "100%",
    justifyContent: "space-around",
  },

  statItem: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 2 },

  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600" },

  thumbWrap: { marginRight: 8 },
  thumb: { width: 84, height: 84, borderRadius: 12 },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  settingText: { fontSize: 16, fontWeight: "500" },

  viewerOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "#000",
  },

  viewerImage: {
    width,
    height,
  },

  viewerClose: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 30,
    right: 20,
    zIndex: 10,
  },

  gridItem: {
    width: width / 3,
    height: width / 3,
    padding: 2,
  },

  gridImage: {
    width: "100%",
    height: "100%",
  },
});
