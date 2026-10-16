import type { ReactNode } from "react";

type BookStatus = "in_stock" | "preorder" | "out_of_stock";

export type BookCardProps = {
  title?: string;
  author?: string;
  price?: string;
  coverUrl?: string;
  status?: BookStatus;
  actions?: ReactNode;
};

const statusLabel: Record<BookStatus, string> = {
  in_stock: "In Stock",
  preorder: "Preorder",
  out_of_stock: "Out of Stock",
};

const statusClass: Record<BookStatus, string> = {
  in_stock: "text-[var(--color-success)]",
  preorder: "text-[var(--color-accent)]",
  out_of_stock: "text-[var(--color-muted)]",
};

export default function BookCard({ title, author, price, coverUrl, status, actions }: BookCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-[var(--color-muted)]/20 bg-[var(--color-background)]">
      <img src={coverUrl} alt={title} className="aspect-[2/3] w-full object-cover" />
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h3>
        <p className="text-sm text-[var(--color-muted)]">{author}</p>
        <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">{price}</p>
        {status && (
          <p className={`text-xs font-medium uppercase tracking-wide ${statusClass[status]}`}>{statusLabel[status]}</p>
        )}
        <div className="mt-2">{actions}</div>
      </div>
    </div>
  );
}
