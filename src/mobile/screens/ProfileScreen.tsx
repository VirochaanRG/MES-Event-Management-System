import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import * as userApi from "../services/userApi";
import type { UserProfile } from "../services/userApi";

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isMcmasterStudent, setIsMcmasterStudent] = useState(false);
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }
      let cancelled = false;
      const load = async () => {
        try {
          setLoading(true);
          const p = await userApi.getProfile(user.id);
          if (!cancelled) {
            if (p) {
              setProfile(p);
              setFirstName(p.firstName ?? "");
              setLastName(p.lastName ?? "");
              setIsMcmasterStudent(p.isMcmasterStudent ?? false);
              setFaculty(p.faculty ?? "");
              setProgram(p.program ?? "");
              setHasProfile(true);
            } else {
              setHasProfile(false);
            }
          }
        } catch (err) {
          console.warn("[ProfileScreen] Failed to load profile", err);
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

  const handleSave = async () => {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Required Fields", "First name and last name are required.");
      return;
    }
    setSaving(true);
    try {
      await userApi.saveProfile({
        userId: user.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isMcmasterStudent,
        faculty: faculty.trim() || null,
        program: program.trim() || null,
      });
      setHasProfile(true);
      Alert.alert("Saved", "Your profile has been saved successfully.");
    } catch (err: any) {
      console.warn("[ProfileScreen] Failed to save profile", err);
      Alert.alert("Error", err?.response?.data?.error ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7f1d1d" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        {!hasProfile && (
          <View style={styles.incompleteBanner}>
            <Text style={styles.incompleteBannerText}>
              Complete your profile to register for events and fill out surveys.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <Text style={styles.fieldLabel}>First Name *</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Last Name *</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          autoCapitalize="words"
        />

        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>McMaster Student</Text>
          <Switch
            value={isMcmasterStudent}
            onValueChange={setIsMcmasterStudent}
            trackColor={{ false: "#d1d5db", true: "#7f1d1d" }}
            thumbColor="#ffffff"
          />
        </View>

        <Text style={styles.fieldLabel}>Faculty</Text>
        <TextInput
          style={styles.input}
          value={faculty}
          onChangeText={setFaculty}
          placeholder="e.g. Engineering"
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Program</Text>
        <TextInput
          style={styles.input}
          value={program}
          onChangeText={setProgram}
          placeholder="e.g. Software Engineering"
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : hasProfile ? "Update Profile" : "Save Profile"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 24,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  incompleteBanner: {
    marginTop: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  incompleteBannerText: {
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
  },
  section: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  label: {
    fontSize: 14,
    color: "#6b7280",
  },
  value: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#7f1d1d",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    padding: 16,
    margin: 24,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
