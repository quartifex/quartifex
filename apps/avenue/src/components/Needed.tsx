// A fact only Nitesh can supply, written as [[NEEDED: ...]] in the content files. The page
// shows "To be confirmed" (and what is missing, for screen readers and on hover) instead of
// inventing a value; when the placeholder is replaced with the real fact, the fact shows.
import { NEEDED } from "@/content/site";

export function Needed({ value }: { value: string }) {
  const match = value.match(NEEDED);
  if (!match) return <>{value}</>;
  return (
    <span className="needed" title={`To be confirmed: ${match[1]}`}>
      To be confirmed<span className="sr-only">: {match[1]}</span>
    </span>
  );
}
