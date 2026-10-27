import { type IconName, iconSvg } from "@/lib/icons";

/** Kit icon. The markup is a static string from our own icon set, never user input. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <span
      className={className ? `ico i-${name} ${className}` : `ico i-${name}`}
      data-i={name}
      aria-hidden="true"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static SVG from the bundled icon set
      dangerouslySetInnerHTML={{ __html: iconSvg(name) }}
    />
  );
}
