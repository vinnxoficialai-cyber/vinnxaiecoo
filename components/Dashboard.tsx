import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { SaleWithDetails, Product, Platform } from '../types';
import { db } from '../services/db';
import {
  AlertTriangleIcon, CalendarIcon, DollarSignIcon, TrendingDownIcon,
  TrendingUpIcon, PackageIcon, ChevronRightIcon, ClockIcon, TrophyIcon,
  CheckCircleIcon
} from './ui/Icons';

interface DashboardProps {
  sales: SaleWithDetails[];
}

// Internal StatCard Component
interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
  trendDirection?: 'up' | 'down';
  Icon: any;
  color?: string;
  bgIconColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, trendDirection, Icon, color = "text-blue-500", bgIconColor = "bg-blue-500/10" }) => (
  <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-zinc-500 mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-zinc-100">{value}</h3>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs mt-2 ${trendDirection === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trendDirection === 'up' ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
          <span className="font-medium">{trend}% vs mês anterior</span>
        </div>
      )}
    </div>
    <div className={`p-3 rounded-xl ${bgIconColor}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ sales }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [productsData, platformsData] = await Promise.all([
        db.getProducts(),
        db.getPlatforms()
      ]);
      setProducts(productsData);
      setPlatforms(platformsData);
    };
    loadData();
  }, []);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalProfit = sales.reduce((acc, curr) => acc + curr.profit_final, 0);
    const totalRevenue = sales.reduce((acc, curr) => acc + curr.value_received, 0);
    const totalExpenses = sales.reduce((acc, curr) => {
      // (Product Cost + Box + Bag + Label + Other)
      const costs = curr.cost_product_snapshot + (curr.cost_box || 0) + (curr.cost_bag || 0) + (curr.cost_label || 0) + (curr.cost_other || 0);
      return acc + costs;
    }, 0);
    const count = sales.length;

    return { totalProfit, totalRevenue, totalExpenses, count };
  }, [sales]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock_quantity <= p.min_stock_level);
  }, [products]);

  // --- CHART DATA (Group by Day) ---
  const chartData = useMemo(() => {
    // 1. Group sales by date (YYYY-MM-DD)
    const grouped = new Map<string, { date: string, receita: number, lucro: number }>();

    // Sort sales by date ascending
    const sortedSales = [...sales].sort((a, b) => new Date(a.date_sale).getTime() - new Date(b.date_sale).getTime());

    sortedSales.forEach(sale => {
      const dateStr = new Date(sale.date_sale).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const current = grouped.get(dateStr) || { date: dateStr, receita: 0, lucro: 0 };

      current.receita += sale.value_received;
      current.lucro += sale.profit_final;
      grouped.set(dateStr, current);
    });

    // Take last 7 days of activity or last 10 entries
    return Array.from(grouped.values()).slice(-10);
  }, [sales]);

  // --- PLATFORM DATA ---
  const platformStats = useMemo(() => {
    const map = new Map();
    sales.forEach(s => {
      const current = map.get(s.platform_name) || { name: s.platform_name, value: 0, color: s.platform_color };
      current.value += 1; // Count sales
      map.set(s.platform_name, current);
    });

    // Calculate percentages
    const total = sales.length;
    return Array.from(map.values()).map(p => ({
      ...p,
      percent: total > 0 ? (p.value / total) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [sales]);

  // --- TOP PRODUCTS ---
  const topProducts = useMemo(() => {
    const map = new Map();
    sales.forEach(s => {
      const current = map.get(s.product_name) || { name: s.product_name, profit: 0, units: 0 };
      current.profit += s.profit_final;
      current.units += 1;
      map.set(s.product_name, current);
    });
    return Array.from(map.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3);
  }, [sales]);

  // --- RECENT SALES ---
  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date_sale).getTime() - new Date(a.date_sale).getTime())
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-6 pb-24">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Visão Geral</h1>
          <p className="text-zinc-500 text-sm">Acompanhe o desempenho do seu e-commerce.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400 bg-card px-3 py-2 rounded-lg border border-border flex items-center gap-2 shadow-sm">
            <CalendarIcon className="w-4 h-4 text-blue-500" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>

      {/* 1. STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Receita Líquida"
          value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={8}
          trendDirection="up"
          Icon={DollarSignIcon}
          color="text-emerald-500"
          bgIconColor="bg-emerald-500/10"
        />
        <StatCard
          label="Lucro Total"
          value={`R$ ${stats.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={12}
          trendDirection="up"
          Icon={TrendingUpIcon}
          color="text-blue-500"
          bgIconColor="bg-blue-500/10"
        />
        <StatCard
          label="Custos Totais"
          value={`R$ ${stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={2}
          trendDirection="down"
          Icon={TrendingDownIcon}
          color="text-red-500"
          bgIconColor="bg-red-500/10"
        />
        <StatCard
          label="Vendas Realizadas"
          value={stats.count.toString()}
          Icon={CheckCircleIcon}
          color="text-purple-500"
          bgIconColor="bg-purple-500/10"
        />
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT COLUMN (Charts & Platforms) - Spans 2 cols */}
        <div className="xl:col-span-2 space-y-6">

          {/* AREA CHART */}
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-100">Fluxo Financeiro</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Lucro</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Receita</span>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }}
                    itemStyle={{ fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" name="Receita" />
                  <Area type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLucro)" name="Lucro" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* PLATFORMS PROGRESS */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <h2 className="text-lg font-bold text-zinc-100 mb-4">Vendas por Canal</h2>
              <div className="space-y-5">
                {platformStats.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400 font-medium">{item.name}</span>
                      <span className="font-bold text-zinc-200">{item.value} vendas</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
                {platformStats.length === 0 && <p className="text-zinc-600 text-sm">Sem dados.</p>}
              </div>
            </div>

            {/* RECENT SALES LIST */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-100">Últimas Vendas</h2>
              </div>
              <div className="space-y-3 flex-1">
                {recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between p-3 border border-border hover:bg-zinc-800/50 transition-colors rounded-xl group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-zinc-800 text-blue-500 rounded-lg">
                        <PackageIcon className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-zinc-200 truncate max-w-[120px]">{sale.product_name}</p>
                        <p className="text-xs text-zinc-500">{new Date(sale.date_sale).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-500">+R${sale.profit_final.toFixed(0)}</span>
                  </div>
                ))}
                {recentSales.length === 0 && <p className="text-zinc-600 text-sm">Nenhuma venda recente.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Top Products, Alerts) */}
        <div className="space-y-6">

          {/* TOP PRODUCTS (Replaces Birthdays) */}
          <div className="bg-blue-600 p-6 rounded-xl shadow-lg shadow-blue-900/20 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrophyIcon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrophyIcon className="w-5 h-5" />
                  <h2 className="text-lg font-bold">Top Models</h2>
                </div>
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-lg">Rentabilidade</span>
              </div>

              <div className="space-y-3">
                {topProducts.length > 0 ? topProducts.map((prod, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{prod.name}</p>
                      <p className="text-xs text-blue-100 truncate">{prod.units} vendidos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-300">R$ {prod.profit.toFixed(0)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 bg-white/5 rounded-lg border border-white/10 text-sm opacity-90">
                    Sem dados de vendas ainda.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ALERTS (Low Stock) */}
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <h2 className="text-lg font-bold text-zinc-100 mb-4">Alertas de Estoque</h2>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 4).map(prod => (
                  <div key={prod.id} className="flex items-start gap-3 p-3 rounded-lg bg-amber-950/20 border border-amber-900/30">
                    <AlertTriangleIcon className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-500">Baixo Estoque</h4>
                      <p className="text-xs text-amber-400/70 mt-1">
                        {prod.name}: <span className="font-bold text-white">{prod.stock_quantity} un</span> (Min: {prod.min_stock_level})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-zinc-600 text-center">
                <CheckCircleIcon className="w-8 h-8 mb-2 text-zinc-700" />
                <p className="text-sm">Estoque saudável.</p>
              </div>
            )}
          </div>

          {/* UPCOMING RESTOCKS (Placeholder for now, could be derived from suppliers) */}
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-100">Lembretes</h2>
              <ClockIcon className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="text-sm text-zinc-500 text-center py-4 bg-zinc-900/50 rounded-lg border border-zinc-800 border-dashed">
              Sem lembretes definidos.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;