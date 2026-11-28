-- The product is now Radmatic. A name too short to make a referral code
-- falls back to the brand name, so the fallback follows the new name.
create or replace function referral_code_base(full_name text) returns text
language plpgsql immutable as $$
declare
  words text[] := regexp_split_to_array(trim(coalesce(full_name, '')), '\s+');
  word text := coalesce(words[1], '');
begin
  if upper(regexp_replace(word, '[^A-Za-z]', '', 'g')) in ('DR', 'DOCTOR') and array_length(words, 1) > 1 then
    word := words[2];
  end if;
  word := left(upper(regexp_replace(word, '[^A-Za-z0-9]', '', 'g')), 12);
  if length(word) < 2 then
    word := 'RADMATIC';
  end if;
  return word;
end;
$$;
