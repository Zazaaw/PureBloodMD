import Link from "next/link";
import { Logo } from "@/components/logo";
import BlurFade from "@/components/effects/blur-fade";
import { Card, CardContent } from "@/components/ui/card";
import { SetupNotice } from "@/components/setup-notice";
import { getSupabaseEnv } from "@/lib/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <BlurFade className="w-full max-w-sm">
        <Link href="/" aria-label="PureBloodMD home" className="mb-6 flex justify-center text-lead">
          <Logo />
        </Link>
        {getSupabaseEnv() ? (
          <Card>
            <CardContent className="pt-6">{children}</CardContent>
          </Card>
        ) : (
          <SetupNotice />
        )}
      </BlurFade>
    </main>
  );
}
