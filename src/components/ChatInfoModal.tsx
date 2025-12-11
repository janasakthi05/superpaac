import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

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

  const clearChat = () => {
    // This would need to be implemented with proper Firestore permissions
    console.log("Clear chat functionality would go here");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chat Info</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Chat Overview */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.chatIcon}>
              <Ionicons name="people" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.chatTitle, { color: colors.text }]}>SuperPaac Group Chat</Text>
            <Text style={[styles.chatSubtitle, { color: colors.textSecondary }]}>
              Anonymous learning community
            </Text>
          </View>

          {/* Participants */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Participants</Text>
            </View>
            <View style={styles.participantRow}>
              <Text style={[styles.participantText, { color: colors.textSecondary }]}>
                {totalParticipants} active participants
              </Text>
            </View>
            <View style={styles.participantRow}>
              <Ionicons name="person" size={16} color={colors.textMuted} />
              <Text style={[styles.currentUser, { color: colors.text }]}>
                You ({isAdmin ? "SuperPaac Mentor" : `Anonymous #${anonId}`})
              </Text>
            </View>
          </View>

          {/* Statistics */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistics</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Messages:</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalMessages}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Your Role:</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {isAdmin ? "Mentor" : "Student"}
              </Text>
            </View>
          </View>

          {/* Shared Media */}
          {sharedMedia.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="images-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Shared Media</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.mediaGrid}>
                  {sharedMedia.slice(0, 10).map((item, index) => (
                    <TouchableOpacity key={index} style={styles.mediaItem}>
                      {item.type === 'image' ? (
                        <Image source={{ uri: item.url }} style={styles.mediaImage} />
                      ) : (
                        <View style={[styles.filePreview, { backgroundColor: colors.border }]}>
                          <Ionicons name="document" size={24} color={colors.textSecondary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Settings */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
            </View>
            
            <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
              <View style={styles.settingLeft}>
                <Ionicons 
                  name={isDark ? "sunny" : "moon"} 
                  size={20} 
                  color={colors.textSecondary} 
                />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  {isDark ? "Light Mode" : "Dark Mode"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity style={styles.settingRow} onPress={clearChat}>
                <View style={styles.settingLeft}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[styles.settingText, { color: colors.error }]}>Clear Chat</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* About */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            </View>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              SuperPaac Group Chat is a safe and private space for students and mentors to connect, 
              share knowledge, and support each other's learning journey. All conversations are anonymous 
              and secure.
            </Text>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>Version 1.0.0</Text>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  chatIcon: {
    alignSelf: 'center',
    marginBottom: 12,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  chatSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantText: {
    fontSize: 14,
  },
  currentUser: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  mediaItem: {
    width: 80,
    height: 80,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  filePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
  },
});