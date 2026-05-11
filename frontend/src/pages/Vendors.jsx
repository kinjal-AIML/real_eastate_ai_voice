import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, Empty } from "@/components/Shared";
import { Star, Phone, Mail, Clock } from "lucide-react";

export default function Vendors() {
  const [vendors, setVendors] = useState([]);

  useEffect(() => { api.get("/vendors").then((r) => setVendors(r.data)).catch(() => {}); }, []);

  return (
    <div data-testid="vendors-page">
      <PageHeader
        eyebrow="// VENDOR INTELLIGENCE"
        title="Vendor Directory"
        subtitle="Performance-ranked supplier roster. Used for automated PO routing."
      />
      <div className="p-8">
        {vendors.length === 0 ? <Empty title="No vendors yet" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
            {vendors.map((v) => (
              <div key={v.id} className="border border-gray-200 rounded-sm p-5 bg-white hover:border-gray-400 hover:-translate-y-0.5 transition-all duration-200" data-testid={`vendor-card-${v.id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display font-bold text-lg leading-tight">{v.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {v.categories.map((c) => (
                        <span key={c} className="label-mono px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded-sm">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[#FF4500]">
                      <Star className="w-3.5 h-3.5 fill-current" /> <span className="font-mono font-bold">{v.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {v.contact}</div>
                  <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {v.email}</div>
                  <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> Lead time: {v.lead_time_days}d · On-time {v.on_time_delivery}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
