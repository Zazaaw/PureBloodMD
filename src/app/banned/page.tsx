import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Prohibit, SignOut } from "@phosphor-icons/react/dist/ssr";
import BlurFade from "@/components/effects/blur-fade";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getUserId } from "@/lib/auth";
import { CONTACT_EMAIL } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account suspended" };

/** Where a banned member lands: what happened, why, and how to appeal. */
export default async function BannedPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("banned_at, ban_reason").eq("user_id", userId).maybeSingle();
  if (!p?.banned_at) redirect("/discover");

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <BlurFade className="w-full max-w-sm">
        <Link href="/" aria-label="PureBloodMD home" className="mb-6 flex justify-center text-lead">
          <Logo />
        </Link>
        <Card>
          <CardContent className="pt-6 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-500/10 text-red-500">
              <Prohibit weight="bold" className="size-7" />
            </span>
            <h1 className="mt-4 text-h5 font-bold">Account suspended</h1>
            <p className="mt-2 text-body-sm text-muted-foreground">
              Our safety team suspended this account for breaking the PureBloodMD Terms. Your profile is hidden and you can&apos;t use the app.
            </p>
            {p.ban_reason ? (
              <p className="mt-4 rounded-lg border-l-2 border-red-500 bg-muted/50 px-4 py-3 text-left text-body-sm">{p.ban_reason}</p>
            ) : null}
            <p className="mt-4 text-caption text-muted-foreground">
              Think this is a mistake? Email <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground underline underline-offset-4">{CONTACT_EMAIL}</a>.
            </p>
            <form action="/auth/signout" method="post" className="mt-6">
              <Button variant="outline" className="w-full" type="submit"><SignOut /> Sign out</Button>
            </form>
          </CardContent>
        </Card>
      </BlurFade>
    </main>
  );
}
