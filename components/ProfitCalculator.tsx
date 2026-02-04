import React, { useState, useEffect } from 'react';
import { CalculatorIcon } from './ui/Icons';

export const ProfitCalculator: React.FC = () => {
  // Inputs
  const [costProduct, setCostProduct] = useState<number>(0);
  
  // Specific Expenses
  const [costBox, setCostBox] = useState<number>(1.50);
  const [costBag, setCostBag] = useState<number>(0.50);
  const [costLabel, setCostLabel] = useState<number>(0.20);
  
  const [costExtra, setCostExtra] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  
  // Fees
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(14); // Default Shopee
  const [taxPercent, setTaxPercent] = useState<number>(0); // Imposto Simples Nacional etc
  const [shippingCost, setShippingCost] = useState<number>(0); // Frete fixo (se houver)

  // Outputs
  const [totalCost, setTotalCost] = useState<number>(0);
  const [netRevenue, setNetRevenue] = useState<number>(0);
  const [profit, setProfit] = useState<number>(0);
  const [margin, setMargin] = useState<number>(0);

  useEffect(() => {
    const feeAmount = (salePrice * platformFeePercent) / 100;
    const taxAmount = (salePrice * taxPercent) / 100;
    const deductions = feeAmount + taxAmount + shippingCost;
    
    const revenue = salePrice - deductions;
    const costs = costProduct + costBox + costBag + costLabel + costExtra;
    
    const finalProfit = revenue - costs;
    
    setTotalCost(costs);
    setNetRevenue(revenue);
    setProfit(finalProfit);
    
    if (salePrice > 0) {
      setMargin((finalProfit / salePrice) * 100);
    } else {
      setMargin(0);
    }

  }, [costProduct, costBox, costBag, costLabel, costExtra, salePrice, platformFeePercent, taxPercent, shippingCost]);

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center gap-2 mb-6">
        <CalculatorIcon className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold text-zinc-100">Simulador de Lucro Detalhado</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* INPUTS */}
        <div className="space-y-4">
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
            <h3 className="font-bold text-zinc-300 mb-4 border-b border-zinc-800 pb-2">Custos Unitários</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500">Custo do Tênis (Fornecedor)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500">R$</span>
                  <input type="number" className="w-full pl-8 p-2 border border-border rounded bg-zinc-900 text-zinc-100" value={costProduct || ''} onChange={e => setCostProduct(parseFloat(e.target.value))} />
                </div>
              </div>

              {/* Specific Breakdown */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                   <label className="text-[10px] text-zinc-500 block mb-1">Caixinha</label>
                   <input type="number" className="w-full p-2 text-xs border border-border rounded bg-zinc-900 text-zinc-100" value={costBox || ''} onChange={e => setCostBox(parseFloat(e.target.value))} />
                </div>
                <div>
                   <label className="text-[10px] text-zinc-500 block mb-1">Saquinho</label>
                   <input type="number" className="w-full p-2 text-xs border border-border rounded bg-zinc-900 text-zinc-100" value={costBag || ''} onChange={e => setCostBag(parseFloat(e.target.value))} />
                </div>
                <div>
                   <label className="text-[10px] text-zinc-500 block mb-1">Etiqueta</label>
                   <input type="number" className="w-full p-2 text-xs border border-border rounded bg-zinc-900 text-zinc-100" value={costLabel || ''} onChange={e => setCostLabel(parseFloat(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500">Outros Extras (Brindes, Fita)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500">R$</span>
                  <input type="number" className="w-full pl-8 p-2 border border-border rounded bg-zinc-900 text-zinc-100" value={costExtra || ''} onChange={e => setCostExtra(parseFloat(e.target.value))} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
            <h3 className="font-bold text-zinc-300 mb-4 border-b border-zinc-800 pb-2">Venda e Taxas</h3>
            <div className="space-y-3">
               <div>
                <label className="text-xs text-zinc-500 font-bold text-blue-500">Preço de Venda</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500">R$</span>
                  <input type="number" className="w-full pl-8 p-2 border-2 border-blue-500/30 rounded focus:border-blue-500 bg-zinc-900 text-zinc-100 outline-none" value={salePrice || ''} onChange={e => setSalePrice(parseFloat(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500">Comissão (%)</label>
                  <input type="number" className="w-full p-2 border border-border rounded bg-zinc-900 text-zinc-100" value={platformFeePercent || ''} onChange={e => setPlatformFeePercent(parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Imposto (%)</label>
                  <input type="number" className="w-full p-2 border border-border rounded bg-zinc-900 text-zinc-100" value={taxPercent || ''} onChange={e => setTaxPercent(parseFloat(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Frete Fixo (se vendedor pagar)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500">R$</span>
                  <input type="number" className="w-full pl-8 p-2 border border-border rounded bg-zinc-900 text-zinc-100" value={shippingCost || ''} onChange={e => setShippingCost(parseFloat(e.target.value))} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS */}
        <div className="space-y-4">
           <div className={`p-6 rounded-xl shadow-lg border-2 h-full flex flex-col justify-center ${profit >= 0 ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
              <div className="text-center mb-6">
                <p className="text-sm text-zinc-400 uppercase tracking-wide">Lucro Líquido Previsto</p>
                <p className={`text-4xl font-extrabold mt-2 ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  R$ {profit.toFixed(2)}
                </p>
              </div>

              <div className="space-y-3 border-t border-zinc-800 pt-4">
                 <div className="flex justify-between text-sm">
                   <span className="text-zinc-500">Receita Líquida (pós taxas):</span>
                   <span className="font-bold text-zinc-200">R$ {netRevenue.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-zinc-500">Custo Total Produtos:</span>
                   <span className="font-bold text-red-400">- R$ {totalCost.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm pt-2 border-t border-zinc-800 border-dashed">
                   <span className="text-zinc-300 font-medium">Margem de Lucro:</span>
                   <span className={`font-bold text-lg ${margin > 20 ? 'text-emerald-500' : margin > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                     {margin.toFixed(2)}%
                   </span>
                 </div>
              </div>

              {margin > 0 && margin < 15 && (
                <div className="mt-4 bg-amber-950/40 text-amber-500 text-xs p-3 rounded-lg border border-amber-900/50">
                  Cuidado: Sua margem está apertada. Considere aumentar o preço ou reduzir custos de embalagem.
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};