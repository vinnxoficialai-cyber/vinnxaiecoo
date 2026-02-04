-- ==============================================================================
-- RESEED PLATFORMS (Recriar Plataformas Sumidas)
-- DESCRIÇÃO: Este script garante que as plataformas (Shopee, ML, etc) existam no banco.
-- Ele pega o primeiro usuário cadastrado e cria as plataformas para ele.
-- ==============================================================================

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- 1. Tenta pegar o ID do seu usuário (assumindo que seja o primeiro/único)
    SELECT id INTO target_user_id FROM auth.users ORDER BY created_at LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado em auth.users!';
    END IF;

    RAISE NOTICE 'Restaurando plataformas para o usuário: %', target_user_id;

    -- 2. Insere as plataformas se não existirem (ON CONFLICT DO NOTHING)
    -- Shopee
    INSERT INTO platforms (name, standard_fee_percent, standard_fixed_fee, color, user_id)
    VALUES ('Shopee', 14, 3.00, '#EA501F', target_user_id)
    ON CONFLICT (name, user_id) DO UPDATE SET standard_fee_percent = 14; 

    -- TikTok Shop
    INSERT INTO platforms (name, standard_fee_percent, standard_fixed_fee, color, user_id)
    VALUES ('TikTok Shop', 10, 0.00, '#FE2C55', target_user_id)
    ON CONFLICT (name, user_id) DO NOTHING;

    -- Mercado Livre
    INSERT INTO platforms (name, standard_fee_percent, standard_fixed_fee, color, user_id)
    VALUES ('Mercado Livre', 16, 0.00, '#FFE600', target_user_id)
    ON CONFLICT (name, user_id) DO NOTHING;

    -- WhatsApp
    INSERT INTO platforms (name, standard_fee_percent, standard_fixed_fee, color, user_id)
    VALUES ('WhatsApp', 0, 0.00, '#25D366', target_user_id)
    ON CONFLICT (name, user_id) DO NOTHING;

    -- Instagram
    INSERT INTO platforms (name, standard_fee_percent, standard_fixed_fee, color, user_id)
    VALUES ('Instagram', 0, 0.00, '#E1306C', target_user_id)
    ON CONFLICT (name, user_id) DO NOTHING;

END $$;

SELECT 'Plataformas restauradas! Atualize a página do App.' as status;
