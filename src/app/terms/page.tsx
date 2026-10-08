import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { TERMS } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      subtitle="The rules for using PureBloodMD. Please read them; by creating an account you agree to them."
      sections={TERMS}
    />
  );
}
