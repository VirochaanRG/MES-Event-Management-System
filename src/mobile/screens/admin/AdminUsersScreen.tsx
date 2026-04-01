import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
  ActivityIndicator,
} from "react-native";
import * as adminApi from "../../services/adminApi";

interface User {
  id: number;
  email: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

const SAMPLE_USERS: User[] = [
  {
    id: 1,
    email: "admin@example.com",
    roles: ["admin", "events", "analytics"],
    createdAt: new Date("2025-01-01T10:00:00Z").toISOString(),
    updatedAt: new Date("2025-01-05T12:00:00Z").toISOString(),
  },
  {
    id: 2,
    email: "organiser@example.com",
    roles: ["events"],
    createdAt: new Date("2025-02-10T09:30:00Z").toISOString(),
    updatedAt: new Date("2025-02-12T08:00:00Z").toISOString(),
  },
  {
    id: 3,
    email: "analyst@example.com",
    roles: ["analytics"],
    createdAt: new Date("2025-03-15T14:45:00Z").toISOString(),
    updatedAt: new Date("2025-03-18T16:20:00Z").toISOString(),
  },
  {
    id: 4,
    email: "user@example.com",
    roles: [],
    createdAt: new Date("2025-04-01T12:00:00Z").toISOString(),
    updatedAt: new Date("2025-04-02T12:00:00Z").toISOString(),
  },
];

export function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditRolesModal, setShowEditRolesModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [editRolesData, setEditRolesData] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to fetch users from API, fall back to sample data
    const load = async () => {
      try {
        setLoading(true);
        const apiUsers = await adminApi.getUsers();
        if (Array.isArray(apiUsers) && apiUsers.length > 0) {
          const mapped: User[] = apiUsers.map((u: any) => ({
            id: u.id,
            email: u.email,
            roles: u.roles || [],
            createdAt: u.createdAt || u.created_at || new Date().toISOString(),
            updatedAt: u.updatedAt || u.updated_at || new Date().toISOString(),
          }));
          setUsers(mapped);
          // Collect all unique roles from DB users
          const allRoles = new Set<string>();
          mapped.forEach((u) => u.roles.forEach((r) => allRoles.add(r)));
          ["admin", "events", "analytics"].forEach((r) => allRoles.add(r));
          setAvailableRoles([...allRoles].sort());
        } else {
          // API unavailable or empty - use sample data
          setUsers(SAMPLE_USERS);
          setAvailableRoles(["admin", "events", "analytics"]);
        }
      } catch (err) {
        console.warn("[AdminUsers] Failed to fetch users from API", err);
        setUsers(SAMPLE_USERS);
        setAvailableRoles(["admin", "events", "analytics"]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    let filtered = users;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((user) => {
        return (
          user.email.toLowerCase().includes(term) ||
          user.roles.some((role) => role.toLowerCase().includes(term))
        );
      });
    }
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // Delete a user
  const handleDeleteUser = (id: number) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Try to delete via API
            await adminApi.deleteUser(id);
            const updated = users.filter((user) => user.id !== id);
            setUsers(updated);
          },
        },
      ],
    );
  };

  // Open the edit roles modal for a user
  const handleOpenEditRoles = (user: User) => {
    setSelectedUser(user);
    setEditRolesData([...user.roles]);
    setShowEditRolesModal(true);
  };

  // Save changes to a user's roles
  const handleUpdateRoles = async () => {
    if (!selectedUser) return;
    // Try to update via API
    await adminApi.updateUserRoles(selectedUser.id, editRolesData);
    const updatedUsers = users.map((user) => {
      if (user.id === selectedUser.id) {
        return { ...user, roles: editRolesData };
      }
      return user;
    });
    setUsers(updatedUsers);
    setShowEditRolesModal(false);
    setSelectedUser(null);
    setEditRolesData([]);
  };

  // Create a new role
  const handleCreateRole = () => {
    const trimmed = newRoleName.trim().toLowerCase();
    if (!trimmed) return;
    if (availableRoles.includes(trimmed)) {
      Alert.alert("Role Exists", "This role already exists.");
      return;
    }
    const updated = [...availableRoles, trimmed].sort();
    setAvailableRoles(updated);
    setShowCreateRoleModal(false);
    setNewRoleName("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#7f1d1d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>Manage application users and roles</Text>
      </View>
      <View style={styles.actionRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity
          style={styles.addRoleButton}
          onPress={() => setShowCreateRoleModal(true)}
        >
          <Text style={styles.addRoleButtonText}>Create Role</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {filteredUsers.length === 0 ? (
          <Text style={styles.emptyText}>No users found</Text>
        ) : (
          filteredUsers.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.rolesRow}>
                  {user.roles.length === 0 ? (
                    <View
                      style={[styles.roleBadge, { backgroundColor: "#e5e7eb" }]}
                    >
                      <Text style={styles.roleText}>None</Text>
                    </View>
                  ) : (
                    user.roles.map((role) => (
                      <View
                        key={role}
                        style={[styles.roleBadge, roleBadgeStyles(role)]}
                      >
                        <Text style={styles.roleText}>{role}</Text>
                      </View>
                    ))
                  )}
                </View>
                <Text style={styles.dateText}>
                  Joined: {formatDate(user.createdAt)}
                </Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.userActionButton, styles.editButton]}
                  onPress={() => handleOpenEditRoles(user)}
                >
                  <Text style={styles.userActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.userActionButton, styles.deleteButton]}
                  onPress={() => handleDeleteUser(user.id)}
                >
                  <Text style={styles.userActionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      {/* Edit Roles Modal */}
      <Modal
        visible={showEditRolesModal}
        animationType="slide"
        onRequestClose={() => setShowEditRolesModal(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Edit Roles</Text>
          <Text style={styles.modalSubtitle}>
            {selectedUser ? selectedUser.email : ""}
          </Text>
          <ScrollView style={{ marginTop: 12 }}>
            {availableRoles.map((role) => {
              const selected = editRolesData.includes(role);
              return (
                <View key={role} style={styles.roleSelectRow}>
                  <Text style={styles.roleSelectLabel}>{role}</Text>
                  <Switch
                    value={selected}
                    onValueChange={(value) => {
                      setEditRolesData((prev) => {
                        if (value) {
                          return prev.includes(role) ? prev : [...prev, role];
                        } else {
                          return prev.filter((r) => r !== role);
                        }
                      });
                    }}
                  />
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleUpdateRoles}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowEditRolesModal(false);
                setSelectedUser(null);
                setEditRolesData([]);
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Create Role Modal */}
      <Modal
        visible={showCreateRoleModal}
        animationType="slide"
        onRequestClose={() => setShowCreateRoleModal(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Create Role</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Role name"
            value={newRoleName}
            onChangeText={setNewRoleName}
          />
          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleCreateRole}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowCreateRoleModal(false);
                setNewRoleName("");
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function roleBadgeStyles(role: string) {
  switch (role) {
    case "admin":
      return { backgroundColor: "#fee2e2" };
    case "events":
      return { backgroundColor: "#fef9c3" };
    case "analytics":
      return { backgroundColor: "#dbeafe" };
    default:
      return { backgroundColor: "#e5e7eb" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  addRoleButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addRoleButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 24,
  },
  userCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  userEmail: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  rolesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  roleBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    color: "#374151",
    textTransform: "capitalize",
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
  },
  userActions: {
    flexDirection: "row",
    marginLeft: 8,
  },
  userActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: "#f3f4f6",
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
  },
  userActionText: {
    fontSize: 12,
    color: "#374151",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  roleSelectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  roleSelectLabel: {
    fontSize: 16,
    color: "#1f2937",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#16a34a",
  },
  cancelButton: {
    backgroundColor: "#6b7280",
  },
  modalButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
});
