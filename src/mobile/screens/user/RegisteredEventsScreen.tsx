import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import * as userApi from "../../services/userApi";
import type { Event } from "../../types";

export function RegisteredEventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);

  // Reload every time the tab gains focus
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
          const registered = await userApi.getUserRegisteredEvents(user.email);
          if (!cancelled) setEvents(registered);
        } catch (err: any) {
          console.warn("[RegisteredEvents] Failed to load", err);
          if (!cancelled) setError("Failed to load registered events");
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

  const openModal = async (ev: Event) => {
    if (!user) return;
    setSelectedEvent(ev);
    setLoadingQR(true);
    setModalVisible(true);
    try {
      const codes = await userApi.getEventQRCodes(ev.id, user.email);
      setQrCodes(codes);
    } catch (err: any) {
      console.warn("[RegisteredEvents] Failed to fetch QR codes", err);
      setQrCodes([]);
    } finally {
      setLoadingQR(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedEvent(null);
    setQrCodes([]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading || error) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color="#7f1d1d" />
        {error && (
          <Text style={styles.loadingText}>Looking for tickets...</Text>
        )}
      </SafeAreaView>
    );
  }

  const renderTicket = ({ item: ev }: { item: Event }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(ev)}>
      <View style={styles.cardLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name="ticket-outline" size={24} color="#7f1d1d" />
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {ev.title}
        </Text>
        <Text style={styles.cardMeta}>
          {formatDate(ev.startTime)} at {formatTime(ev.startTime)}
        </Text>
        {ev.location && <Text style={styles.cardMeta}>{ev.location}</Text>}
        <Text style={styles.tapHint}>Tap to view ticket</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Text style={styles.header}>My Tickets</Text>
      <FlatList
        data={events}
        keyExtractor={(ev) => String(ev.id)}
        renderItem={renderTicket}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No tickets yet</Text>
            <Text style={styles.emptySubtext}>
              Register for events to see your tickets here
            </Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedEvent?.title}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {selectedEvent && (
              <View style={styles.eventInfo}>
                <Text style={styles.eventInfoText}>
                  {formatDate(selectedEvent.startTime)} at{" "}
                  {formatTime(selectedEvent.startTime)}
                </Text>
                {selectedEvent.location && (
                  <Text style={styles.eventInfoText}>
                    {selectedEvent.location}
                  </Text>
                )}
              </View>
            )}

            {loadingQR ? (
              <ActivityIndicator
                size="large"
                color="#7f1d1d"
                style={{ marginTop: 32 }}
              />
            ) : qrCodes.length === 0 ? (
              <Text style={styles.noQRText}>
                No QR codes generated for this event
              </Text>
            ) : (
              qrCodes.map((code) => {
                const imageData = code.imageBase64 || code.image;
                const isSvg =
                  imageData &&
                  (imageData.startsWith("PHN2") || imageData.includes("<svg"));

                if (isSvg) {
                  const qrData = JSON.stringify({
                    registrationId: code.registrationId,
                    eventId: code.eventId,
                    userEmail: code.userEmail,
                    instance: code.instance || 1,
                  });
                  return (
                    <View
                      key={code.id ?? code.instance}
                      style={styles.ticketCard}
                    >
                      <Text style={styles.ticketLabel}>
                        Ticket #{code.instance || 1}
                      </Text>
                      <View style={styles.qrPlaceholder}>
                        <Ionicons name="qr-code" size={80} color="#374151" />
                        <Text style={styles.qrDataText}>{qrData}</Text>
                      </View>
                      <Text style={styles.scanHint}>
                        Show this code at check-in
                      </Text>
                    </View>
                  );
                }

                const uri = `data:image/png;base64,${imageData}`;
                return (
                  <View
                    key={code.id ?? code.instance}
                    style={styles.ticketCard}
                  >
                    <Text style={styles.ticketLabel}>
                      Ticket #{code.instance || 1}
                    </Text>
                    <Image
                      source={{ uri }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.scanHint}>
                      Show this code at check-in
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
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
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardLeft: {
    marginRight: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },
  cardRight: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 13,
    color: "#6b7280",
  },
  tapHint: {
    fontSize: 12,
    color: "#7f1d1d",
    marginTop: 4,
    fontWeight: "500",
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
    marginRight: 12,
  },
  modalBody: {
    padding: 16,
    alignItems: "center",
    paddingBottom: 32,
  },
  eventInfo: {
    marginBottom: 16,
    alignItems: "center",
  },
  eventInfoText: {
    fontSize: 14,
    color: "#6b7280",
  },
  noQRText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 32,
  },
  ticketCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    width: "100%",
  },
  ticketLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  qrPlaceholder: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  qrDataText: {
    fontFamily: "monospace",
    fontSize: 10,
    color: "#374151",
    marginTop: 8,
    textAlign: "center",
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  scanHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 10,
  },
});
