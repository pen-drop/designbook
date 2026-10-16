import type { ReactNode } from "react";

export type SiteHeaderProps = {
  storeName?: string;
  nav?: ReactNode;
};

export default function SiteHeader({ storeName, nav }: SiteHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-muted)]/20 bg-[var(--color-background)] px-6 py-4">
      <span className="text-lg font-semibold text-[var(--color-foreground)]">{storeName}</span>
      {nav}
    </div>
  );
}
