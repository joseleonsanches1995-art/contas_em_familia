"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Início" },
  { href: "/contas", label: "Contas" },
  { href: "/agenda", label: "Agenda" },
  { href: "/analises", label: "Análises" },
  { href: "/familia", label: "Família" },
  { href: "/historico", label: "Histórico" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-card">
      <ul className="mx-auto grid max-w-lg grid-cols-6">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-14 items-center justify-center px-1 text-center text-xs ${
                  active ? "font-semibold text-accent" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
