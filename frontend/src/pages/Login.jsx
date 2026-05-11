import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowRight, HardHat } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("manager@demo.com");
  const [password, setPassword] = useState("Demo@123");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* Left panel - image */}
      <div className="hidden lg:block relative overflow-hidden bg-gray-950">
        <img
          src="https://images.unsplash.com/photo-1685543905636-cdc396ded922?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhYnN0cmFjdCUyMGFyY2hpdGVjdHVyYWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3ODQ5NDQzNHww&ixlib=rb-4.1.0&q=85"
          alt="Architecture"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-950/70 via-gray-950/30 to-transparent" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white grid place-items-center rounded-sm">
              <HardHat className="w-5 h-5 text-[#FF4500]" strokeWidth={2.5} />
            </div>
            <div className="font-display font-black tracking-tight text-base leading-none">
              CONSTRUCT<span className="text-[#FF4500]">.</span>PROCURE
            </div>
          </div>
          <div>
            <div className="label-mono text-white/70 mb-4">// PROCUREMENT OS</div>
            <h1 className="font-display font-black tracking-tighter text-5xl xl:text-6xl leading-[0.95]">
              Speak it.<br />
              AI extracts it.<br />
              <span className="text-[#FF4500]">PO ships</span> it.
            </h1>
            <p className="mt-6 text-sm text-white/70 max-w-md">
              Voice-first procurement for construction sites. English, Hindi, Gujarati — your engineers talk, our AI does the paperwork.
            </p>
          </div>
          <div className="label-mono text-white/40">v1.0 · BUILT FOR THE FIELD</div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm" data-testid="login-form">
          <div className="label-mono mb-3">// SIGN IN</div>
          <h2 className="font-display font-black tracking-tighter text-4xl">Access the platform.</h2>
          <p className="mt-2 text-sm text-gray-500">Use the demo accounts below or your own.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="label-mono block mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                data-testid="login-email-input"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="label-mono block mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                data-testid="login-password-input"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-transparent text-sm"
              />
            </div>
          </div>

          <button
            type="submit" disabled={submitting}
            data-testid="login-submit-button"
            className="mt-6 w-full bg-gray-900 hover:bg-[#FF4500] text-white py-3 text-sm font-medium tracking-wide rounded-sm transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : <>Sign in <ArrowRight className="w-4 h-4" /></>}
          </button>

          <div className="mt-6 p-3 border border-gray-200 rounded-sm bg-gray-50 text-xs text-gray-600">
            <div className="label-mono mb-2 text-gray-700">// Demo Accounts</div>
            <div>manager@demo.com / Demo@123</div>
            <div>engineer@demo.com / Demo@123</div>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            New here? <Link to="/register" data-testid="goto-register-link" className="text-gray-900 underline underline-offset-4 hover:text-[#FF4500]">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
