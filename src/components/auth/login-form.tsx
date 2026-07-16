"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form-field";
import { ErrorState } from "@/components/ui/state-view";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  initialError?: string;
};

type AuthMeResponse = {
  ok: boolean;
  data?: {
    authenticated: boolean;
    owner: boolean;
    role: string | null;
    user: {
      email?: string;
    } | null;
  };
};

export function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const response = await fetch("/api/auth/me", {
      cache: "no-store",
    });
    const payload = (await response.json()) as AuthMeResponse;

    if (!payload.data?.authenticated || !payload.data.owner) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Akun ini belum memiliki role OWNER.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      {error ? <ErrorState message={error} title="Login gagal" /> : null}
      <TextInput
        autoComplete="email"
        label="Email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="owner@example.com"
        required
        type="email"
        value={email}
      />
      <TextInput
        autoComplete="current-password"
        label="Password"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Masukkan password"
        required
        type="password"
        value={password}
      />
      <Button
        className="w-full"
        disabled={loading}
        icon={<LogIn size={16} />}
        type="submit"
      >
        {loading ? "Memeriksa akses..." : "Masuk sebagai OWNER"}
      </Button>
    </form>
  );
}
