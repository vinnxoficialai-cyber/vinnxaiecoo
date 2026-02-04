-- ========================================
-- SUPABASE SCHEMA - Loja Marketplace Vinnx
-- Apenas estrutura, sem dados de exemplo
-- ========================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. Tabela de Fornecedores
-- ========================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT
);

-- ========================================
-- 2. Tabela de Produtos
-- ========================================
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

-- ========================================
-- 3. Tabela de Plataformas
-- ========================================
CREATE TABLE IF NOT EXISTS platforms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  standard_fee_percent NUMERIC DEFAULT 0,
  color TEXT DEFAULT '#64748B'
);

-- ========================================
-- 4. Tabela de Vendas
-- ========================================
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

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuário só vê seus próprios dados
-- ========================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Políticas de Suppliers
CREATE POLICY "Users can view own suppliers" ON suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own suppliers" ON suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own suppliers" ON suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own suppliers" ON suppliers FOR DELETE USING (auth.uid() = user_id);

-- Políticas de Products
CREATE POLICY "Users can view own products" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (auth.uid() = user_id);

-- Políticas de Platforms
CREATE POLICY "Users can view own platforms" ON platforms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own platforms" ON platforms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own platforms" ON platforms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own platforms" ON platforms FOR DELETE USING (auth.uid() = user_id);

-- Políticas de Sales
CREATE POLICY "Users can view own sales" ON sales FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sales" ON sales FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sales" ON sales FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sales" ON sales FOR DELETE USING (auth.uid() = user_id);