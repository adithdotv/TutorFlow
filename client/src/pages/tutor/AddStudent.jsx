import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const AddStudent = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    subject: "",
    currentLevel: "",
    learningGoals: "",
    weakAreas: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setLoading(true);

    try {
      await api.post("/students", form);

      setSuccess("Student created successfully!");

      setTimeout(() => {
        navigate("/tutor");
      }, 800);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to create student"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center px-6 py-4">
          <button
            onClick={() => navigate("/tutor")}
            className="mr-4 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Back
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Add Student
            </h1>

            <p className="text-sm text-slate-500">
              Create a student profile
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Basic Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Information the student will use to log in.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Student Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="student@example.com"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Temporary Password
                </label>

                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Subject
                </label>

                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  required
                  placeholder="Mathematics"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Level */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Current Level
                </label>

                <input
                  type="text"
                  name="currentLevel"
                  value={form.currentLevel}
                  onChange={handleChange}
                  placeholder="Beginner / Intermediate / Grade 10..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Learning Information */}
            <div className="border-t border-slate-200 pt-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Learning Profile
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                This information will later be used by Gemini to
                generate personalized session plans.
              </p>
            </div>

            {/* Learning Goals */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Learning Goals
              </label>

              <textarea
                name="learningGoals"
                value={form.learningGoals}
                onChange={handleChange}
                rows={4}
                placeholder="What does the student want to achieve?"
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Weak Areas */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Weak Areas
              </label>

              <textarea
                name="weakAreas"
                value={form.weakAreas}
                onChange={handleChange}
                rows={4}
                placeholder="Topics or concepts the student struggles with..."
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
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
                disabled={loading}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Student"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddStudent;