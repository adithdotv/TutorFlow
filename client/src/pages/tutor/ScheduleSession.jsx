import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const ScheduleSession = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);

  const [form, setForm] = useState({
    studentId: "",
    scheduledAt: "",
    topic: "",
  });

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get("/students");

        setStudents(response.data.students || []);
      } catch (err) {
        console.error(err);

        setError(
          err.response?.data?.message ||
            "Failed to load students"
        );
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await api.post("/sessions", {
        studentId: form.studentId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        topic: form.topic,
      });

      setSuccess("Session scheduled successfully!");

      setTimeout(() => {
        navigate("/tutor");
      }, 800);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to schedule session"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-4">
          <button
            onClick={() => navigate("/tutor")}
            className="mr-4 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Back
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Schedule Session
            </h1>

            <p className="text-sm text-slate-500">
              Create a new tutoring session
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Student
              </label>

              {loadingStudents ? (
                <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500">
                  Loading students...
                </div>
              ) : students.length === 0 ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                  You don't have any students yet. Create a
                  student first.
                </div>
              ) : (
                <select
                  name="studentId"
                  value={form.studentId}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">
                    Select a student
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.name} — {student.subject}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date & Time
              </label>

              <input
                type="datetime-local"
                name="scheduledAt"
                value={form.scheduledAt}
                onChange={handleChange}
                required
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />

              <p className="mt-1 text-xs text-slate-400">
                Select when the tutoring session will take place.
              </p>
            </div>

            {/* Topic */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Topic
              </label>

              <input
                type="text"
                name="topic"
                value={form.topic}
                onChange={handleChange}
                required
                placeholder="e.g. Quadratic Equations"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Information */}
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">
                Session lifecycle
              </p>

              <p className="mt-1 text-sm text-slate-500">
                New sessions always start as{" "}
                <span className="font-semibold">
                  SCHEDULED
                </span>
                . The session can later move through the required
                lifecycle.
              </p>
            </div>

            {/* Messages */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={() => navigate("/tutor")}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingStudents ||
                  students.length === 0
                }
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Scheduling..."
                  : "Schedule Session"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ScheduleSession;