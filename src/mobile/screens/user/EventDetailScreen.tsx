import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { Event } from "../../types";

interface RouteParams {
  eventId: number;
}

export function EventDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { eventId } = route.params as unknown as RouteParams;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const ev = await userApi.getEvent(eventId);
        if (!cancelled) setEvent(ev);
        if (user) {
          const registration = await userApi.getEventRegistration(
            eventId,
            user.email,
          );
          if (!cancelled) {
            setIsRegistered(!!registration);
          }
        }
      } catch (err: any) {
        console.warn("[EventDetail] Failed to load event", err);
        if (!cancelled) setError("Failed to load event");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, user]);

  const handleRegister = async () => {
    if (!user) return;
    setRegistering(true);
    try {
      const reg = await userApi.registerForEvent(eventId, user.email);
      const registrationId =
        reg.id ??
        reg.registrationId ??
        reg.registration_id ??
        reg.registrationID;
      await userApi.generateEventQR(eventId, registrationId, user.email);
      setIsRegistered(true);
    } catch (err: any) {
      console.warn("[EventDetail] Registration error", err);
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color="#7f1d1d" />
      </SafeAreaView>
    );
  }
  if (error || !event) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color="#7f1d1d" />
        <Text style={styles.loadingText}>Event not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color="#374151" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{event.title}</Text>

        {isRegistered && (
          <View style={styles.registeredBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.registeredBannerText}>
              You are registered for this event
            </Text>
          </View>
        )}

        {event.description && (
          <Text style={styles.description}>{event.description}</Text>
        )}

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{formatDate(event.startTime)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {formatTime(event.startTime)} – {formatTime(event.endTime)}
          </Text>
        </View>
        {event.location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{event.location}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Capacity: {event.capacity}</Text>
        </View>
        {event.cost > 0 && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>${event.cost}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#6b7280"
          />
          <Text style={styles.detailText}>Status: {event.status}</Text>
        </View>

        {!isRegistered ? (
          <TouchableOpacity
            style={[styles.button, registering && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={registering}
          >
            <Text style={styles.buttonText}>
              {registering ? "Registering..." : "Register for Event"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.ticketButton}
            onPress={() => {
              // Navigate to the My Tickets tab
              navigation.getParent()?.navigate("Registered");
            }}
          >
            <Ionicons name="qr-code-outline" size={18} color="#ffffff" />
            <Text style={styles.ticketButtonText}>View My Ticket</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    padding: 16,
    paddingBottom: 32,
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  registeredBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  registeredBannerText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
    marginLeft: 6,
  },
  description: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 16,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#1f2937",
    marginLeft: 8,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  ticketButton: {
    marginTop: 20,
    backgroundColor: "#7f1d1d",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  ticketButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
