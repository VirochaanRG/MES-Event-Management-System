import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUser, AuthUser, logout } from "@/lib/auth";
import ProtectedTeamPortal from "@/components/ProtectedTeamPortal";
import AdminLayout from "@/components/AdminLayout";
import RequireRole from "@/components/RequireRole";
import {
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  Search,
  Eye,
} from "lucide-react";

interface Form {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

interface FormStats {
  formId: number;
  totalSubmissions: number;
  totalQuestions: number;
  lastSubmissionDate: string | null;
  completionRate: number;
}

function AnalyticsPageContent() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forms, setForms] = useState<Form[]>([]);
  const [formStats, setFormStats] = useState<Map<number, FormStats>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredForms, setFilteredForms] = useState<Form[]>([]);
  const navigate = useNavigate();

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
      fetchForms();
    }
  }, [currentUser]);

  useEffect(() => {
    filterForms();
  }, [searchTerm, forms]);

  const fetchForms = async () => {
    try {
      const response = await fetch("/api/forms/all");
      const data = await response.json();
      if (data.success) {
        setForms(data.data);
        // Fetch stats for each form
        data.data.forEach((form: Form) => {
          fetchFormStats(form.id);
        });
      }
    } catch (error) {
      console.error("Failed to fetch forms:", error);
    }
  };

  const fetchFormStats = async (formId: number) => {
    try {
      const response = await fetch(`/api/forms/${formId}/answers`);
      const data = await response.json();
      if (data.success) {
        const submissions = data.data.submissions || [];
        const totalSubmissions = submissions.length;

        // Get questions count
        const questionsResponse = await fetch(`/api/forms/${formId}/questions`);
        const questionsData = await questionsResponse.json();
        const totalQuestions = questionsData.success
          ? questionsData.data.length
          : 0;

        // Find last submission date
        const lastSubmissionDate =
          submissions.length > 0
            ? submissions.reduce((latest: any, submission: any) => {
                const subDate = new Date(submission.submittedAt);
                return subDate > new Date(latest)
                  ? submission.submittedAt
                  : latest;
              }, submissions[0].submittedAt)
            : null;

        // Calculate completion rate (simplified - assumes all questions answered)
        const completionRate = totalQuestions > 0 ? 100 : 0;

        setFormStats((prev) =>
          new Map(prev).set(formId, {
            formId,
            totalSubmissions,
            totalQuestions,
            lastSubmissionDate,
            completionRate,
          }),
        );
      }
    } catch (error) {
      console.error(`Failed to fetch stats for form ${formId}:`, error);
    }
  };

  const filterForms = () => {
    let filtered = forms;

    if (searchTerm) {
      filtered = filtered.filter(
        (form) =>
          form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredForms(filtered);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No submissions yet";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const totalSubmissions = Array.from(formStats.values()).reduce(
    (sum, stats) => sum + stats.totalSubmissions,
    0,
  );

  return (
    <RequireRole
      userRoles={currentUser.roles}
      requiredRole="analytics"
      redirectTo="/"
    >
      <AdminLayout
        user={currentUser}
        title="Form Analytics"
        subtitle="View and analyze form submissions and responses"
      >
        <div className="p-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Forms
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {forms.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Submissions
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {totalSubmissions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Avg Submissions/Form
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {forms.length > 0
                      ? Math.round(totalSubmissions / forms.length)
                      : 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search forms by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Forms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map((form) => {
              const stats = formStats.get(form.id);
              return (
                <Link
                  key={form.id}
                  to={`/analytics/${form.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-1">
                          {form.name}
                        </h3>
                        {form.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {form.description}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <Eye className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                      </div>
                    </div>

                    {stats ? (
                      <div className="space-y-3 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Submissions</span>
                          <span className="font-semibold text-gray-900">
                            {stats.totalSubmissions}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Questions</span>
                          <span className="font-semibold text-gray-900">
                            {stats.totalQuestions}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">
                            Last: {formatDate(stats.lastSubmissionDate)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="animate-pulse space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">View Analytics</span>
                      <BarChart3 className="w-4 h-4 text-red-600" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredForms.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No forms found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Create your first form to start collecting data"}
              </p>
              {!searchTerm && (
                <Link
                  to="/form-builder"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Create Form
                </Link>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
    </RequireRole>
  );
}

function AnalyticsPage() {
  return (
    <ProtectedTeamPortal>
      <AnalyticsPageContent />
    </ProtectedTeamPortal>
  );
}

export const Route = createFileRoute("/analytics/")({
  component: AnalyticsPage,
});
