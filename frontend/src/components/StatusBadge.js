// src/components/StatusBadge.js
import React from "react";

const COLOR_MAP = {
  pending:  { bg: "#fef3c7", text: "#92400e", label: "Pending"  },
  approved: { bg: "#d1fae5", text: "#065f46", label: "Approved" },
  rejected: { bg: "#fee2e2", text: "#991b1b", label: "Rejected" },
};

export default function StatusBadge({ status }) {
  const style = COLOR_MAP[status] || { bg: "#f3f4f6", text: "#374151", label: status };
  return (
    <span style={{
      background: style.bg,
      color: style.text,
      padding: "3px 10px",
      borderRadius: "99px",
      fontSize: "0.78rem",
      fontWeight: 600,
      letterSpacing: "0.03em",
    }}>
      {style.label}
    </span>
  );
}
