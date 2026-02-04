import React from 'react';
import { SaleWithDetails } from '../types';
import { ShoppingBagIcon, CalendarIcon } from './ui/Icons';

interface SalesHistoryProps {
    sales: SaleWithDetails[];
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ sales }) => {
    // Take only last 10 sales
    const recentSales = sales.slice(0, 10);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-card rounded-xl shadow-lg border border-border p-5 h-full max-h-[600px] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-zinc-500" />
                Últimas Vendas
            </h3>

            <div className="space-y-3">
                {recentSales.map((sale) => (
                    <div
                        key={sale.id}
                        className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                    >
                        {/* Platform Indicator */}
                        <div
                            className="w-2 h-10 rounded-full shrink-0"
                            style={{ backgroundColor: sale.platform_color || '#3b82f6' }}
                            title={sale.platform_name}
                        />

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-bold text-zinc-200 truncate pr-2">
                                    {sale.product_name}
                                </p>
                                <span className="text-sm font-bold text-emerald-400 shrink-0">
                                    R$ {sale.value_received.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center mt-1">
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <span
                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-black uppercase"
                                        style={{ backgroundColor: sale.platform_color || '#ccc', color: ['#FFE600', '#FFFFFF'].includes(sale.platform_color) ? 'black' : 'white' }}
                                    >
                                        {sale.platform_name}
                                    </span>
                                    {sale.color && (
                                        <span className="text-zinc-400">
                                            {sale.color} {sale.size && `- ${sale.size}`}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-zinc-600">
                                    {formatDate(sale.date_sale)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {recentSales.length === 0 && (
                    <div className="text-center py-10 text-zinc-500 text-sm">
                        Nenhuma venda registrada ainda.
                    </div>
                )}
            </div>
        </div>
    );
};
