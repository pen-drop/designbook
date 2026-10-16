import type { ReactNode } from "react";

export type PageProps = {
  header?: ReactNode;
  content?: ReactNode;
  footer?: ReactNode;
};

export default function Page({ header, content, footer }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
      <header>{header}</header>
      <main className="flex-1">{content}</main>
      <footer>{footer}</footer>
    </div>
  );
}
