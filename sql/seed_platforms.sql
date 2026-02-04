-- ======================================== 
-- SEED PLATFORMS (Exemplo)
-- Rodar este script no Supabase SQL Editor para popular as plataformas iniciais
-- Certifique-se de estar logado ou ajustar o user_id se necessário (o RLS pode bloquear se não tiver UID na sessão ao rodar via API, mas no SQL Editor do dashboard funciona normal se tirar o user_id ou se o user for admin)
-- ========================================

INSERT INTO platforms (name, standard_fee_percent, color) 
VALUES 
  ('Shopee', 14.0, '#EA501F'),
  ('TikTok Shop', 10.0, '#FE2C55'),
  ('Mercado Livre', 16.0, '#FFE600'),
  ('WhatsApp', 0.0, '#25D366'),
  ('Instagram', 0.0, '#E1306C'),
  ('Site Próprio', 0.0, '#2563EB');
