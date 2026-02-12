import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUser, AuthUser, logout } from "../../lib/auth";
import ProtectedTeamPortal from "../../components/ProtectedTeamPortal";
import AdminLayout from "@/components/AdminLayout";
import {
  Users,
  Plus,
  Trash2,
  Search,
  Edit2,
  X,
  Shield,
  Mail,
  Calendar,
  Tag,
} from "lucide-react";
import RequireRole from "@/components/RequireRole";

interface User {
  id: number;
  email: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

function UsersPageContent() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditRolesModal, setShowEditRolesModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const navigate = useNavigate();

  const [editRolesData, setEditRolesData] = useState<string[]>([]);

  useEffect(() => {
    const initAuth = () => {
      const sessionUser = getCurrentUser("admin");
      if (sessionUser) {
        if (sessionUser.roles && sessionUser.roles.includes("admin")) {
          setCurrentUser(sessionUser);
        } else {
          console.error("User does not have admin role");
          logout("admin");
          navigate({ to: "/" });
        }
      } else {
        navigate({ to: "/" });
      }
      setIsLoading(false);
    };

    initAuth();
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      fetchRoles();
    }
  }, [currentUser]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
        setFilteredUsers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles");
      const data = await response.json();
      if (data.success) {
        setAvailableRoles(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.roles.some((role) =>
            role.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }

    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        fetchRoles();
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user");
    }
  };

  const handleOpenEditRoles = (user: User) => {
    setSelectedUser(user);
    setEditRolesData([...user.roles]);
    setShowEditRolesModal(true);
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: editRolesData }),
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        fetchRoles();
        setShowEditRolesModal(false);
        setSelectedUser(null);
      } else {
        alert(data.error || "Failed to update roles");
      }
    } catch (error) {
      console.error("Failed to update roles:", error);
      alert("Failed to update roles");
    }
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;

    const roleName = newRoleName.trim().toLowerCase();
    if (availableRoles.includes(roleName)) {
      alert("This role already exists!");
      return;
    }

    setAvailableRoles([...availableRoles, roleName].sort());
    setNewRoleName("");
    setShowCreateRoleModal(false);
  };

  const toggleRole = (role: string, isCreate: boolean = false) => {
    if (isCreate) {
      console.log("");
    } else {
      setEditRolesData((prev) =>
        prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <RequireRole
      userRoles={currentUser.roles}
      requiredRole="users"
      redirectTo="/denied"
    >
      <AdminLayout user={currentUser} title="Users Management">
        <div className="p-6">
          {/* Actions Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full md:w-auto md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by email or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateRoleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Tag className="w-5 h-5" />
                  Create Role
                </button>
                {/* <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add User
                </button> */}
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Roles</p>
              <p className="text-2xl font-bold text-yellow-600">
                {availableRoles.length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Admin Users</p>
              <p className="text-2xl font-bold text-red-600">
                {users.filter((u) => u.roles.includes("admin")).length}
              </p>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-yellow-500 rounded-full flex items-center justify-center font-bold text-white">
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.email}
                            </p>
                            {user.id === currentUser.id && (
                              <p className="text-xs text-gray-500">(You)</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <span
                                key={role}
                                className={`px-2 py-1 text-xs font-semibold rounded ${
                                  role === "admin"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">
                              No roles
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditRoles(user)}
                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                            title="Edit Roles"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser.id}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              user.id === currentUser.id
                                ? "Cannot delete yourself"
                                : "Delete User"
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No users found
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Create your first user to get started"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Roles Modal */}
        {showEditRolesModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Edit Roles</h2>
                <button
                  onClick={() => setShowEditRolesModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">User</p>
                  <p className="font-medium text-gray-900">
                    {selectedUser.email}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableRoles.map((role) => (
                      <button
                        key={role}
                        onClick={() => toggleRole(role, false)}
                        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                          editRolesData.includes(role)
                            ? "bg-red-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleUpdateRoles}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Update Roles
                  </button>
                  <button
                    onClick={() => setShowEditRolesModal(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Role Modal */}
        {showCreateRoleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create New Role
                </h2>
                <button
                  onClick={() => {
                    setShowCreateRoleModal(false);
                    setNewRoleName("");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g., moderator, editor, viewer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Role names will be converted to lowercase
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCreateRole}
                    className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Create Role
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateRoleModal(false);
                      setNewRoleName("");
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </RequireRole>
  );
}

function UsersPage() {
  return (
    <ProtectedTeamPortal>
      <UsersPageContent />
    </ProtectedTeamPortal>
  );
}

export const Route = createFileRoute("/users/")({
  component: UsersPage,
});
