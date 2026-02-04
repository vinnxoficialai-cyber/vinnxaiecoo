import { Product, Platform, Sale, Supplier } from '../types';

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

// Mantemos as plataformas pois são configurações necessárias para o sistema funcionar
export const INITIAL_PLATFORMS: Platform[] = [
  { id: 'pl1', name: 'Shopee', standard_fee_percent: 14, color: '#EA501F' },
  { id: 'pl2', name: 'TikTok Shop', standard_fee_percent: 10, color: '#000000' },
  { id: 'pl3', name: 'Mercado Livre', standard_fee_percent: 18, color: '#FFE600' },
  { id: 'pl4', name: 'Venda Direta / WhatsApp', standard_fee_percent: 0, color: '#25D366' },
];

export const INITIAL_SALES: Sale[] = [];