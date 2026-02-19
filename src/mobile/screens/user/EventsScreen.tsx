import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { Event } from "../../types";

export function EventsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userApi.getEvents();
      setEvents(data);

      // Check which events the user is registered for
      if (user) {
        const registered = await userApi.getUserRegisteredEvents(user.email);
        const ids = new Set<number>(registered.map((ev: Event) => ev.id));
        setRegisteredIds(ids);
      }
    } catch (err: any) {
      console.warn("[EventsScreen] Failed to fetch events", err);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload on focus so registrations are reflected immediately
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString();
  };
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading || error) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color="#7f1d1d" />
        {error && <Text style={styles.loadingText}>Looking for events...</Text>}
      </SafeAreaView>
    );
  }

  const renderEvent = ({ item: ev }: { item: Event }) => {
    const isRegistered = registeredIds.has(ev.id);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("EventDetail", { eventId: ev.id })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {ev.title}
          </Text>
          {isRegistered && (
            <View style={styles.registeredBadge}>
              <Text style={styles.registeredBadgeText}>Registered</Text>
            </View>
          )}
        </View>
        {ev.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {ev.description}
          </Text>
        ) : null}
        <Text style={styles.cardMeta}>
          {formatDate(ev.startTime)} {formatTime(ev.startTime)}
        </Text>
        {ev.location && <Text style={styles.cardMeta}>{ev.location}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Text style={styles.header}>Events</Text>
      <FlatList
        data={events}
        keyExtractor={(ev) => String(ev.id)}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No events found</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#f9fafb",
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
    marginRight: 8,
  },
  registeredBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  registeredBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
  },
  cardDesc: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
});
