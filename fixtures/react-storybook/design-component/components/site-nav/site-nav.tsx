export type SiteNavProps = {
  links?: { label: string; url: string }[];
};

export default function SiteNav({ links = [] }: SiteNavProps) {
  return (
    <nav className="flex items-center gap-6">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          className="text-sm font-medium text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
