import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusBadge, Empty } from "@/components/Shared";
import { toast } from "sonner";

const NEXT = { issued: "acknowledged", acknowledged: "shipped", shipped: "delivered" };

export default function PurchaseOrders() {
  const [pos, setPOs] = useState([]);

  const load = () => api.get("/purchase-orders").then((r) => setPOs(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const advance = async (po) => {
    const next = NEXT[po.status];
    if (!next) return;
    await api.post(`/purchase-orders/${po.id}/status`, { status: next });
    toast.success(`PO ${next}`);
    load();
  };

  return (
    <div data-testid="po-page">
      <PageHeader
        eyebrow="// PROCUREMENT OUTPUT"
        title="Purchase Orders"
        subtitle="From issued to delivered. Click 'Advance' to move PO through the pipeline."
      />

      <div className="p-8">
        {pos.length === 0 ? <Empty title="No POs issued yet" hint="Approve a request to auto-generate." /> : (
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="label-mono text-[10px]">
                  <th className="px-4 py-3">PO #</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pos.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50" data-testid={`po-row-${p.id}`}>
                    <td className="px-4 py-3 font-mono text-xs">{p.po_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.material}</div>
                      {p.brand && <div className="text-xs text-gray-500">{p.brand}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.vendor_name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.site_name}</td>
                    <td className="px-4 py-3 text-right font-mono">{p.quantity} {p.unit}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">₹{Math.round(p.total).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.delivery_date || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {NEXT[p.status] && (
                        <button onClick={() => advance(p)} data-testid={`advance-po-${p.id}`}
                          className="text-xs bg-gray-900 hover:bg-[#FF4500] text-white px-3 py-1.5 rounded-sm transition-colors">
                          → {NEXT[p.status]}
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
  );
}
