import React, { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusBadge } from "@/components/Shared";
import { toast } from "sonner";
import { Send, Bot } from "lucide-react";

const SAMPLES = [
  "Need 50 bags Ultratech Cement OPC 53 tomorrow for Riverfront Site Surat. Urgent.",
  "कल रिवरफ्रंट साइट सूरत के लिए 30 बैग अल्ट्राटेक सीमेंट चाहिए",
  "આવતીકાલે મરીના બે મુંબઈ માટે 2 ટન TMT સ્ટીલ બાર 12mm જોઈએ.",
];

export default function WhatsApp() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const load = async () => {
    const { data } = await api.get("/whatsapp/messages");
    setMessages(data);
  };

  useEffect(() => { load().catch(() => {}); }, []);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (msg) => {
    const t = (msg ?? text).trim();
    if (!t) return;
    setSending(true);
    try {
      await api.post("/whatsapp/send", { text: t });
      setText("");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen" data-testid="whatsapp-page">
      <PageHeader
        eyebrow="// WHATSAPP SIMULATOR"
        title="Field Channel"
        subtitle="Simulates how site engineers send requests over WhatsApp. AI parses → request logged → bot confirms."
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 overflow-hidden">
        {/* Chat */}
        <div className="lg:col-span-2 flex flex-col border-r border-gray-200">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-400 mt-20">Send your first message to start.</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "out" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-md ${m.direction === "out" ? "bg-white border border-gray-200" : "bg-gray-900 text-white"} px-3.5 py-2.5 rounded-sm`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    {m.direction === "out" && <Bot className="w-3 h-3 text-[#FF4500]" />}
                    <span className={`text-[10px] uppercase tracking-wider font-mono ${m.direction === "out" ? "text-gray-500" : "text-white/60"}`}>
                      {m.sender}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                  <div className={`mt-1 text-[10px] font-mono ${m.direction === "out" ? "text-gray-400" : "text-white/50"}`}>
                    {new Date(m.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2 mb-2 flex-wrap">
              {SAMPLES.map((s, i) => (
                <button key={i} onClick={() => setText(s)} data-testid={`whatsapp-sample-${i}`}
                  className="text-[10px] font-mono uppercase tracking-wider border border-gray-300 px-2 py-1 hover:bg-gray-100 rounded-sm">
                  Sample {i + 1}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Type a procurement message (EN / HI / GU)..."
                data-testid="whatsapp-input"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4500]" />
              <button onClick={() => send()} disabled={sending || !text.trim()} data-testid="whatsapp-send-button"
                className="bg-[#FF4500] hover:bg-orange-600 text-white px-4 py-2.5 text-sm rounded-sm flex items-center gap-2 disabled:opacity-60">
                <Send className="w-4 h-4" /> {sending ? "Parsing..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Side panel: latest extraction */}
        <div className="p-6 overflow-y-auto bg-white">
          <div className="label-mono mb-3">// LIVE EXTRACTIONS</div>
          <RecentRequests />
        </div>
      </div>
    </div>
  );
}

function RecentRequests() {
  const [reqs, setReqs] = useState([]);
  useEffect(() => {
    const fetch = () => api.get("/requests").then((r) => setReqs(r.data.filter((x) => x.source === "whatsapp").slice(0, 8))).catch(() => {});
    fetch();
    const t = setInterval(fetch, 5000);
    return () => clearInterval(t);
  }, []);

  if (reqs.length === 0) return <div className="text-xs text-gray-500">No WhatsApp requests yet.</div>;
  return (
    <div className="space-y-3">
      {reqs.map((r) => (
        <div key={r.id} className="border border-gray-200 rounded-sm p-3 hover:border-gray-400 transition-colors">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{r.material || "—"}</div>
            <StatusBadge status={r.status} />
          </div>
          <div className="text-xs text-gray-500">{r.brand} · {r.quantity} {r.unit}</div>
          <div className="text-xs text-gray-500 mt-1">{r.site_name} · {r.delivery_date}</div>
        </div>
      ))}
    </div>
  );
}
