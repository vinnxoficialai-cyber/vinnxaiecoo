-- =======================================================
-- CORREÇÃO FINAL (SUPER ADMIN)
-- Desabilita travas de segurança (RLS) para forçar a limpeza.
-- =======================================================

-- 1. Desabilita RLS (Permite editar tudo)
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE platforms DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    r RECORD;
    keeper_id UUID;
BEGIN
    -- Para cada plataforma duplicada
    FOR r IN 
        SELECT name, count(*) 
        FROM platforms 
        GROUP BY name 
        HAVING count(*) > 1
    LOOP
        -- Pega a ID da original (mais antiga)
        SELECT id INTO keeper_id 
        FROM platforms 
        WHERE name = r.name 
        ORDER BY created_at ASC 
        LIMIT 1;

        RAISE NOTICE 'Corrigindo: % (Mantendo ID: %)', r.name, keeper_id;

        -- FORÇA: Move todas as vendas das cópias para a original
        UPDATE sales 
        SET platform_id = keeper_id 
        WHERE platform_id IN (
            SELECT id FROM platforms WHERE name = r.name AND id != keeper_id
        );

        -- FORÇA: Apaga as cópias
        DELETE FROM platforms 
        WHERE name = r.name AND id != keeper_id;
    END LOOP;
END $$;

-- 2. Habilita RLS de volta (Segurança)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
