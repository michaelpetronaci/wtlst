-- Run only after this operator has verified their email. Grants no access to anyone else.
do $$
declare operator_id uuid;
begin
 select id into operator_id from auth.users where lower(email)='michael@theideaconsultancy.com' and email_confirmed_at is not null;
 if operator_id is null then raise exception 'Operator must verify their email first'; end if;
 insert into private.admins(user_id) values(operator_id) on conflict do nothing;
end $$;
