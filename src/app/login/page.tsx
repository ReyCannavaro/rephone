import { ReceiptText } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getUserRole, ownerRole } from "@/lib/auth/owner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  login_required: "Silakan login terlebih dahulu.",
  owner_required: "Akses dashboard hanya untuk OWNER.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && getUserRole(user) === ownerRole) {
    redirect("/");
  }

  const initialError = params?.error ? errorMessages[params.error] : undefined;

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-stone-950">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden min-h-[620px] flex-col justify-between bg-stone-950 p-10 text-white lg:flex">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-white text-stone-950">
                <ReceiptText size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold">Rephone POS</p>
                <p className="text-xs text-stone-400">Owner operation console</p>
              </div>
            </div>
            <div className="max-w-md">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Protected workspace
              </p>
              <h1 className="text-4xl font-semibold leading-tight">
                Masuk ke dashboard operasional.
              </h1>
              <p className="mt-5 text-sm leading-6 text-stone-300">
                Akses mutasi stok, jurnal, transaksi, dan laporan dibatasi untuk akun
                dengan role OWNER.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-stone-300">
              <div className="rounded-md border border-white/10 p-3">
                <p className="font-semibold text-white">Auth</p>
                <p className="mt-1">Supabase session</p>
              </div>
              <div className="rounded-md border border-white/10 p-3">
                <p className="font-semibold text-white">Role</p>
                <p className="mt-1">OWNER only</p>
              </div>
              <div className="rounded-md border border-white/10 p-3">
                <p className="font-semibold text-white">Audit</p>
                <p className="mt-1">Tracked actions</p>
              </div>
            </div>
          </div>
          <div className="flex min-h-[620px] items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-sm">
              <div className="mb-8 lg:hidden">
                <span className="mb-4 flex size-10 items-center justify-center rounded-md bg-stone-900 text-white">
                  <ReceiptText size={19} />
                </span>
                <p className="text-sm font-semibold text-stone-950">Rephone POS</p>
              </div>
              <p className="text-sm font-medium uppercase text-stone-500">
                Owner Login
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                Selamat datang kembali
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Gunakan akun Supabase Auth yang sudah diberi role OWNER.
              </p>
              <div className="mt-8">
                <LoginForm initialError={initialError} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
