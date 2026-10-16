import type { ReactNode } from "react";

export type CatalogGridProps = {
  children?: ReactNode;
};

export default function CatalogGrid({ children }: CatalogGridProps) {
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
