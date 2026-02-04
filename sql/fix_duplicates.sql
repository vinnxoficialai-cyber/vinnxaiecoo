-- =======================================================
-- CORREÇÃO: REMOVER PLATAFORMAS DUPLICADAS
-- Rode isto no Supabase para deixar apenas uma de cada.
-- =======================================================

DELETE FROM platforms a USING platforms b
WHERE a.id < b.id AND a.name = b.name;

-- Opcional: Adicionar restrição para evitar que aconteça de novo
ALTER TABLE platforms ADD CONSTRAINT unique_platform_name_user UNIQUE (name, user_id);
