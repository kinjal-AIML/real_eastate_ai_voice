import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader, StatCard, StatusBadge, Empty } from "@/components/Shared";
import { ArrowUpRight, Mic, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    (async () => {
      const [a, r, inv] = await Promise.all([
        api.get("/analytics/dashboard"),
        api.get("/requests"),
        api.get("/inventory"),
      ]);
      setData(a.data);
      setRequests(r.data.slice(0, 6));
      setInventory(inv.data);
    })().catch(() => {});
  }, []);

  const lowStock = inventory.filter((i) => i.quantity < i.reorder_level);
  const k = data?.kpis || {};

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        eyebrow="// CONTROL ROOM"
        title="Operations Overview"
        subtitle="Live procurement signal from across all sites. Voice in → PO out."
        actions={
          <Link
            to="/intake"
            data-testid="dashboard-cta-intake"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-[#FF4500] transition-colors text-white px-4 py-2.5 text-sm rounded-sm"
          >
            <Mic className="w-4 h-4" /> New Voice Request
          </Link>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
          <StatCard label="// TOTAL REQUESTS" value={k.total_requests ?? "—"} hint="Lifetime" />
          <StatCard label="// PENDING" value={k.pending_requests ?? "—"} hint="Awaiting approval" accent />
          <StatCard label="// OPEN POs" value={k.open_pos ?? "—"} hint="Not yet delivered" />
          <StatCard label="// LOW STOCK" value={k.low_stock_items ?? "—"} hint="Below reorder level" />
          <StatCard
            label="// TOTAL SPEND"
            value={k.total_spend ? `₹${Math.round(k.total_spend).toLocaleString()}` : "₹0"}
            hint="All-time PO value"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent requests */}
          <div className="lg:col-span-2 border border-gray-200 rounded-sm">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="label-mono">// RECENT PROCUREMENT REQUESTS</div>
              <Link to="/requests" data-testid="dashboard-view-all-requests" className="text-xs text-gray-600 hover:text-[#FF4500] flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {requests.length === 0 ? (
              <div className="p-6"><Empty title="No requests yet" hint="Create one from Voice Intake or WhatsApp." /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr className="label-mono text-[10px]">
                    <th className="px-4 py-2.5">Material</th>
                    <th className="px-4 py-2.5">Site</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                    <th className="px-4 py-2.5">Delivery</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.material || "—"}</div>
                        {r.brand && <div className="text-xs text-gray-500">{r.brand}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.site_name || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.quantity ?? "—"} {r.unit || ""}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.delivery_date || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Low stock */}
          <div className="border border-gray-200 rounded-sm">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF4500]" />
              <div className="label-mono">// LOW STOCK ALERTS</div>
            </div>
            {lowStock.length === 0 ? (
              <div className="p-6"><Empty title="All sites stocked" hint="No items below reorder level." /></div>
            ) : (
              <div className="divide-y divide-gray-100">
                {lowStock.map((i) => (
                  <div key={i.id} className="p-4">
                    <div className="font-medium text-sm">{i.material}</div>
                    <div className="text-xs text-gray-500">{i.site_name}</div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-mono text-[#FF4500]">{i.quantity} {i.unit}</span>
                      <span className="text-gray-500">reorder ≤ {i.reorder_level}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
