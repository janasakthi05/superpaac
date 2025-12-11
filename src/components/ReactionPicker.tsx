import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ReactionPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectReaction: (emoji: string) => void;
  currentReaction?: string;
}

const REACTIONS = ['👍', '❤️', '😄', '😮', '😢', '😡'];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  onClose,
  onSelectReaction,
  currentReaction,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>React to this message</Text>
          <View style={styles.reactionRow}>
            {REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.reactionButton,
                  currentReaction === emoji && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  onSelectReaction(emoji);
                  onClose();
                }}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {currentReaction && (
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: colors.error + '20' }]}
              onPress={() => {
                onSelectReaction(''); // Remove reaction
                onClose();
              }}
            >
              <Text style={[styles.removeText, { color: colors.error }]}>Remove Reaction</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  reactionButton: {
    padding: 12,
    borderRadius: 25,
    minWidth: 50,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  removeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});