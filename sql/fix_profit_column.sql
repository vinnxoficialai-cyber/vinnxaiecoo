-- ==============================================================================
-- FIX PROFIT COLUMN (Permitir cálculo pelo App)
-- DESCRIÇÃO: Este erro ocorre porque o banco está com 'profit_final' como coluna calculada (Gerada),
-- mas agora queremos salvar o lucro calculado pelo App (que inclui custos de caixinha, etc).
-- Este script transforma a coluna em uma coluna comum/editável.
-- ==============================================================================

-- 1. Desabilitar segurança para garantir a alteração
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;

-- 2. Renomear a coluna gerada atual (Backup)
DO $$
BEGIN
    -- Tenta renomear apenas se ela existir. Se der erro (ex: já renomeada), ignoramos.
    BEGIN
        ALTER TABLE sales RENAME COLUMN profit_final TO profit_final_generated_backup;
    EXCEPTION
        WHEN undefined_column THEN
            RAISE NOTICE 'Coluna profit_final não encontrada para renomear, ou já processada.';
        WHEN OTHERS THEN
            RAISE NOTICE 'Nota: %', SQLERRM;
    END;
END $$;

-- 3. Criar a nova coluna 'profit_final' como Numérica Comum (Editável)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS profit_final NUMERIC(10,2);

-- 4. Copiar os dados do backup para a nova (para não perder histórico)
DO $$
BEGIN
    -- Verifica se a coluna de backup existe antes de tentar copiar
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'profit_final_generated_backup') THEN
        UPDATE sales 
        SET profit_final = profit_final_generated_backup 
        WHERE profit_final IS NULL;
    END IF;
END $$;

-- 5. Reabilitar segurança
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Confirmação
SELECT 'Coluna profit_final corrigida com sucesso!' as status;
