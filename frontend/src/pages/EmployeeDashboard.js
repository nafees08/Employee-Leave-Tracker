// src/pages/EmployeeDashboard.js
// Employee view: shows their leave history and a form to request new leave.

import React, { useEffect, useState } from "react";
import { getLeaves, createLeave, deleteLeave } from "../api/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import Navbar from "../components/Navbar";

const LEAVE_TYPES = ["annual", "sick", "unpaid"];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [leaves,  setLeaves]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    type: "annual", start_date: "", end_date: "", reason: "",
  });

  async function fetchLeaves() {
    try {
      const { data } = await getLeaves();
      setLeaves(data);
    } catch (err) {
      setError("Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeaves(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError("End date cannot be before start date.");
      return;
    }

    setSubmitting(true);
    try {
      await createLeave(form);
      setSuccess("Leave request submitted successfully!");
      setShowForm(false);
      setForm({ type: "annual", start_date: "", end_date: "", reason: "" });
      await fetchLeaves();
    } catch (err) {
      setError(err.response?.data?.error || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Withdraw this leave request?")) return;
    try {
      await deleteLeave(id);
      setSuccess("Leave request withdrawn.");
      fetchLeaves();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to withdraw.");
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
            <h2>Welcome back, {user.name} 👋</h2>
            <p className="subtitle">Manage your leave requests below.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ Request Leave"}
          </button>
        </div>

        {/* Stats Row */}
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

        {/* Alerts */}
        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* New Leave Form */}
        {showForm && (
          <div className="card form-card">
            <h3>New Leave Request</h3>
            <form onSubmit={handleSubmit} className="leave-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Leave Type</label>
                  <select value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {LEAVE_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" required value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" required value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Reason (optional)</label>
                <textarea rows={3} placeholder="Brief description…"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>
        )}

        {/* Leave History Table */}
        <div className="card">
          <h3>My Leave History</h3>
          {loading ? (
            <p className="loading-text">Loading…</p>
          ) : leaves.length === 0 ? (
            <p className="empty-text">No leave requests yet. Click "+ Request Leave" to get started.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th><th>From</th><th>To</th>
                    <th>Reason</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l.id}>
                      <td><span className="type-badge">{l.type}</span></td>
                      <td>{l.start_date}</td>
                      <td>{l.end_date}</td>
                      <td>{l.reason || "—"}</td>
                      <td><StatusBadge status={l.status} /></td>
                      <td>
                        {l.status === "pending" && (
                          <button className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(l.id)}>
                            Withdraw
                          </button>
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
