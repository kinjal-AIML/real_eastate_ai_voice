import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import VoiceIntake from "@/pages/VoiceIntake";
import Requests from "@/pages/Requests";
import WhatsApp from "@/pages/WhatsApp";
import Vendors from "@/pages/Vendors";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Inventory from "@/pages/Inventory";
import Analytics from "@/pages/Analytics";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/intake" element={<VoiceIntake />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/whatsapp" element={<WhatsApp />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
