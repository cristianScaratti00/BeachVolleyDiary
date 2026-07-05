-- Le funzioni-trigger hanno il grant EXECUTE di default su PUBLIC: va revocato lì
-- (revocarlo solo da anon/authenticated non basta). I trigger continuano a funzionare
-- perché eseguono con i privilegi del proprietario, non del chiamante.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.enforce_profile_privileges() from public;
