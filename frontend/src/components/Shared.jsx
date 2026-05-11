import React from "react";

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="border-b border-gray-200 px-8 py-6 flex items-start justify-between gap-6 bg-white sticky top-0 z-10">
      <div>
        {eyebrow && <div className="label-mono mb-2">{eyebrow}</div>}
        <h1 className="font-display font-black tracking-tighter text-3xl sm:text-4xl text-gray-950">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-gray-500 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pending:      { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200", label: "Pending" },
    approved:     { bg: "bg-blue-50",   text: "text-blue-800",   border: "border-blue-200",   label: "Approved" },
    rejected:     { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    label: "Rejected" },
    po_generated: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "PO Generated" },
    delivered:    { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  label: "Delivered" },
    issued:       { bg: "bg-gray-100",  text: "text-gray-800",   border: "border-gray-300",   label: "Issued" },
    acknowledged: { bg: "bg-blue-50",   text: "text-blue-800",   border: "border-blue-200",   label: "Acknowledged" },
    shipped:      { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Shipped" },
    urgent:       { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-300",    label: "URGENT" },
    high:         { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "High" },
    normal:       { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200",   label: "Normal" },
    low:          { bg: "bg-gray-50",   text: "text-gray-500",   border: "border-gray-200",   label: "Low" },
  };
  const c = map[status] || map.normal;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded-sm ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
}

export function StatCard({ label, value, hint, accent }) {
  return (
    <div className="border border-gray-200 bg-white p-5 rounded-sm h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-400">
      <div className="label-mono">{label}</div>
      <div className={`mt-3 font-display font-black tracking-tighter text-3xl ${accent ? "text-[#FF4500]" : "text-gray-950"}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

export function Empty({ title, hint }) {
  return (
    <div className="border border-dashed border-gray-300 p-10 text-center rounded-sm">
      <div className="font-display font-bold text-gray-700">{title}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
