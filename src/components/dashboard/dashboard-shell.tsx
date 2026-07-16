"use client";

import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  ReceiptText,
  Settings2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Penerimaan Unit", href: "/receipts", icon: ClipboardList },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Penjualan", href: "/sales", icon: PackageCheck },
  { label: "Keuangan", href: "/finance", icon: WalletCards },
  { label: "Laporan", href: "/reports", icon: BarChart3 },
  { label: "Master Data", href: "/master-data", icon: Settings2 },
];

type DashboardShellProps = {
  children: ReactNode;
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

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/login")) {
      return;
    }

    let mounted = true;

    async function loadSession() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = (await response.json()) as AuthMeResponse;

      if (!mounted) {
        return;
      }

      setUserEmail(payload.data?.user?.email ?? null);
    }

    loadSession().catch(() => setUserEmail(null));

    return () => {
      mounted = false;
    };
  }, [pathname]);

  if (pathname.startsWith("/login")) {
    return children;
  }

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <div
        className={[
          "fixed inset-0 z-30 bg-stone-950/40 transition md:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-white transition-transform md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between border-b border-stone-200 px-5">
          <Link href="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <span className="flex size-9 items-center justify-center rounded-md bg-stone-900 text-white">
              <ReceiptText size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-stone-950">Rephone POS</span>
              <span className="block text-xs text-stone-500">Used phone operations</span>
            </span>
          </Link>
          <Button
            aria-label="Tutup menu"
            className="size-9 px-0 md:hidden"
            icon={<X size={16} />}
            onClick={() => setSidebarOpen(false)}
            variant="ghost"
          />
        </div>
        <nav className="grid gap-1 p-3">
          {navigation.map((item) => (
            <SidebarLink
              href={item.href}
              icon={<item.icon size={18} />}
              key={item.href}
              label={item.label}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>
      </aside>
      <div className="md:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <Button
              aria-label="Buka menu"
              className="size-9 px-0 md:hidden"
              icon={<Menu size={16} />}
              onClick={() => setSidebarOpen(true)}
              variant="secondary"
            />
            <div>
              <p className="text-xs font-medium uppercase text-stone-500">Dashboard operasional</p>
              <h1 className="text-base font-semibold text-stone-950">Rephone POS</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 sm:flex">
              <UserRound size={15} />
              <span className="max-w-48 truncate">{userEmail ?? "OWNER"}</span>
            </div>
            <Button
              aria-label="Logout"
              className="size-9 px-0 sm:w-auto sm:px-3"
              disabled={loggingOut}
              icon={<LogOut size={16} />}
              onClick={handleLogout}
              variant="secondary"
            >
              <span className="hidden sm:inline">
                {loggingOut ? "Keluar..." : "Logout"}
              </span>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

type SidebarLinkProps = {
  href: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

function SidebarLink({ href, icon, label, onClick }: SidebarLinkProps) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      className={[
        "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
        active
          ? "bg-stone-900 text-white"
          : "text-stone-700 hover:bg-stone-100 hover:text-stone-950",
      ].join(" ")}
      href={href}
      onClick={onClick}
    >
      <span className="flex size-5 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
