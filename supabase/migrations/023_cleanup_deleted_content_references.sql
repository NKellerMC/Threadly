create or replace function public.cleanup_thread_polymorphic_refs()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  delete from public.reposts where target_type='thread' and target_id=old.id::text;
  delete from public.collection_items where target_type='thread' and target_id=old.id::text;
  delete from public.collaborations where target_type='thread' and target_id=old.id::text;
  delete from public.prompt_entries where target_type='thread' and target_id=old.id::text;
  delete from public.profile_pins where target_type='thread' and target_id=old.id::text;
  return old;
end;$$;

create or replace function public.cleanup_video_polymorphic_refs()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  delete from public.reposts where target_type='video' and target_id=old.id::text;
  delete from public.collection_items where target_type='video' and target_id=old.id::text;
  delete from public.collaborations where target_type='video' and target_id=old.id::text;
  delete from public.prompt_entries where target_type='video' and target_id=old.id::text;
  delete from public.profile_pins where target_type='video' and target_id=old.id::text;
  return old;
end;$$;

drop trigger if exists cleanup_thread_polymorphic_refs_trigger on public.threads;
create trigger cleanup_thread_polymorphic_refs_trigger before delete on public.threads for each row execute function public.cleanup_thread_polymorphic_refs();
drop trigger if exists cleanup_video_polymorphic_refs_trigger on public.videos;
create trigger cleanup_video_polymorphic_refs_trigger before delete on public.videos for each row execute function public.cleanup_video_polymorphic_refs();

revoke all on function public.cleanup_thread_polymorphic_refs() from public,anon,authenticated;
revoke all on function public.cleanup_video_polymorphic_refs() from public,anon,authenticated;

create index if not exists reposts_target_idx on public.reposts(target_type,target_id);
create index if not exists collection_items_target_idx on public.collection_items(target_type,target_id);
create index if not exists collaborations_target_idx on public.collaborations(target_type,target_id);
create index if not exists prompt_entries_target_idx on public.prompt_entries(target_type,target_id);
create index if not exists profile_pins_target_idx on public.profile_pins(target_type,target_id);
