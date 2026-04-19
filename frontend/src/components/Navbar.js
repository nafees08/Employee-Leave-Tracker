// src/components/Navbar.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>🏢</span> LeaveTrack
        {isAdmin && <span className="admin-chip">Admin</span>}
      </div>
      <div className="navbar-user">
        <span className="user-name">{user?.name}</span>
        <button className="btn btn-sm btn-outline" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
