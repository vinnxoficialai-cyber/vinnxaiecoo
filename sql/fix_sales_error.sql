-- =======================================================
-- CORREÇÃO DE ERRO: "Erro ao salvar venda"
-- Rode isto no Supabase para adicionar as colunas que faltam
-- =======================================================

-- 1. Adiciona coluna para saber QUAL variação foi vendida (ID)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES product_variations(id);

-- 2. Adiciona colunas para registrar Cor e Tamanho na venda (Histórico)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS size TEXT;

-- 3. Garante permissão para salvar (RLS)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own sales" ON sales;
CREATE POLICY "Users can insert own sales" ON sales FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Garante permissão para atualizar variações (Baixa de estoque)
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can update own product_variations" ON product_variations;
CREATE POLICY "Users can update own product_variations" ON product_variations FOR UPDATE USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_variations.product_id AND p.user_id = auth.uid()));
