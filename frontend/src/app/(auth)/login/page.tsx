"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Authentication failed. Verify credentials.");
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("email", email);

      if (data.role === "admin") {
        setToast({ message: "Establish secure connection: Authorized Admin session verified.", type: "success" });
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 1000);
      } else if (data.role === "public_user") {
        setToast({ message: "Sign in successful: Citizen portal session verified.", type: "success" });
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        throw new Error("Access restricted: Invalid account role.");
      }
    } catch (err: any) {
      let msg = err.message || "An unexpected error occurred.";
      if (msg === "Failed to fetch") {
        msg = "Network Connection Refused: EOC server is offline at http://localhost:8000. Verify the backend service is active.";
      }
      setError(msg);
      setToast({ message: msg, type: "error" });
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@agency.gov"
          id="email"
        />

        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          id="password"
        />

        {error && (
          <div className="text-severity-extreme text-xs bg-severity-extreme/10 border border-severity-extreme/20 rounded-xl p-3 font-semibold">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Establishing Secure Connection..." : "Authorize Access"}
        </Button>

        <div className="text-center text-xs text-text-secondary mt-6">
          Need operational credentials?{" "}
          <Link href="/register" className="text-accent-primary hover:underline font-bold transition">
            Register Here
          </Link>
        </div>
      </form>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
