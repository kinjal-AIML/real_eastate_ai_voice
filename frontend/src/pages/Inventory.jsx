import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, Empty } from "@/components/Shared";
import { AlertTriangle } from "lucide-react";

export default function Inventory() {
  const [items, setItems] = useState([]);

  useEffect(() => { api.get("/inventory").then((r) => setItems(r.data)).catch(() => {}); }, []);

  // Group by site
  const bySite = items.reduce((acc, it) => {
    (acc[it.site_name] = acc[it.site_name] || []).push(it);
    return acc;
  }, {});

  return (
    <div data-testid="inventory-page">
      <PageHeader
        eyebrow="// SITE INVENTORY"
        title="Stock Levels"
        subtitle="Real-time stock per site. Updated automatically on PO delivery."
      />
      <div className="p-8 space-y-6">
        {Object.keys(bySite).length === 0 ? <Empty title="No inventory yet" /> : Object.entries(bySite).map(([site, list]) => (
          <div key={site} className="border border-gray-200 rounded-sm" data-testid={`site-section-${site}`}>
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="font-display font-bold">{site}</div>
              <div className="label-mono">{list.length} item{list.length !== 1 ? "s" : ""}</div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr className="label-mono text-[10px] border-b border-gray-200">
                  <th className="px-4 py-2.5">Material</th>
                  <th className="px-4 py-2.5">Brand</th>
                  <th className="px-4 py-2.5 text-right">Stock</th>
                  <th className="px-4 py-2.5 text-right">Reorder Level</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => {
                  const low = i.quantity < i.reorder_level;
                  return (
                    <tr key={i.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{i.material}</td>
                      <td className="px-4 py-3 text-gray-600">{i.brand || "—"}</td>
                      <td className={`px-4 py-3 text-right font-mono ${low ? "text-[#FF4500] font-bold" : ""}`}>{i.quantity} {i.unit}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{i.reorder_level} {i.unit}</td>
                      <td className="px-4 py-3">
                        {low ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-sm">
                            <AlertTriangle className="w-3 h-3" /> Reorder
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-sm">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
