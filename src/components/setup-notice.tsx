import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Shown when NEXT_PUBLIC_SUPABASE_* env vars are missing. */
export function SetupNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase is not connected yet</CardTitle>
        <CardDescription>
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the dev server.
          The steps are in README.md.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
