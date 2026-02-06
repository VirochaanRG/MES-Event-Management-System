import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { getCurrentUser, AuthUser } from "@/lib/auth";
import ProtectedTeamPortal from "@/components/ProtectedTeamPortal";
import AdminLayout from "@/components/AdminLayout";
import RequireRole from "@/components/RequireRole";
import { BarChart3, Search, Filter, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics/$analyticsId/advanced/")({
  component: AdvancedAnalyticsPage,
});

interface Answer {
  questionId: number;
  questionTitle: string;
  qorder: number;
  answer: string;
}

interface Submission {
  userId: string;
  submittedAt: string;
  answers: Answer[];
}

function AdvancedAnalyticsContent() {
  const { analyticsId } = Route.useParams();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionUser = getCurrentUser("admin");
    if (sessionUser) setCurrentUser(sessionUser);

    fetch(`http://localhost:3124/api/forms/${analyticsId}/answers`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSubmissions(json.data.submissions);
        setLoading(false);
      });
  }, [analyticsId]);

  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;

    const criteriaRegex = /Q(\d+):"([^"]+)"|Q(\d+):(\S+)/g;
    const matches = [...searchQuery.matchAll(criteriaRegex)];
    const filters = matches.map((m) => ({
      qOrder: parseInt(m[1] || m[3]),
      value: (m[2] || m[4]).toLowerCase(),
    }));

    if (filters.length === 0) return submissions;

    return submissions.filter((sub) => {
      return filters.every((f) => {
        const targetAnswer = sub.answers.find((a) => a.qorder === f.qOrder);
        return targetAnswer?.answer.toLowerCase().includes(f.value);
      });
    });
  }, [searchQuery, submissions]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);

  useEffect(() => {
    // Fetch master list of questions for the form
    fetch(`http://localhost:3124/api/forms/${analyticsId}/questions`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          // Sort by qorder so columns are consistent
          const sorted = json.data.sort(
            (a: any, b: any) => a.qorder - b.qorder,
          );
          setAllQuestions(sorted);
        }
      });
  }, [analyticsId]);
  // Helper to get an answer or return "N/A" for optional fields
  const getAnswerForQuestion = (submission: Submission, qOrder: number) => {
    const found = submission.answers.find((a) => a.qorder === qOrder);
    return found ? (
      found.answer
    ) : (
      <span className="text-gray-400 italic">No response</span>
    );
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <RequireRole
      userRoles={currentUser?.roles}
      requiredRole="analytics"
      redirectTo="/"
    >
      <AdminLayout
        user={currentUser!}
        title="Advanced Filtering"
        subtitle={`Analyzing Form ID: ${analyticsId}`}
      >
        <div className="p-6">
          {/* Back Navigation */}
          <Link
            to="/analytics"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Advanced Search Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder='Try logic like Q1:engineering Q2:"6 hours"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-xs text-gray-400">
                <Filter className="w-3 h-3" />
                <span>{filteredSubmissions.length} Results</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Syntax:{" "}
              <code className="bg-gray-100 px-1 rounded">Q[Number]:Value</code>.
              Use quotes for multi-word phrases.
            </p>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      User ID
                    </th>
                    {allQuestions.map((q) => (
                      <th
                        key={q.id}
                        className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider"
                      >
                        Q{q.qorder}: {q.questionTitle}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSubmissions.map((sub) => (
                    <tr
                      key={sub.userId}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {sub.userId.slice(0, 8)}
                      </td>
                      {allQuestions.map((q) => (
                        <td
                          key={q.id}
                          className="px-6 py-4 text-sm text-gray-600"
                        >
                          {getAnswerForQuestion(sub, q.qorder)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSubmissions.length === 0 && (
              <div className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  No matches found
                </h3>
                <p className="text-gray-600">
                  Adjust your Q:V filters to broaden your search.
                </p>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </RequireRole>
  );
}

function AdvancedAnalyticsPage() {
  return (
    <ProtectedTeamPortal>
      <AdvancedAnalyticsContent />
    </ProtectedTeamPortal>
  );
}
