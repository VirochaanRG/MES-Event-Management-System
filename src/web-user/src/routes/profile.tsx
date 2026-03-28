import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomAlert } from "@/components/CustomAlert";

interface ProfileRecord {
  firstName: string;
  lastName: string;
  isMcmasterStudent: boolean;
  faculty: string | null;
  program: string | null;
}

const PROGRAMS_BY_FACULTY: Record<string, string[]> = {
  Engineering: [
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Engineering",
    "Electrical Engineering",
    "Engineering Physics",
    "Materials Engineering",
    "Mechanical Engineering",
    "Software Engineering",
    "Mechatronics Engineering",
  ],
  Science: [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Earth and Environmental Sciences",
  ],
  Business: ["Commerce", "Business Analytics", "Finance", "Marketing"],
  Humanities: ["History", "Philosophy", "English", "Linguistics"],
  "Social Sciences": [
    "Economics",
    "Political Science",
    "Psychology",
    "Sociology",
  ],
  Health: ["Nursing", "Health Sciences", "Kinesiology", "Biochemistry"],
};

const FACULTIES = Object.keys(PROGRAMS_BY_FACULTY);

function ProfilePageContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAlert } = useCustomAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isMcmasterStudent, setIsMcmasterStudent] = useState(true);
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const endpoint = user.id
          ? `/api/profiles/${user.id}`
          : `/api/profiles?email=${encodeURIComponent(user.email)}`;

        const res = await fetch(endpoint, { credentials: "include" });
        const json = await res.json();

        if (json?.success && json?.data) {
          const profile = json.data as ProfileRecord;
          setFirstName(profile.firstName ?? "");
          setLastName(profile.lastName ?? "");
          setIsMcmasterStudent(Boolean(profile.isMcmasterStudent));
          setFaculty(profile.faculty ?? "");
          setProgram(profile.program ?? "");
        }
      } catch {
        showAlert("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, showAlert]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert("All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      showAlert("New password must be at least 8 characters");
      return;
    }
    if (!user?.email) {
      showAlert("You must be logged in");
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: user.email,
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to change password");
      }
      showAlert("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePw(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to change password";
      showAlert(message);
    } finally {
      setChangingPw(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      showAlert("First name and last name are required");
      return;
    }

    if (isMcmasterStudent && (!faculty || !program)) {
      showAlert("Please select both faculty and program");
      return;
    }

    if (!user) {
      showAlert("You must be logged in to save a profile");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          isMcmasterStudent,
          faculty: isMcmasterStudent ? faculty : null,
          program: isMcmasterStudent ? program : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to save profile");
      }

      showAlert("Profile saved successfully");
      navigate({ to: "/" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save profile";
      showAlert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white border-2 border-red-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-red-900 px-6 py-5">
          <h1 className="text-2xl font-black text-yellow-300">
            Set Up Profile
          </h1>
          <p className="text-yellow-100/80 text-sm mt-1">
            Complete your profile so we can personalize your experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Are you a McMaster student?
            </label>
            <div className="flex items-center gap-6 text-sm text-gray-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="isMcmasterStudent"
                  checked={isMcmasterStudent}
                  onChange={() => setIsMcmasterStudent(true)}
                  className="h-4 w-4 accent-red-900"
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="isMcmasterStudent"
                  checked={!isMcmasterStudent}
                  onChange={() => {
                    setIsMcmasterStudent(false);
                    setFaculty("");
                    setProgram("");
                  }}
                  className="h-4 w-4 accent-red-900"
                />
                No
              </label>
            </div>
          </div>

          {isMcmasterStudent && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Faculty
                </label>
                <select
                  value={faculty}
                  onChange={(e) => {
                    const nextFaculty = e.target.value;
                    setFaculty(nextFaculty);

                    if (!PROGRAMS_BY_FACULTY[nextFaculty]?.includes(program)) {
                      setProgram("");
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900"
                >
                  <option value="">Select faculty</option>
                  {FACULTIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Program
                </label>
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  disabled={!faculty}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">
                    {faculty ? "Select program" : "Select faculty first"}
                  </option>
                  {(PROGRAMS_BY_FACULTY[faculty] ?? []).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-red-900 text-white font-semibold rounded-md hover:bg-red-950 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="px-5 py-2.5 bg-white text-red-900 border-2 border-yellow-400 font-semibold rounded-md hover:bg-yellow-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Change Password Section */}
        <div className="border-t border-gray-200 px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={() => {
              setShowChangePw((v) => !v);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }}
            className="flex items-center gap-2 text-sm font-semibold text-red-900 hover:text-red-700"
          >
            <span>{showChangePw ? "▲" : "▼"}</span>
            Change Password
          </button>

          {showChangePw && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-900"
                />
              </div>
              <button
                type="submit"
                disabled={changingPw}
                className="px-5 py-2.5 bg-yellow-400 text-red-950 font-semibold rounded-md hover:bg-yellow-300 disabled:opacity-60"
              >
                {changingPw ? "Changing..." : "Change Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});
