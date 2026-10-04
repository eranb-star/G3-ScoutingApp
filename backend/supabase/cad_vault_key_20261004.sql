-- Generate the encryption key inside Vault; never print it in SQL results.
begin;
do $$ begin
 if not exists(select 1 from vault.secrets where name='g3_cad_envelope_key_v1') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'base64'),'g3_cad_envelope_key_v1','CAD OAuth envelope encryption; retain while connections exist');
 end if;
end $$;
create or replace function public.cad_envelope_key() returns text
language sql security definer set search_path=pg_catalog as $$
 select decrypted_secret from vault.decrypted_secrets where name='g3_cad_envelope_key_v1'
$$;
revoke all on function public.cad_envelope_key() from public,anon,authenticated;
grant execute on function public.cad_envelope_key() to service_role;
commit;
