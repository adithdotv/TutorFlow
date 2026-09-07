import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusStyle = (status) => {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-100 text-blue-700";

    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-700";

    case "COMPLETED":
      return "bg-green-100 text-green-700";

    case "AI_REVIEWED":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
};

const TutorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [studentsResponse, sessionsResponse] = await Promise.all([
          api.get("/students"),
          api.get("/sessions"),
        ]);

        setStudents(studentsResponse.data.students || []);
        setSessions(sessionsResponse.data.sessions || []);
      } catch (err) {
        console.error(err);

        setError(
          err.response?.data?.message ||
            "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const now = new Date();

  const upcomingSessions = sessions
    .filter(
      (session) =>
        session.status === "SCHEDULED" &&
        new Date(session.scheduled_at) >= now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_at) -
        new Date(b.scheduled_at)
    );

  const completedSessions = sessions.filter(
    (session) =>
      session.status === "COMPLETED" ||
      session.status === "AI_REVIEWED"
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="mt-4 text-sm text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              TutorFlow
            </h1>

            <p className="text-sm text-slate-500">
              Tutor Dashboard
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {user?.name}
              </p>

              <p className="text-xs text-slate-500">
                Tutor
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name} 👋
          </h2>

          <p className="mt-1 text-slate-500">
            Here's what's happening with your students.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Total Students
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {students.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Upcoming Sessions
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {upcomingSessions.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Completed Sessions
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {completedSessions.length}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/tutor/students/new")}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Add Student
          </button>

          <button
            onClick={() => navigate("/tutor/sessions/new")}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            + Schedule Session
          </button>
        </div>

        {/* Content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Upcoming Sessions */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="font-semibold text-slate-900">
                Upcoming Sessions
              </h3>
            </div>

            {upcomingSessions.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-500">
                  No upcoming sessions.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="px-6 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {session.topic}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {session.student_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(session.scheduled_at)} ·{" "}
                          {formatTime(session.scheduled_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                          session.status
                        )}`}
                      >
                        {session.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Students */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="font-semibold text-slate-900">
                My Students
              </h3>
            </div>

            {students.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-500">
                  No students yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {students.slice(0, 6).map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {student.name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {student.email}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        {student.subject}
                      </p>

                      {student.current_level && (
                        <p className="text-xs text-slate-400">
                          {student.current_level}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default TutorDashboard;