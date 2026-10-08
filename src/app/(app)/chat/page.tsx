import { ChatCircleDots } from "@phosphor-icons/react/dist/ssr";

/** Desktop placeholder when no consult is open (phones show the inbox instead). */
export default function ChatIndex() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
      <ChatCircleDots className="size-10 text-muted-foreground" />
      <p className="mt-3 text-body-sm text-muted-foreground">Pick a consult to start resuscitation.</p>
    </div>
  );
}
