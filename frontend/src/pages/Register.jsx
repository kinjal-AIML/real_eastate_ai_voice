import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowRight, HardHat } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "engineer" });
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      toast.success("Account created");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      <div className="hidden lg:block relative overflow-hidden bg-gray-950">
        <img
          src="https://images.unsplash.com/photo-1763303775599-08d20753a9ec?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBhYnN0cmFjdCUyMGFyY2hpdGVjdHVyYWwlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3ODQ5NDQzNHww&ixlib=rb-4.1.0&q=85"
          alt="Architecture"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-950/70 via-gray-950/30 to-transparent" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white grid place-items-center rounded-sm">
              <HardHat className="w-5 h-5 text-[#FF4500]" strokeWidth={2.5} />
            </div>
            <div className="font-display font-black tracking-tight text-base leading-none">CONSTRUCT<span className="text-[#FF4500]">.</span>PROCURE</div>
          </div>
          <div>
            <div className="label-mono text-white/70 mb-4">// NEW ACCOUNT</div>
            <h1 className="font-display font-black tracking-tighter text-5xl leading-[0.95]">
              Join the<br />
              field-grade<br />
              procurement <span className="text-[#FF4500]">OS</span>.
            </h1>
          </div>
          <div className="label-mono text-white/40">v1.0</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm" data-testid="register-form">
          <div className="label-mono mb-3">// CREATE ACCOUNT</div>
          <h2 className="font-display font-black tracking-tighter text-4xl">Sign up.</h2>

          <div className="mt-8 space-y-4">
            <div>
              <label className="label-mono block mb-1.5">Full Name</label>
              <input required value={form.name} onChange={update("name")} data-testid="register-name-input"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#FF4500] text-sm" />
            </div>
            <div>
              <label className="label-mono block mb-1.5">Email</label>
              <input type="email" required value={form.email} onChange={update("email")} data-testid="register-email-input"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#FF4500] text-sm" />
            </div>
            <div>
              <label className="label-mono block mb-1.5">Password</label>
              <input type="password" required value={form.password} onChange={update("password")} data-testid="register-password-input"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#FF4500] text-sm" />
            </div>
            <div>
              <label className="label-mono block mb-1.5">Role</label>
              <select value={form.role} onChange={update("role")} data-testid="register-role-select"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#FF4500] text-sm bg-white">
                <option value="engineer">Site Engineer</option>
                <option value="manager">Procurement Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={submitting} data-testid="register-submit-button"
            className="mt-6 w-full bg-gray-900 hover:bg-[#FF4500] text-white py-3 text-sm font-medium rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {submitting ? "Creating..." : <>Create account <ArrowRight className="w-4 h-4" /></>}
          </button>

          <div className="mt-6 text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-gray-900 underline underline-offset-4 hover:text-[#FF4500]">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
