-- ============================================================================
-- SCRIPT DE CORREÇÃO COMPLETA DO BANCO DE DADOS - VINNX MARKETPLACE
-- Rode este script no Supabase (SQL Editor) para garantir que tudo existe.
-- ============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Fornecedores (Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT
);

-- 3. Tabela de Produtos (Products)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  standard_cost NUMERIC NOT NULL DEFAULT 0,
  cost_box NUMERIC DEFAULT 0,
  cost_bag NUMERIC DEFAULT 0,
  cost_label NUMERIC DEFAULT 0,
  suggested_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  supplier_id UUID REFERENCES suppliers(id),
  image_url TEXT
);

-- 4. Tabela de Plataformas (Platforms) - Criação Básica
CREATE TABLE IF NOT EXISTS platforms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  standard_fee_percent NUMERIC DEFAULT 0,
  color TEXT DEFAULT '#64748B'
);

-- 5. Tabela de Variações de Produto (NOVA)
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Vendas (Sales)
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  platform_id UUID REFERENCES platforms(id) NOT NULL,
  cost_product_snapshot NUMERIC NOT NULL,
  cost_box NUMERIC DEFAULT 0,
  cost_bag NUMERIC DEFAULT 0,
  cost_label NUMERIC DEFAULT 0,
  cost_other NUMERIC DEFAULT 0,
  value_gross NUMERIC NOT NULL,
  value_received NUMERIC NOT NULL,
  profit_final NUMERIC GENERATED ALWAYS AS (
    value_received - (cost_product_snapshot + cost_box + cost_bag + cost_label + cost_other)
  ) STORED,
  date_sale TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT CHECK (status IN ('Pendente', 'Enviado', 'Entregue', 'Devolvido')) DEFAULT 'Pendente'
);

-- 7. ATUALIZAÇÃO (ALTER TABLE): Adicionar colunas de Variação na tabela de Vendas
-- Isso garante que as colunas existam mesmo se a tabela sales já existir
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

-- 8. RLS Policies (Segurança Básica)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;

-- Apaga políticas antigas para evitar duplicação/erro (Reset simples)
DROP POLICY IF EXISTS "Users can view own suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can insert own suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can update own suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can delete own suppliers" ON suppliers;

DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

DROP POLICY IF EXISTS "Users can view own product_variations" ON product_variations;
DROP POLICY IF EXISTS "Users can insert own product_variations" ON product_variations;
DROP POLICY IF EXISTS "Users can update own product_variations" ON product_variations;
DROP POLICY IF EXISTS "Users can delete own product_variations" ON product_variations;

DROP POLICY IF EXISTS "Users can view own platforms" ON platforms;
DROP POLICY IF EXISTS "Users can insert own platforms" ON platforms;
DROP POLICY IF EXISTS "Users can update own platforms" ON platforms;
DROP POLICY IF EXISTS "Users can delete own platforms" ON platforms;

DROP POLICY IF EXISTS "Users can view own sales" ON sales;
DROP POLICY IF EXISTS "Users can insert own sales" ON sales;
DROP POLICY IF EXISTS "Users can update own sales" ON sales;
DROP POLICY IF EXISTS "Users can delete own sales" ON sales;

-- Recria políticas (Assumindo que o usuário esteja logado via Supabase Auth)
CREATE POLICY "Users can view own suppliers" ON suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own suppliers" ON suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own suppliers" ON suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own suppliers" ON suppliers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own products" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own product_variations" ON product_variations FOR SELECT USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_variations.product_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can insert own product_variations" ON product_variations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can update own product_variations" ON product_variations FOR UPDATE USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_variations.product_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can delete own product_variations" ON product_variations FOR DELETE USING (EXISTS (SELECT 1 FROM products p WHERE p.id = product_variations.product_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can view own platforms" ON platforms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own platforms" ON platforms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own platforms" ON platforms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own platforms" ON platforms FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sales" ON sales FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sales" ON sales FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sales" ON sales FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sales" ON sales FOR DELETE USING (auth.uid() = user_id);

-- 9. POPULAR PLATAFORMAS PADRÃO (Apenas se tabela estiver vazia)
DO $$
DECLARE 
    current_uid UUID;
BEGIN
    SELECT auth.uid() INTO current_uid;
    
    -- Insere apenas se não existir nenhuma plataforma e se tiver usuário logado (opcional, pode remover o check de uid se rodar como admin)
    IF NOT EXISTS (SELECT 1 FROM platforms) THEN
        INSERT INTO platforms (name, standard_fee_percent, color, user_id) VALUES 
        ('Shopee', 14.0, '#EA501F', current_uid),
        ('TikTok Shop', 10.0, '#FE2C55', current_uid),
        ('Mercado Livre', 16.0, '#FFE600', current_uid),
        ('WhatsApp', 0.0, '#25D366', current_uid),
        ('Instagram', 0.0, '#E1306C', current_uid),
        ('Site Próprio', 0.0, '#2563EB', current_uid);
    END IF;
END $$;
