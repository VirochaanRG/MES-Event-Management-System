import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as adminApi from "../../services/adminApi";

interface FormStats {
  id: number;
  name: string;
  description: string | null;
  createdAt: string | null;
  isPublic: boolean;
  totalSubmissions: number;
  totalQuestions: number;
}

interface Completion {
  userId: string;
  email: string;
  submittedAt: string | null;
}

export function AdminAnalyticsScreen() {
  const [forms, setForms] = useState<FormStats[]>([]);
  const [filteredForms, setFilteredForms] = useState<FormStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Completions modal state
  const [showCompletionsModal, setShowCompletionsModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormStats | null>(null);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [completionsLoading, setCompletionsLoading] = useState(false);

  // Aggregate statistics
  const [totalForms, setTotalForms] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getFormAnalytics();
      setForms(data.forms ?? []);
      setFilteredForms(data.forms ?? []);
      setTotalForms(data.totalForms ?? 0);
      setTotalSubmissions(data.totalSubmissions ?? 0);
    } catch (err: any) {
      console.warn("[AdminAnalytics] Failed to load analytics", err);
      setError("Failed to load form analytics");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        await loadAnalytics();
      };
      if (!cancelled) load();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    if (!searchTerm) {
      setFilteredForms(forms);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredForms(
      forms.filter(
        (f) =>
          f.name.toLowerCase().includes(term) ||
          (f.description && f.description.toLowerCase().includes(term)),
      ),
    );
  }, [searchTerm, forms]);

  const handleViewCompletions = async (formItem: FormStats) => {
    setSelectedForm(formItem);
    setShowCompletionsModal(true);
    setCompletionsLoading(true);
    setCompletions([]);
    try {
      const data = await adminApi.getFormCompletions(formItem.id);
      setCompletions(data.completions ?? []);
    } catch (err: any) {
      console.warn("[AdminAnalytics] Failed to load completions", err);
    } finally {
      setCompletionsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "\u2014";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "\u2014";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " " +
      date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#ca8a04" />
        <Text style={{ marginTop: 12, color: "#6b7280" }}>
          Loading analytics...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: "#dc2626", fontSize: 16, marginBottom: 12 }}>
          {error}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Form Analytics</Text>
        <Text style={styles.subtitle}>
          View form submissions and completions
        </Text>
      </View>

      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Total Forms</Text>
          <Text style={styles.overviewValue}>{totalForms}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Submissions</Text>
          <Text style={styles.overviewValue}>{totalSubmissions}</Text>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search forms..."
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {filteredForms.length === 0 ? (
          <Text style={styles.emptyText}>No forms found</Text>
        ) : (
          filteredForms.map((formItem) => (
            <View key={formItem.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.formName}>{formItem.name}</Text>
                  {formItem.isPublic && (
                    <View style={styles.publicBadge}>
                      <Text style={styles.publicBadgeText}>Public</Text>
                    </View>
                  )}
                </View>
                {formItem.description ? (
                  <Text style={styles.formDescription}>
                    {formItem.description}
                  </Text>
                ) : null}
                <Text style={styles.formStats}>
                  {formItem.totalSubmissions} submission
                  {formItem.totalSubmissions !== 1 ? "s" : ""}
                </Text>
                <Text style={styles.formStats}>
                  {formItem.totalQuestions} question
                  {formItem.totalQuestions !== 1 ? "s" : ""}
                </Text>
                {formItem.createdAt ? (
                  <Text style={styles.formStats}>
                    Created: {formatDate(formItem.createdAt)}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => handleViewCompletions(formItem)}
                >
                  <Text style={styles.viewButtonText}>
                    View ({formItem.totalSubmissions})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Completions Modal */}
      <Modal
        visible={showCompletionsModal}
        animationType="slide"
        onRequestClose={() => setShowCompletionsModal(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {selectedForm?.name ?? "Form"} - Completions
          </Text>

          {completionsLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="#ca8a04" />
            </View>
          ) : completions.length === 0 ? (
            <Text style={styles.emptyText}>No submissions yet</Text>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.completionCount}>
                {completions.length} user{completions.length !== 1 ? "s" : ""}{" "}
                completed this form
              </Text>
              {completions.map((c, index) => (
                <View key={`${c.userId}-${index}`} style={styles.completionRow}>
                  <Text style={styles.completionEmail}>{c.email}</Text>
                  <Text style={styles.completionDate}>
                    {formatDateTime(c.submittedAt)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowCompletionsModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: "#fef9c3",
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ca8a04",
  },
  searchInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  formName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  publicBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  publicBadgeText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "600",
  },
  formDescription: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 6,
  },
  formStats: {
    fontSize: 12,
    color: "#6b7280",
  },
  viewButton: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  viewButtonText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  completionCount: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 12,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  completionEmail: {
    fontSize: 14,
    color: "#1f2937",
    flex: 1,
  },
  completionDate: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 8,
  },
  closeButton: {
    backgroundColor: "#6b7280",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  closeButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
});
