import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/student/sessions");

        setSessions(response.data.sessions || response.data);
      } catch (error) {
        console.error(error);

        setError(
          error.response?.data?.message ||
            "Failed to load your sessions"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const upcomingSessions = sessions.filter(
    (session) =>
      session.status === "SCHEDULED" ||
      session.status === "IN_PROGRESS"
  );

  const completedSessions = sessions.filter(
    (session) =>
      session.status === "COMPLETED" ||
      session.status === "AI_REVIEWED"
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <div>
            <p className="text-sm text-slate-500">
              Student Dashboard
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Hi, {user?.name} 👋
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Logout
          </button>

        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Upcoming Sessions
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {upcomingSessions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Completed Sessions
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {completedSessions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Sessions
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {sessions.length}
            </p>
          </div>

        </div>

        {/* Upcoming Sessions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Upcoming Sessions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your scheduled learning sessions.
            </p>
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              You don't have any upcoming sessions.
            </div>
          ) : (
            <div className="mt-6 space-y-3">

              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200 p-5"
                >

                  <div className="flex flex-col justify-between gap-4 md:flex-row">

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {session.topic}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        {formatDate(session.scheduled_at)}
                        {" • "}
                        {formatTime(session.scheduled_at)}
                      </p>
                    </div>

                    <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {session.status}
                    </span>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* Past Sessions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Past Sessions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your completed sessions, notes and homework.
            </p>
          </div>

          {completedSessions.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
              You don't have any completed sessions yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">

              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200 p-5"
                >

                  {/* Session Header */}
                  <div className="flex flex-col justify-between gap-3 md:flex-row">

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {session.topic}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(session.scheduled_at)}
                      </p>
                    </div>

                    <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {session.status}
                    </span>

                  </div>

                  {/* Notes */}
                  {session.notes && (
                    <div className="mt-5">

                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Session Notes
                      </h4>

                      <div className="mt-2 rounded-lg bg-slate-50 p-4">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {session.notes}
                        </p>
                      </div>

                    </div>
                  )}

                  {/* Homework */}
                  {session.ai_review?.homework?.length > 0 && (
                    <div className="mt-5">

                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Homework
                      </h4>

                      <div className="mt-2 space-y-2">

                        {session.ai_review.homework.map(
                          (task, index) => (
                            <div
                              key={index}
                              className="flex gap-3 rounded-lg border border-slate-200 p-3"
                            >
                              <span className="font-semibold text-slate-400">
                                {index + 1}.
                              </span>

                              <p className="text-sm text-slate-700">
                                {task}
                              </p>
                            </div>
                          )
                        )}

                      </div>

                    </div>
                  )}

                  {/* Next Session */}
                  {session.ai_review?.nextSessionSuggestion && (
                    <div className="mt-5">

                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Next Session
                      </h4>

                      <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                        {session.ai_review.nextSessionSuggestion}
                      </p>

                    </div>
                  )}

                </div>
              ))}

            </div>
          )}

        </section>

      </main>
    </div>
  );
};

export default StudentDashboard;