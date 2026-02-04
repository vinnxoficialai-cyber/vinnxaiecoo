-- ========================================
-- ATUALIZAÇÃO PARA VARIAÇÕES DE PRODUTOS
-- ========================================

-- 1. Tabela de Variações de Produto
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Atualizar tabela de Vendas para incluir detalhes da variação (snapshot)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS variation_id UUID REFERENCES product_variations(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS size TEXT;
