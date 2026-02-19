import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { Form, FormStatus } from "../../types";

interface RouteParams {
  formId: number;
}

export function SurveyDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { formId } = route.params as unknown as RouteParams;
  const [form, setForm] = useState<Form | null>(null);
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refresh form status every time this screen gains focus
  // (e.g. after submitting the form and navigating back)
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
          const [f, s] = await Promise.all([
            userApi.getForm(formId),
            userApi.getFormStatus(formId, user.id),
          ]);
          if (!cancelled) {
            setForm(f);
            setStatus(s);
          }
        } catch (err: any) {
          console.warn("[SurveyDetailScreen] Failed to load form", err);
          if (!cancelled) setError("Failed to load survey");
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, [formId, user]),
  );

  const handleDelete = async () => {
    if (!user) return;
    Alert.alert(
      "Delete Submission",
      "Are you sure you want to delete your responses?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await userApi.deleteFormSubmission(formId, user.id);
              setStatus({ status: "unfilled", submissionId: null });
            } catch (err: any) {
              console.warn(
                "[SurveyDetailScreen] Failed to delete submission",
                err,
              );
            }
          },
        },
      ],
    );
  };

  const actionButton = () => {
    if (!status || status.status === "unfilled") {
      return (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("SurveyForm", { formId })}
        >
          <Text style={styles.buttonText}>Start Survey</Text>
        </TouchableOpacity>
      );
    }
    if (status.status === "started") {
      return (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("SurveyForm", { formId })}
        >
          <Text style={styles.buttonText}>Continue Survey</Text>
        </TouchableOpacity>
      );
    }
    if (status.status === "completed") {
      return (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("SurveyForm", { formId })}
        >
          <Text style={styles.buttonText}>Edit Responses</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7f1d1d" />
      </View>
    );
  }
  if (error || !form) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7f1d1d" />
        <Text style={styles.loadingText}>Survey not found</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{form.title}</Text>
      {form.description && (
        <Text style={styles.description}>{form.description}</Text>
      )}
      {status && (
        <>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{status.status}</Text>
        </>
      )}
      {actionButton()}
      {status && status.status !== "unfilled" && (
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={styles.buttonText}>Delete Submission</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginTop: 46,
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
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    color: "#1f2937",
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
    backgroundColor: "#7f1d1d",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#dc2626",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
