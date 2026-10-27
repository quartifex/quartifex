-- Self-service account deletion for Quartifex Lab.
-- Run once in the Supabase SQL editor (project quartifex-lab). Safe to re-run.
-- Deletes the signed-in user's tickets, messages, collections, favourites, profile and auth user.
-- Avatar files in the "avatars" bucket are not removed by this function.

create or replace function public.lab_delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from public.ticket_messages
    where author_id = uid
       or ticket_id in (select id from public.tickets where user_id = uid);
  delete from public.tickets where user_id = uid;
  delete from public.collection_items
    where collection_id in (select id from public.collections where user_id = uid);
  delete from public.collections where user_id = uid;
  delete from public.favorites where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.lab_delete_my_account() from public, anon;
grant execute on function public.lab_delete_my_account() to authenticated;
