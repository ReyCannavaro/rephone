import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/state-view";

type ModulePageProps = {
  title: string;
  eyebrow: string;
  description: string;
  children?: ReactNode;
};

export function ModulePage({ children, description, eyebrow, title }: ModulePageProps) {
  return (
    <div className="grid gap-6">
      <section className="border-b border-stone-200 pb-6">
        <p className="text-sm font-medium uppercase text-stone-500">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-950">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
      </section>
      {children ?? (
        <EmptyState
          description="Fondasi layout sudah siap. Alur data dan form transaksi bisa mulai dipasang di modul ini."
          title="Belum ada tampilan data"
        />
      )}
    </div>
  );
}
