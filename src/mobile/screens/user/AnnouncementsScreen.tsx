import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { Announcement } from "../../services/userApi";
import {
  getSeenAnnouncementIds,
  saveSeenAnnouncementIds,
  showLocalNotification,
} from "../../services/notificationsService";

const POLL_INTERVAL_MS = 60_000; // match web app's 60-second polling

export function AnnouncementsScreen() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAndNotify = useCallback(
    async (silent = false) => {
      if (!user) return;
      try {
        const data = await userApi.getAnnouncements(user.email);
        setAnnouncements(data);

        // Fire local notifications for any new unread announcements
        const seen = await getSeenAnnouncementIds();
        const newUnread = data.filter((a: Announcement) => !a.read && !seen.has(a.id));
        for (const a of newUnread) {
          await showLocalNotification(a.title, a.body);
        }
        if (newUnread.length > 0) {
          const updated = new Set(seen);
          newUnread.forEach((a: Announcement) => updated.add(a.id));
          await saveSeenAnnouncementIds(updated);
        }
      } catch (err) {
        if (!silent) console.warn("[AnnouncementsScreen] Failed to fetch", err);
      }
    },
    [user],
  );

  // Full load (with spinner) when screen first mounts or gains focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        await fetchAndNotify(true);
        if (!cancelled) setLoading(false);
      };
      load();

      // Start polling while screen is focused
      pollRef.current = setInterval(() => fetchAndNotify(true), POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fetchAndNotify]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAndNotify(false);
    setRefreshing(false);
  };

  const openAnnouncement = async (a: Announcement) => {
    setSelected(a);
    if (!a.read && user) {
      try {
        await userApi.markAnnouncementsRead(user.email, [a.id]);
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === a.id ? { ...item, read: true } : item)),
        );
      } catch {
        // non-fatal
      }
    }
  };

  const unreadCount = announcements.filter((a) => !a.read).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7f1d1d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Announcements</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7f1d1d" />
        }
      >
        {announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No announcements yet</Text>
          </View>
        ) : (
          announcements.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.card, !a.read && styles.cardUnread]}
              onPress={() => openAnnouncement(a)}
            >
              <View style={styles.cardLeft}>
                {!a.read && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, !a.read && styles.cardTitleBold]} numberOfLines={1}>
                    {a.title}
                  </Text>
                  {a.eventTitle && (
                    <View style={styles.eventBadge}>
                      <Text style={styles.eventBadgeText} numberOfLines={1}>{a.eventTitle}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardPreview} numberOfLines={2}>{a.body}</Text>
                <Text style={styles.cardDate}>{formatDate(a.createdAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Full announcement modal */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
            <Ionicons name="close" size={26} color="#374151" />
          </TouchableOpacity>
          {selected && (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              {selected.eventTitle && (
                <View style={[styles.eventBadge, { alignSelf: "flex-start", marginBottom: 10 }]}>
                  <Text style={styles.eventBadgeText}>{selected.eventTitle}</Text>
                </View>
              )}
              <Text style={styles.modalTitle}>{selected.title}</Text>
              <Text style={styles.modalDate}>{formatDate(selected.createdAt)}</Text>
              <Text style={styles.modalBody}>{selected.body}</Text>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBar: {
    flexDirection: "row", alignItems: "center",
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 20,
    backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#111827", flex: 1 },
  unreadBadge: {
    backgroundColor: "#7f1d1d", borderRadius: 12,
    minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  unreadBadgeText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  scroll: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, color: "#9ca3af", marginTop: 12 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff",
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#e5e7eb", elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  cardUnread: { borderColor: "#fecaca", backgroundColor: "#fff9f9" },
  cardLeft: { width: 16, alignItems: "center", marginRight: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#7f1d1d" },
  cardBody: { flex: 1, marginRight: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 15, color: "#111827", flex: 1 },
  cardTitleBold: { fontWeight: "700" },
  cardPreview: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
  cardDate: { fontSize: 11, color: "#9ca3af", marginTop: 6 },
  eventBadge: {
    backgroundColor: "#eff6ff", borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6,
    borderWidth: 1, borderColor: "#bfdbfe", maxWidth: 120,
  },
  eventBadgeText: { fontSize: 11, color: "#1d4ed8", fontWeight: "600" },
  modal: { flex: 1, backgroundColor: "#ffffff" },
  modalClose: { padding: 18, alignSelf: "flex-end" },
  modalScroll: { padding: 24, paddingTop: 4 },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#111827", marginBottom: 6 },
  modalDate: { fontSize: 13, color: "#9ca3af", marginBottom: 20 },
  modalBody: { fontSize: 16, color: "#374151", lineHeight: 26 },
});
