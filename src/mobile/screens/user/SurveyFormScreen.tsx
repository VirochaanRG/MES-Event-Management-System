import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
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
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [f, qs, ans] = await Promise.all([
          userApi.getForm(formId),
          userApi.getFormQuestions(formId),
          userApi.getFormAnswers(formId, user.id),
        ]);
        if (!cancelled) {
          setForm(f);
          // Sort questions by their order field
          const sorted = qs
            .slice()
            .sort((a: FormQuestion, b: FormQuestion) => a.order - b.order);
          setQuestions(sorted);
          const ansMap: Record<number, any> = {};
          ans.forEach((a: any) => {
            ansMap[a.questionId] = a.answer;
          });
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
    return () => {
      cancelled = true;
    };
  }, [formId, user]);

  const handleChange = async (
    questionId: number,
    value: any,
    questionType: string = "text",
  ) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (user) {
      try {
        await userApi.saveFormAnswer(
          formId,
          user.id,
          questionId,
          value,
          questionType,
        );
      } catch (err) {
        console.warn("[SurveyFormScreen] Failed to save answer", err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await userApi.submitForm(formId, user.id);
      navigation.goBack();
    } catch (err: any) {
      console.warn("[SurveyFormScreen] Failed to submit form", err);
    } finally {
      setSubmitting(false);
    }
  };

  const shouldShowQuestion = (q: FormQuestion) => {
    if (!q.parentQuestionId) return true;
    const parentAnswer = answers[q.parentQuestionId];
    if (parentAnswer === undefined || parentAnswer === null) return false;
    if (!q.enablingAnswers || q.enablingAnswers.length === 0) return true;
    return q.enablingAnswers.includes(String(parentAnswer));
  };

  const renderQuestion = (q: FormQuestion) => {
    if (!shouldShowQuestion(q)) return null;
    const value = answers[q.id];
    if (q.type === "text") {
      return (
        <View key={q.id} style={styles.questionContainer}>
          <Text style={styles.questionText}>{q.question}</Text>
          <TextInput
            style={styles.textInput}
            value={value || ""}
            onChangeText={(text) => handleChange(q.id, text, q.type)}
            placeholder="Your answer"
          />
        </View>
      );
    }
    if (q.type === "multipleChoice") {
      const options: string[] = q.options || [];
      return (
        <View key={q.id} style={styles.questionContainer}>
          <Text style={styles.questionText}>{q.question}</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.optionRow}
              onPress={() => handleChange(q.id, opt, q.type)}
            >
              <View
                style={[
                  styles.radioOuter,
                  value === opt && styles.radioOuterSelected,
                ]}
              >
                {value === opt && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (q.type === "linearScale") {
      let scale: number[] = [];
      if (q.options && q.options.length >= 2) {
        if (q.options.length === 2) {
          const [minStr, maxStr] = q.options;
          const min = parseInt(minStr, 10);
          const max = parseInt(maxStr, 10);
          for (let i = min; i <= max; i++) scale.push(i);
        } else {
          scale = q.options.map((o) => parseInt(o, 10));
        }
      } else {
        scale = [1, 2, 3, 4, 5];
      }
      return (
        <View key={q.id} style={styles.questionContainer}>
          <Text style={styles.questionText}>{q.question}</Text>
          <View style={styles.scaleRow}>
            {scale.map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.scaleItem,
                  value === num && styles.scaleItemSelected,
                ]}
                onPress={() => handleChange(q.id, num, q.type)}
              >
                <Text
                  style={[
                    styles.scaleItemText,
                    value === num && styles.scaleItemTextSelected,
                  ]}
                >
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
        <ActivityIndicator size="large" color="#7f1d1d" />
        <Text style={styles.loadingText}>Form not found</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{form.title}</Text>
      {form.description && (
        <Text style={styles.description}>{form.description}</Text>
      )}
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
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#7f1d1d",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: "#7f1d1d",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7f1d1d",
  },
  optionText: {
    fontSize: 14,
    color: "#374151",
  },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  scaleItem: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    alignItems: "center",
  },
  scaleItemSelected: {
    backgroundColor: "#7f1d1d",
  },
  scaleItemText: {
    fontSize: 14,
    color: "#374151",
  },
  scaleItemTextSelected: {
    color: "#ffffff",
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
