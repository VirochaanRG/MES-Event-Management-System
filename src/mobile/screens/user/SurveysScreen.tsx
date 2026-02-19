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
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { Form } from "../../types";

export function SurveysScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [available, setAvailable] = useState<Form[]>([]);
  const [completed, setCompleted] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        if (!user) {
          setLoading(false);
          return;
        }
        try {
          setLoading(true);
          setError(null);
          const [avail, comp] = await Promise.all([
            userApi.getAvailableForms(user.id),
            userApi.getCompletedForms(user.id),
          ]);
          if (!cancelled) {
            setAvailable(avail);
            setCompleted(comp);
          }
        } catch (err: any) {
          console.warn("[SurveysScreen] Failed to load forms", err);
          if (!cancelled) setError("Failed to load surveys");
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  if (loading || error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7f1d1d" />
        {error && (
          <Text style={styles.loadingText}>Looking for surveys...</Text>
        )}
      </View>
    );
  }
  const list = showCompleted ? completed : available;
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            !showCompleted && styles.toggleButtonActive,
          ]}
          onPress={() => setShowCompleted(false)}
        >
          <Text
            style={[
              styles.toggleText,
              !showCompleted && styles.toggleTextActive,
            ]}
          >
            Available
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            showCompleted && styles.toggleButtonActive,
          ]}
          onPress={() => setShowCompleted(true)}
        >
          <Text
            style={[
              styles.toggleText,
              showCompleted && styles.toggleTextActive,
            ]}
          >
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
          list.map((form) => (
            <TouchableOpacity
              key={form.id}
              style={styles.card}
              onPress={() =>
                navigation.navigate("SurveyDetail", { formId: form.id })
              }
            >
              <Text style={styles.cardTitle}>{form.title}</Text>
              {form.description && (
                <Text style={styles.cardDesc}>{form.description}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 46,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#7f1d1d",
  },
  toggleText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#ffffff",
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 4,
  },
});
