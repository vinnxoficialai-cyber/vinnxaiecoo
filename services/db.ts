import { Product, Platform, Sale, SaleWithDetails, Supplier, ProductWithDetails } from '../types';
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
      return [];
    }
    return data || [];
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

  addSale: async (sale: Omit<Sale, 'id' | 'profit_final'>): Promise<Sale | null> => {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('Usuário não autenticado');
      return null;
    }

    // 1. Insert Sale with user_id
    const { data: newSale, error: saleError } = await supabase
      .from('sales')
      .insert({ ...sale, user_id: userId })
      .select()
      .single();

    if (saleError) {
      console.error('Erro ao adicionar venda:', saleError);
      return null;
    }

    // 2. Decrease Stock (Mini-ERP Logic)
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

    return newSale;
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

  // ============ AGGREGATED QUERIES ============

  getProductsWithDetails: async (): Promise<ProductWithDetails[]> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        suppliers (name)
      `)
      .order('name');

    if (error) {
      console.error('Erro ao buscar produtos com detalhes:', error);
      return [];
    }

    return (data || []).map((p: any) => ({
      ...p,
      supplier_name: p.suppliers?.name || 'Fornecedor N/A'
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