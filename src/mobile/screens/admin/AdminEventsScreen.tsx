import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as adminApi from "../../services/adminApi";
import * as localStorage from "../../services/localStorage";
import type { Event } from "../../types";

export function AdminEventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "scheduled" | "ongoing" | "completed" | "cancelled"
  >("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  interface RegisteredUser {
    registrationId: number;
    eventId: number;
    userEmail: string;
    instance: number;
    checkedIn?: boolean;
  }

  const [registeredUsersMap, setRegisteredUsersMap] = useState<{
    [key: number]: RegisteredUser[];
  }>({});
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState(false);
  const [scannedOnce, setScannedOnce] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    startTime: "",
    endTime: "",
    capacity: "",
    isPublic: true,
    status: "scheduled" as
      | "scheduled"
      | "ongoing"
      | "completed"
      | "cancelled"
      | "scheduled",
    cost: "",
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const data = await adminApi.getEvents();
          if (cancelled) return;
          const normalised = data.map((ev: Event) => ({
            ...ev,
            status:
              typeof ev.status === "string"
                ? ev.status.toLowerCase()
                : ev.status,
          }));
          setEvents(normalised);
          setFilteredEvents(normalised);
        } catch (err: any) {
          console.warn("[AdminEvents] Failed to load events", err);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    let filtered = events;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((event) => {
        return (
          (event.title && event.title.toLowerCase().includes(term)) ||
          (event.description &&
            event.description.toLowerCase().includes(term)) ||
          (event.location && event.location.toLowerCase().includes(term))
        );
      });
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((event) => event.status === statusFilter);
    }
    setFilteredEvents(filtered);
  }, [searchTerm, statusFilter, events]);

  const totalEvents = events.length;
  const scheduledCount = events.filter((e) => e.status === "scheduled").length;
  const ongoingCount = events.filter((e) => e.status === "ongoing").length;
  const completedCount = events.filter((e) => e.status === "completed").length;
  // const cancelledCount = events.filter((e) => e.status === "cancelled").length;

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      startTime: "",
      endTime: "",
      capacity: "",
      isPublic: true,
      status: "scheduled",
      cost: "",
    });
  };

  const handleCreateEvent = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Validation Error", "Title is required");
      return;
    }

    const eventData = {
      title: formData.title,
      description: formData.description || undefined,
      location: formData.location || undefined,
      startTime: formData.startTime || new Date().toISOString(),
      endTime: formData.endTime || new Date().toISOString(),
      capacity: parseInt(formData.capacity || "0", 10),
      isPublic: formData.isPublic,
      status: formData.status,
      cost: parseFloat(formData.cost || "0"),
    };

    const apiResult = await adminApi.createEvent(eventData);

    let newEvent: Event;
    if (apiResult && apiResult.id) {
      newEvent = {
        id: apiResult.id,
        title: apiResult.title || eventData.title,
        description: apiResult.description || null,
        location: apiResult.location || null,
        startTime:
          apiResult.startTime || apiResult.start_time || eventData.startTime,
        endTime: apiResult.endTime || apiResult.end_time || eventData.endTime,
        capacity: apiResult.capacity ?? eventData.capacity,
        isPublic:
          apiResult.isPublic ?? apiResult.is_public ?? eventData.isPublic,
        status: apiResult.status || eventData.status,
        cost: apiResult.cost ?? eventData.cost,
        createdAt:
          apiResult.createdAt ||
          apiResult.created_at ||
          new Date().toISOString(),
        updatedAt:
          apiResult.updatedAt ||
          apiResult.updated_at ||
          new Date().toISOString(),
      };
    } else {
      console.warn(
        "[AdminEvents] API did not return expected data, falling back to local event creation",
      );
      newEvent = {
        id: Date.now(),
        title: eventData.title,
        description: eventData.description || null,
        location: eventData.location || null,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        capacity: eventData.capacity!,
        isPublic: eventData.isPublic!,
        status: eventData.status!,
        cost: eventData.cost!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await localStorage.addEvent(newEvent);
    }

    const updated = [...events, newEvent];
    setEvents(updated);
    setShowCreateModal(false);
    resetForm();

    setRegisteredUsersMap({
      ...registeredUsersMap,
      [newEvent.id]: [],
    });
  };

  const handleDeleteEvent = (id: number) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this event?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await adminApi.deleteEvent(id);
            const updated = events.filter((ev) => ev.id !== id);
            setEvents(updated);
            await localStorage.deleteEvent(id);
            const copy = { ...registeredUsersMap };
            delete copy[id];
            setRegisteredUsersMap(copy);
          },
        },
      ],
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const processTicket = async (rawData: string) => {
    if (!selectedEvent) return;
    const registrationHash = rawData.trim();
    if (!registrationHash) {
      Alert.alert("Scanning Error", "QR code data is empty.");
      return;
    }
    try {
      const result = await adminApi.qrCheckIn(
        selectedEvent.id,
        registrationHash,
      );
      const eventId = selectedEvent.id;
      const users = registeredUsersMap[eventId] || [];
      const email = result?.userEmail ?? result?.user_email ?? "";
      if (email) {
        const idx = users.findIndex((u) => u.userEmail === email);
        const updatedUsers = [...users];
        if (idx !== -1) {
          updatedUsers[idx] = { ...updatedUsers[idx], checkedIn: true };
        } else {
          updatedUsers.push({
            registrationId: result?.registrationId ?? result?.id ?? 0,
            eventId,
            userEmail: email,
            instance: 0,
            checkedIn: true,
          });
        }
        setRegisteredUsersMap({
          ...registeredUsersMap,
          [eventId]: updatedUsers,
        });
      }
      Alert.alert(
        "Success",
        `Attendee${email ? ` (${email})` : ""} checked in.`,
      );
    } catch (err: any) {
      console.warn("[AdminEvents] QR check-in failed", err);
      const serverMsg =
        err?.response?.data?.error || err?.response?.data?.message;
      if (serverMsg?.toLowerCase().includes("already")) {
        Alert.alert("Already Checked In", serverMsg);
      } else if (serverMsg) {
        Alert.alert("Check-in Failed", serverMsg);
      } else {
        Alert.alert("Error", "Failed to check in. Please try again.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <View style={styles.filterRow}>
          {(
            ["all", "scheduled", "ongoing", "completed", "cancelled"] as const
          ).map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === status && styles.filterButtonTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>Create Event</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Total</Text>
          <Text style={styles.statsValue}>{totalEvents}</Text>
        </View>
        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Scheduled</Text>
          <Text style={[styles.statsValue, { color: "#ca8a04" }]}>
            {scheduledCount}
          </Text>
        </View>
        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Ongoing</Text>
          <Text style={[styles.statsValue, { color: "#16a34a" }]}>
            {ongoingCount}
          </Text>
        </View>
        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Completed</Text>
          <Text style={[styles.statsValue, { color: "#4b5563" }]}>
            {completedCount}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {filteredEvents.length === 0 ? (
          <Text style={styles.emptyText}>No events found</Text>
        ) : (
          filteredEvents.map((event) => (
            <View key={event.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderEmoji}>📅</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.description ? (
                  <Text style={styles.eventDescription}>
                    {event.description}
                  </Text>
                ) : null}
                {event.location ? (
                  <View style={styles.eventDetailRow}>
                    <Text style={styles.eventDetailIcon}>📍</Text>
                    <Text style={styles.eventDetailText}>{event.location}</Text>
                  </View>
                ) : null}
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventDetailIcon}>🗓️</Text>
                  <Text style={styles.eventDetailText}>
                    {formatDate(event.startTime)} {formatTime(event.startTime)}
                  </Text>
                </View>
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventDetailIcon}>👥</Text>
                  <Text style={styles.eventDetailText}>
                    Capacity: {event.capacity}
                  </Text>
                </View>
                {event.cost > 0 ? (
                  <View style={styles.eventDetailRow}>
                    <Text style={styles.eventDetailIcon}>💰</Text>
                    <Text style={styles.eventDetailText}>${event.cost}</Text>
                  </View>
                ) : null}

                <View style={styles.eventFooter}>
                  <View
                    style={[styles.statusBadge, getStatusStyles(event.status)]}
                  >
                    <Text style={styles.statusText}>{event.status}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.eventActionButton, styles.viewButton]}
                      onPress={async () => {
                        setSelectedEvent(event);
                        setShowDetailModal(true);
                        setScanMode(false);
                        setScannedOnce(false);
                        // Fetch registered users from API
                        try {
                          const regList =
                            await adminApi.getEventRegistrationList(event.id);
                          if (Array.isArray(regList) && regList.length > 0) {
                            const mapped = regList.map((r: any) => ({
                              registrationId: r.id ?? r.registrationId,
                              eventId: r.eventId ?? r.event_id ?? event.id,
                              userEmail: r.userEmail ?? r.user_email,
                              instance: r.instance ?? 0,
                              checkedIn:
                                registeredUsersMap[event.id]?.find(
                                  (u: RegisteredUser) =>
                                    u.userEmail ===
                                    (r.userEmail ?? r.user_email),
                                )?.checkedIn ?? false,
                            }));
                            setRegisteredUsersMap((prev) => ({
                              ...prev,
                              [event.id]: mapped,
                            }));
                          }
                        } catch (err) {
                          // Keep existing local data if fetch fails
                        }
                      }}
                    >
                      <Text style={styles.eventActionText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.eventActionButton, styles.deleteButton]}
                      onPress={() => handleDeleteEvent(event.id)}
                    >
                      <Text style={styles.eventActionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Create Event</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            <TextInput
              style={styles.modalInput}
              placeholder="Title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Location"
              value={formData.location}
              onChangeText={(text) =>
                setFormData({ ...formData, location: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Start Time (ISO)"
              value={formData.startTime}
              onChangeText={(text) =>
                setFormData({ ...formData, startTime: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="End Time (ISO)"
              value={formData.endTime}
              onChangeText={(text) =>
                setFormData({ ...formData, endTime: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Capacity"
              value={formData.capacity}
              keyboardType="numeric"
              onChangeText={(text) =>
                setFormData({ ...formData, capacity: text })
              }
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Public Event</Text>
              <Switch
                value={formData.isPublic}
                onValueChange={(value) =>
                  setFormData({ ...formData, isPublic: value })
                }
              />
            </View>

            <View style={styles.statusSelectRow}>
              {(
                ["scheduled", "ongoing", "completed", "cancelled"] as const
              ).map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setFormData({ ...formData, status })}
                  style={[
                    styles.statusOption,
                    formData.status === status && styles.statusOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      formData.status === status &&
                        styles.statusOptionTextActive,
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Cost"
              value={formData.cost}
              keyboardType="numeric"
              onChangeText={(text) => setFormData({ ...formData, cost: text })}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreateEvent}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showDetailModal}
        animationType="slide"
        onRequestClose={() => {
          setShowDetailModal(false);
          setScanMode(false);
          setScannedOnce(false);
        }}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Event Details</Text>

          {selectedEvent ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.detailLabel}>Title</Text>
              <Text style={styles.detailValue}>{selectedEvent.title}</Text>

              {selectedEvent.description ? (
                <>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>
                    {selectedEvent.description}
                  </Text>
                </>
              ) : null}

              {selectedEvent.location ? (
                <>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>
                    {selectedEvent.location}
                  </Text>
                </>
              ) : null}

              <Text style={styles.detailLabel}>Start Time</Text>
              <Text style={styles.detailValue}>
                {formatDate(selectedEvent.startTime)}{" "}
                {formatTime(selectedEvent.startTime)}
              </Text>

              <Text style={styles.detailLabel}>End Time</Text>
              <Text style={styles.detailValue}>
                {formatDate(selectedEvent.endTime)}{" "}
                {formatTime(selectedEvent.endTime)}
              </Text>

              <Text style={styles.detailLabel}>Capacity</Text>
              <Text style={styles.detailValue}>{selectedEvent.capacity}</Text>

              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{selectedEvent.status}</Text>

              {selectedEvent.cost > 0 ? (
                <>
                  <Text style={styles.detailLabel}>Cost</Text>
                  <Text style={styles.detailValue}>${selectedEvent.cost}</Text>
                </>
              ) : null}

              <Text style={[styles.detailLabel, { marginTop: 16 }]}>
                Registered Users
              </Text>
              {registeredUsersMap[selectedEvent.id]?.length ? (
                registeredUsersMap[selectedEvent.id].map((user) => (
                  <View
                    key={user.registrationId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 14, color: "#374151" }}>
                      {user.userEmail}
                    </Text>
                    {user.checkedIn ? (
                      <Text style={{ color: "#16a34a", fontSize: 14 }}>✅</Text>
                    ) : (
                      <Text style={{ color: "#f59e0b", fontSize: 14 }}>⌛</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 14, color: "#6b7280" }}>
                  No registered users
                </Text>
              )}

              {scanMode ? (
                <View style={{ height: 320, marginTop: 16 }}>
                  {!cameraPermission ? (
                    <Text>Requesting camera permission...</Text>
                  ) : cameraPermission && !cameraPermission.granted ? (
                    <Text>Camera permission not granted.</Text>
                  ) : (
                    <View
                      style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}
                    >
                      <CameraView
                        style={{
                          flex: 1,
                          borderRadius: 12,
                          overflow: "hidden",
                        }}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                        onBarcodeScanned={(result: any) => {
                          if (scannedOnce) return;
                          const value = (result?.data ??
                            (result as any)?.[0]?.data) as string | undefined;
                          if (!value) return;
                          setScannedOnce(true);
                          processTicket(String(value));
                          setScanMode(false);
                        }}
                      />
                      <View style={styles.scanOverlay}>
                        <View style={styles.scanFrame} />
                        <Text style={styles.scanHint}>
                          Align QR code inside the box
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.cancelButton,
                      { marginTop: 12 },
                    ]}
                    onPress={() => {
                      setScanMode(false);
                      setScannedOnce(false);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Cancel Scan</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    { marginTop: 16 },
                  ]}
                  onPress={() => {
                    setScanMode(true);
                    setScannedOnce(false);
                    // Request camera permission when starting scan
                    requestCameraPermission();
                  }}
                >
                  <Text style={styles.modalButtonText}>Scan Ticket</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { marginTop: 24 },
                ]}
                onPress={() => {
                  setShowDetailModal(false);
                  setScanMode(false);
                  setScannedOnce(false);
                }}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <Text>No event selected</Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

function getStatusStyles(status: string) {
  switch (status) {
    case "scheduled":
      return { backgroundColor: "#fef9c3" };
    case "ongoing":
      return { backgroundColor: "#dcfce7" };
    case "completed":
      return { backgroundColor: "#e5e7eb" };
    case "cancelled":
      return { backgroundColor: "#fee2e2" };
    default:
      return { backgroundColor: "#dbeafe" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },

  actionBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  searchInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: { backgroundColor: "#dc2626" },
  filterButtonText: { fontSize: 12, color: "#374151" },
  filterButtonTextActive: { color: "#ffffff" },

  createButton: {
    alignSelf: "flex-start",
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  createButtonText: { color: "#ffffff", fontWeight: "600" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  statsBox: { alignItems: "center" },
  statsLabel: { fontSize: 12, color: "#6b7280" },
  statsValue: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },

  listContainer: { padding: 16 },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 32,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    height: 72,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderEmoji: { fontSize: 32, color: "#ffffff" },
  cardBody: { padding: 12 },

  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  eventDescription: { fontSize: 14, color: "#4b5563", marginBottom: 8 },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  eventDetailIcon: { marginRight: 4 },
  eventDetailText: { fontSize: 12, color: "#374151" },

  eventFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, color: "#374151", textTransform: "capitalize" },

  actionButtons: { flexDirection: "row", alignItems: "center" },
  eventActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  viewButton: { backgroundColor: "#f3f4f6" },
  deleteButton: { backgroundColor: "#fee2e2" },
  eventActionText: { fontSize: 12, color: "#374151" },

  modalContainer: { flex: 1, backgroundColor: "#ffffff", padding: 16 },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  switchLabel: { fontSize: 14, color: "#374151" },

  statusSelectRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  statusOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
    marginBottom: 8,
  },
  statusOptionActive: { backgroundColor: "#dc2626" },
  statusOptionText: { fontSize: 12, color: "#374151" },
  statusOptionTextActive: { color: "#ffffff" },

  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: { backgroundColor: "#16a34a" },
  cancelButton: { backgroundColor: "#6b7280" },
  modalButtonText: { color: "#ffffff", fontWeight: "600" },

  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  detailValue: { fontSize: 14, color: "#1f2937", marginBottom: 4 },

  // Scanner overlay
  scanOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 12,
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
  },
  scanHint: {
    marginTop: 10,
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
});
