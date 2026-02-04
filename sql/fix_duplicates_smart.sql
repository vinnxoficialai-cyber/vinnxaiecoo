-- =======================================================
-- CORREÇÃO INTELIGENTE: REMOVER DUPLICADAS COM VENDAS
-- Este script move as vendas para a plataforma 'oficial' antes de apagar.
-- =======================================================

DO $$
DECLARE
    r RECORD;
    keeper_id UUID;
BEGIN
    -- Para cada nome de plataforma duplicado
    FOR r IN 
        SELECT name, count(*) 
        FROM platforms 
        GROUP BY name 
        HAVING count(*) > 1
    LOOP
        -- 1. Escolhe a plataforma "oficial" (a mais antiga)
        SELECT id INTO keeper_id 
        FROM platforms 
        WHERE name = r.name 
        ORDER BY created_at ASC 
        LIMIT 1;

        -- 2. Atualiza TODAS as vendas que usam as duplicatas para usar a "oficial"
        UPDATE sales 
        SET platform_id = keeper_id 
        WHERE platform_id IN (
            SELECT id FROM platforms WHERE name = r.name AND id != keeper_id
        );

        -- 3. Agora sim, apaga as duplicatas (que não têm mais vendas presas)
        DELETE FROM platforms 
        WHERE name = r.name AND id != keeper_id;
        
        RAISE NOTICE 'Plataforma corrigida: % (ID Mantido: %)', r.name, keeper_id;
    END LOOP;
END $$;

-- 4. Trava para não deixar acontecer de novo
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS unique_platform_name_user;
ALTER TABLE platforms ADD CONSTRAINT unique_platform_name_user UNIQUE (name, user_id);
