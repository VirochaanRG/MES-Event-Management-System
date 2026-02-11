import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUser, AuthUser, logout } from "@/lib/auth";
import ProtectedTeamPortal from "@/components/ProtectedTeamPortal";
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
  Table as TableIcon,
  PieChart,
  Filter,
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
  optionsCategory: string | null;
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

type ViewMode = "table" | "graphs";
type ChartType = "bar" | "pie";

function AnalyticsDetailPageContent() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [chartTypes, setChartTypes] = useState<Map<number, ChartType>>(
    new Map(),
  );
  const [textAnswerPages, setTextAnswerPages] = useState<Map<number, number>>(
    new Map(),
  );
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(
    new Set(),
  );
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
      const response = await fetch(`/api/forms/${analyticsId}/answers`);
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
      const response = await fetch(`/api/forms/${analyticsId}/questions`);
      const data = await response.json();
      if (data.success) {
        setQuestions(data.data);
        // Initialize chart types for all questions
        const initialChartTypes = new Map<number, ChartType>();
        data.data.forEach((q: Question) => {
          initialChartTypes.set(q.id, "bar");
        });
        setChartTypes(initialChartTypes);
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
    const question = questions.find((q) => q.id === questionId);
    const answers: string[] = [];

    analyticsData.submissions.forEach((submission) => {
      const answer = submission.answers.find(
        (a) => a.questionId === questionId,
      );
      if (answer && answer.answer) {
        // For multi_select, parse the {1,2,3} format and add each value separately
        if (question?.questionType === "multi_select") {
          const cleaned = answer.answer.replace(/[{}]/g, "");
          const values = cleaned
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          answers.push(...values);
        } else {
          answers.push(answer.answer);
        }
      }
    });
    return answers;
  };

  const getAnswerStats = (questionId: number) => {
    const answers = getAnswersByQuestion(questionId);
    const question = questions.find((q) => q.id === questionId);

    // For multi_select, total is the number of submissions, not individual answers
    const total =
      question?.questionType === "multi_select"
        ? analyticsData?.submissions.length || 0
        : answers.length;

    const frequency = new Map<string, number>();
    answers.forEach((answer) => {
      frequency.set(answer, (frequency.get(answer) || 0) + 1);
    });

    const sorted = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);

    return { total, answers: sorted };
  };

  const toggleChartType = (questionId: number) => {
    setChartTypes((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(questionId) || "bar";
      newMap.set(questionId, current === "bar" ? "pie" : "bar");
      return newMap;
    });
  };

  const toggleRowSelection = (index: number) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    if (!analyticsData) return;
    if (selectedRows.size === analyticsData.submissions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(analyticsData.submissions.map((_, i) => i)));
    }
  };

  const toggleQuestionSelection = (questionId: number) => {
    setSelectedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const exportToCSV = () => {
    if (!analyticsData || !questions) return;

    const headers = [
      "User ID",
      "Submitted At",
      ...questions.map((q) => q.questionTitle || `Question ${q.id}`),
    ];

    const submissionsToExport =
      selectedRows.size > 0
        ? analyticsData.submissions.filter((_, i) => selectedRows.has(i))
        : analyticsData.submissions;

    const rows = submissionsToExport.map((submission) => {
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

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix =
      selectedRows.size > 0 ? `_selected_${selectedRows.size}` : "";
    a.download = `${analyticsData.form.name}_responses${suffix}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportQuestionStats = (questionId?: number) => {
    if (!analyticsData || !questions) return;

    const questionsToExport = questionId
      ? ([questions.find((q) => q.id === questionId)].filter(
          Boolean,
        ) as Question[])
      : questions.filter((q) => selectedQuestions.has(q.id));

    if (questionsToExport.length === 0) return;

    const csvContent = questionsToExport
      .map((question) => {
        const stats = getAnswerStats(question.id);
        const rows = [
          [
            `Question: ${question.questionTitle || `Question ${question.qorder}`}`,
          ],
          [`Type: ${question.questionType}`],
          [`Total Responses: ${stats.total}`],
          [""],
          ["Answer", "Count", "Percentage"],
          ...stats.answers.map(([answer, count]) => {
            const percentage =
              stats.total > 0 ? (count / stats.total) * 100 : 0;
            return [answer, count.toString(), `${percentage.toFixed(1)}%`];
          }),
          [""], // Empty row between questions
        ];
        return rows
          .map((row) => row.map((cell) => `"${cell}"`).join(","))
          .join("\n");
      })
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    if (questionId) {
      const question = questions.find((q) => q.id === questionId);
      a.download = `${analyticsData.form.name}_${question?.questionTitle || `question_${questionId}`}_stats.csv`;
    } else {
      a.download = `${analyticsData.form.name}_selected_questions_stats.csv`;
    }
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportCombined = () => {
    if (!analyticsData || !questions) return;

    let csvContent = "";

    // Export selected question statistics first
    const questionsToExport = questions.filter((q) =>
      selectedQuestions.has(q.id),
    );
    if (questionsToExport.length > 0) {
      csvContent += "QUESTION STATISTICS\n\n";
      questionsToExport.forEach((question) => {
        const stats = getAnswerStats(question.id);
        csvContent += `"Question: ${question.questionTitle || `Question ${question.qorder}`}"\n`;
        csvContent += `"Type: ${question.questionType}"\n`;
        csvContent += `"Total Responses: ${stats.total}"\n`;
        csvContent += "\n";
        csvContent += '"Answer","Count","Percentage"\n';
        stats.answers.forEach(([answer, count]) => {
          const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
          csvContent += `"${answer}","${count}","${percentage.toFixed(1)}%"\n`;
        });
        csvContent += "\n\n";
      });
    }

    // Export selected rows
    const submissionsToExport =
      selectedRows.size > 0
        ? analyticsData.submissions.filter((_, i) => selectedRows.has(i))
        : analyticsData.submissions;

    if (submissionsToExport.length > 0) {
      csvContent += "RAW RESPONSES\n\n";
      const headers = [
        "User ID",
        "Submitted At",
        ...questions.map((q) => q.questionTitle || `Question ${q.id}`),
      ];
      csvContent += headers.join(",") + "\n";

      submissionsToExport.forEach((submission) => {
        const row = [
          submission.userId,
          formatDate(submission.submittedAt),
          ...questions.map((q) => {
            const answer = submission.answers.find(
              (a) => a.questionId === q.id,
            );
            return answer?.answer || "";
          }),
        ];
        csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${analyticsData.form.name}_combined_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderBarChart = (questionId: number) => {
    const stats = getAnswerStats(questionId);
    const maxCount = Math.max(...stats.answers.map(([_, count]) => count), 1);

    return (
      <div className="flex items-end gap-4 justify-start overflow-x-auto pb-4">
        {stats.answers.map(([answer, count]) => {
          const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
          const barHeight = (count / maxCount) * 200; // Max height of 200px

          return (
            <div
              key={answer}
              className="flex flex-col items-center gap-2 min-w-[100px]"
            >
              <div className="text-sm text-gray-600 font-medium">
                ({percentage.toFixed(1)}%)
              </div>
              <div
                className="relative w-20 bg-gray-200 rounded-t-lg flex items-end justify-center"
                style={{ height: "200px" }}
              >
                <div
                  className="w-full bg-red-900 rounded-t-lg transition-all flex items-end justify-center pb-2"
                  style={{ height: `${barHeight}px` }}
                >
                  <span className="text-white font-bold text-sm">{count}</span>
                </div>
              </div>
              <div className="text-sm text-gray-700 font-medium text-center w-full break-words px-2">
                {answer}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTextAnswers = (questionId: number) => {
    const answers = getAnswersByQuestion(questionId);
    const currentPage = textAnswerPages.get(questionId) || 1;
    const itemsPerPage = 10;

    const totalPages = Math.ceil(answers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentAnswers = answers.slice(startIndex, endIndex);

    const setCurrentPage = (page: number) => {
      setTextAnswerPages((prev) => {
        const newMap = new Map(prev);
        newMap.set(questionId, page);
        return newMap;
      });
    };

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {currentAnswers.length > 0 ? (
            currentAnswers.map((answer, index) => (
              <div
                key={startIndex + index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-900 font-semibold text-sm">
                      {startIndex + index + 1}
                    </span>
                  </div>
                  <p className="text-gray-700 flex-1">{answer}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No responses yet
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, answers.length)} of{" "}
              {answers.length} responses
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPieChart = (questionId: number) => {
    const stats = getAnswerStats(questionId);

    // If only one answer, show a full circle with legend
    if (stats.answers.length === 1) {
      const [answer, count] = stats.answers[0];
      const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

      return (
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <svg
            width="200"
            height="200"
            viewBox="0 0 200 200"
            className="flex-shrink-0"
          >
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="#82181a"
              stroke="white"
              strokeWidth="2"
            />
          </svg>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: "#82181a" }}
              />
              <span className="text-gray-700 truncate flex-1">{answer}</span>
              <span className="text-gray-600 font-medium whitespace-nowrap">
                {count} ({percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      );
    }

    const colors = [
      "#82181a", // red-900
      "#EA580C", // orange-600
      "#D97706", // amber-600
      "#CA8A04", // yellow-600
      "#65A30D", // lime-600
      "#16A34A", // green-600
      "#059669", // emerald-600
      "#0D9488", // teal-600
      "#0891B2", // cyan-600
      "#0284C7", // sky-600
    ];

    let currentAngle = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    const slices = stats.answers.map(([answer, count], index) => {
      const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
      const angle = (percentage / 100) * 360;

      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");

      return {
        path: pathData,
        color: colors[index % colors.length],
        answer,
        count,
        percentage,
      };
    });

    return (
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className="flex-shrink-0"
        >
          {slices.map((slice, index) => (
            <path
              key={index}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
            />
          ))}
        </svg>

        <div className="flex-1 space-y-2">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-gray-700 truncate flex-1">
                {slice.answer}
              </span>
              <span className="text-gray-600 font-medium whitespace-nowrap">
                {slice.count} ({slice.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto mb-4"></div>
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
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate({ to: "/analytics" })}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Analytics
            </button>
            <button
              onClick={() =>
                navigate({
                  to: "/analytics/$analyticsId/advanced",
                  params: { analyticsId },
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              Advanced Analytics
            </button>
          </div>

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
                  <Users className="w-6 h-6 text-red-900" />
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
                  <TrendingUp className="w-6 h-6 text-red-900" />
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

          {/* Action Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-lg transition-colors ${
                    viewMode === "table"
                      ? "bg-red-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                  Table View
                </button>
                <button
                  onClick={() => setViewMode("graphs")}
                  className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-lg transition-colors ${
                    viewMode === "graphs"
                      ? "bg-red-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Graph View
                </button>
              </div>
              <div className="flex gap-2">
                {viewMode === "table" && selectedRows.size > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                    {selectedRows.size} row{selectedRows.size !== 1 ? "s" : ""}{" "}
                    selected
                  </div>
                )}
                {viewMode === "graphs" && selectedQuestions.size > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                    {selectedQuestions.size} question
                    {selectedQuestions.size !== 1 ? "s" : ""} selected
                  </div>
                )}
                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <div className="p-2">
                      <button
                        onClick={exportToCSV}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {viewMode === "table" && selectedRows.size > 0
                          ? `Export Selected Rows (${selectedRows.size})`
                          : "Export All Responses"}
                      </button>
                      {viewMode === "graphs" && selectedQuestions.size > 0 && (
                        <button
                          onClick={() => exportQuestionStats()}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Export Selected Question Stats (
                          {selectedQuestions.size})
                        </button>
                      )}
                      {((viewMode === "table" && selectedRows.size > 0) ||
                        (viewMode === "graphs" &&
                          selectedQuestions.size > 0)) && (
                        <button
                          onClick={exportCombined}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border-t border-gray-200"
                        >
                          Export Combined (Stats + Responses)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table View */}
          {viewMode === "table" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left sticky left-0 bg-gray-50">
                        <input
                          type="checkbox"
                          checked={
                            analyticsData.submissions.length > 0 &&
                            selectedRows.size ===
                              analyticsData.submissions.length
                          }
                          onChange={toggleAllRows}
                          className="w-4 h-4 text-red-900 border-gray-300 rounded focus:ring-red-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-gray-50">
                        User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Submitted At
                      </th>
                      {questions.map((question) => (
                        <th
                          key={question.id}
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase"
                        >
                          {question.questionTitle ||
                            `Question ${question.qorder}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analyticsData.submissions.map((submission, index) => (
                      <tr
                        key={index}
                        className={`hover:bg-gray-50 ${selectedRows.has(index) ? "bg-blue-50" : ""}`}
                      >
                        <td className="px-6 py-4 sticky left-0 bg-white">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(index)}
                            onChange={() => toggleRowSelection(index)}
                            className="w-4 h-4 text-red-900 border-gray-300 rounded focus:ring-red-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium sticky left-0 bg-white">
                          {submission.userId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {formatDate(submission.submittedAt)}
                          </div>
                        </td>
                        {questions.map((question) => {
                          const answer = submission.answers.find(
                            (a) => a.questionId === question.id,
                          );
                          return (
                            <td
                              key={question.id}
                              className="px-6 py-4 text-sm text-gray-700"
                            >
                              {answer?.answer || "-"}
                            </td>
                          );
                        })}
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
          )}

          {/* Graph View */}
          {viewMode === "graphs" && (
            <div className="space-y-6">
              {questions.map((question) => {
                const stats = getAnswerStats(question.id);
                const currentChartType = chartTypes.get(question.id) || "bar";
                const isPieChartAvailable =
                  question.questionType !== "multi_select" &&
                  question.questionType !== "text_answer";
                const isTextAnswer = question.questionType === "text_answer";
                const isSelected = selectedQuestions.has(question.id);

                return (
                  <div
                    key={question.id}
                    className={`bg-white rounded-lg shadow-sm border-2 transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    } p-6`}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleQuestionSelection(question.id)}
                          className="w-5 h-5 text-red-900 border-gray-300 rounded focus:ring-red-500 mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {question.questionTitle ||
                              `Question ${question.qorder}`}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                              {question.questionType}
                            </span>
                            <p className="text-sm text-gray-600">
                              {stats.total} response
                              {stats.total !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportQuestionStats(question.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                          title="Export this question's stats"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isPieChartAvailable && (
                          <button
                            onClick={() => toggleChartType(question.id)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                          >
                            {currentChartType === "bar" ? (
                              <>
                                <PieChart className="w-4 h-4" />
                                Show Pie Chart
                              </>
                            ) : (
                              <>
                                <BarChart3 className="w-4 h-4" />
                                Show Bar Chart
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {stats.answers.length > 0 || isTextAnswer ? (
                      <div className="mt-4">
                        {isTextAnswer
                          ? renderTextAnswers(question.id)
                          : currentChartType === "bar" || !isPieChartAvailable
                            ? renderBarChart(question.id)
                            : renderPieChart(question.id)}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No responses yet
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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

export const Route = createFileRoute("/analytics/$analyticsId/")({
  component: AnalyticsDetailPage,
});
