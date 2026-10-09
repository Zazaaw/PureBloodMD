import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { Select } from "@/components/form/field";
import { countryName } from "@/lib/constants";

/**
 * Country control driven by app_config.active_countries. While only one country
 * is open (launch: Indonesia), it renders as a locked field that still submits.
 */
export function CountrySelect({
  id,
  countries,
  defaultValue,
}: {
  id: string;
  countries: string[];
  defaultValue?: string | null;
}) {
  const value = defaultValue && countries.includes(defaultValue) ? defaultValue : countries[0] ?? "ID";
  if (countries.length <= 1) {
    return (
      <>
        <input type="hidden" name="country" value={value} />
        <div
          id={id}
          aria-readonly="true"
          className="flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm"
        >
          {countryName(value)}
          <LockSimple className="size-4 text-muted-foreground" aria-label="Only country during launch" />
        </div>
      </>
    );
  }
  return (
    <Select id={id} name="country" defaultValue={value} autoComplete="country">
      {countries.map((c) => (
        <option key={c} value={c}>{countryName(c)}</option>
      ))}
    </Select>
  );
}
