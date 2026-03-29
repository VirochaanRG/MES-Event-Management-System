import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { Form, FormQuestion } from "../../types";

interface RouteParams {
  formId: number;
}

export function SurveyFormScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { formId } = route.params as unknown as RouteParams;
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const [f, qs, ans] = await Promise.all([
          userApi.getForm(formId, user.email),
          userApi.getFormQuestions(formId, user.email),
          userApi.getFormAnswers(formId, user.email),
        ]);
        if (!cancelled) {
          setForm(f);
          const sorted = qs
            .slice()
            .sort((a: FormQuestion, b: FormQuestion) => a.order - b.order);
          setQuestions(sorted);
          const ansMap: Record<number, any> = {};
          ans.forEach((a: any) => { ansMap[a.questionId] = a.answer; });
          setAnswers(ansMap);
        }
      } catch (err: any) {
        console.warn("[SurveyFormScreen] Failed to load form", err);
        if (!cancelled) setError("Failed to load survey");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [formId, user]);

  const handleChange = async (
    questionId: number,
    value: any,
    questionType: string,
  ) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (user) {
      try {
        await userApi.saveFormAnswer(formId, user.email, questionId, value, questionType);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          Alert.alert(
            "Profile Required",
            "Please complete your profile before answering surveys.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Complete Profile", onPress: () => navigation.getParent()?.navigate("Profile") },
            ],
          );
        } else {
          console.warn("[SurveyFormScreen] Failed to save answer", err);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await userApi.submitForm(formId, user.email);
      navigation.goBack();
    } catch (err: any) {
      if (err?.response?.status === 403) {
        Alert.alert(
          "Profile Required",
          "Please complete your profile before submitting surveys.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Complete Profile", onPress: () => navigation.getParent()?.navigate("Profile") },
          ],
        );
      } else {
        console.warn("[SurveyFormScreen] Failed to submit form", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * A question is visible when it has no parent, or when the parent's selected
   * answer matches one of the enabling answer indices (stored as numbers in the DB).
   */
  const shouldShowQuestion = (q: FormQuestion): boolean => {
    if (!q.parentQuestionId) return true;
    const parentAnswer = answers[q.parentQuestionId];
    if (parentAnswer === undefined || parentAnswer === null) return false;
    if (!q.enablingAnswers || q.enablingAnswers.length === 0) return true;

    // Find parent question to resolve index-based enabling answers
    const parentQ = questions.find((pq) => pq.id === q.parentQuestionId);
    if (parentQ?.options && parentQ.options.length > 0) {
      const selectedIndex = parentQ.options.indexOf(String(parentAnswer));
      if (selectedIndex !== -1) {
        return (q.enablingAnswers as unknown as number[]).includes(selectedIndex);
      }
    }
    // Fallback: direct string comparison
    return (q.enablingAnswers as unknown as number[]).some(
      (ea) => String(ea) === String(parentAnswer),
    );
  };

  const renderQuestion = (q: FormQuestion) => {
    if (!shouldShowQuestion(q)) return null;
    const value = answers[q.id];
    const type = q.type; // already mapped by mapQuestionFromApi

    // ── Text answer ────────────────────────────────────────────────────────
    if (type === "text_answer" || type === "text") {
      return (
        <View key={q.id} style={styles.questionContainer}>
          <Text style={styles.questionText}>
            {q.question}{q.required ? " *" : ""}
          </Text>
          <TextInput
            style={styles.textInput}
            value={value || ""}
            onChangeText={(text) => handleChange(q.id, text, type)}
            placeholder="Your answer"
            multiline
          />
        </View>
      );
    }

    // ── Multiple choice (single select) ────────────────────────────────────
    if (type === "multiple_choice" || type === "multipleChoice") {
      const options: string[] = q.options || [];
      return (
        <View key={q.id} style={styles.questionContainer}>
          <Text style={styles.questionText}>
            {q.question}{q.required ? " *" : ""}
          </Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.optionRow}
              onPress={() => handleChange(q.id, opt, type)}
            >
              <View style={[styles.radioOuter, value === opt && styles.radioOuterSelected]}>
                {value === opt && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // ── Dropdown (render as radio list for simplicity) ─────────────────────
    if (type === "dropdown") {
      const options: string[] = q.options || [];
      return (
        <View key={q.id} style={styles.questionContainer}>
          <Text style={styles.questionText}>
            {q.question}{q.required ? " *" : ""}
          </Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.optionRow}
              onPress={() => handleChange(q.id, opt, type)}
            >
              <View style={[styles.radioOuter, value === opt && styles.radioOuterSelected]}>
                {value === opt && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // ── Multi-select (checkboxes) ───────────────────────────────────────────
    if (type === "multi_select") {
      const options: string[] = q.options || [];
      const selected: string[] = Array.isArray(value) ? value : value ? [value] : [];
      const toggleOption = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter((s) => s !== opt)
          : [...selected, opt];
        handleChange(q.id, next, type);
      };
      return (
        <View key={q.id} style={styles.questionContainer}>
          <Text style={styles.questionText}>
            {q.question}{q.required ? " *" : ""}
          </Text>
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={styles.optionRow}
                onPress={() => toggleOption(opt)}
              >
                <View style={[styles.checkboxOuter, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    // ── Linear scale ───────────────────────────────────────────────────────
    if (type === "linear_scale" || type === "linearScale") {
      let scale: number[] = [];
      if (q.options && q.options.length >= 2) {
        if (q.options.length === 2) {
          const min = parseInt(q.options[0], 10);
          const max = parseInt(q.options[1], 10);
          for (let i = min; i <= max; i++) scale.push(i);
        } else {
          scale = q.options.map((o) => parseInt(o, 10));
        }
      } else {
        scale = [1, 2, 3, 4, 5];
      }
      return (
        <View key={q.id} style={styles.questionContainer}>
          <Text style={styles.questionText}>
            {q.question}{q.required ? " *" : ""}
          </Text>
          <View style={styles.scaleRow}>
            {scale.map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.scaleItem, value === num && styles.scaleItemSelected]}
                onPress={() => handleChange(q.id, num, type)}
              >
                <Text style={[styles.scaleItemText, value === num && styles.scaleItemTextSelected]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
        <Text style={styles.loadingText}>Survey not found</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{form.title}</Text>
      {form.description && <Text style={styles.description}>{form.description}</Text>}
      {questions.map((q) => renderQuestion(q))}
      <TouchableOpacity
        style={[styles.submitButton, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? "Submitting..." : "Submit"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, marginTop: 46, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  loadingText: { fontSize: 14, color: "#9ca3af", marginTop: 12 },
  title: { fontSize: 20, fontWeight: "bold", color: "#111827", marginBottom: 8 },
  description: { fontSize: 14, color: "#374151", marginBottom: 12 },
  questionContainer: { marginBottom: 22 },
  questionText: { fontSize: 15, fontWeight: "600", color: "#1f2937", marginBottom: 10 },
  textInput: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
    padding: 12, fontSize: 15, backgroundColor: "#ffffff", minHeight: 44,
  },
  optionRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: "#7f1d1d", alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  radioOuterSelected: { borderColor: "#7f1d1d" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#7f1d1d" },
  checkboxOuter: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2,
    borderColor: "#7f1d1d", alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  checkboxChecked: { backgroundColor: "#7f1d1d" },
  checkmark: { color: "#ffffff", fontSize: 13, fontWeight: "bold" },
  optionText: { fontSize: 14, color: "#374151", flex: 1 },
  scaleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  scaleItem: {
    minWidth: 40, paddingVertical: 8, paddingHorizontal: 6,
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, alignItems: "center",
  },
  scaleItemSelected: { backgroundColor: "#7f1d1d", borderColor: "#7f1d1d" },
  scaleItemText: { fontSize: 14, color: "#374151" },
  scaleItemTextSelected: { color: "#ffffff" },
  submitButton: {
    marginTop: 24, backgroundColor: "#16a34a",
    paddingVertical: 14, borderRadius: 8, alignItems: "center",
  },
  submitButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
});
