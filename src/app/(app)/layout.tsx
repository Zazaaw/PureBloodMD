import { AppNav } from "@/components/app-nav";
import { PausedBanner } from "@/components/paused-banner";
import { PresenceProvider } from "@/components/presence";
import { SetupNotice } from "@/components/setup-notice";
import { requireProfile } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!getSupabaseEnv()) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
        <SetupNotice />
      </main>
    );
  }

  const { supabase, profile, flags } = await requireProfile();
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`profile_a.eq.${profile.id},profile_b.eq.${profile.id}`);

  return (
    <PresenceProvider meId={profile.id}>
      <AppNav country={profile.country ?? "ID"} name={profile.display_name} photo={profile.photo_url} isVip={profile.is_vip} vipEnabled={flags.vipEnabled} consults={count ?? 0} />
      <div className="lg:pl-24">
        {profile.deactivated_at ? <PausedBanner /> : null}
        {children}
      </div>
    </PresenceProvider>
  );
}
