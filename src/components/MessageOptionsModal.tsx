// src/components/MessageOptionsModal.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
  onReply: () => void;
  onReact: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function MessageOptionsModal({
  visible,
  onClose,
  onReply,
  onReact,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          {/* TOP ROW: Title + Close */}
          <View style={styles.topRow}>
            <Text style={styles.title}>Message options</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close message options">
              <Ionicons name="close" size={22} color="#222" />
            </TouchableOpacity>
          </View>

          {/* OPTIONS */}
          <TouchableOpacity style={styles.item} onPress={onReply} accessibilityLabel="Reply">
            <Text style={styles.itemText}>Reply</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={onReact} accessibilityLabel="React">
            <Text style={styles.itemText}>React</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={onEdit} accessibilityLabel="Edit">
            <Text style={styles.itemText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={onDelete} accessibilityLabel="Delete">
            <Text style={[styles.itemText, { color: "#D04444" }]}>Delete</Text>
          </TouchableOpacity>

          {/* CANCEL */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} accessibilityLabel="Cancel">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  box: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    // shadow / elevation
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  closeBtn: {
    padding: 6,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  itemText: {
    fontSize: 16,
    color: "#222",
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#6A5AE0",
  },
});
