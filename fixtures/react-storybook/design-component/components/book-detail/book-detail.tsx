import type { ReactNode } from "react";

type BookStatus = "in_stock" | "preorder" | "out_of_stock";

export type BookDetailProps = {
  title?: string;
  author?: string;
  genre?: string;
  price?: string;
  coverUrl?: string;
  summary?: string;
  status?: BookStatus;
  publisher?: ReactNode;
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

export default function BookDetail(props: BookDetailProps) {
  const { title, author, genre, price, coverUrl, summary, status, publisher, actions } = props;
  return (
    <article className="grid grid-cols-1 gap-8 bg-[var(--color-background)] p-6 md:grid-cols-[minmax(0,320px)_1fr]">
      <img src={coverUrl} alt={title} className="aspect-[2/3] w-full rounded-lg object-cover" />
      <div className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-wide text-[var(--color-muted)]">{genre}</p>
        <h1 className="text-3xl font-semibold text-[var(--color-foreground)]">{title}</h1>
        <p className="text-lg text-[var(--color-muted)]">{author}</p>
        <p className="text-xl font-medium text-[var(--color-foreground)]">{price}</p>
        {status && (
          <p className={`text-sm font-medium uppercase tracking-wide ${statusClass[status]}`}>{statusLabel[status]}</p>
        )}
        <p className="mt-2 text-base leading-relaxed text-[var(--color-foreground)]">{summary}</p>
        <div className="mt-4">{publisher}</div>
        <div className="mt-4">{actions}</div>
      </div>
    </article>
  );
}
