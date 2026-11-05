import { BottomNav } from "@/components/bottom-nav";
import { requireMembership } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireMembership();

  return (
    <div className="mx-auto min-h-full w-full max-w-lg">
      <div className="px-4 pb-28 pt-6">{children}</div>
      <BottomNav />
    </div>
  );
}
