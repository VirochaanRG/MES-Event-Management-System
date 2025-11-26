import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

interface Answer {
  questionId: number;
  questionTitle: string | null;
  questionType: string;
  qorder: number;
  answer: string | null;
}

interface Submission {
  userId: string;
  submittedAt: string;
  answers: Answer[];
}

interface FormData {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

interface ReportData {
  form: FormData;
  submissions: Submission[];
  totalSubmissions: number;
}

function ReportDetailPage() {
  const { reportId } = Route.useParams();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchReportData();
  }, [reportId]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3124/api/forms/${reportId}/answers`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }

      const data = await response.json();
      if (data.success) {
        setReportData(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch report data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const extractEmail = (userId: string): string => {
    try {
      const parsed = JSON.parse(userId);
      return parsed.email || userId;
    } catch {
      return userId;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && reportData) {
      setSelectedSubmissions(
        new Set(reportData.submissions.map((s) => s.userId))
      );
    } else {
      setSelectedSubmissions(new Set());
    }
  };

  const handleSelectSubmission = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedSubmissions);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedSubmissions(newSelected);
  };

  const exportToCSV = () => {
    if (!reportData) return;

    // Determine which submissions to export
    const submissionsToExport =
      selectedSubmissions.size > 0
        ? reportData.submissions.filter((s) =>
            selectedSubmissions.has(s.userId)
          )
        : reportData.submissions;

    if (submissionsToExport.length === 0) {
      alert("No submissions to export");
      return;
    }

    // Get all questions
    const allQuestions =
      reportData.submissions.length > 0
        ? reportData.submissions[0].answers.sort((a, b) => a.qorder - b.qorder)
        : [];

    // Build CSV header
    const headers = [
      "Email",
      ...allQuestions.map((q) => q.questionTitle || `Question ${q.qorder}`),
      "Submitted At",
    ];

    // Build CSV rows
    const rows = submissionsToExport.map((submission) => {
      const email = extractEmail(submission.userId);
      const answers = allQuestions.map((question) => {
        const answer = submission.answers.find(
          (a) => a.questionId === question.questionId
        );
        // Escape quotes and wrap in quotes if contains comma or newline
        const value = answer?.answer || "";
        return value.includes(",") ||
          value.includes("\n") ||
          value.includes('"')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      });
      const submittedAt = new Date(submission.submittedAt).toLocaleString();
      return [email, ...answers, submittedAt];
    });

    // Combine headers and rows
    const csvContent = [
      headers.map((h) =>
        h.includes(",") || h.includes("\n") ? `"${h.replace(/"/g, '""')}"` : h
      ),
      ...rows,
    ]
      .map((row) => row.join(","))
      .join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${reportData.form.name.replace(/[^a-z0-9]/gi, "_")}_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBack = () => {
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="m-0 p-0">
          <div className="text-center px-5 py-10">
            <div className="text-gray-600">Loading report data...</div>
          </div>
        </main>
      </>
    );
  }

  if (error || !reportData) {
    return (
      <>
        <Navbar />
        <main className="m-0 p-0">
          <div className="text-center px-5 py-10">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-red-600 mb-4">
                Error: {error || "No data found"}
              </p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Get all unique questions from submissions
  const allQuestions =
    reportData.submissions.length > 0
      ? reportData.submissions[0].answers.sort((a, b) => a.qorder - b.qorder)
      : [];

  const allSelected =
    reportData.submissions.length > 0 &&
    selectedSubmissions.size === reportData.submissions.length;
  const someSelected = selectedSubmissions.size > 0 && !allSelected;

  return (
    <>
      <Navbar />
      <main className="m-0 p-0">
        <div className="px-5 py-10">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <button
                onClick={handleBack}
                className="mb-4 px-4 py-2 text-purple-600 hover:text-purple-800 font-medium"
              >
                ← Back to Dashboard
              </button>
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-3xl font-bold text-gray-800">
                  {reportData.form.name}
                </h2>
                <button
                  onClick={exportToCSV}
                  className="px-6 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors"
                >
                  Export to CSV
                  {selectedSubmissions.size > 0 &&
                    ` (${selectedSubmissions.size})`}
                </button>
              </div>
              {reportData.form.description && (
                <p className="text-gray-600 mb-4">
                  {reportData.form.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Total Submissions: {reportData.totalSubmissions}</span>
                <span>
                  Created:{" "}
                  {new Date(reportData.form.createdAt).toLocaleDateString()}
                </span>
                {selectedSubmissions.size > 0 && (
                  <span className="text-purple-600 font-medium">
                    {selectedSubmissions.size} selected
                  </span>
                )}
              </div>
            </div>

            {/* No submissions message */}
            {reportData.submissions.length === 0 ? (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-600">
                  No submissions yet for this form
                </p>
              </div>
            ) : (
              /* Submissions Table */
              <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = someSelected;
                              }
                            }}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        {allQuestions.map((question) => (
                          <th
                            key={question.questionId}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                          >
                            {question.questionTitle ||
                              `Question ${question.qorder}`}
                            <span className="block text-xs font-normal text-gray-500 capitalize mt-1">
                              ({question.questionType})
                            </span>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Submitted At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.submissions.map((submission, idx) => (
                        <tr
                          key={submission.userId}
                          className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedSubmissions.has(
                                submission.userId
                              )}
                              onChange={(e) =>
                                handleSelectSubmission(
                                  submission.userId,
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {extractEmail(submission.userId)}
                          </td>
                          {allQuestions.map((question) => {
                            const answer = submission.answers.find(
                              (a) => a.questionId === question.questionId
                            );
                            return (
                              <td
                                key={question.questionId}
                                className="px-4 py-3 text-sm text-gray-700"
                              >
                                {answer?.answer || "-"}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(submission.submittedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export const Route = createFileRoute("/reports/$reportId")({
  component: ReportDetailPage,
});
