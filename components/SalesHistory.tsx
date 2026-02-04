import React, { useState } from 'react';
import { SaleWithDetails } from '../types';
import { ShoppingBagIcon, CalendarIcon, TrashIcon, AlertTriangleIcon, LockIcon } from './ui/Icons';
import { db } from '../services/db';
import { supabase } from '../services/supabaseClient';

interface SalesHistoryProps {
    sales: SaleWithDetails[];
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ sales: initialSales }) => {
    const [sales, setSales] = useState<SaleWithDetails[]>(initialSales);
    const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Sync if initial sales updates (from parent fetch)
    React.useEffect(() => {
        setSales(initialSales);
    }, [initialSales]);

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

    const handleDeleteClick = (saleId: string) => {
        setSaleToDelete(saleId);
        setPassword('');
        setErrorMsg(null);
    };

    const handleConfirmDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!saleToDelete) return;
        setIsDeleting(true);
        setErrorMsg(null);

        // 1. Verify Password
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) {
            setErrorMsg("Erro de sessão. Recarregue a página.");
            setIsDeleting(false);
            return;
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: password
        });

        if (authError) {
            setErrorMsg("Senha incorreta.");
            setIsDeleting(false);
            return;
        }

        // 2. Perform Delete
        const { success, error } = await db.deleteSale(saleToDelete);

        if (!success) {
            setErrorMsg(error || "Erro ao excluir venda.");
            setIsDeleting(false);
            return;
        }

        // 3. Update UI
        setSales(prev => prev.filter(s => s.id !== saleToDelete));
        setSaleToDelete(null);
        setIsDeleting(false);
        alert("Venda excluída e estoque estornado!");
    };

    return (
        <div className="bg-card rounded-xl shadow-lg border border-border p-5 h-full max-h-[600px] overflow-y-auto custom-scrollbar relative">
            <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-zinc-500" />
                Últimas Vendas
            </h3>

            <div className="space-y-3">
                {recentSales.map((sale) => (
                    <div
                        key={sale.id}
                        className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-colors group"
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
                                <div className='flex items-center gap-3'>
                                    <span className="text-[10px] text-zinc-600">
                                        {formatDate(sale.date_sale)}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteClick(sale.id)}
                                        className='opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-900/30 rounded text-zinc-600 hover:text-red-500'
                                        title="Excluir Venda"
                                    >
                                        <TrashIcon className='w-4 h-4' />
                                    </button>
                                </div>
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

            {/* Password Confirmation Modal */}
            {saleToDelete && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 rounded-xl">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="text-center mb-6">
                            <div className="mx-auto w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-3">
                                <LockIcon className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Confirmar Exclusão</h3>
                            <p className="text-sm text-zinc-400 mt-1">
                                Para excluir esta venda e estornar o estoque, confirme sua senha.
                            </p>
                        </div>

                        <form onSubmit={handleConfirmDelete} className="space-y-4">
                            <div>
                                <input
                                    type="password"
                                    placeholder="Sua senha de login"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoFocus
                                />
                                {errorMsg && (
                                    <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1">
                                        <AlertTriangleIcon className="w-3 h-3" /> {errorMsg}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSaleToDelete(null)}
                                    className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-medium transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!password || isDeleting}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isDeleting ? 'Excluindo...' : 'Excluir Venda'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
