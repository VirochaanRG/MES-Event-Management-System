import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { Form } from "../../types";
import type { ModularForm } from "../../services/userApi";

type SurveyItem =
  | { kind: "form"; data: Form }
  | { kind: "modular"; data: ModularForm };

export function SurveysScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [available, setAvailable] = useState<SurveyItem[]>([]);
  const [completed, setCompleted] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        if (!user) { setLoading(false); return; }
        try {
          setLoading(true);
          setError(null);
          const [avail, comp, modAvail, modComp] = await Promise.all([
            userApi.getAvailableForms(user.email),
            userApi.getCompletedForms(user.email),
            userApi.getAvailableModularForms(user.email),
            userApi.getCompletedModularForms(user.email),
          ]);
          if (!cancelled) {
            setAvailable([
              ...avail.map((f: Form) => ({ kind: "form" as const, data: f })),
              ...modAvail.map((m: ModularForm) => ({ kind: "modular" as const, data: m })),
            ]);
            setCompleted([
              ...comp.map((f: Form) => ({ kind: "form" as const, data: f })),
              ...modComp.map((m: ModularForm) => ({ kind: "modular" as const, data: m })),
            ]);
          }
        } catch (err: any) {
          console.warn("[SurveysScreen] Failed to load forms", err);
          if (!cancelled) setError("Failed to load surveys");
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [user]),
  );

  const handlePress = (item: SurveyItem) => {
    if (item.kind === "modular") {
      navigation.navigate("ModularSurvey", { modularFormId: item.data.id, title: item.data.title });
    } else {
      navigation.navigate("SurveyDetail", { formId: item.data.id });
    }
  };

  if (loading || error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7f1d1d" />
        {error && <Text style={styles.loadingText}>Looking for surveys...</Text>}
      </View>
    );
  }

  const list = showCompleted ? completed : available;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, !showCompleted && styles.toggleButtonActive]}
          onPress={() => setShowCompleted(false)}
        >
          <Text style={[styles.toggleText, !showCompleted && styles.toggleTextActive]}>
            Available
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, showCompleted && styles.toggleButtonActive]}
          onPress={() => setShowCompleted(true)}
        >
          <Text style={[styles.toggleText, showCompleted && styles.toggleTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {list.length === 0 ? (
          <Text style={styles.emptyText}>
            {showCompleted ? "No completed surveys" : "No available surveys"}
          </Text>
        ) : (
          list.map((item) => (
            <TouchableOpacity
              key={`${item.kind}-${item.data.id}`}
              style={styles.card}
              onPress={() => handlePress(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.data.title}</Text>
                {item.kind === "modular" && (
                  <View style={styles.badge}>
                    <Ionicons name="layers-outline" size={12} color="#7f1d1d" />
                    <Text style={styles.badgeText}>Multi-part</Text>
                  </View>
                )}
              </View>
              {item.data.description && (
                <Text style={styles.cardDesc}>{item.data.description}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  loadingText: { fontSize: 14, color: "#9ca3af", marginTop: 12 },
  toggleRow: { flexDirection: "row", justifyContent: "center", marginTop: 46 },
  toggleButton: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: "#f3f4f6", marginHorizontal: 8,
  },
  toggleButtonActive: { backgroundColor: "#7f1d1d" },
  toggleText: { fontSize: 14, color: "#374151", fontWeight: "600" },
  toggleTextActive: { color: "#ffffff" },
  emptyText: { fontSize: 16, color: "#6b7280", textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: "#ffffff", borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#e5e7eb",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#1f2937", flex: 1 },
  badge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fef3f2",
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "#fecaca", marginLeft: 8,
  },
  badgeText: { fontSize: 11, color: "#7f1d1d", marginLeft: 3, fontWeight: "600" },
  cardDesc: { fontSize: 14, color: "#4b5563", marginTop: 6 },
});
