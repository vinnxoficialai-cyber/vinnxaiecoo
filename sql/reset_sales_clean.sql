-- ============================================================================
-- SCRIPT DE LIMPEZA (RESET) PARA DADOS REAIS
-- Rode isto no Supabase para limpar vendas de teste e zerar estoque.
-- ============================================================================

-- 1. Apagar todo o histórico de vendas (Remove dados falsos/testes do Dashboard)
TRUNCATE TABLE sales CASCADE;

-- 2. Zerar estoque de todos os produtos (Para começar contagem real)
UPDATE products SET stock_quantity = 0;

-- 3. Zerar estoque de todas as variações
UPDATE product_variations SET stock_quantity = 0;

-- NOTA: Seus cadastros de Produtos, Fornecedores e Plataformas SERÃO MANTIDOS.
-- Apenas os números (vendas e quantidades) serão resetados.
