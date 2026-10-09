import { CheckCircle, XCircle } from "@phosphor-icons/react/dist/ssr";

const ROWS = [
  { when: "Your pager goes off at 2 AM", civilian: "Who is texting you at 2 AM?", colleague: "Go. I'll keep the nasi goreng warm." },
  { when: "Dinner conversation", civilian: "Can we please not talk about pus while eating?", colleague: "Wait, how big was the abscess?" },
  { when: "Your schedule", civilian: "You're on call AGAIN?", colleague: "Same. Let's swap shifts and sync calendars." },
  { when: "Your handwriting", civilian: "I can't read this note.", colleague: "Clearly says \"love you\". Obviously." },
  { when: "Meeting the parents", civilian: "So when will they get a real job?", colleague: "A doctor? Book the gedung." },
];

/** Two columns of the same five moments: the civilian reply, then the colleague one. */
export function CivilianVsColleague() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-xl border bg-muted/40 p-6">
        <p className="flex items-center gap-2 text-lead font-semibold text-muted-foreground">
          <XCircle weight="fill" className="size-6" /> Dating a civilian
        </p>
        <ul className="mt-6 grid gap-5">
          {ROWS.map((r) => (
            <li key={r.when}>
              <p className="text-caption text-muted-foreground">{r.when}</p>
              <p className="mt-1 text-body text-muted-foreground line-through decoration-muted-foreground/40">{r.civilian}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
        <p className="flex items-center gap-2 text-lead font-semibold">
          <CheckCircle weight="fill" className="size-6 text-primary" /> Dating a colleague
        </p>
        <ul className="mt-6 grid gap-5">
          {ROWS.map((r) => (
            <li key={r.when}>
              <p className="text-caption text-muted-foreground">{r.when}</p>
              <p className="mt-1 text-body font-medium">{r.colleague}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
