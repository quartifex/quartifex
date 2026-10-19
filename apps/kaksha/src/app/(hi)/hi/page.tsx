import { redirect } from "next/navigation";

// The product page is English only (the app itself keeps Hindi). next.config.ts
// redirects /hi as well; this covers any route that reaches the page directly.
export default function HindiHome() {
  redirect("/");
}
