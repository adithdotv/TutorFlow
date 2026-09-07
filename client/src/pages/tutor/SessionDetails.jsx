import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

const statusStyles = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  AI_REVIEWED: "bg-purple-100 text-purple-700",
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const SessionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/sessions/${id}`);

      setSession(response.data.session);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Failed to load session"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      setActionLoading(true);
      setError("");

      const response = await api.patch(
        `/sessions/${id}/status`,
        {
          status: newStatus,
        }
      );

      setSession(response.data.session);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Failed to update session status"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartSession = () => {
    handleStatusChange("IN_PROGRESS");
  };

  const handleCompleteSession = () => {
    handleStatusChange("COMPLETED");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">
          Loading session...
        </p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/tutor")}
            className="mb-6 text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Dashboard
          </button>

          <div className="bg-white border border-red-200 rounded-xl p-6">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const canStart = session.status === "SCHEDULED";
  const canComplete = session.status === "IN_PROGRESS";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <button
            onClick={() => navigate("/tutor")}
            className="text-sm text-slate-500 hover:text-slate-900 mb-3"
          >
            ← Back to Dashboard
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Session Details
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Manage this tutoring session
              </p>
            </div>

            <span
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                statusStyles[session.status]
              }`}
            >
              {session.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Session Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">
            Session Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-500">
                Student
              </p>

              <p className="font-medium text-slate-900 mt-1">
                {session.student_name}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Topic
              </p>

              <p className="font-medium text-slate-900 mt-1">
                {session.topic}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Date
              </p>

              <p className="font-medium text-slate-900 mt-1">
                {formatDate(session.scheduled_at)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Time
              </p>

              <p className="font-medium text-slate-900 mt-1">
                {formatTime(session.scheduled_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Lifecycle Controls */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Session Lifecycle
          </h2>

          <p className="text-sm text-slate-500 mb-6">
            Sessions must move through each stage in order.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                session.status === "SCHEDULED"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              1. Scheduled
            </div>

            <span className="text-slate-300">→</span>

            <div
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                session.status === "IN_PROGRESS"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              2. In Progress
            </div>

            <span className="text-slate-300">→</span>

            <div
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                session.status === "COMPLETED"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              3. Completed
            </div>

            <span className="text-slate-300">→</span>

            <div
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                session.status === "AI_REVIEWED"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              4. AI Reviewed
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6">
            {canStart && (
              <button
                onClick={handleStartSession}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {actionLoading
                  ? "Starting..."
                  : "Start Session"}
              </button>
            )}

            {canComplete && (
              <button
                onClick={handleCompleteSession}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {actionLoading
                  ? "Completing..."
                  : "Complete Session"}
              </button>
            )}

            {session.status === "COMPLETED" && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-sm text-green-700">
                  Session completed. You can now generate the
                  AI review.
                </p>
              </div>
            )}

            {session.status === "AI_REVIEWED" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                <p className="text-sm text-purple-700">
                  This session has been reviewed by AI.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Session Notes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Session Notes
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Notes will be added during the session.
              </p>
            </div>

            {session.status === "IN_PROGRESS" && (
              <span className="text-xs text-yellow-600 font-medium">
                Editable
              </span>
            )}
          </div>

          <textarea
            value={session.notes || ""}
            onChange={(event) =>
              setSession((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            disabled={session.status !== "IN_PROGRESS"}
            placeholder={
              session.status === "IN_PROGRESS"
                ? "Write your notes here..."
                : "Notes are available when the session is in progress."
            }
            className="w-full min-h-[220px] border border-slate-300 rounded-lg p-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 resize-y disabled:bg-slate-100 disabled:text-slate-500"
          />

          {session.status === "IN_PROGRESS" && (
            <p className="text-xs text-slate-400 mt-2">
              Autosave will be added next.
            </p>
          )}

          {session.status !== "IN_PROGRESS" && (
            <p className="text-xs text-slate-400 mt-2">
              Notes become read-only once the session is
              completed.
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default SessionDetails;