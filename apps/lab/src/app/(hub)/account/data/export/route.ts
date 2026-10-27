import { NextResponse } from "next/server";
import { createClient, getSession } from "@/lib/supabase/server";

// A JSON copy of everything we hold for the signed-in user. Row-level security scopes each query.
export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const supabase = await createClient();
  const [favorites, collections, collectionItems, tickets, messages] = await Promise.all([
    supabase.from("favorites").select("*"),
    supabase.from("collections").select("*"),
    supabase.from("collection_items").select("*"),
    supabase.from("tickets").select("*"),
    supabase.from("ticket_messages").select("*"),
  ]);
  const body = {
    exported_at: new Date().toISOString(),
    account: {
      id: session.user.id,
      email: session.user.email,
      created_at: session.user.created_at,
    },
    profile: session.profile,
    favorites: favorites.data ?? [],
    collections: collections.data ?? [],
    collection_items: collectionItems.data ?? [],
    tickets: tickets.data ?? [],
    ticket_messages: messages.data ?? [],
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="quartifex-lab-data.json"',
      "cache-control": "no-store",
    },
  });
}
