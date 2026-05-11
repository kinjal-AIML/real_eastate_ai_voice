import React, { useRef, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusBadge } from "@/components/Shared";
import { toast } from "sonner";
import { Mic, Square, Loader2, Send, Sparkles, Languages } from "lucide-react";

const SAMPLES = {
  en: "Need 50 bags Ultratech Cement OPC 53 tomorrow for Riverfront Site Surat. Urgent.",
  hi: "कल रिवरफ्रंट साइट सूरत के लिए 30 बैग अल्ट्राटेक सीमेंट OPC 53 चाहिए।",
  gu: "આવતીકાલે રિવરફ્રન્ટ સાઇટ સુરત માટે 40 બેગ અલ્ટ્રાટેક સિમેન્ટ OPC 53 જોઈએ.",
};

export default function VoiceIntake() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("auto");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribe(blob);
      };
      mr.start();
      setRecording(true);
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const transcribe = async (blob) => {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "voice.webm");
      if (language !== "auto") fd.append("language", language);
      const { data } = await api.post("/ai/transcribe", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setText(data.text || "");
      toast.success("Transcribed");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const runExtraction = async () => {
    if (!text.trim()) return toast.error("Enter or record some text first");
    setExtracting(true);
    setExtracted(null);
    try {
      const { data } = await api.post("/ai/extract", { text, language });
      setExtracted(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const submitRequest = async () => {
    if (!extracted) return;
    setSubmitting(true);
    try {
      await api.post("/requests", { raw_text: text, extracted, source: "voice" });
      toast.success("Request submitted");
      setText(""); setExtracted(null);
    } catch (err) {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="voice-intake-page">
      <PageHeader
        eyebrow="// AI VOICE INTAKE"
        title="Speak. Type. Extract."
        subtitle="Record a voice note or type a request. AI extracts structured procurement data in English, Hindi, or Gujarati."
      />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input panel */}
        <div className="border border-gray-200 rounded-sm bg-white">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="label-mono">// INPUT</div>
            <div className="flex items-center gap-2">
              <Languages className="w-3.5 h-3.5 text-gray-500" />
              <select value={language} onChange={(e) => setLanguage(e.target.value)} data-testid="intake-language-select"
                className="text-xs border border-gray-300 rounded-sm px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4500]">
                <option value="auto">Auto</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="gu">Gujarati</option>
              </select>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              {!recording ? (
                <button onClick={startRecording} disabled={transcribing} data-testid="start-recording-button"
                  className="flex items-center gap-2 bg-[#FF4500] hover:bg-orange-600 text-white px-4 py-2.5 text-sm rounded-sm disabled:opacity-60">
                  <Mic className="w-4 h-4" /> {transcribing ? "Transcribing..." : "Record"}
                </button>
              ) : (
                <button onClick={stopRecording} data-testid="stop-recording-button"
                  className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 text-sm rounded-sm rec-pulse">
                  <Square className="w-3.5 h-3.5 fill-white" /> Stop ({"REC"})
                </button>
              )}
              {transcribing && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
              <div className="ml-auto flex gap-1">
                {Object.entries(SAMPLES).map(([k, v]) => (
                  <button key={k} onClick={() => setText(v)} data-testid={`sample-${k}-button`}
                    className="text-[10px] font-mono uppercase tracking-wider border border-gray-300 px-2 py-1 hover:bg-gray-100 rounded-sm">
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a procurement request or press Record..."
              rows={7} data-testid="intake-text-input"
              className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#FF4500] text-sm resize-none" />

            <button onClick={runExtraction} disabled={extracting || !text.trim()} data-testid="extract-button"
              className="w-full bg-gray-900 hover:bg-[#FF4500] text-white py-3 text-sm rounded-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {extracting ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</> : <><Sparkles className="w-4 h-4" /> Run AI Extraction</>}
            </button>
          </div>
        </div>

        {/* Output panel */}
        <div className="border border-gray-200 rounded-sm bg-white">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="label-mono">// EXTRACTED ENTITIES</div>
            {extracted?.language && (
              <span className="label-mono text-[#FF4500]">lang: {extracted.language}</span>
            )}
          </div>

          {!extracted ? (
            <div className="p-10 text-center text-sm text-gray-500">
              <Sparkles className="w-6 h-6 mx-auto text-gray-300 mb-3" />
              AI-parsed fields will appear here.
            </div>
          ) : (
            <div className="p-5 space-y-3" data-testid="extraction-result">
              <Field k="Site" v={extracted.site_name} />
              <Field k="Employee" v={extracted.employee_name} />
              <Field k="Material" v={extracted.material} />
              <Field k="Brand / Spec" v={extracted.brand} />
              <Field k="Quantity" v={extracted.quantity != null ? `${extracted.quantity} ${extracted.unit || ""}` : null} />
              <Field k="Delivery Date" v={extracted.delivery_date} />
              <Field k="Priority" v={<StatusBadge status={extracted.priority || "normal"} />} />

              {extracted.missing_fields?.length > 0 && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="label-mono text-[#FF4500]">// MISSING FIELDS</div>
                  <div className="mt-1 text-xs text-gray-700">{extracted.missing_fields.join(", ")}</div>
                  {extracted.follow_up_question && (
                    <div className="mt-2 p-2.5 bg-orange-50 border border-orange-200 text-xs text-orange-800 rounded-sm">
                      <strong>AI follow-up:</strong> {extracted.follow_up_question}
                    </div>
                  )}
                </div>
              )}

              <button onClick={submitRequest} disabled={submitting} data-testid="submit-request-button"
                className="w-full mt-4 bg-gray-900 hover:bg-[#FF4500] transition-colors text-white py-3 text-sm rounded-sm flex items-center justify-center gap-2 disabled:opacity-60">
                <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit Procurement Request"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ k, v }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-gray-100 pb-2.5 last:border-0">
      <div className="label-mono col-span-1">{k}</div>
      <div className="col-span-2 text-sm">{v ?? <span className="text-gray-400 italic">—</span>}</div>
    </div>
  );
}
