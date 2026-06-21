"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
      // Mocking login flow for routing structure setup
      if (email && password) {
        setTimeout(() => {
          router.push("/admin");
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
      <div>
        <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
          Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white text-sm outline-hidden transition duration-300 focus:ring-2 focus:ring-cyan-500/20"
          placeholder="admin@earth.org"
        />
      </div>

      <div>
        <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white text-sm outline-hidden transition duration-300 focus:ring-2 focus:ring-cyan-500/20"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/50 rounded-xl p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-linear-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold py-3 px-4 rounded-xl cursor-pointer shadow-lg shadow-cyan-500/10 transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        ) : (
          "Sign In"
        )}
      </button>

      <div className="text-center text-xs text-slate-400 mt-6">
        Don't have an account?{" "}
        <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition">
          Sign Up
        </Link>
      </div>
    </form>
  );
}
