import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  AccessibilityInfo,
  Alert,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Message = {
  id: string;
  anonId?: string | number;
  isAdmin?: boolean;
  text?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  message?: Message | null;
  currentAnonId: string | number;
  currentRole: string;
  onEdit?: (msg: Message) => void;
  onDelete?: (msg: Message) => void;
};

const MessageOptionsModal: React.FC<Props> = ({
  visible,
  onClose,
  message,
  currentAnonId,
  currentRole,
  onEdit,
  onDelete,
}) => {
  if (!message) return null;

  const isAdmin = currentRole === "admin";
  const isMine = message.isAdmin
    ? isAdmin
    : String(message.anonId) === String(currentAnonId);

  const canDelete = isAdmin || isMine;

  useEffect(() => {
    if (visible) {
      AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
        if (enabled) {
          AccessibilityInfo.announceForAccessibility("Message options opened");
        }
      });
    }
  }, [visible]);

  const confirmDelete = () => {
    Alert.alert(
      "Delete message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete?.(message);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Message options</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            {isMine && (
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onEdit?.(message);
                  onClose();
                }}
              >
                <Text style={styles.optionText}>EDIT</Text>
              </TouchableOpacity>
            )}

            {canDelete && (
              <TouchableOpacity
                style={[styles.option, styles.deleteOption]}
                onPress={confirmDelete}
              >
                <Text style={[styles.optionText, styles.deleteText]}>
                  DELETE
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingBottom: 10,
  },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "600" },

  options: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  option: { paddingVertical: 12, minWidth: "30%", alignItems: "center" },
  optionText: { fontSize: 15, fontWeight: "600", color: "#111827" },

  deleteOption: { backgroundColor: "#FFF1F2", borderRadius: 8 },
  deleteText: { color: "#DC2626" },

  cancel: { paddingVertical: 12, alignItems: "center" },
  cancelText: { fontWeight: "700", color: "#374151" },
});

export default MessageOptionsModal;
