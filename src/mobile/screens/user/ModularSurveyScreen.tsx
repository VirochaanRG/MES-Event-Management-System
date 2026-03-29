import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { ModularFormPage } from "../../services/userApi";

interface RouteParams {
  modularFormId: number;
  title: string;
}

const STATUS_CONFIG = {
  completed: { icon: "checkmark-circle" as const, color: "#16a34a", label: "Completed", bg: "#dcfce7" },
  available: { icon: "ellipse-outline" as const, color: "#7f1d1d", label: "Available", bg: "#fef3f2" },
  locked:    { icon: "lock-closed-outline" as const, color: "#9ca3af", label: "Locked",    bg: "#f3f4f6" },
};

export function ModularSurveyScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { modularFormId, title } = route.params as unknown as RouteParams;

  const [pages, setPages] = React.useState<ModularFormPage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        if (!user) { setLoading(false); return; }
        try {
          setLoading(true);
          setError(null);
          const data = await userApi.getModularFormPages(modularFormId, user.email);
          if (!cancelled) setPages(data);
        } catch (err: any) {
          console.warn("[ModularSurveyScreen] Failed to load pages", err);
          if (!cancelled) setError("Failed to load survey parts");
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [modularFormId, user]),
  );

  const handlePagePress = (page: ModularFormPage) => {
    if (page.status === "locked") return;
    navigation.navigate("SurveyDetail", { formId: page.id });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7f1d1d" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const completedCount = pages.filter((p) => p.status === "completed").length;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.progress}>
          {completedCount} of {pages.length} parts completed
        </Text>

        {pages.map((page, idx) => {
          const cfg = STATUS_CONFIG[page.status];
          return (
            <TouchableOpacity
              key={page.id}
              style={[styles.card, page.status === "locked" && styles.cardLocked]}
              onPress={() => handlePagePress(page)}
              activeOpacity={page.status === "locked" ? 1 : 0.7}
            >
              <View style={[styles.stepBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={20} color={cfg.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, page.status === "locked" && styles.textMuted]}>
                  Part {idx + 1}: {page.title}
                </Text>
                {page.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{page.description}</Text>
                ) : null}
                <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              {page.status !== "locked" && (
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 14, color: "#9ca3af" },
  headerBar: {
    flexDirection: "row", alignItems: "center",
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#111827", flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  progress: { fontSize: 13, color: "#6b7280", marginBottom: 16, textAlign: "center" },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff",
    borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: "#e5e7eb", elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  cardLocked: { opacity: 0.6 },
  stepBadge: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  textMuted: { color: "#9ca3af" },
  cardDesc: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  statusLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
});
