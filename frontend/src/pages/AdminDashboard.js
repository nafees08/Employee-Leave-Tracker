// src/pages/AdminDashboard.js
// Admin view: see all leave requests across employees and approve/reject them.

import React, { useEffect, useState } from "react";
import { getAllUsers, getLeaves, updateStatus } from "../api/api";
import StatusBadge from "../components/StatusBadge";
import Navbar from "../components/Navbar";

export default function AdminDashboard() {
  const [leaves,     setLeaves]     = useState([]);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null); // leave id being actioned

  async function fetchDashboardData() {
    try {
      const [{ data: leaveData }, { data: userData }] = await Promise.all([
        getLeaves(),
        getAllUsers(),
      ]);
      setLeaves(leaveData);
      setUsers(userData);
    } catch {
      setError("Failed to load leaves.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filtered = leaves.filter((leave) => {
    const matchesStatus = statusFilter === "all" || leave.status === statusFilter;
    const matchesEmployee =
      employeeFilter === "all" || String(leave.user_id) === employeeFilter;
    return matchesStatus && matchesEmployee;
  });

  async function handleAction(id, status) {
    setError(""); setSuccess("");
    setActionLoading(id);
    try {
      await updateStatus(id, status);
      setSuccess(`Leave #${id} has been ${status}.`);
      await fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  const stats = {
    total:    leaves.length,
    pending:  leaves.filter(l => l.status === "pending").length,
    approved: leaves.filter(l => l.status === "approved").length,
    rejected: leaves.filter(l => l.status === "rejected").length,
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <div>
            <h2>Admin Dashboard 🛡️</h2>
            <p className="subtitle">Review and manage all employee leave requests.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: "Total",    value: stats.total,    color: "#6366f1" },
            { label: "Pending",  value: stats.pending,  color: "#f59e0b" },
            { label: "Approved", value: stats.approved, color: "#10b981" },
            { label: "Rejected", value: stats.rejected, color: "#ef4444" },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Filter Tabs */}
        <div className="filter-tabs filter-toolbar">
          {["all", "pending", "approved", "rejected"].map(f => (
            <button key={f}
              className={`filter-tab ${statusFilter === f ? "active" : ""}`}
              onClick={() => setStatusFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && stats.pending > 0 && (
                <span className="badge-dot">{stats.pending}</span>
              )}
            </button>
          ))}
          <label className="employee-filter">
            <span>Employee</span>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
            >
              <option value="all">All employees</option>
              {users.map((employee) => (
                <option key={employee.id} value={String(employee.id)}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <p className="loading-text">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="empty-text">No leave requests match this filter.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Employee</th><th>Type</th>
                    <th>From</th><th>To</th><th>Reason</th>
                    <th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id}>
                      <td>{l.id}</td>
                      <td>
                        <div className="employee-cell">
                          <strong>{l.employee_name}</strong>
                          <small>{l.employee_email}</small>
                        </div>
                      </td>
                      <td><span className="type-badge">{l.type}</span></td>
                      <td>{l.start_date}</td>
                      <td>{l.end_date}</td>
                      <td>{l.reason || "—"}</td>
                      <td><StatusBadge status={l.status} /></td>
                      <td>
                        {l.status === "pending" ? (
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-success"
                              disabled={actionLoading === l.id}
                              onClick={() => handleAction(l.id, "approved")}>
                              ✓ Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              disabled={actionLoading === l.id}
                              onClick={() => handleAction(l.id, "rejected")}>
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span className="no-action">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
