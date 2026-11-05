"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/contas", label: "Contas", icon: "wallet" },
  { href: "/agenda", label: "Agenda", icon: "calendar" },
  { href: "/analises", label: "Análises", icon: "chart" },
  { href: "/familia", label: "Família", icon: "people" },
  { href: "/historico", label: "Histórico", icon: "history" },
] as const;

type NavIconName = (typeof items)[number]["icon"];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur-md">
      <ul className="mx-auto grid max-w-lg grid-cols-6 px-1 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1.5 text-[10px] leading-none tracking-tight ${
                  active ? "font-semibold text-accent" : "text-muted"
                }`}
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-xl ${
                    active ? "bg-accent-soft" : ""
                  }`}
                >
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavIcon({ name }: { name: NavIconName }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "size-[22px]",
  };

  switch (name) {
    case "home":
      return (
        <svg {...props}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...props}>
          <rect x="3.5" y="6.5" width="17" height="12" rx="2" />
          <path d="M3.5 10h17" />
          <path d="M15.5 14.5h2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...props}>
          <rect x="4" y="5.5" width="16" height="14" rx="2" />
          <path d="M8 3.5v4M16 3.5v4M4 10h16" />
        </svg>
      );
    case "chart":
      return (
        <svg {...props}>
          <path d="M4 19h16" />
          <path d="M7 16V11" />
          <path d="M12 16V7" />
          <path d="M17 16v-3.5" />
        </svg>
      );
    case "people":
      return (
        <svg {...props}>
          <circle cx="9" cy="9" r="2.4" />
          <circle cx="16" cy="9.5" r="2" />
          <path d="M4.8 18.5c.6-2.4 2.3-3.6 4.2-3.6s3.6 1.2 4.2 3.6" />
          <path d="M13.2 15.2c1.3-.5 2.6-.4 3.6.4 1 .8 1.6 2 1.9 3" />
        </svg>
      );
    case "history":
      return (
        <svg {...props}>
          <path d="M5 12a7 7 0 1 0 2-4.9" />
          <path d="M5 5.5V9h3.5" />
          <path d="M12 8.5V12l2.5 1.5" />
        </svg>
      );
  }
}
