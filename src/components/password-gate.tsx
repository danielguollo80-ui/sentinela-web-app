"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Login do painel: a senha é conferida no servidor (/api/login), que devolve um cookie HttpOnly.
// Nada de senha no bundle nem flag em sessionStorage — o servidor é quem decide.
export function PasswordGate({ onUnlock, className = "mt-24" }: { onUnlock: () => void; className?: string }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pwd || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        onUnlock();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Senha incorreta.");
      setPwd("");
    } catch {
      setError("Erro de conexão.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`container mx-auto px-4 max-w-sm ${className}`}>
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/60 space-y-6 text-center">
        <h2 className="text-2xl font-black text-white uppercase">SENTINELA <span className="text-emerald-400">PRO</span></h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="password" placeholder="Password" value={pwd} onChange={(e) => { setPwd(e.target.value); setError(null); }} className="bg-slate-950 border-slate-700 text-white text-center" />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg h-12">{busy ? "Entrando..." : "Entrar"}</Button>
        </form>
      </div>
    </div>
  );
}
