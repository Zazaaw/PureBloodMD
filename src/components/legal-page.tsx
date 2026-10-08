import Link from "next/link";
import BlurFade from "@/components/effects/blur-fade";
import { Logo } from "@/components/logo";
import PageHeader from "@/components/ui/page-header";
import type { LegalSection } from "@/lib/legal";
import { LEGAL_UPDATED } from "@/lib/legal";

/** Shared layout for Terms and Privacy: header, contents list, readable 65ch body. */
export function LegalPage({ title, subtitle, sections }: { title: string; subtitle: string; sections: LegalSection[] }) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="PureBloodMD home" className="text-lead"><Logo /></Link>
        <nav className="flex gap-4 text-body-sm text-muted-foreground">
          <Link href="/terms" className="py-3 hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="py-3 hover:text-foreground">Privacy</Link>
        </nav>
      </header>
      <BlurFade>
        <main className="pb-16 pt-4">
          <PageHeader title={title} subtitle={`${subtitle} Last updated ${LEGAL_UPDATED}.`} className="[&_h3]:mt-0" />
          <div className="grid gap-10 lg:grid-cols-[14rem_1fr]">
            <nav aria-label="Contents" className="hidden lg:block">
              <ol className="sticky top-6 space-y-2 text-body-sm text-muted-foreground">
                {sections.map((s) => (
                  <li key={s.id}><a href={`#${s.id}`} className="hover:text-foreground">{s.title}</a></li>
                ))}
              </ol>
            </nav>
            <article className="max-w-[65ch] space-y-10">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-m-20">
                  <h2 className="text-lead font-bold">{s.title}</h2>
                  <div className="mt-3 space-y-3 text-body text-muted-foreground">
                    {s.body.map((b, i) =>
                      Array.isArray(b) ? (
                        <ul key={i} className="list-disc space-y-1.5 pl-5">
                          {b.map((li) => <li key={li}>{li}</li>)}
                        </ul>
                      ) : (
                        <p key={i}>{b}</p>
                      )
                    )}
                  </div>
                </section>
              ))}
            </article>
          </div>
        </main>
      </BlurFade>
    </div>
  );
}
