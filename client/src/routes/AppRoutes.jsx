import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import Login from "../pages/Login";
import TutorDashboard from "../pages/tutor/TutorDashboard";
import AddStudent from "../pages/tutor/AddStudent";
import ScheduleSession from "../pages/tutor/ScheduleSession";
import SessionDetails from "../pages/tutor/SessionDetails";

const StudentHome = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold">
      Student Dashboard
    </h1>
  </div>
);

const ProtectedRoute = ({
  children,
  role,
}) => {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    role &&
    user.role !== role
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>

      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={
                user.role === "tutor"
                  ? "/tutor"
                  : "/student"
              }
              replace
            />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/tutor"
        element={
          <ProtectedRoute role="tutor">
            <TutorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tutor/students/new"
        element={
            <ProtectedRoute role="tutor">
            <AddStudent />
            </ProtectedRoute>
        }
        />

    <Route
        path="/tutor/sessions/new"
        element={
            <ProtectedRoute role="tutor">
            <ScheduleSession />
            </ProtectedRoute>
        }
    />

    <Route
        path="/tutor/sessions/:id"
        element={
            <ProtectedRoute role="tutor">
            <SessionDetails />
            </ProtectedRoute>
        }
    />

      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <StudentHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <Navigate
            to={
              user
                ? user.role === "tutor"
                  ? "/tutor"
                  : "/student"
                : "/login"
            }
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
};

export default AppRoutes;