// src/context/AuthContext.js
// React Context that holds the currently logged-in user and provides
// login / logout helpers to any component in the tree.

import React, { createContext, useContext, useState } from "react";
import { login as apiLogin } from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Rehydrate from localStorage so the user stays logged in on page refresh
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);

  async function login(email, password) {
    const { data } = await apiLogin(email, password);
    // Persist token & user profile
    localStorage.setItem("token", data.token);
    localStorage.setItem("user",  JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convenience hook
export const useAuth = () => useContext(AuthContext);
