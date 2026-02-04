import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product, Platform, ProductVariation } from '../types';
import { AlertTriangleIcon } from './ui/Icons';

interface SalesFormProps {
  onSaleComplete: () => void;
}

const SalesForm: React.FC<SalesFormProps> = ({ onSaleComplete }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Variations State
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');

  const [costProduct, setCostProduct] = useState<number>(0);

  // New Expenses Breakdown
  const [costBox, setCostBox] = useState<number>(0);
  const [costBag, setCostBag] = useState<number>(0);
  const [costLabel, setCostLabel] = useState<number>(0);
  const [costOther, setCostOther] = useState<number>(0);

  const [valueGross, setValueGross] = useState<number>(0);
  const [valueReceived, setValueReceived] = useState<number>(0);

  // Logic State
  const [profit, setProfit] = useState<number>(0);
  const [margin, setMargin] = useState<number>(0);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [productsData, platformsData] = await Promise.all([
        db.getProducts(),
        db.getPlatforms()
      ]);
      setProducts(productsData);
      setPlatforms(platformsData);
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadVars = async () => {
      if (selectedProductId) {
        const vars = await db.getProductVariations(selectedProductId);
        setVariations(vars);
        setSelectedVariationId('');
      } else {
        setVariations([]);
        setSelectedVariationId('');
      }
    };
    loadVars();
  }, [selectedProductId]);

  // Auto-fill defaults and Price when Product changes
  useEffect(() => {
    const prod = products.find(p => p.id === selectedProductId);
    const selectedVar = variations.find(v => v.id === selectedVariationId);

    if (prod) {
      setCostProduct(prod.standard_cost);

      // Auto-fill defaults from product settings
      setCostBox(prod.cost_box || 0);
      setCostBag(prod.cost_bag || 0);
      setCostLabel(prod.cost_label || 0);

      // Auto-fill Sale Price (Gross)
      if (prod.suggested_price) {
        setValueGross(prod.suggested_price);
      }

      if (selectedVar) {
        if (selectedVar.stock_quantity <= 0) {
          setStockWarning(`Variação ${selectedVar.color}/${selectedVar.size} sem estoque.`);
        } else if (selectedVar.stock_quantity < 2) {
          setStockWarning(`Variação ${selectedVar.color}/${selectedVar.size} com estoque baixo.`);
        } else {
          setStockWarning(null);
        }
      } else {
        if (prod.stock_quantity <= 0) {
          setStockWarning("Atenção: Produto sem estoque registrado.");
        } else if (prod.stock_quantity < 2) {
          setStockWarning("Atenção: Últimas unidades em estoque.");
        } else {
          setStockWarning(null);
        }
      }
    } else {
      setStockWarning(null);
      setValueGross(0); // Reset if no product
    }
  }, [selectedProductId, selectedVariationId, variations, products]);

  // Calculate Net Received (Value - Platform Fees)
  useEffect(() => {
    if (valueGross > 0 && selectedPlatformId) {
      const platform = platforms.find(p => p.id === selectedPlatformId);
      if (platform) {
        const feePercent = platform.standard_fee_percent || 0;
        const feeAmount = valueGross * (feePercent / 100);
        const netValue = valueGross - feeAmount;
        setValueReceived(parseFloat(netValue.toFixed(2)));
      } else {
        setValueReceived(valueGross);
      }
    } else if (valueGross > 0 && !selectedPlatformId) {
      setValueReceived(valueGross); // No platform selected yet
    }
  }, [valueGross, selectedPlatformId, platforms]);

  // Calculate profit
  useEffect(() => {
    const totalCost = Number(costProduct) + Number(costBox) + Number(costBag) + Number(costLabel) + Number(costOther);
    const calculatedProfit = Number(valueReceived) - totalCost;
    setProfit(calculatedProfit);

    if (Number(valueReceived) > 0) {
      setMargin((calculatedProfit / Number(valueReceived)) * 100);
    } else {
      setMargin(0);
    }
  }, [costProduct, costBox, costBag, costLabel, costOther, valueReceived]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedPlatformId) return;

    // Validate Stock block
    const prod = products.find(p => p.id === selectedProductId);
    const selectedVar = variations.find(v => v.id === selectedVariationId);

    if (selectedVar && selectedVar.stock_quantity <= 0) {
      if (!confirm(`Variação ${selectedVar.color} - ${selectedVar.size} sem estoque. Confirmar?`)) return;
    } else if (prod && prod.stock_quantity <= 0) {
      if (!confirm("Este produto consta como 'Sem Estoque'. Deseja vender mesmo assim (estoque ficará negativo)?")) {
        return;
      }
    }

    setIsSubmitting(true);

    const { error } = await db.addSale({
      product_id: selectedProductId,
      platform_id: selectedPlatformId,
      cost_product_snapshot: Number(costProduct),
      cost_box: Number(costBox),
      cost_bag: Number(costBag),
      cost_label: Number(costLabel),
      cost_other: Number(costOther),
      value_gross: Number(valueGross),
      value_received: Number(valueReceived),
      date_sale: new Date(saleDate + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
      status: 'Pendente',
      variation_id: selectedVariationId || undefined,
      color: selectedVar?.color,
      size: selectedVar?.size
    });

    if (error) {
      alert(`Erro ao salvar venda: ${error}\n\nDica: Se o erro for sobre "column does not exist", rode o script SQL 'fix_sales_error.sql'.`);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setValueGross(0);
    setValueReceived(0);
    setCostOther(0);
    alert('Venda registrada e estoque atualizado!');
    onSaleComplete();
  };

  const isProfitPositive = profit > 0;

  // Helper for dynamic button styling
  const getPlatformButtonClass = (platformName: string, isSelected: boolean) => {
    const name = platformName.toLowerCase();

    if (!isSelected) {
      return 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700';
    }

    if (name.includes('shopee')) {
      return 'bg-[#EA501F] text-white border-[#EA501F] shadow-lg shadow-orange-900/20'; // Laranja Shopee
    }
    if (name.includes('tiktok')) {
      return 'bg-[#FE2C55] text-white border-[#FE2C55] shadow-lg shadow-red-900/20'; // Vermelho TikTok
    }
    if (name.includes('mercado')) {
      return 'bg-[#FFE600] text-black border-[#FFE600] shadow-lg shadow-yellow-900/20 font-bold'; // Amarelo ML
    }
    if (name.includes('whatsapp') || name.includes('whats') || name.includes('zap')) {
      return 'bg-[#25D366] text-white border-[#25D366] shadow-lg shadow-green-900/20'; // Verde WhatsApp
    }

    // Default fallback
    return 'bg-blue-600 text-white border-blue-600';
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border p-6 max-w-lg mx-auto mb-20 flex items-center justify-center min-h-[300px]">
        <div className="text-zinc-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border p-6 max-w-lg mx-auto mb-20">
      <h2 className="text-2xl font-bold text-zinc-100 mb-6">Nova Venda Rápida</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Data da Venda</label>
          <input
            type="date"
            required
            className="w-full p-3 border border-border rounded-lg bg-zinc-900 text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
          />
        </div>

        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Modelo do Tênis</label>
          <select
            required
            className="w-full p-3 border border-border rounded-lg bg-zinc-900 text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} (Estoque: {p.stock_quantity})
              </option>
            ))}
          </select>
          {stockWarning && (
            <div className="flex items-center gap-1 mt-2 text-amber-500 text-xs font-bold">
              <AlertTriangleIcon className="w-4 h-4" />
              {stockWarning}
            </div>
          )}
        </div>

        {/* Variations Selection (if available) */}
        {variations.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Variação (Cor/Tamanho)</label>
            <select
              required
              className="w-full p-3 border border-border rounded-lg bg-zinc-900 text-zinc-100 focus:ring-2 focus:ring-blue-500"
              value={selectedVariationId}
              onChange={(e) => setSelectedVariationId(e.target.value)}
            >
              <option value="">Selecione a opção...</option>
              {variations.map(v => (
                <option key={v.id} value={v.id}>
                  {v.color} - Tam: {v.size} (Estoque: {v.stock_quantity})
                </option>
              ))}
            </select>
          </div>
        )}


        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Plataforma</label>
          <div className="grid grid-cols-3 gap-3">
            {platforms.map(plat => (
              <button
                key={plat.id}
                type="button"
                onClick={() => setSelectedPlatformId(plat.id)}
                className={`p-3 text-sm rounded-xl border font-bold transition-all active:scale-95 ${getPlatformButtonClass(plat.name, selectedPlatformId === plat.id)}`}
              >
                {plat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Financial Inputs Breakdown */}
        <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50 space-y-3">
          <h3 className="text-xs font-bold text-zinc-500 uppercase">Custos & Despesas</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Custo Produto</label>
              <div className="relative">
                <span className="absolute left-2 top-2 text-xs text-zinc-600">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={costProduct}
                  onChange={e => setCostProduct(parseFloat(e.target.value))}
                  className="w-full pl-6 p-2 text-sm border border-border rounded bg-zinc-900/50 text-zinc-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Outros/Extras</label>
              <div className="relative">
                <span className="absolute left-2 top-2 text-xs text-zinc-600">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={costOther}
                  onChange={e => setCostOther(parseFloat(e.target.value))}
                  className="w-full pl-6 p-2 text-sm border border-border rounded bg-zinc-900 text-zinc-100"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Caixinha</label>
              <input
                type="number"
                step="0.01"
                value={costBox}
                onChange={e => setCostBox(parseFloat(e.target.value))}
                className="w-full p-2 text-xs border border-border rounded bg-zinc-900 text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Saquinho</label>
              <input
                type="number"
                step="0.01"
                value={costBag}
                onChange={e => setCostBag(parseFloat(e.target.value))}
                className="w-full p-2 text-xs border border-border rounded bg-zinc-900 text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Etiqueta</label>
              <input
                type="number"
                step="0.01"
                value={costLabel}
                onChange={e => setCostLabel(parseFloat(e.target.value))}
                className="w-full p-2 text-xs border border-border rounded bg-zinc-900 text-zinc-100"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Valor Venda (Bruto)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={valueGross || ''}
              onChange={e => setValueGross(parseFloat(e.target.value))}
              className="w-full p-3 border border-border rounded-lg bg-zinc-900 text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Recebido (Líquido)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={valueReceived || ''}
              onChange={e => setValueReceived(parseFloat(e.target.value))}
              className="w-full p-3 border-2 border-blue-500/30 rounded-lg bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Real-time Profit Card */}
        <div className={`mt-6 p-4 rounded-xl border-l-4 ${isProfitPositive ? 'bg-emerald-950/30 border-emerald-500' : 'bg-red-950/30 border-red-500'}`}>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-zinc-400">Lucro Líquido Estimado</p>
              <p className={`text-3xl font-bold ${isProfitPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                R$ {profit.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Margem</p>
              <p className={`text-xl font-bold ${isProfitPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {margin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!selectedProductId || !selectedPlatformId || !valueReceived || isSubmitting}
          className="w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed mt-4 transition-all active:scale-[0.98]"
        >
          {isSubmitting ? 'Salvando...' : 'Confirmar Venda e Baixar Estoque'}
        </button>
      </form>
    </div>
  );
};

export default SalesForm;