import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

const StudentProgress = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);

  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/progress/students/${studentId}`
        );

        setData(response.data);
      } catch (error) {
        console.error(error);

        setError(
          error.response?.data?.message ||
            "Failed to load student progress"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [studentId]);

  const generateInsights = async () => {
    try {
      setGeneratingInsights(true);
      setError("");

      const response = await api.post(
        `/progress/students/${studentId}/ai-insights`
      );

      setInsights(
        response.data.insights || response.data
      );
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Failed to generate AI insights"
      );
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading student progress...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>

          <button
            onClick={() => navigate("/tutor")}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const student = data.student;
  const sessions = data.sessions || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <button
              onClick={() => navigate("/tutor")}
              className="mb-2 text-sm text-slate-500 hover:text-slate-900"
            >
              ← Back to Dashboard
            </button>

            <h1 className="text-2xl font-bold text-slate-900">
              Student Progress
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">

        {/* Student Profile */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {student.name}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {student.email}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Subject
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {student.subject || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current Level
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {student.current_level || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Learning Goals
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {student.learning_goals || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Weak Areas
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {student.weak_areas || "Not specified"}
              </p>
            </div>
          </div>
        </section>

        {/* Session History */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Session History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                All sessions for this student.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {sessions.length} sessions
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              No sessions found for this student.
            </div>
          ) : (
            <div className="mt-6 divide-y divide-slate-100">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row">
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {session.topic}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(
                          session.scheduled_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {session.status}
                    </span>
                  </div>

                  {session.ai_review?.summary && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        AI Review
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {session.ai_review.summary}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AI Progress Insights */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                AI Progress Insights
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Gemini analyzes all previous AI session reviews
                to identify improvement and recurring struggles.
              </p>
            </div>

            <button
              onClick={generateInsights}
              disabled={generatingInsights}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingInsights
                ? "Analyzing..."
                : "Generate Insights"}
            </button>
          </div>

          {insights ? (
            <div className="mt-6 space-y-6">

              {/* Improvement */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Improvement Summary
                </h3>

                <div className="mt-3 rounded-xl bg-slate-50 p-5">
                  <p className="text-sm leading-6 text-slate-700">
                    {insights.improvementSummary}
                  </p>
                </div>
              </div>

              {/* Struggles */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Recurring Struggles
                </h3>

                {insights.recurringStruggles?.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {insights.recurringStruggles.map(
                      (struggle, index) => (
                        <li
                          key={index}
                          className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700"
                        >
                          {struggle}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No recurring struggles identified.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              Generate AI insights after the student has
              completed and reviewed sessions.
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentProgress;