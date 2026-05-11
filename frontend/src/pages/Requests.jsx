import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusBadge, Empty } from "@/components/Shared";
import { toast } from "sonner";
import { Check, X, FileText, ChevronRight } from "lucide-react";

const STATUSES = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "po_generated", label: "PO Generated" },
  { key: "delivered", label: "Delivered" },
  { key: "rejected", label: "Rejected" },
];

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const params = filter ? { status_filter: filter } : {};
    const [r, v] = await Promise.all([
      api.get("/requests", { params }),
      api.get("/vendors"),
    ]);
    setRequests(r.data);
    setVendors(v.data);
  };

  useEffect(() => { load().catch(() => {}); }, [filter]);

  const approve = async (id) => {
    await api.post(`/requests/${id}/approve`);
    toast.success("Approved");
    load();
  };
  const reject = async (id) => {
    await api.post(`/requests/${id}/reject`, { reason: "Rejected via dashboard" });
    toast.success("Rejected");
    load();
  };
  const generatePO = async (id, vendor_id) => {
    await api.post(`/requests/${id}/generate-po`, { vendor_id });
    toast.success("Purchase Order generated");
    load();
  };

  return (
    <div data-testid="requests-page">
      <PageHeader
        eyebrow="// REQUEST PIPELINE"
        title="Procurement Requests"
        subtitle="From AI-parsed voice/text to delivered PO. Filter, approve, dispatch."
      />

      <div className="p-8">
        <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
          {STATUSES.map((s) => (
            <button key={s.key} onClick={() => setFilter(s.key)} data-testid={`filter-${s.key || "all"}`}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                filter === s.key ? "border-[#FF4500] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        {requests.length === 0 ? (
          <Empty title="No requests in this view" hint="Try a different filter or create a new request." />
        ) : (
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="label-mono text-[10px]">
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                      data-testid={`request-row-${r.id}`}>
                    <td className="px-4 py-3 font-medium">{r.material || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.brand || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.site_name || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{r.quantity ?? "—"} {r.unit || ""}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.delivery_date || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.priority || "normal"} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500 uppercase">{r.source}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelected(r)} data-testid={`view-request-${r.id}`}
                        className="text-xs text-gray-600 hover:text-[#FF4500] inline-flex items-center gap-1">
                        Details <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto border-l border-gray-200 fade-up"
               onClick={(e) => e.stopPropagation()} data-testid="request-drawer">
            <div className="p-6 border-b border-gray-200">
              <div className="label-mono">// REQUEST DETAIL</div>
              <h3 className="font-display font-black tracking-tight text-2xl mt-1">{selected.material || "—"}</h3>
              <div className="mt-2 flex gap-2">
                <StatusBadge status={selected.status} />
                <StatusBadge status={selected.priority || "normal"} />
              </div>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <Row k="Brand" v={selected.brand} />
              <Row k="Quantity" v={selected.quantity ? `${selected.quantity} ${selected.unit || ""}` : "—"} />
              <Row k="Site" v={selected.site_name} />
              <Row k="Delivery date" v={selected.delivery_date} />
              <Row k="Requested by" v={selected.employee_name} />
              <Row k="Source" v={selected.source} />
              <Row k="Language" v={selected.language} />
              <div>
                <div className="label-mono mb-1">// RAW INPUT</div>
                <div className="text-xs text-gray-700 p-3 bg-gray-50 border border-gray-200 rounded-sm">{selected.raw_text || "—"}</div>
              </div>

              {selected.status === "pending" && (
                <div className="grid grid-cols-2 gap-2 pt-4">
                  <button onClick={() => { approve(selected.id); setSelected(null); }} data-testid="drawer-approve"
                    className="bg-gray-900 hover:bg-[#16A34A] text-white py-2.5 text-sm rounded-sm flex items-center justify-center gap-2 transition-colors">
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => { reject(selected.id); setSelected(null); }} data-testid="drawer-reject"
                    className="border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 py-2.5 text-sm rounded-sm flex items-center justify-center gap-2 transition-colors">
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}

              {selected.status === "approved" && (
                <div className="pt-4">
                  <div className="label-mono mb-2">// GENERATE PURCHASE ORDER</div>
                  <VendorPicker vendors={vendors} onPick={(vid) => { generatePO(selected.id, vid); setSelected(null); }} />
                </div>
              )}

              {selected.status === "po_generated" && (
                <div className="pt-4 text-xs text-gray-600 border-t border-gray-200">
                  PO has been generated. View it in Purchase Orders.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-100 pb-2 last:border-0">
      <div className="label-mono col-span-1">{k}</div>
      <div className="col-span-2 text-sm">{v || <span className="text-gray-400 italic">—</span>}</div>
    </div>
  );
}

function VendorPicker({ vendors, onPick }) {
  const [vid, setVid] = useState("");
  return (
    <div className="flex gap-2">
      <select value={vid} onChange={(e) => setVid(e.target.value)} data-testid="vendor-picker-select"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4500]">
        <option value="">Auto-select vendor</option>
        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name} · ★ {v.rating}</option>)}
      </select>
      <button onClick={() => onPick(vid)} data-testid="drawer-generate-po"
        className="bg-[#FF4500] hover:bg-orange-600 text-white px-4 py-2 text-sm rounded-sm flex items-center gap-1.5">
        <FileText className="w-4 h-4" /> Generate
      </button>
    </div>
  );
}
