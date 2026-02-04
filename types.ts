export interface SupplierProduct {
  model: string;
  price: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  catalog?: SupplierProduct[];
}

export interface Product {
  id: string;
  name: string;
  standard_cost: number; // Custo do Tênis

  // Despesas Detalhadas
  cost_box: number;      // Caixinha
  cost_bag: number;      // Saquinho
  cost_label: number;    // Etiqueta

  suggested_price?: number;
  image_url?: string;
  stock_quantity: number;
  min_stock_level: number;
  supplier_id?: string;
  variations?: ProductVariation[];
}

export interface ProductVariation {
  id: string;
  product_id: string;
  color: string;
  size: string;
  stock_quantity: number;
}

// For UI Visualization (Product list with Supplier name)
export interface ProductWithDetails extends Product {
  supplier_name: string;
}

export interface Platform {
  id: string;
  name: string;
  standard_fee_percent?: number;
  color: string;
}

export type SaleStatus = 'Pendente' | 'Enviado' | 'Entregue' | 'Devolvido';

export interface Sale {
  id: string;
  product_id: string;
  platform_id: string;

  // Custos no momento da venda
  cost_product_snapshot: number;
  cost_box: number;
  cost_bag: number;
  cost_label: number;
  cost_other: number; // Extra field for unforeseen costs

  variation_id?: string;
  color?: string;
  size?: string;

  value_gross: number;
  value_received: number;
  profit_final: number;
  date_sale: string;
  status: SaleStatus;
}

// For UI Visualization
export interface SaleWithDetails extends Sale {
  product_name: string;
  platform_name: string;
  platform_color: string;
}

export interface DashboardStats {
  totalProfit: number;
  totalRevenue: number;
  totalSales: number;
  averageMargin: number;
  lowStockCount: number;
}