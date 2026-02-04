-- ==============================================================================
-- MASTER RESTORE SCRIPT (CORREÇÃO TOTAL)
-- Corrige Colunas, Duplicatas, Permissões e Taxas.
-- ==============================================================================

-- 1. DESABILITAR SEGURANÇA TEMPORARIAMENTE (Para permitir correções profundas)
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE platforms DISABLE ROW LEVEL SECURITY;

-- 2. GARANTIR COLUNAS FALTANTES NA TABELA SALES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'variation_id') THEN
        ALTER TABLE sales ADD COLUMN variation_id UUID REFERENCES product_variations(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'color') THEN
        ALTER TABLE sales ADD COLUMN color TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'size') THEN
        ALTER TABLE sales ADD COLUMN size TEXT;
    END IF;
END $$;

-- 3. CORREÇÃO DE DUPLICATAS DE PLATAFORMAS (Lógica Inteligente)
DO $$
DECLARE
    r RECORD;
    keeper_id UUID;
BEGIN
    FOR r IN 
        SELECT name, count(*) 
        FROM platforms 
        GROUP BY name 
        HAVING count(*) > 1
    LOOP
        -- Identifica a plataforma ORIGINAL (a mais antiga)
        SELECT id INTO keeper_id FROM platforms WHERE name = r.name ORDER BY created_at ASC LIMIT 1;
        
        RAISE NOTICE 'Corrigindo duplicidade: % (ID Oficial: %)', r.name, keeper_id;

        -- Move vendas órfãs para a oficial
        UPDATE sales SET platform_id = keeper_id 
        WHERE platform_id IN (SELECT id FROM platforms WHERE name = r.name AND id != keeper_id);

        -- Apaga as cópias
        DELETE FROM platforms WHERE name = r.name AND id != keeper_id;
    END LOOP;
END $$;

-- 4. ADICIONAR CONSTRAINT PARA EVITAR NOVAS DUPLICATAS
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS unique_platform_name_user;
ALTER TABLE platforms ADD CONSTRAINT unique_platform_name_user UNIQUE (name, user_id);

-- 5. POPULAR PLATAFORMAS PADRÃO (Se não existirem) E ATUALIZAR TAXAS
DO $$
DECLARE
    curr_user_id UUID;
BEGIN
    -- Pega um usuário existente (ou o atual se rodado via app, mas aqui é SQL direto)
    -- Tenta pegar o primeiro usuário da tabela platforms para usar de referência, ou auth.uid() se disponível contextualmente
    -- Nota: Em scripts SQL puros rodados no dashboard, auth.uid() pode ser nulo. Vamos tentar atualizar as existentes.
    
    -- Atualiza TAXAS Padrão das plataformas existentes
    UPDATE platforms SET standard_fee_percent = 14 WHERE name = 'Shopee';
    UPDATE platforms SET standard_fee_percent = 10 WHERE name = 'TikTok Shop';
    UPDATE platforms SET standard_fee_percent = 16 WHERE name = 'Mercado Livre';
    UPDATE platforms SET standard_fee_percent = 0 WHERE name = 'WhatsApp';
    UPDATE platforms SET standard_fee_percent = 0 WHERE name = 'Instagram';
    UPDATE platforms SET standard_fee_percent = 0 WHERE name = 'Site Próprio';
END $$;

-- 6. REABILITAR SEGURANÇA
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

-- 7. GARANTIR POLÍTICAS DE ACESSO (CRUD)
DROP POLICY IF EXISTS "Users can manage their own platforms" ON platforms;
CREATE POLICY "Users can manage their own platforms" ON platforms USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
CREATE POLICY "Users can manage their own sales" ON sales USING (auth.uid() = user_id);
