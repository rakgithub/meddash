-- Generated columns only accept IMMUTABLE functions. array_to_string is STABLE because it is
-- generic over element types, but for text[] its output never changes, so this wrapper is safe.
CREATE FUNCTION "text_array_to_string"(text[]) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT array_to_string($1, ' ') $$;
