import { LogoMark } from "@/components/logo";

/**
 * The drug-leaflet section. Reads like a package insert on purpose: mono
 * headings, dense two-column body, one bordered sheet.
 */
export function PackageInsert({ dailySwipes, vipEnabled }: { dailySwipes: number; vipEnabled: boolean }) {
  const rows = [
    { k: "Composition", v: "Each match contains two licensed doctors (or koas). Zero MBAs. Zero tech bros." },
    { k: "Indications", v: "Chronic singleness in medical professionals. Acute post-call loneliness. Mothers asking \"when?\" every Lebaran." },
    {
      k: "Dosage",
      v: vipEnabled
        ? `${dailySwipes} swipes a day, unlimited with VIP. One Super Like a day, five with VIP. Do not exceed one crush per ward.`
        : `${dailySwipes} swipes every 24 hours, one Super Like a day. Do not exceed one crush per ward.`,
    },
    { k: "Contraindications", v: "Anyone who says \"I'm basically a doctor, I've watched all of House.\" Non-doctors in general. Sorry." },
    { k: "Side effects", v: "Dinner talk about bowel obstruction. A shared on-call calendar. Children with 100% illegible handwriting. A wedding where half the guests get paged." },
    { k: "Interactions", v: "May interact with night shifts. Effect strongly potentiated by kopi susu." },
    { k: "Storage", v: "Keep your matches away from your ex. Store below 37°C. Do not refrigerate your feelings." },
    { k: "Manufacturer", v: "Two doctors who should have been sleeping. A parody, not medical advice." },
  ];

  return (
    <article className="rounded-xl border bg-card p-6 shadow-sm sm:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <LogoMark className="size-12" />
          <div>
            <p className="text-h5 font-extrabold">PureBloodMD</p>
            <p className="font-mono text-body-sm text-muted-foreground">swipes, oral. For doctors only.</p>
          </div>
        </div>
        <p className="font-mono text-caption text-muted-foreground">Rx only. Read the leaflet before use.</p>
      </header>
      <dl className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.k}>
            <dt className="font-mono text-caption font-semibold uppercase tracking-wider text-primary">{r.k}</dt>
            <dd className="mt-1.5 text-body-sm">{r.v}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
