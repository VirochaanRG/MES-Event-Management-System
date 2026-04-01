import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as adminApi from "../../services/adminApi";
import type { Event } from "../../types";

interface FormStats {
  id: number;
  name: string;
  description: string | null;
  totalSubmissions: number;
  totalQuestions: number;
}

export function AdminDashboardScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<FormStats[]>([]);
  const [totalForms, setTotalForms] = useState(0);
  const [totalFormSubmissions, setTotalFormSubmissions] = useState(0);

  // Refresh data when the dashboard tab gains focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          setLoading(true);
          const [eventsData, analyticsData] = await Promise.all([
            adminApi.getEvents(),
            adminApi.getFormAnalytics(),
          ]);
          if (cancelled) return;
          setEvents(eventsData);
          setForms(analyticsData.forms ?? []);
          setTotalForms(analyticsData.totalForms ?? 0);
          setTotalFormSubmissions(analyticsData.totalSubmissions ?? 0);
        } catch (err) {
          console.warn("Failed to load admin dashboard data", err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7f1d1d" />
      </View>
    );
  }

  const totalEvents = events.length;
  const scheduledCount = events.filter(
    (e) => (e.status || "").toLowerCase() === "scheduled",
  ).length;
  const ongoingCount = events.filter(
    (e) => (e.status || "").toLowerCase() === "ongoing",
  ).length;
  const completedCount = events.filter(
    (e) => (e.status || "").toLowerCase() === "completed",
  ).length;
  // const cancelledCount = events.filter(
  //   (e) => (e.status || "").toLowerCase() === "cancelled",
  // ).length;

  const recentEvents = [...events]
    .sort((a, b) => {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    })
    .slice(0, 3);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.cardRow}>
        <View style={[styles.statCard, { backgroundColor: "#fee2e2" }]}>
          <Text style={styles.statTitle}>Total Events</Text>
          <Text style={styles.statValue}>{totalEvents}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#fef9c3" }]}>
          <Text style={styles.statTitle}>Scheduled</Text>
          <Text style={[styles.statValue, { color: "#ca8a04" }]}>
            {scheduledCount}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#dcfce7" }]}>
          <Text style={styles.statTitle}>Ongoing</Text>
          <Text style={[styles.statValue, { color: "#16a34a" }]}>
            {ongoingCount}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#e5e7eb" }]}>
          <Text style={styles.statTitle}>Completed</Text>
          <Text style={[styles.statValue, { color: "#4b5563" }]}>
            {completedCount}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Recent Events</Text>
        {recentEvents.length === 0 ? (
          <Text style={styles.emptyText}>No recent events</Text>
        ) : (
          recentEvents.map((event) => (
            <View key={event.id} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{event.title}</Text>
                <Text style={styles.itemSubtitle}>
                  {formatDate(event.startTime)}
                </Text>
              </View>
              <Text
                style={[
                  styles.statusBadge,
                  getStatusStyles(event.status || "scheduled"),
                ]}
              >
                {event.status || "scheduled"}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.cardRow}>
        <View style={[styles.statCard, { backgroundColor: "#fef9c3" }]}>
          <Text style={styles.statTitle}>Total Forms</Text>
          <Text style={[styles.statValue, { color: "#ca8a04" }]}>
            {totalForms}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#fef9c3" }]}>
          <Text style={styles.statTitle}>Total Submissions</Text>
          <Text style={[styles.statValue, { color: "#ca8a04" }]}>
            {totalFormSubmissions}
          </Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Recent Forms</Text>
        {forms.length === 0 ? (
          <Text style={styles.emptyText}>No recent forms</Text>
        ) : (
          forms.slice(0, 3).map((f) => (
            <View key={f.id} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{f.name}</Text>
                <Text style={styles.itemSubtitle}>{f.description ?? ""}</Text>
              </View>
              <Text
                style={[
                  styles.statusBadge,
                  { backgroundColor: "#fef9c3", color: "#ca8a04" },
                ]}
              >
                {f.totalSubmissions} submissions
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function getStatusStyles(status: string) {
  const lower = status.toLowerCase();
  switch (lower) {
    case "scheduled":
      return { backgroundColor: "#fef9c3", color: "#ca8a04" };
    case "ongoing":
      return { backgroundColor: "#dcfce7", color: "#16a34a" };
    case "completed":
      return { backgroundColor: "#e5e7eb", color: "#4b5563" };
    case "cancelled":
      return { backgroundColor: "#fee2e2", color: "#dc2626" };
    default:
      return { backgroundColor: "#dbeafe", color: "#2563eb" };
  }
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
  },
  cardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    flexBasis: "48%",
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  statTitle: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  statusBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
});
