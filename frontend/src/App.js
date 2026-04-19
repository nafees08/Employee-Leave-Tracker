// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage       from "./pages/LoginPage";
import RegisterPage    from "./pages/RegisterPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard  from "./pages/AdminDashboard";

function RootRedirect() {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<RootRedirect />} />
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/register"  element={<RegisterPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><EmployeeDashboard /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
