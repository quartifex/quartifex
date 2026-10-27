import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "soft" | "ghost";
type Size = "sm" | "md" | "lg";

type Common = {
  variant?: Variant | undefined;
  size?: Size | undefined;
  /** The main call to action: a slow rotating edge. One per screen. */
  cta?: boolean | undefined;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string | undefined;
};

type AsButton = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & { href?: undefined };
type AsLink = Common &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof Common> & { href: string };

function classes({ variant, size, cta, icon, children, className }: Common): string {
  const iconOnly = icon !== undefined && children === undefined;
  return [
    "btn",
    variant && variant !== "primary" ? variant : "",
    size && size !== "md" ? size : "",
    cta ? "cta" : "",
    iconOnly ? "icon" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The kit's button. Depth look, a fill that grows from where the pointer enters (PointerFx
 * sets the origin), a light that follows the pointer, a spring on press.
 */
export function Button(props: AsButton | AsLink) {
  const { variant, size, cta, icon, children, className, ...rest } = props;
  const label =
    children === undefined ? null : (
      <span className="lbl">
        <span>{children}</span>
      </span>
    );
  const cls = classes({ variant, size, cta, icon, children, className });
  if ("href" in rest && rest.href !== undefined) {
    if (rest.href.startsWith("/")) {
      const { href, ...anchor } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & {
        href: string;
      };
      return (
        <Link {...(anchor as object)} href={href} className={cls} data-fx="">
          {label}
          {icon}
        </Link>
      );
    }
    return (
      <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={cls} data-fx="">
        {label}
        {icon}
      </a>
    );
  }
  return (
    <button
      type="button"
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      className={cls}
      data-fx=""
    >
      {label}
      {icon}
    </button>
  );
}
