// app/(tabs)/index.tsx
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
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, storage } from "../../src/firebase";
import { useGlobalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import * as FileSystem from "expo-file-system";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SearchBar } from "../../src/components/SearchBar";
import { ReactionPicker } from "../../src/components/ReactionPicker";
import { ChatInfoModal } from "../../src/components/ChatInfoModal";

type ChatMessage = {
  id: string;
  text: string;
  anonId: string;
  isAdmin: boolean;
  time: string;
  type: "text" | "image" | "file";
  mediaUrl?: string;
  mediaName?: string;
  replyToId?: string | null;
  replyToName?: string | null;
  replyToText?: string | null;
  edited?: boolean;
  pinned?: boolean;
  pinnedBy?: string;
  reactions?: { [userId: string]: string };
};

export default function ChatTabScreen() {
  const router = useRouter();
  const { colors, toggleTheme, isDark } = useTheme();
  const { anonId: anonParam, role: roleParam } = useGlobalSearchParams<{
    anonId?: string;
    role?: string;
  }>();

  const anonId = anonParam || "0";
  const isAdmin = roleParam === "admin";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);

  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionMessage, setReactionMessage] = useState<ChatMessage | null>(null);

  const [showChatInfo, setShowChatInfo] = useState(false);

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  const currentDisplayName = isAdmin ? "SuperPaac Mentor" : `Anonymous #${anonId}`;

  // Real-time messages
  useEffect(() => {
    const q = query(collection(db, "groupChatMessages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: ChatMessage[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          text: data.text ?? "",
          anonId: String(data.anonId ?? "0"),
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
          time:
            data.timestamp?.toDate?.().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) || "",
        };
      });
      setMessages(list);
      setPinnedMessages(list.filter((m) => m.pinned));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => unsub();
  }, []);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredMessages(
      messages.filter((m) => {
        if (m.text && m.text.toLowerCase().includes(q)) return true;
        const sender = m.isAdmin ? "superpaac mentor" : `anonymous #${m.anonId}`;
        if (sender.toLowerCase().includes(q)) return true;
        if (m.mediaName && m.mediaName.toLowerCase().includes(q)) return true;
        return false;
      })
    );
  }, [messages, searchQuery]);

  const getMentions = (text: string) => {
    const m: string[] = [];
    if (text.includes("@SuperPaac Mentor")) m.push("mentor");
    if (text.includes("@Anonymous #")) m.push("student");
    return m;
  };

  // send / edit text
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    try {
      setSending(true);
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
        anonId,
        isAdmin,
        type: "text",
        timestamp: serverTimestamp(),
        mentions: getMentions(trimmed),
      };
      if (replyTo) {
        payload.replyToId = replyTo.id;
        payload.replyToName = replyTo.isAdmin ? "SuperPaac Mentor" : `Anonymous #${replyTo.anonId}`;
        payload.replyToText = replyTo.text.slice(0, 80);
      }
      await addDoc(collection(db, "groupChatMessages"), payload);
      setInput("");
      setReplyTo(null);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      console.log("Send message error:", err);
      Alert.alert("Error", "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  // ---------- UPLOAD HELPERS ----------
  // convert uri to blob (handles content:// on Android, file://, blob: and web)
  const uriToBlob = async (uri: string) => {
    console.log("[DEBUG] uriToBlob called with:", uri);
    try {
      if (!uri) throw new Error("Invalid uri");

      // Android content URIs
      if (uri.startsWith("content://")) {
        // read as base64 then make a blob
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" as any });
        const res = await fetch(`data:application/octet-stream;base64,${base64}`);
        const b = await res.blob();
        console.log("[DEBUG] uriToBlob -> content:// converted, blob size/type:", b.size, b.type);
        return b;
      }

      // file://, blob: or http(s)
      const resp = await fetch(uri);
      const b = await resp.blob();
      console.log("[DEBUG] uriToBlob -> fetched, blob size/type:", b.size, b.type);
      return b;
    } catch (err) {
      console.log("[DEBUG] uriToBlob error:", err);
      throw err;
    }
  };

  const uploadToStorage = async (uri: string, filename: string, onProgress?: (pct: number) => void) => {
    console.log("[DEBUG] uploadToStorage called:", { uri, filename });
    try {
      const blob = await uriToBlob(uri);
      console.log("[DEBUG] uploadToStorage: got blob", { size: blob.size, type: blob.type });

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
              console.log(`[DEBUG] upload progress: ${pct}%`, snapshot.bytesTransferred, "/", snapshot.totalBytes);
            }
          },
          (error) => {
            console.log("[DEBUG] uploadToStorage - upload error:", error);
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(storageRef);
              console.log("[DEBUG] uploadToStorage - success. downloadURL:", url);
              resolve(url);
            } catch (e) {
              console.log("[DEBUG] uploadToStorage - getDownloadURL error:", e);
              reject(e);
            }
          }
        );
      });
    } catch (err) {
      console.log("[DEBUG] uploadToStorage - outer catch:", err);
      throw err;
    }
  };
  // -------------------------------------

  // 2 MB limit
  const MAX_BYTES = 2 * 1024 * 1024;

  // <<-- FIXED: call getInfoAsync without unknown 'size' option, cast result to any for TS
  const checkFileSize = async (uri: string) => {
    try {
      const info: any = await FileSystem.getInfoAsync(uri); // no options object here to avoid TS error
      if (info.exists && typeof info.size === "number") return info.size;
      return undefined;
    } catch (err) {
      console.log("getInfoAsync error:", err);
      return undefined;
    }
  };

  // Handle image picking
  const handlePickImage = async () => {
    try {
      setUploading(true);
      setUploadPercent(0);

      // Request permissions (best practice)
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
          Alert.alert("Permission required", "Please grant photo permissions to upload images.");
          setUploading(false);
          return;
        }
      } catch (e) {
        // ignore permission error - we'll handle when picker returns
      }

      const res: any = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      // For older/newer SDK shapes - use any
      if (res?.canceled || !res?.assets || res.assets.length === 0) {
        setUploading(false);
        return;
      }

      const asset = (res.assets && res.assets[0]) as any;
      const filename = asset.fileName || (asset.uri ? asset.uri.split("/").pop() : `image_${Date.now()}.jpg`);
      const uri = asset.uri;

      // size check
      const size = await checkFileSize(uri);
      if (typeof size === "number" && size > MAX_BYTES) {
        Alert.alert("File too large", "Image must be less than 2 MB.");
        setUploading(false);
        return;
      }

      console.log("[DEBUG] About to upload image:", { uri, filename });

      const url = await uploadToStorage(uri, filename, (pct) => {
        setUploadPercent(pct);
      });

      const payload: any = {
        text: "",
        anonId,
        isAdmin,
        type: "image" as const,
        mediaUrl: url,
        mediaName: filename,
        timestamp: serverTimestamp(),
      };

      if (replyTo) {
        payload.replyToId = replyTo.id;
        payload.replyToName = replyTo.isAdmin ? "SuperPaac Mentor" : `Anonymous #${replyTo.anonId}`;
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
  };

  // Handle file picking
  const handlePickFile = async () => {
    try {
      setUploading(true);
      setUploadPercent(0);

      const resRaw = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      const res = resRaw as any;
      if (res.type !== "success") {
        setUploading(false);
        return;
      }

      const fileUri: string = res.uri;
      const fileName: string = res.name || `file_${Date.now()}`;

      // size check
      const size = await checkFileSize(fileUri);
      if (typeof size === "number" && size > MAX_BYTES) {
        Alert.alert("File too large", "File must be less than 2 MB.");
        setUploading(false);
        return;
      }

      console.log("[DEBUG] About to upload file:", { fileUri, fileName });

      const url = await uploadToStorage(fileUri, fileName, (pct) => {
        setUploadPercent(pct);
      });

      const payload: any = {
        text: "",
        anonId,
        isAdmin,
        type: "file" as const,
        mediaUrl: url,
        mediaName: fileName,
        timestamp: serverTimestamp(),
      };

      if (replyTo) {
        payload.replyToId = replyTo.id;
        payload.replyToName = replyTo.isAdmin ? "SuperPaac Mentor" : `Anonymous #${replyTo.anonId}`;
        payload.replyToText = replyTo.text.slice(0, 80);
      }

      await addDoc(collection(db, "groupChatMessages"), payload);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
      setUploadPercent(0);
      setReplyTo(null);
    } catch (err) {
      console.log("File pick error:", err);
      Alert.alert("Error", "Could not upload file.");
    } finally {
      setUploading(false);
    }
  };

  // long press actions
  const handleMessageLongPress = (msg: ChatMessage) => {
    const mine = msg.isAdmin === isAdmin && msg.anonId === anonId;

    const options: { text: string; onPress: () => void; style?: any }[] = [
      {
        text: "REPLY",
        onPress: () => setReplyTo(msg),
      },
      {
        text: "REACT",
        onPress: () => {
          setReactionMessage(msg);
          setShowReactionPicker(true);
        },
      },
    ];

    if (isAdmin) {
      options.push({
        text: msg.pinned ? "UNPIN" : "PIN MESSAGE",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "groupChatMessages", msg.id), {
              pinned: !msg.pinned,
              pinnedBy: !msg.pinned ? (isAdmin ? "SuperPaac Mentor" : `Anonymous #${anonId}`) : null,
            });
          } catch (err) {
            console.log("Pin/unpin error:", err);
          }
        },
      });
    }

    if (mine) {
      options.push({
        text: "EDIT",
        onPress: () => {
          setEditingMessage(msg);
          setInput(msg.text);
        },
      });

      options.push({
        text: "DELETE",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "groupChatMessages", msg.id));
          } catch (err) {
            console.log("Delete error:", err);
          }
        },
      });
    }

    options.push({
      text: "CANCEL",
      style: "cancel",
      onPress: () => {},
    });

    Alert.alert("Message options", "", options);
  };

  // search handlers
  const handleOpenSearch = () => {
    setShowSearch(true);
    setSearchQuery("");
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleReaction = async (emoji: string) => {
    if (!reactionMessage) return;
    try {
      const userId = isAdmin ? `admin_${anonId}` : `student_${anonId}`;
      const currentReactions = reactionMessage.reactions || {};
      const newReactions = { ...currentReactions };
      if (emoji === "") {
        delete newReactions[userId];
      } else {
        newReactions[userId] = emoji;
      }
      await updateDoc(doc(db, "groupChatMessages", reactionMessage.id), {
        reactions: newReactions,
      });
    } catch (err) {
      console.log("Reaction error:", err);
    }
  };

  const handleLogout = () => {
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
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.isAdmin === isAdmin && item.anonId === anonId;

    return (
      <View style={[styles.bubbleRow, mine ? styles.rightAlign : styles.leftAlign]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => handleMessageLongPress(item)}
          style={[
            styles.bubble,
            item.isAdmin
              ? { backgroundColor: colors.mentorBubble }
              : mine
              ? { backgroundColor: colors.myBubble }
              : {
                  backgroundColor: colors.otherBubble,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
          ]}
        >
          {/* Use white text for colored bubbles, dark text only for light gray other bubble */}
          <Text style={[styles.nameText, { color: item.isAdmin || mine ? "#FFFFFF" : (isDark ? "#E5E7EB" : colors.text) }]}>
            {item.isAdmin ? "SuperPaac Mentor" : `Anonymous #${item.anonId}`}{" "}
            {item.edited && <Text style={[styles.editedLabel, { color: item.isAdmin || mine ? "#FFFFFF" : (isDark ? "#E5E7EB" : colors.text) }]}>(edited)</Text>}
            {item.pinned && (
              <Ionicons name="pin" size={12} color={colors.warning} style={{ marginLeft: 4 }} />
            )}
          </Text>

          {item.replyToId && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyLabel}>Replying to {item.replyToName || "someone"}</Text>
              {!!item.replyToText && <Text style={styles.replyText} numberOfLines={1}>{item.replyToText}</Text>}
            </View>
          )}

          {item.type === "text" && !!item.text && <Text style={[styles.messageText, { color: item.isAdmin || mine ? "#FFFFFF" : (isDark ? "#F9FAFB" : colors.text) }]}>{item.text}</Text>}

          {item.type === "image" && item.mediaUrl && <Image source={{ uri: item.mediaUrl }} style={styles.imageMessage} />}

          {item.type === "file" && item.mediaUrl && (
            <View style={styles.fileContainer}>
              <Ionicons name="document-text-outline" size={18} color={item.isAdmin || mine ? "#FFFFFF" : "#E5E7EB"} />
              <Text style={[styles.fileName, { color: item.isAdmin || mine ? "#FFFFFF" : (isDark ? "#E5E7EB" : colors.text) }]} numberOfLines={1}>{item.mediaName || "Attachment"}</Text>
            </View>
          )}

          <Text style={[styles.timeText, { color: item.isAdmin || mine ? "#FFFFFF" : (isDark ? "#CBD5F5" : colors.textSecondary) }]}>{item.time}</Text>

          {item.reactions && Object.keys(item.reactions).length > 0 && (
            <View style={styles.reactionsContainer}>
              {Object.entries(
                Object.values(item.reactions).reduce((acc: { [emoji: string]: number }, emoji) => {
                  acc[emoji] = (acc[emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setReactionMessage(item);
                    setShowReactionPicker(true);
                  }}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary, colors.info]} style={styles.safe}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}>
          <View style={styles.container}>
            {/* HEADER */}
            <LinearGradient colors={[colors.header, colors.surface]} style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="people" size={20} color="#2c92abff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>SuperPaac Space</Text>
                  <Text style={styles.headerSubtitle}>You’re chatting as {currentDisplayName}</Text>
                </View>
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity onPress={handleOpenSearch} style={styles.headerButton}>
                  <Ionicons name="search" size={20} color="#E5E7EB" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowChatInfo(true)} style={styles.headerButton}>
                  <Ionicons name="information-circle" size={20} color="#E5E7EB" />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
                  <Ionicons name={isDark ? "sunny" : "moon"} size={20} color="#E5E7EB" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleLogout} style={[styles.headerButton, { paddingHorizontal: 12 }]}>
                  <Ionicons name="log-out-outline" size={20} color="#E5E7EB" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* SEARCH BAR */}
            {showSearch && (
              <SearchBar searchQuery={searchQuery} onSearchChange={handleSearchChange} onClose={handleCloseSearch} placeholder="Search messages, names, files..." />
            )}

            {/* PINNED MESSAGES */}
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
                    <TouchableOpacity style={[styles.pinnedMessage, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {
                      const index = messages.findIndex(msg => msg.id === item.id);
                      if (index !== -1) listRef.current?.scrollToIndex({ index, animated: true });
                    }}>
                      <Text style={[styles.pinnedText, { color: colors.text }]} numberOfLines={2}>{item.text || `${item.type} message`}</Text>
                      <Text style={[styles.pinnedBy, { color: colors.textMuted }]}>Pinned by {item.pinnedBy}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* MESSAGES */}
            <View style={styles.messagesContainer}>
              {(showSearch ? filteredMessages : messages).length === 0 && (
                <Text style={styles.emptyText}>{showSearch && searchQuery ? `No results found for "${searchQuery}"` : "Say hi 👋\nShare anything here."}</Text>
              )}

              {/* FlatList with keyboardShouldPersistTaps to enable scroll when keyboard is visible */}
              <FlatList ref={listRef} data={showSearch ? filteredMessages : messages} keyExtractor={(it) => it.id} renderItem={renderMessage} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 12, paddingTop: 4 }} keyboardShouldPersistTaps="handled" onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })} />
            </View>

            {/* REPLY / EDIT BAR */}
            {(replyTo || editingMessage) && (
              <View style={styles.replyBar}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.replyingLabel}>{editingMessage ? "Editing message" : "Replying to"}</Text>
                  {replyTo && (
                    <Text style={styles.replyingTarget} numberOfLines={1}>
                      {replyTo.isAdmin ? "SuperPaac Mentor" : `Anonymous #${replyTo.anonId}`} • {replyTo.text}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => { setReplyTo(null); setEditingMessage(null); }}>
                  <Ionicons name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            )}

            {/* INPUT BAR */}
            <View style={[styles.inputBar, { backgroundColor: "transparent" }]}>
              <View style={[styles.inputGlass, { backgroundColor: colors.input }]}>
                <TouchableOpacity style={styles.iconButton} onPress={handlePickImage}>
                  <Ionicons name="image-outline" size={20} color="#E5E7EB" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={handlePickFile}>
                  <Ionicons name="attach-outline" size={20} color="#E5E7EB" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={() => setInput((prev) => prev.includes("@SuperPaac Mentor") ? prev : (prev ? prev + " " : "") + "@SuperPaac Mentor ")}>
                  <MaterialCommunityIcons name="at" size={20} color="#E5E7EB" />
                </TouchableOpacity>

                <TextInput style={styles.input} placeholder={isAdmin ? "Reply to your students…" : "Share your doubts or thoughts…"} placeholderTextColor="#9CA3AF" value={input} onChangeText={setInput} multiline />

                <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || !input.trim()}>
                  {sending ? <ActivityIndicator size="small" color="#000000ff" /> : <Ionicons name="send" size={18} color="#020617" />}
                </TouchableOpacity>
              </View>
            </View>

            {uploading && (
              <View style={[styles.uploadBanner, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="small" color="#d5b122ff" />
                <Text style={styles.uploadText}>{uploadPercent > 0 ? `Uploading… ${uploadPercent}%` : "Uploading…"}</Text>
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

      <ReactionPicker visible={showReactionPicker} onClose={() => { setShowReactionPicker(false); setReactionMessage(null); }} onSelectReaction={handleReaction} currentReaction={reactionMessage?.reactions?.[isAdmin ? `admin_${anonId}` : `student_${anonId}`]} />

      <ChatInfoModal visible={showChatInfo} onClose={() => setShowChatInfo(false)} isAdmin={isAdmin} anonId={anonId} totalMessages={messages.length} totalParticipants={new Set([...messages.map(m => m.anonId), anonId]).size} sharedMedia={messages.filter(m => m.type !== "text")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(136, 63, 36, 0.6)",
    shadowColor: "#1dcf28ff",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerButton: { padding: 8, marginHorizontal: 4, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.1)" },
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#F9FAFB" },
  headerSubtitle: { fontSize: 12, color: "#f0f5cbff", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  messagesContainer: { flex: 1, paddingHorizontal: 4, paddingTop: 4, paddingBottom: 8 },
  emptyText: { color: "#E5E7EB", textAlign: "center", marginTop: 16, fontSize: 13, opacity: 0.8 },
  bubbleRow: { marginVertical: 3, paddingHorizontal: 8, flexDirection: "row" },
  leftAlign: { justifyContent: "flex-start" },
  rightAlign: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "85%",
    minWidth: 60,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#ec3a3a5a",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 2,
  },
  // Base dark theme colors - overridden by inline styles for light theme
  nameText: { fontSize: 11, fontWeight: "600", color: "#E5E7EB" },
  editedLabel: { fontSize: 10, color: "#E5E7EB" },
  messageText: { fontSize: 14, color: "#F9FAFB", marginTop: 4 },
  timeText: { fontSize: 10, color: "#CBD5F5", marginTop: 4, alignSelf: "flex-end" },
  imageMessage: { width: 220, height: 220, borderRadius: 16, marginTop: 6 },
  fileContainer: { marginTop: 6, flexDirection: "row", alignItems: "center" },
  fileName: { color: "#E5E7EB", fontSize: 12, marginLeft: 6, maxWidth: 180 },
  replyPreview: { marginTop: 6, marginBottom: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: "rgba(15,23,42,0.55)" },
  replyLabel: { fontSize: 10, color: "#CBD5F5" },
  replyText: { fontSize: 11, color: "#E5E7EB" },
  replyBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(32, 33, 34, 0.9)", borderTopWidth: 0.5, borderTopColor: "#9aa258ff" },
  replyingLabel: { fontSize: 11, color: "#6caabfff" },
  replyingTarget: { fontSize: 11, color: "#e0e1dfff" },
  inputBar: { paddingHorizontal: 10, paddingVertical: 8 },
  inputGlass: { flexDirection: "row", alignItems: "flex-end", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(148,163,184,0.3)", shadowColor: "#000000ff", shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  iconButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "rgba(148,163,184,0.4)", alignItems: "center", justifyContent: "center", marginRight: 6, backgroundColor: "rgba(165, 116, 164, 0.5)" },
  input: { flex: 1, maxHeight: 100, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "transparent", color: "#F9FAFB", fontSize: 14 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#e4bc57ff", alignItems: "center", justifyContent: "center", marginLeft: 6 },
  uploadBanner: { position: "absolute", bottom: 80, alignSelf: "center", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  uploadText: { marginLeft: 8, fontSize: 12, color: "#E5E7EB" },
  uploadSuccessToast: { position: "absolute", bottom: 140, alignSelf: "center", backgroundColor: "#4ade80", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  uploadTextSuccess: { marginLeft: 8, fontSize: 12, color: "#ffffff" },
});
