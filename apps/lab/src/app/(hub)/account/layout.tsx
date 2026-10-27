import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AccountTabs } from "@/components/account/AccountTabs";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Account" };

export default async function AccountLayout({ children }: { children: ReactNode }) {
  if (!(await getSession())) redirect("/login?next=/account/profile");
  return (
    <>
      <AccountTabs />
      {children}
    </>
  );
}
