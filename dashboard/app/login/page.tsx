"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Incorrect password");
    }
  }

  return (
    <div className="login-wrap">
      <form onSubmit={handleSubmit} className="login-card">
        <div className="login-title">SoFi Ticket Desk</div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={loading || !password}>
          {loading ? "…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
