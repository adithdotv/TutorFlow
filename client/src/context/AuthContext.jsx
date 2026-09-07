import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        "tutorflow_user"
      );

    const token =
      localStorage.getItem(
        "tutorflow_token"
      );

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  const persistSession = (
    token,
    user
  ) => {
    localStorage.setItem(
      "tutorflow_token",
      token
    );

    localStorage.setItem(
      "tutorflow_user",
      JSON.stringify(user)
    );

    setUser(user);
  };

  const login = async (
    email,
    password
  ) => {
    const response = await api.post(
      "/auth/login",
      {
        email,
        password,
      }
    );

    const {
      token,
      user,
    } = response.data;

    persistSession(token, user);

    return user;
  };

  const signup = async (
    name,
    email,
    password
  ) => {
    const response = await api.post(
      "/auth/register",
      {
        name,
        email,
        password,
      }
    );

    const {
      token,
      user,
    } = response.data;

    persistSession(token, user);

    return user;
  };

  const logout = () => {
    localStorage.removeItem(
      "tutorflow_token"
    );

    localStorage.removeItem(
      "tutorflow_user"
    );

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);