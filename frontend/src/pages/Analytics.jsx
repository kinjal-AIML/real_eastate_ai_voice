import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatCard, Empty } from "@/components/Shared";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

export default function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/analytics/dashboard").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <div className="p-8 text-sm text-gray-500">Loading...</div>;
  const k = data.kpis;

  return (
    <div data-testid="analytics-page">
      <PageHeader
        eyebrow="// ANALYTICS"
        title="Spend Intelligence"
        subtitle="Procurement velocity, vendor share, material breakdown."
      />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          <StatCard label="// TOTAL SPEND" value={`₹${Math.round(k.total_spend).toLocaleString()}`} accent />
          <StatCard label="// REQUESTS" value={k.total_requests} />
          <StatCard label="// OPEN POs" value={k.open_pos} />
          <StatCard label="// LOW STOCK" value={k.low_stock_items} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-sm bg-white p-5">
            <div className="label-mono mb-4">// MONTHLY SPEND TREND</div>
            {data.monthly_spend.length === 0 ? <Empty title="No PO data yet" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.monthly_spend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="spend" stroke="#FF4500" strokeWidth={2.5} dot={{ fill: "#FF4500" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="border border-gray-200 rounded-sm bg-white p-5">
            <div className="label-mono mb-4">// TOP MATERIALS BY SPEND</div>
            {data.top_materials.length === 0 ? <Empty title="No PO data yet" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.top_materials}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="material" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                  <Tooltip />
                  <Bar dataKey="spend" fill="#111827" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-sm bg-white">
          <div className="px-4 py-3 border-b border-gray-200 label-mono">// TOP VENDORS</div>
          {data.top_vendors.length === 0 ? <div className="p-6"><Empty title="No vendor data yet" /></div> : (
            <table className="w-full text-sm">
              <thead className="text-left bg-gray-50">
                <tr className="label-mono text-[10px]">
                  <th className="px-4 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5 text-right">Orders</th>
                  <th className="px-4 py-2.5 text-right">Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {data.top_vendors.map((v) => (
                  <tr key={v.vendor} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{v.vendor}</td>
                    <td className="px-4 py-3 text-right font-mono">{v.orders}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">₹{Math.round(v.spend).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
