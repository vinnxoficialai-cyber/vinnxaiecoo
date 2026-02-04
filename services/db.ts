import { Product, Platform, Sale, SaleWithDetails, Supplier, ProductWithDetails, ProductVariation } from '../types';
import { supabase } from './supabaseClient';

// Helper para pegar o user_id atual
const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

export const db = {
  // ============ GET OPERATIONS ============

  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
    return data || [];
  },

  getPlatforms: async (): Promise<Platform[]> => {
    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .order('name');

    if (error) {
      console.error('Erro ao buscar plataformas:', error);
      // Return empty first to fallback below
    }

    // Fallback: If DB is empty, AUTO-SEED default platforms for this user
    if (!data || data.length === 0) {
      const userId = await getCurrentUserId();
      if (userId) {
        console.log('Sem plataformas encontradas. Criando padrões...');
        const defaultPlatforms = [
          { name: 'Shopee', standard_fee_percent: 14, color: '#EA501F', user_id: userId },
          { name: 'TikTok Shop', standard_fee_percent: 10, color: '#FE2C55', user_id: userId },
          { name: 'Mercado Livre', standard_fee_percent: 16, color: '#FFE600', user_id: userId },
          { name: 'WhatsApp', standard_fee_percent: 0, color: '#25D366', user_id: userId },
          { name: 'Instagram', standard_fee_percent: 0, color: '#E1306C', user_id: userId }
        ];

        const { data: newPlatforms, error: insertError } = await supabase
          .from('platforms')
          .upsert(defaultPlatforms, { onConflict: 'name, user_id' })
          .select();

        if (insertError) {
          console.error("Erro ao criar plataformas automáticas:", insertError);
        }

        if (newPlatforms) {
          return newPlatforms;
        }
      }
      // If auth fails or insert fails, return empty to avoid Fake ID errors
      return [];
    }
    return data;
  },

  getSales: async (): Promise<Sale[]> => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date_sale', { ascending: false });

    if (error) {
      console.error('Erro ao buscar vendas:', error);
      return [];
    }
    return data || [];
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Erro ao buscar fornecedores:', error);
      return [];
    }
    return data || [];
  },

  // ============ ADD OPERATIONS ============

  addSale: async (sale: Omit<Sale, 'id' | 'profit_final'>): Promise<{ data: Sale | null; error: string | null }> => {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('Usuário não autenticado');
      return { data: null, error: 'Usuário não autenticado' };
    }

    // Calculate Profit Final manually since it's not generated
    const totalCost = Number(sale.cost_product_snapshot || 0) +
      Number(sale.cost_box || 0) +
      Number(sale.cost_bag || 0) +
      Number(sale.cost_label || 0) +
      Number(sale.cost_other || 0);

    const profitFinal = Number(sale.value_received || 0) - totalCost;

    // 1. Insert Sale with user_id & profit_final
    const { data: newSale, error: saleError } = await supabase
      .from('sales')
      .insert({ ...sale, user_id: userId, profit_final: profitFinal })
      .select()
      .single();

    if (saleError) {
      console.error('Erro ao adicionar venda:', saleError);
      return { data: null, error: saleError.message || JSON.stringify(saleError) };
    }

    // 2. Decrease Stock (Mini-ERP Logic)
    if (sale.variation_id) {
      // Decrease VARIATION stock
      const { data: variation } = await supabase
        .from('product_variations')
        .select('stock_quantity')
        .eq('id', sale.variation_id)
        .single();

      if (variation) {
        await supabase
          .from('product_variations')
          .update({ stock_quantity: Math.max(0, variation.stock_quantity - 1) })
          .eq('id', sale.variation_id);
      }
    }

    // ALWAYS decrease MAIN PRODUCT stock (as a total cache)
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', sale.product_id)
      .single();

    if (product) {
      await supabase
        .from('products')
        .update({ stock_quantity: Math.max(0, product.stock_quantity - 1) })
        .eq('id', sale.product_id);
    }

    return { data: newSale, error: null };
  },

  deleteSale: async (saleId: string): Promise<{ success: boolean; error: string | null }> => {
    // 1. Get Sale Details to Restore Stock
    const { data: sale, error: fetchError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single();

    if (fetchError || !sale) {
      return { success: false, error: 'Venda não encontrada.' };
    }

    // 2. Restore Stock (Variation)
    if (sale.variation_id) {
      const { data: variation } = await supabase
        .from('product_variations')
        .select('stock_quantity')
        .eq('id', sale.variation_id)
        .single();

      if (variation) {
        await supabase
          .from('product_variations')
          .update({ stock_quantity: variation.stock_quantity + 1 })
          .eq('id', sale.variation_id);
      }
    }

    // 3. Restore Stock (Product)
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', sale.product_id)
      .single();

    if (product) {
      await supabase
        .from('products')
        .update({ stock_quantity: product.stock_quantity + 1 })
        .eq('id', sale.product_id);
    }

    // 4. Delete Sale
    const { error: deleteError } = await supabase
      .from('sales')
      .delete()
      .eq('id', saleId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true, error: null };
  },



  addSupplier: async (supplier: Omit<Supplier, 'id'>): Promise<Supplier | null> => {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('Usuário não autenticado');
      return null;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...supplier, user_id: userId })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar fornecedor:', error);
      return null;
    }
    return data;
  },

  addNewProduct: async (product: Omit<Product, 'id'>): Promise<Product | null> => {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('Usuário não autenticado');
      return null;
    }

    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, user_id: userId })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar produto:', error);
      return null;
    }
    return data;
  },

  addPlatform: async (platform: Omit<Platform, 'id'>): Promise<Platform | null> => {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('Usuário não autenticado');
      return null;
    }

    const { data, error } = await supabase
      .from('platforms')
      .insert({ ...platform, user_id: userId })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar plataforma:', error);
      return null;
    }
    return data;
  },

  // ============ UPDATE OPERATIONS ============

  updateProductStock: async (productId: string, newQuantity: number): Promise<void> => {
    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', productId);

    if (error) {
      console.error('Erro ao atualizar estoque:', error);
    }
  },

  updateProduct: async (product: Product): Promise<void> => {
    const { error } = await supabase
      .from('products')
      .update(product)
      .eq('id', product.id);

    if (error) {
      console.error('Erro ao atualizar produto:', error);
    }
  },

  updateSupplier: async (supplier: Supplier): Promise<void> => {
    const { error } = await supabase
      .from('suppliers')
      .update(supplier)
      .eq('id', supplier.id);

    if (error) {
      console.error('Erro ao atualizar fornecedor:', error);
    }
  },

  deleteSupplier: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar fornecedor:', error);
    }
  },

  deleteProduct: async (productId: string): Promise<void> => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Erro ao deletar produto:', error);
    }
  },

  // ============ VARIATIONS ============

  getProductVariations: async (productId: string): Promise<ProductVariation[]> => {
    const { data, error } = await supabase
      .from('product_variations')
      .select('*')
      .eq('product_id', productId);

    if (error) {
      console.error('Erro ao buscar variações:', error);
      return [];
    }
    return data || [];
  },

  addVariation: async (variation: Omit<ProductVariation, 'id' | 'created_at'>): Promise<ProductVariation | null> => {
    const { data, error } = await supabase
      .from('product_variations')
      .insert(variation)
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar variação:', error);
      return null;
    }
    return data;
  },

  deleteVariation: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('product_variations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar variação:', error);
    }
  },

  // ============ AGGREGATED QUERIES ============

  getProductsWithDetails: async (): Promise<ProductWithDetails[]> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        suppliers (name),
        product_variations (*)
      `)
      .order('name');

    if (error) {
      console.error('Erro ao buscar produtos com detalhes:', error);
      return [];
    }

    return (data || []).map((p: any) => ({
      ...p,
      supplier_name: p.suppliers?.name || 'Fornecedor N/A',
      variations: p.product_variations || [] // Join returns array
    }));
  },

  getSalesWithDetails: async (): Promise<SaleWithDetails[]> => {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        products (name),
        platforms (name, color)
      `)
      .order('date_sale', { ascending: false });

    if (error) {
      console.error('Erro ao buscar vendas com detalhes:', error);
      return [];
    }

    return (data || []).map((sale: any) => ({
      ...sale,
      product_name: sale.products?.name || 'Desconhecido',
      platform_name: sale.platforms?.name || 'Desconhecido',
      platform_color: sale.platforms?.color || '#ccc'
    }));
  }
};