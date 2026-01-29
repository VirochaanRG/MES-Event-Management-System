import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUser, AuthUser, logout } from "../../lib/auth";
import ProtectedTeamPortal from "../../components/ProtectedTeamPortal";
import AdminLayout from "@/components/AdminLayout";
import RequireRole from "@/components/RequireRole";
import {
  BarChart3,
  Users,
  Calendar,
  ArrowLeft,
  Download,
  FileText,
  TrendingUp,
  Clock,
} from "lucide-react";

interface Form {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

interface Question {
  id: number;
  formId: number;
  questionType: string;
  questionTitle: string | null;
  qorder: number;
}

interface Submission {
  userId: string;
  submittedAt: string;
  answers: {
    questionId: number;
    questionTitle: string | null;
    questionType: string;
    qorder: number;
    answer: string;
  }[];
}

interface AnalyticsData {
  form: Form;
  submissions: Submission[];
  totalSubmissions: number;
}

function AnalyticsDetailPageContent() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const navigate = useNavigate();
  const { analyticsId } = Route.useParams();

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
    if (currentUser && analyticsId) {
      fetchAnalyticsData();
      fetchQuestions();
    }
  }, [currentUser, analyticsId]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(
        `http://localhost:3124/api/forms/${analyticsId}/answers`,
      );
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(
        `http://localhost:3124/api/forms/${analyticsId}/questions`,
      );
      const data = await response.json();
      if (data.success) {
        setQuestions(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAnswersByQuestion = (questionId: number) => {
    if (!analyticsData) return [];
    const answers: string[] = [];
    analyticsData.submissions.forEach((submission) => {
      const answer = submission.answers.find(
        (a) => a.questionId === questionId,
      );
      if (answer && answer.answer) {
        answers.push(answer.answer);
      }
    });
    return answers;
  };

  const getAnswerStats = (questionId: number) => {
    const answers = getAnswersByQuestion(questionId);
    const total = answers.length;

    // Count unique answers and their frequency
    const frequency = new Map<string, number>();
    answers.forEach((answer) => {
      frequency.set(answer, (frequency.get(answer) || 0) + 1);
    });

    // Convert to array and sort by frequency
    const sorted = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 answers

    return { total, answers: sorted };
  };

  const exportToCSV = () => {
    if (!analyticsData || !questions) return;

    // Create CSV header
    const headers = [
      "User ID",
      "Submitted At",
      ...questions.map((q) => q.questionTitle || `Question ${q.id}`),
    ];

    // Create CSV rows
    const rows = analyticsData.submissions.map((submission) => {
      const row = [
        submission.userId,
        formatDate(submission.submittedAt),
        ...questions.map((q) => {
          const answer = submission.answers.find((a) => a.questionId === q.id);
          return answer?.answer || "";
        }),
      ];
      return row;
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${analyticsData.form.name}_analytics.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  if (!analyticsData) {
    return (
      <RequireRole
        userRoles={currentUser.roles}
        requiredRole="analytics"
        redirectTo="/"
      >
        <AdminLayout user={currentUser} title="Form Analytics">
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No data available
              </h3>
              <p className="text-gray-600">
                Unable to load analytics for this form.
              </p>
            </div>
          </div>
        </AdminLayout>
      </RequireRole>
    );
  }

  return (
    <RequireRole
      userRoles={currentUser.roles}
      requiredRole="analytics"
      redirectTo="/"
    >
      <AdminLayout
        user={currentUser}
        title={analyticsData.form.name}
        subtitle="Detailed form analytics and responses"
      >
        <div className="p-6">
          {/* Back Button */}
          <Link
            to="/analytics"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Analytics
          </Link>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Responses
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analyticsData.totalSubmissions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Questions</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {questions.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Completion Rate
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analyticsData.totalSubmissions > 0 ? "100" : "0"}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Created</p>
                  <p className="text-sm font-bold text-gray-900 mt-2">
                    {new Date(
                      analyticsData.form.createdAt,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Export Data</h3>
                <p className="text-sm text-gray-600">
                  Download all responses as CSV
                </p>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Question Analytics */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">
              Question Breakdown
            </h2>

            {questions.map((question) => {
              const stats = getAnswerStats(question.id);

              return (
                <div
                  key={question.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 flex-1">
                        {question.questionTitle ||
                          `Question ${question.qorder}`}
                      </h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        {question.questionType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {stats.total} response{stats.total !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {stats.answers.length > 0 ? (
                    <div className="space-y-2">
                      {stats.answers.map(([answer, count]) => {
                        const percentage =
                          stats.total > 0 ? (count / stats.total) * 100 : 0;
                        return (
                          <div key={answer} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 truncate flex-1 mr-4">
                                {answer}
                              </span>
                              <span className="text-gray-600 font-medium">
                                {count} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-red-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No responses yet</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent Submissions */}
          <div className="mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Submissions
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Submitted At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Responses
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analyticsData.submissions
                      .slice(0, 10)
                      .map((submission, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            {submission.userId}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {formatDate(submission.submittedAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {submission.answers.length} answer
                            {submission.answers.length !== 1 ? "s" : ""}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {analyticsData.submissions.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No submissions yet
                  </h3>
                  <p className="text-gray-600">
                    Responses will appear here once users start submitting the
                    form.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </RequireRole>
  );
}

function AnalyticsDetailPage() {
  return (
    <ProtectedTeamPortal>
      <AnalyticsDetailPageContent />
    </ProtectedTeamPortal>
  );
}

export const Route = createFileRoute("/analytics/$analyticsId")({
  component: AnalyticsDetailPage,
});
