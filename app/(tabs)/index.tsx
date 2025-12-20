// app/(tabs)/index.tsx
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";

import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
} from "react-native-gesture-handler";


import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { ChatInfoModal } from "../../src/components/ChatInfoModal";
import { ReactionPicker } from "../../src/components/ReactionPicker";
import { SearchBar } from "../../src/components/SearchBar";
import { useTheme } from "../../src/contexts/ThemeContext";
import { db, storage } from "../../src/firebase";

type ChatMessage = {
  id: string;
  text: string;
  anonId: string;
  isAdmin: boolean;
  time: string;
  type: "text" | "image" | "file";
   createdAt?: Date;
  mediaUrl?: string;
  mediaName?: string;
    mediaSize?: number;
  mediaMime?: string;
  replyToId?: string | null;
  replyToName?: string | null;
  replyToText?: string | null;
  edited?: boolean;
  pinned?: boolean;
  pinnedBy?: string | null;
  reactions?: { [userId: string]: string };
};
type PanEvent = PanGestureHandlerGestureEvent;
// 📅 DATE HELPERS (WhatsApp-style)
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getDateLabel = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};


export default function ChatTabScreen() {
  const router = useRouter();
  const { colors, toggleTheme, isDark } = useTheme();
  const { anonId: anonParam, role: roleParam } = useGlobalSearchParams<{
    anonId?: string;
    role?: string;
  }>();
const handleSwipeReply = useCallback((msg: ChatMessage) => {
  setReplyTo(msg);
}, []);

  const anonId = anonParam || "0";
  const isAdmin = roleParam === "admin";
const scale = useSharedValue(1);
const insets = useSafeAreaInsets();
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;   // 2 MB
const MAX_FILE_BYTES  = 10 * 1024 * 1024;  // 10 MB
const didInitialScrollRef = useRef(false);
const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
const [webMenuMessage, setWebMenuMessage] = useState<ChatMessage | null>(null);
const messageIndexMapRef = useRef<Record<string, number>>({});

  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);

  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionMessage, setReactionMessage] = useState<ChatMessage | null>(null);
const [showMenu, setShowMenu] = useState(false);

  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);

  const [imageViewerVisible, setImageViewerVisible] = useState(false);
const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
const handleOpenImage = useCallback((url: string) => {
  setActiveImageUrl(url);
  setImageViewerVisible(true);
}, []);

const handleCloseImage = useCallback(() => {
  setImageViewerVisible(false);
  setActiveImageUrl(null);
}, []);
const onPinchEvent = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

const handlePinchGesture = (event: PinchGestureHandlerGestureEvent) => {
  scale.value = event.nativeEvent.scale;
};

const handlePinchEnd = () => {
  // limit zoom range
  if (scale.value < 1) {
    scale.value = withTiming(1);
  }
  if (scale.value > 3) {
    scale.value = withTiming(3);
  }
};

const urlRegex = /(https?:\/\/[^\s]+)/g;

const renderMessageText = (text: string, color: string) => {
  const parts = text.split(urlRegex);

  return (
    <Text style={[styles.messageText, { color }]}>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <Text
            key={i}
            style={{ color: "#2563eb", textDecorationLine: "underline" }}
            onPress={() => WebBrowser.openBrowserAsync(part)}
          >
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
};

const getFileIcon = (mime?: string) => {
  if (!mime) return "document-outline";
  if (mime.includes("pdf")) return "document-text";
  if (mime.includes("image")) return "image";
  if (mime.includes("audio")) return "musical-notes";
  if (mime.includes("video")) return "videocam";
  if (mime.includes("zip")) return "archive";
  return "document-outline";
};

const formatSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

const [keyboardHeight, setKeyboardHeight] = useState(0);

  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const scrollScheduledRef = useRef<number | null>(null);
  const lastMessageCountRef = useRef(0);
const handleScroll = useCallback((event: any) => {
  if (!didInitialScrollRef.current) return;

  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

  const distanceFromBottom =
    contentSize.height - (contentOffset.y + layoutMeasurement.height);

 if (distanceFromBottom > 60) {
  setShowScrollDown(true);
} else {
  setShowScrollDown(false);
  setUnreadCount(0); // ✅ reset when user reaches bottom
}
}, []);

  const scrollToMessageSafely = (index: number) => {
  if (!listRef.current) return;

  try {
    listRef.current.scrollToOffset({
      offset: Math.max(index * 80, 0), // estimated message height
      animated: true,
    });
  } catch {
    // ultimate fallback — never crash
    listRef.current.scrollToEnd({ animated: true });
  }
};

const jumpToMessageById = useCallback((messageId: string) => {
  const index = messageIndexMapRef.current[messageId];
  if (index === undefined) return;

  setHighlightedMessageId(messageId);
  setTimeout(() => setHighlightedMessageId(null), 1200);

  requestAnimationFrame(() => {
    try {
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    } catch {
      listRef.current?.scrollToOffset({
        offset: Math.max(index * 80, 0),
        animated: true,
      });
    }
  });
}, []);



  const currentDisplayName = isAdmin ? "SuperPaac Mentor" : "Anonymous";

  // --- realtime subscription (scroll on initial load + updates) ---
  useEffect(() => {
   const q = query(
  collection(db, "groupChatMessages"),
  orderBy("clientTimestamp", "asc")
);

    const unsub = onSnapshot(q, (snap) => {
  const list: ChatMessage[] = snap.docs.map((d) => {
    const data: any = d.data();
    const createdAt: Date =
  data.timestamp?.toDate?.() ??
  new Date(data.clientTimestamp ?? Date.now());

    return {
      id: d.id,
      text: data.text ?? "",
      anonId: String(data.anonId ?? ""),
      isAdmin: !!data.isAdmin,
      type: (data.type as ChatMessage["type"]) || "text",
      mediaUrl: data.mediaUrl,
      mediaName: data.mediaName,
      replyToId: data.replyToId ?? null,
      replyToName: data.replyToName ?? null,
      replyToText: data.replyToText ?? null,
      edited: !!data.edited,
      pinned: !!data.pinned,
      pinnedBy: data.pinnedBy || null,
      reactions: data.reactions || {},
    createdAt,

time: createdAt.toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit",
}),

    };
  });
  

  setMessages(list);
  setPinnedMessages(list.filter((m) => m.pinned));

  // ✅ SCROLL ONLY WHEN A NEW MESSAGE IS ADDED
  if (list.length > lastMessageCountRef.current) {
  const diff = list.length - lastMessageCountRef.current;

  if (showScrollDown) {
    setUnreadCount((c) => c + diff); // ✅ increase badge count
  } else {
    setUnreadCount(0);
  }

  if (!didInitialScrollRef.current) {
  requestAnimationFrame(() => {
    listRef.current?.scrollToEnd({ animated: false });
    didInitialScrollRef.current = true;
  });
} else if (!showScrollDown && !showChatInfo && !imageViewerVisible) {
  requestAnimationFrame(() => {
    listRef.current?.scrollToEnd({ animated: true });
  });
}

}
  lastMessageCountRef.current = list.length;
});


    return () => unsub();
  }, []);

  useEffect(() => {
  const map: Record<string, number> = {};
  messages.forEach((m, i) => {
    map[m.id] = i;
  });
  messageIndexMapRef.current = map;
}, [messages]);


  // --- search filter ---
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredMessages(
      messages.filter((m) => {
        if (m.text && m.text.toLowerCase().includes(q)) return true;
        const sender = m.isAdmin ? "superpaac mentor" : `anonymous`;
        if (sender.toLowerCase().includes(q)) return true;
        if (m.mediaName && m.mediaName.toLowerCase().includes(q)) return true;
        return false;
      })
    );
  }, [messages, searchQuery]);
  useEffect(() => {
  const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
    setKeyboardHeight(e.endCoordinates.height);
  });

  const hideSub = Keyboard.addListener("keyboardDidHide", () => {
    setKeyboardHeight(0);
  });

  return () => {
    showSub.remove();
    hideSub.remove();
  };
}, []);


  // --- helper: mentions ---
  const getMentions = useCallback((text: string) => {
    const m: string[] = [];
    if (text.includes("@SuperPaac Mentor")) m.push("mentor");
    if (text.includes("@Anonymous")) m.push("student");
    return m;
  }, []);

  // --- send / edit handler ---
  

    const handleSend = useCallback(async () => {
  const trimmed = input.trim();
  if (!trimmed || sending) return;

  setSending(true);
  try {
    // EDIT MESSAGE
    if (editingMessage) {
      await updateDoc(doc(db, "groupChatMessages", editingMessage.id), {
        text: trimmed,
        edited: true,
      });
      setEditingMessage(null);
      setReplyTo(null);
      setInput("");
      return;
    }

   const payload: any = {
  text: trimmed,
  anonId: String(anonId),
  conversationId: String(anonId),
  isAdmin,
  type: "text",

  // 🔑 BOTH timestamps
  timestamp: serverTimestamp(),
  clientTimestamp: Date.now(),
};



    if (replyTo) {
      payload.replyToId = replyTo.id;
      payload.replyToName = replyTo.isAdmin
        ? "SuperPaac Mentor"
        : "Anonymous";
      payload.replyToText = replyTo.text.slice(0, 80);
    }

    await addDoc(collection(db, "groupChatMessages"), payload);

    setInput("");
    setReplyTo(null);
  } catch (err) {
    console.log("Send message error:", err);
    Alert.alert("Error", "Could not send message.");
  } finally {
    setSending(false);
  }
}, [
  input,
  sending,
  editingMessage,
  anonId,
  isAdmin,
  replyTo,
  getMentions,
]);


  // --- upload utilities ---
  const uriToBlob = useCallback(async (uri: string) => {
    if (!uri) throw new Error("Invalid uri");
    if (uri.startsWith("content://")) {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" as any });
      const res = await fetch(`data:application/octet-stream;base64,${base64}`);
      return await res.blob();
    }
    const resp = await fetch(uri);
    return await resp.blob();
  }, []);

  const uploadToStorage = useCallback(async (uri: string, filename: string, onProgress?: (pct: number) => void) => {
    const blob = await uriToBlob(uri);
    const contentType = blob.type || (filename.match(/\.(\w+)$/) ? `image/${filename.split(".").pop()}` : "application/octet-stream");
    const storageRef = ref(storage, `chatMedia/${Date.now().toString()}-${filename}`);
    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });

    return await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (onProgress && snapshot.totalBytes) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (error) => reject(error),
        async () => {
          try {
            const url = await getDownloadURL(storageRef);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }, [uriToBlob]);

  const MAX_BYTES = 2 * 1024 * 1024;
  const checkFileSize = useCallback(async (uri: string) => {
    try {
      const info: any = await FileSystem.getInfoAsync(uri);
      if (info.exists && typeof info.size === "number") return info.size;
      return undefined;
    } catch {
      return undefined;
    }
  }, []);

  const handlePickImage = useCallback(async () => {
    try {
      setUploading(true);
      setUploadPercent(0);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission required", "Please grant photo permissions to upload images.");
        setUploading(false);
        return;
      }

      const res: any = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (res?.canceled || !res?.assets || res.assets.length === 0) {
        setUploading(false);
        return;
      }

      const asset = (res.assets && res.assets[0]) as any;
      const filename = asset.fileName || (asset.uri ? asset.uri.split("/").pop() : `image_${Date.now()}.jpg`);
      const uri = asset.uri;

      const size = await checkFileSize(uri);
      if (typeof size === "number" && size > MAX_IMAGE_BYTES) {
  Alert.alert("Image too large", "Image must be less than 2 MB.");
  setUploading(false);
  return;
}

      const url = await uploadToStorage(uri, filename, (pct) => setUploadPercent(pct));
const payload: any = {
  text: "",
  anonId,
  conversationId: String(anonId),
  isAdmin,
  type: "image",
  mediaUrl: url,
  mediaName: filename,

  timestamp: serverTimestamp(),
  clientTimestamp: Date.now(),
};


      if (replyTo) {
        payload.replyToId = replyTo.id;
        payload.replyToName = replyTo.isAdmin ? "SuperPaac Mentor" : `Anonymous`;
        payload.replyToText = replyTo.text.slice(0, 80);
      }

      await addDoc(collection(db, "groupChatMessages"), payload);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
      setUploadPercent(0);
      setReplyTo(null);
    } catch (err) {
      console.log("Image pick error:", err);
      Alert.alert("Error", "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }, [anonId, isAdmin, checkFileSize, uploadToStorage, replyTo]);

  const handlePickFile = useCallback(async () => {
  try {
    setUploading(true);
    setUploadPercent(0);

    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (res.canceled || !res.assets?.length) {
      setUploading(false);
      return;
    }

    const file = res.assets[0];
// 🔒 SIZE CHECK
if (file.size && file.size > MAX_FILE_BYTES) {
  Alert.alert(
    "File too large",
    "File size must be less than 10 MB."
  );
  setUploading(false);
  return;
}
    const url = await uploadToStorage(
      file.uri,
      file.name,
      (pct) => setUploadPercent(pct)
    );

    await addDoc(collection(db, "groupChatMessages"), {
  anonId,
  conversationId: String(anonId),
  isAdmin,
  type: "file",
  mediaUrl: url,
  mediaName: file.name,
  mediaSize: file.size,
  mediaMime: file.mimeType,

  timestamp: serverTimestamp(),
  clientTimestamp: Date.now(),
});


    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 2000);
  } catch (e) {
    Alert.alert("Error", "File upload failed");
  } finally {
    setUploading(false);
  }
}, [anonId, isAdmin, uploadToStorage]);

const handleCopyMessage = async (msg: ChatMessage) => {
  try {
    if (msg.type === "text" && msg.text) {
      await Clipboard.setStringAsync(msg.text);
    } else if (msg.mediaUrl) {
      await Clipboard.setStringAsync(msg.mediaUrl);
    }

    // ✅ Web-safe feedback
    if (Platform.OS === "web") {
      console.log("Copied to clipboard");
    } else {
      Alert.alert("Copied", "Message copied to clipboard");
    }
  } catch (err) {
    if (Platform.OS === "web") {
      console.error("Copy failed", err);
    } else {
      Alert.alert("Error", "Copy failed");
    }
  }
};


  // --- long press options: REPLY + (mentor: EDIT) or (non-mentor: REACT) + PIN(for mentors) + edit/delete if mine + CANCEL ---
  const handleMessageLongPress = useCallback(
  (msg: ChatMessage) => {
    const mine = msg.isAdmin === isAdmin && msg.anonId === anonId;

    const options: { text: string; onPress: () => void; style?: any }[] = [];

    /**
     * REACT
     * - Anonymous: other users only
     * - Admin: other users only
     */
    if (!mine) {
      options.push({
        text: "REACT",
        onPress: () => {
          setReactionMessage(msg);
          setShowReactionPicker(true);
        },
      });
    }

    /**
     * EDIT
     * - Own message only (anonymous or admin)
     */
    if (mine) {
      options.push({
        text: "EDIT",
        onPress: () => {
          setEditingMessage(msg);
          setInput(msg.text || "");
        },
      });
    }
options.push({
  text: "COPY",
  onPress: () => handleCopyMessage(msg),
});

    /**
     * PIN / UNPIN
     * - Admin only (own + others)
     */
    if (isAdmin) {
      options.push({
        text: msg.pinned ? "UNPIN" : "PIN MESSAGE",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "groupChatMessages", msg.id), {
              pinned: !msg.pinned,
              pinnedBy: !msg.pinned ? "SuperPaac Mentor" : null,
            });
          } catch (err) {
            console.log("Pin/unpin error:", err);
          }
        },
      });
    }

    /**
     * DELETE
     * - Own message (anonymous or admin)
     * - Any message if admin
     * - ALWAYS with confirmation
     */
    if (mine || isAdmin) {
      options.push({
        text: "DELETE",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete message",
            "Are you sure you want to delete this message?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteDoc(doc(db, "groupChatMessages", msg.id));
                  } catch (err) {
                    console.log("Delete error:", err);
                  }
                },
              },
            ]
          );
        },
      });
    }

    options.push({
      text: "CANCEL",
      style: "cancel",
      onPress: () => {},
    });

    if (Platform.OS === "web") {
  setWebMenuMessage(msg);
  return;
}

Alert.alert("Message options", "", options);

  },
  [anonId, isAdmin]
);


  const handleReaction = useCallback(async (emoji: string) => {
    if (!reactionMessage) return;
    try {
      const userId = isAdmin ? `admin_${anonId}` : `student_${anonId}`;
      const currentReactions = reactionMessage.reactions || {};
      const newReactions = { ...currentReactions };
      if (emoji === "") delete newReactions[userId];
      else newReactions[userId] = emoji;
      await updateDoc(doc(db, "groupChatMessages", reactionMessage.id), {
        reactions: newReactions,
      });
    } catch (err) {
      console.log("Reaction error:", err);
    }
  }, [reactionMessage, isAdmin, anonId]);

  const handleOpenSearch = useCallback(() => {
    setShowSearch(true);
    setSearchQuery("");
  }, []);

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery("");
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

 const handleLogout = useCallback(() => {
  // 🌐 WEB: use browser confirm (Alert.alert is broken on web)
  if (Platform.OS === "web") {
    const ok = window.confirm("Are you sure you want to logout?");
    if (ok) {
      // 🔥 hard reset – exits /(tabs) completely
      window.location.replace("/login");
    }
    return;
  }

  // 📱 MOBILE: native Alert works correctly
  Alert.alert(
    "Logout",
    "Are you sure you want to logout?",
    [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => router.replace("/login"),
      },
    ],
    { cancelable: true }
  );
}, [router]);

  const MessageBubble = React.memo(
  ({ item }: { item: ChatMessage }) => {
    const mine = item.isAdmin === isAdmin && item.anonId === anonId;
    const translateX = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const onGestureEvent = (e: PanEvent) => {
      translateX.value = e.nativeEvent.translationX;
    };

    const onGestureEnd = () => {
      if (Math.abs(translateX.value) > 60) {
        runOnJS(handleSwipeReply)(item);
      }
      translateX.value = withTiming(0);
    };

    const bubbleStyle = item.isAdmin
      ? { backgroundColor: colors.mentorBubble }
      : mine
      ? { backgroundColor: colors.myBubble }
      : {
          backgroundColor: colors.otherBubble,
          borderColor: colors.border,
          borderWidth: 1,
        };
const isHighlighted = item.id === highlightedMessageId;

    return (
      <View style={[styles.bubbleRow, mine ? styles.rightAlign : styles.leftAlign]}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onEnded={onGestureEnd}
          activeOffsetX={[-10, 10]}
        >
          <Animated.View style={animatedStyle}>
           <TouchableOpacity
  activeOpacity={0.9}
  onLongPress={() => handleMessageLongPress(item)}
  style={[
    styles.bubble,
    bubbleStyle,
    isHighlighted && {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    item.type === "image" && styles.imageBubble,
  ]}
>
             <Text
  style={[styles.nameText, { color: colors.text }]}
  numberOfLines={1}
  ellipsizeMode="tail"
>
  {item.isAdmin ? "SuperPaac Mentor" : "Anonymous"}
  {item.edited && <Text style={styles.editedLabel}> (edited)</Text>}
</Text>

{item.pinned && (
  <Ionicons
    name="pin"
    size={12}
    color={colors.warning}
    style={{ marginLeft: 4, alignSelf: "flex-start" }}
  />
)}
              {item.replyToId && (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={() => jumpToMessageById(item.replyToId!)}
    style={styles.replyPreview}
  >

                  <Text
                    style={[styles.replyLabel, { color: colors.textSecondary }]}
                  >
                    Replying to {item.replyToName || "someone"}
                  </Text>
                  {!!item.replyToText && (
                    <Text
                      style={[styles.replyText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.replyToText}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

             {item.type === "text" && !!item.text && (
  renderMessageText(item.text, colors.text)
)}

             {item.type === "image" && item.mediaUrl && (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() => handleOpenImage(item.mediaUrl!)}
  >
    <View
      style={[
        styles.imageWrapper,
        { alignSelf: mine ? "flex-end" : "flex-start" },
      ]}
    >
      <Image
  source={{ uri: item.mediaUrl }}
  style={styles.imageMessage}
  resizeMode="cover"
  
/>
    </View>
  </TouchableOpacity>
)}

{item.type === "file" && item.mediaUrl && (
  <TouchableOpacity
    style={[
      styles.fileContainer,
      { backgroundColor: colors.surface },
    ]}
    onPress={() => WebBrowser.openBrowserAsync(item.mediaUrl!)}
  >
    <View style={styles.fileIconBox}>
      <Ionicons
        name={getFileIcon(item.mediaMime)}
        size={22}
        color={colors.primary}
      />
    </View>

    <View style={styles.fileTextBox}>
      <Text
  style={[styles.fileName, { color: colors.text }]}
  numberOfLines={2}          // ✅ REQUIRED
  ellipsizeMode="tail"
>
  {item.mediaName}
</Text>

      <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
        {formatSize(item.mediaSize)}
      </Text>
    </View>
  </TouchableOpacity>
)}


              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {item.time}
              </Text>

              {item.reactions && Object.keys(item.reactions).length > 0 && (
                <View style={styles.reactionsContainer}>
                  {Object.entries(
                    Object.values(item.reactions).reduce(
                      (acc: { [emoji: string]: number }, emoji) => {
                        acc[emoji] = (acc[emoji] || 0) + 1;
                        return acc;
                      },
                      {}
                    )
                  ).map(([emoji, count]) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.reactionBadge,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        setReactionMessage(item);
                        setShowReactionPicker(true);
                      }}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      <Text
                        style={[
                          styles.reactionCount,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {count}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.text === next.item.text &&
      prev.item.mediaUrl === next.item.mediaUrl &&
      prev.item.edited === next.item.edited &&
      prev.item.pinned === next.item.pinned &&
      JSON.stringify(prev.item.reactions) ===
        JSON.stringify(next.item.reactions)
    );
  }
);
  const messagesToRender = useMemo(() => (showSearch ? filteredMessages : messages), [showSearch, filteredMessages, messages]);
const renderItem = useCallback(
  ({ item, index }: ListRenderItemInfo<ChatMessage>) => {
    const prev = messagesToRender[index - 1];

    const itemDate = item.createdAt!;
    const prevDate = prev?.createdAt ?? null;

    const showDateSeparator =
      !prevDate || !isSameDay(itemDate, prevDate);

    return (
      <>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {getDateLabel(itemDate)}
            </Text>
          </View>
        )}
        <MessageBubble item={item} />
      </>
    );
  },
  [messagesToRender]
);


  const keyExtractor = useCallback((it: ChatMessage) => it.id, []);



  return (
    <SafeAreaView style={styles.safe}>
  <LinearGradient
    colors={
      isDark
        ? ["#020617", "#020617"]
        : ["#f8fafc", "#eef2ff"]
    }
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.safe}
  >


       <KeyboardAvoidingView
  style={styles.safe}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
>
          <View style={styles.container}>
            {/* HEADER */}
            <View
  style={[
    styles.header,
    {
      paddingTop: insets.top + 10,
      backgroundColor: colors.header,
    },
  ]}


>

              <View style={styles.headerLeft}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="people" size={20} color="#2c92abff" />
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>SuperPaac Space</Text>
                  <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>You’re chatting as {currentDisplayName}</Text>
                </View>
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity onPress={handleOpenSearch} style={styles.headerButton}>
                  <Ionicons name="search" size={20} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowChatInfo(true)} style={styles.headerButton}>
                  <Ionicons name="information-circle" size={20} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
                  <Ionicons name={isDark ? "sunny" : "moon"} size={20} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleLogout} style={[styles.headerButton, { paddingHorizontal: 12 }]}>
                  <Ionicons name="log-out-outline" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* SEARCH */}
            {showSearch && (
              <SearchBar searchQuery={searchQuery} onSearchChange={handleSearchChange} onClose={handleCloseSearch} placeholder="Search messages, names, files..." />
            )}

            {/* PINNED */}
            {!showSearch && pinnedMessages.length > 0 && (
              <View style={[styles.pinnedSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={styles.pinnedHeader}>
                  <Ionicons name="pin" size={16} color={colors.warning} />
                  <Text style={[styles.pinnedTitle, { color: colors.text }]}>Pinned Messages</Text>
                </View>
                <FlatList
                  data={pinnedMessages}
                  keyExtractor={(item) => `pinned-${item.id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.pinnedMessage, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                    onPress={() => {
  const index = messages.findIndex(msg => msg.id === item.id);
  if (index !== -1) {
    scrollToMessageSafely(index);
  }
}}

                    >
                      <Text style={[styles.pinnedText, { color: colors.text }]} numberOfLines={2}>{item.text || `${item.type} message`}</Text>
                      <Text style={[styles.pinnedBy, { color: colors.textMuted }]}>Pinned by {item.pinnedBy}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* MESSAGES */}
            <View style={styles.messagesContainer}>
              {messagesToRender.length === 0 && <Text style={[styles.emptyText, { color: colors.text }]}>{showSearch && searchQuery ? `No results found for "${searchQuery}"` : "Say hi 👋\nShare anything here."}</Text>}

              <FlatList
  ref={listRef}
  data={messagesToRender}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  style={{ flex: 1 }}
  contentContainerStyle={{ paddingBottom: 12, paddingTop: 4 }}
  initialNumToRender={18}
  maxToRenderPerBatch={10}
  windowSize={9}
  removeClippedSubviews={true}
  onScroll={handleScroll}              // ✅ ADD
  scrollEventThrottle={16}  
 onScrollToIndexFailed={(info) => {
    setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: Math.max(info.index * 80, 0),
        animated: true,
      });
    }, 300);
  }}
 
/>

            </View>

            {/* REPLY / EDIT BAR */}
            {(replyTo || editingMessage) && (
              <View style={[styles.replyBar, { backgroundColor: colors.surface }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.replyingLabel, { color: colors.textSecondary }]}>{editingMessage ? "Editing message" : "Replying to"}</Text>
                  {replyTo && (
                    <Text style={[styles.replyingTarget, { color: colors.text }]} numberOfLines={1}>
                      {replyTo.isAdmin ? "SuperPaac Mentor" : `Anonymous`} • {replyTo.text}
                    </Text>
                  )}
                </View>
              <TouchableOpacity onPress={() => { setReplyTo(null); setEditingMessage(null); }}>
  <Ionicons name="close" size={18} color={colors.textSecondary} />
</TouchableOpacity>

              </View>
            )}

            {/* INPUT BAR */}
            <View style={[styles.inputBar, { backgroundColor: "transparent" }]}>
              <View style={[styles.inputGlass, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.iconButton} onPress={handlePickImage}>
                  <Ionicons name="image-outline" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handlePickFile}>
  <Ionicons name="attach-outline" size={20} color={colors.text} />
</TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={() => setInput((prev) => prev.includes("@SuperPaac Mentor") ? prev : (prev ? prev + " " : "") + "@SuperPaac Mentor ")}>
                  <MaterialCommunityIcons name="at" size={20} color={colors.text} />
                </TouchableOpacity>

                <TextInput style={[styles.input, { color: colors.text }]} placeholder={isAdmin ? "Reply to your students…" : "Share your thoughts…"} placeholderTextColor={colors.textSecondary} value={input} onChangeText={setInput} multiline />

                <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || !input.trim()}>
                  {sending ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="send" size={18} color={isDark ? "#020617" : "#020617"} />}
                </TouchableOpacity>
              </View>
            </View>

            {uploading && (
              <View style={[styles.uploadBanner, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.uploadText, { color: colors.text }]}>{uploadPercent > 0 ? `Uploading… ${uploadPercent}%` : "Uploading…"}</Text>
              </View>
            )}

            {uploadSuccess && (
              <View style={styles.uploadSuccessToast}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.uploadTextSuccess}>Upload Successful</Text>
              </View>
            )}
          </View>
          
        </KeyboardAvoidingView>
      </LinearGradient>
{/* ⬇️ SCROLL TO BOTTOM BUTTON */}
{showScrollDown && (
  <TouchableOpacity
    activeOpacity={0.85}
    style={styles.scrollDownButton}
    onPress={() => {
      listRef.current?.scrollToEnd({ animated: true });
      setShowScrollDown(false);
    }}
  >
    <Ionicons name="chevron-down" size={26} color="#fff" />

{unreadCount > 0 && (
  <View style={styles.unreadBadge}>
    <Text style={styles.unreadBadgeText}>
      {unreadCount > 99 ? "99+" : unreadCount}
    </Text>
  </View>
)}

  </TouchableOpacity>
)}

      <ReactionPicker visible={showReactionPicker} onClose={() => { setShowReactionPicker(false); setReactionMessage(null); }} onSelectReaction={handleReaction} currentReaction={reactionMessage?.reactions?.[isAdmin ? `admin_${anonId}` : `student_${anonId}`]} />
        {Platform.OS === "web" && webMenuMessage && (
  <View style={styles.webMenuOverlay}>
    <View style={styles.webMenu}>
      {!(
        webMenuMessage.isAdmin === isAdmin &&
        webMenuMessage.anonId === anonId
      ) && (
        <TouchableOpacity
          onPress={() => {
            setReactionMessage(webMenuMessage);
            setShowReactionPicker(true);
            setWebMenuMessage(null);
          }}
        >
          <Text style={styles.webMenuItem}>React</Text>
        </TouchableOpacity>
      )}

      {(webMenuMessage.isAdmin === isAdmin &&
        webMenuMessage.anonId === anonId) && (
        <TouchableOpacity
          onPress={() => {
            setEditingMessage(webMenuMessage);
            setInput(webMenuMessage.text || "");
            setWebMenuMessage(null);
          }}
        >
          <Text style={styles.webMenuItem}>Edit</Text>
        </TouchableOpacity>
      )}

      {isAdmin && (
        <TouchableOpacity
          onPress={async () => {
            await updateDoc(
              doc(db, "groupChatMessages", webMenuMessage.id),
              {
                pinned: !webMenuMessage.pinned,
                pinnedBy: webMenuMessage.pinned
                  ? null
                  : "SuperPaac Mentor",
              }
            );
            setWebMenuMessage(null);
          }}
        >
          <Text style={styles.webMenuItem}>
            {webMenuMessage.pinned ? "Unpin" : "Pin"}
          </Text>
        </TouchableOpacity>
      )}

      {(isAdmin ||
        (webMenuMessage.isAdmin === isAdmin &&
          webMenuMessage.anonId === anonId)) && (
        <TouchableOpacity
          onPress={async () => {
            await deleteDoc(
              doc(db, "groupChatMessages", webMenuMessage.id)
            );
            setWebMenuMessage(null);
          }}
        >
          <Text style={[styles.webMenuItem, { color: "red" }]}>
            Delete
          </Text>
        </TouchableOpacity>
      )}
<TouchableOpacity
  onPress={() => {
    if (webMenuMessage) {
      handleCopyMessage(webMenuMessage);
    }
    setWebMenuMessage(null);
  }}
>
  <Text style={styles.webMenuItem}>Copy</Text>
</TouchableOpacity>


      <TouchableOpacity onPress={() => setWebMenuMessage(null)}>
        <Text style={styles.webMenuCancel}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
)}


      <ChatInfoModal visible={showChatInfo} onClose={() => setShowChatInfo(false)} isAdmin={isAdmin} anonId={anonId} totalMessages={messages.length} totalParticipants={new Set([...messages.map(m => m.anonId), anonId]).size} sharedMedia={messages.filter(m => m.type !== "text")} />
      {imageViewerVisible && activeImageUrl && (
  <TouchableOpacity
    activeOpacity={1}
    style={styles.imageViewerOverlay}
    onPress={handleCloseImage}
  >
    <TouchableOpacity
      style={styles.imageViewerClose}
      onPress={handleCloseImage}
    >
      <Ionicons name="close" size={28} color="#fff" />
    </TouchableOpacity>

    <PinchGestureHandler
      onGestureEvent={handlePinchGesture}
      onEnded={handlePinchEnd}
    >
      <Animated.Image
        source={{ uri: activeImageUrl }}
        style={[styles.imageViewerImage, onPinchEvent]}
        resizeMode="contain"
      />
    </PinchGestureHandler>
  </TouchableOpacity>
)}


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: {
      minHeight: 64,              
  paddingBottom: 8,
  paddingHorizontal: 16,
  flexDirection: "row",
  alignItems: "center",        // ✅ keep vertical centering
  borderBottomWidth: 0.5,
  borderBottomColor: "rgba(136, 63, 36, 0.6)",
  shadowColor: "#ea9bcaff",
  shadowOpacity: 0.3,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
},
unreadBadge: {
  position: "absolute",
  top: -4,
  right: -4,
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: "#ef4444", // WhatsApp red
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 5,
},

unreadBadgeText: {
  color: "#fff",
  fontSize: 11,
  fontWeight: "700",
},

scrollDownButton: {
  position: "absolute",
  right: 18,
  bottom: 90,              // above input bar
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: "#111827",
borderWidth: 1,
borderColor: "rgba(255,255,255,0.15)",

  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
  zIndex: 100,
},

  headerLeft: {
    
  flexDirection: "row",
  alignItems: "center",
  flex: 1,          // ✅ pushes icons to the right cleanly
  minHeight: 44,    // ✅ consistent vertical alignment
},
headerButton: {
  width: 40,          // ✅ give breathing room
  height: 40,
  alignItems: "center",
  justifyContent: "center",
  marginHorizontal: 1,
  borderRadius: 20,
},


  pinnedSection: { borderBottomWidth: 1, paddingVertical: 8 },
  pinnedHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  pinnedTitle: { fontSize: 14, fontWeight: "600", marginLeft: 8 },
  pinnedMessage: { width: 200, padding: 12, marginHorizontal: 8, borderRadius: 12, borderWidth: 1 },
  pinnedText: { fontSize: 13, lineHeight: 18 },
  pinnedBy: { fontSize: 11, marginTop: 4 },
  reactionsContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 4 },
  reactionBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  reactionEmoji: { fontSize: 14, marginRight: 4 },
  reactionCount: { fontSize: 12, fontWeight: "600" },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(232, 196, 105, 0.81)", alignItems: "center", justifyContent: "center", marginRight: 10 },
  headerTitle: {
  fontSize: 18,
  fontWeight: "700",
  letterSpacing: 0.3,
},

headerSubtitle: {
  fontSize: 12,
  marginTop: 2,
  opacity: 0.75,
},

  headerRight: {
     height: "100%", 
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  minHeight: 44,    // ✅ same height as left
},

  messagesContainer: { flex: 1, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8 },
  emptyText: { textAlign: "center", marginTop: 16, fontSize: 13, opacity: 0.8 },
  bubbleRow: { marginVertical: 3, paddingHorizontal: 8, flexDirection: "row" },
  leftAlign: { justifyContent: "flex-start" },
  rightAlign: { justifyContent: "flex-end" },
  bubble: {
  maxWidth: Platform.OS === "web" ? "82%" : "92%",
  minWidth: 120,
  borderRadius: 18,
  paddingHorizontal: 14,
  paddingVertical: 10,
  backgroundColor: "#ffffff",
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
},

  nameText: {
  fontSize: 12,
  fontWeight: "600",
  marginBottom: 2,
  opacity: 0.85,
},
  editedLabel: { fontSize: 10 },
  messageText: {
  fontSize: 15,
  lineHeight: 22,
  marginTop: 6,
  letterSpacing: 0.15,
},

  timeText: {
  fontSize: 11,
  marginTop: 6,
  opacity: 0.6,
  alignSelf: "flex-end",
},
  imageMessage: {
  width: "100%",
  maxWidth: Platform.OS === "web" ? 300 : 240,
  maxHeight: Platform.OS === "web" ? 400 : 320,
  aspectRatio: 3 / 4,
  borderRadius: 18,
},

imageWrapper: {
  marginTop: 8,
  borderRadius: 18,
  overflow: "hidden",
  backgroundColor: "#00000010",
  maxWidth: Platform.OS === "web" ? 320 : 260,
  width: "100%",
},

imageBubble: {
  padding: 6,
  maxWidth: Platform.OS === "web" ? 320 : 260,
},
fileContainer: {
  marginTop: 6,
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 14,
  gap: 12,width: "100%",          // ✅ force measurable width
  alignSelf: "stretch",              // 🔑 ensures width on mobile
},

fileIconBox: {
  width: 36,               // ✅ balanced size (not too big, not too small)
  height: 36,
  borderRadius: 10,
  backgroundColor: "rgba(99,102,241,0.12)",
  alignItems: "center",
  justifyContent: "center",
},

fileTextBox: {
  flex: 1,                 // 🔑 takes remaining space
  minWidth: 0,  flexShrink: 1,            // 🔑 REQUIRED for text visibility on mobile
  justifyContent: "center",
},

fileName: {
  fontSize: 14,            // ✅ readable on mobile & web
  fontWeight: "600",
  lineHeight: 18,  flexShrink: 1, 
},

fileMeta: {
  fontSize: 11,
  marginTop: 2,
  opacity: 0.75,
},

webMenuOverlay: {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
},

webMenu: {
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 16,
  width: 260,
},

webMenuItem: {
  fontSize: 15,
  paddingVertical: 10,
},

webMenuCancel: {
  fontSize: 14,
  paddingTop: 12,
  textAlign: "center",
  opacity: 0.6,
},

  replyPreview: { marginTop: 6, marginBottom: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  replyLabel: { fontSize: 10 },
  replyText: { fontSize: 11 },
  replyBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6 },
  replyingLabel: { fontSize: 11 },
  replyingTarget: { fontSize: 11 },
  inputBar: { paddingHorizontal: 10, paddingVertical: 8 },
 inputGlass: {
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 28,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderWidth: 1,
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
},

  iconButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 6 },
 input: {
  flex: 1,
  fontSize: 15,
  lineHeight: 22,
  paddingHorizontal: 12,
  paddingVertical: 8,
},

  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#e4bc57ff", alignItems: "center", justifyContent: "center", marginLeft: 6 },
  uploadBanner: { position: "absolute", bottom: 80, alignSelf: "center", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  uploadText: { marginLeft: 8, fontSize: 12 },
  uploadSuccessToast: { position: "absolute", bottom: 140, alignSelf: "center", backgroundColor: "#4ade80", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  uploadTextSuccess: { marginLeft: 8, fontSize: 12, color: "#ffffff" },
  imageViewerOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.95)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
},

imageViewerImage: {
  width: "100%",
  height: "100%",
},

imageViewerClose: {
  position: "absolute",
  top: 50,
  right: 20,
  zIndex: 1000,
},
dateSeparator: {
  alignSelf: "center",
  marginVertical: 12,
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 14,
  backgroundColor: "rgba(0,0,0,0.15)",
},
dateSeparatorText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#e5e7eb",
},

});


