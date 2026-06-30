"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("public_user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Registration failed. Account might already exist.");
      }

      setToast({ message: "Registration successful! Profile registered in EOC directory.", type: "success" });
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
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
          placeholder="operator@agency.gov"
          id="email"
        />

        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          id="password"
        />

        <Select
          label="Account Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          id="role"
        >
          <option value="admin">Disaster Response Admin (EOC)</option>
          <option value="public_user">Public Citizen Portal</option>
        </Select>

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
          {loading ? "Registering Operator..." : "Create Agency Profile"}
        </Button>

        <div className="text-center text-xs text-text-secondary mt-6">
          Already registered?{" "}
          <Link href="/login" className="text-accent-primary hover:underline font-bold transition">
            Sign In
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
