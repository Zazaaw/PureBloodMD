import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

/** Everything under /admin: admins only (public.admin_emails), others get a 404. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireProfile();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();
  const { data: stats } = await supabase.rpc("admin_stats");
  const s = (stats ?? {}) as { pending_verifications?: number; open_reports?: number };

  return (
    <main className="pb-dock mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:pb-10">
      <AdminNav counts={{ verification: s.pending_verifications ?? 0, reports: s.open_reports ?? 0 }} />
      {children}
    </main>
  );
}
