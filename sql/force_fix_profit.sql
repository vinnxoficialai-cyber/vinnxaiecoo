-- ==============================================================================
-- FORCE FIX PROFIT (Reset Total da Coluna)
-- DESCRIÇÃO: O script anterior pode ter falhado se a coluna tinha dependências.
-- Este script APAGA a coluna profit_final e cria de novo do zero.
-- ==============================================================================

ALTER TABLE sales DISABLE ROW LEVEL SECURITY;

-- 1. Remove a coluna problemática de vez (DROP CASCADE)
ALTER TABLE sales DROP COLUMN IF EXISTS profit_final CASCADE;

-- 2. Recria a coluna limpa (sem travas de "Generated Always")
ALTER TABLE sales ADD COLUMN profit_final NUMERIC(10,2) DEFAULT 0.00;

-- 3. Tenta recalcular o lucro das vendas antigas para não ficarem zeradas
-- Lógica: Recebido - Custo Produto (snapshot)
UPDATE sales 
SET profit_final = COALESCE(value_received, 0) - COALESCE(cost_product_snapshot, 0);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

SELECT 'Coluna recriada com sucesso! Tente salvar a venda agora.' as status;
