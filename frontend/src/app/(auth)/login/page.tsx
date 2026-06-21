"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (email && password) {
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 800);
      } else {
        setError("Please enter valid credentials.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
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
  );
}
