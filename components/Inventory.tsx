import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { ProductWithDetails, Supplier, Product } from '../types';
import { PackageIcon, PlusIcon, SearchIcon, PencilIcon, XIcon, CalculatorIcon, MinusIcon } from './ui/Icons';

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // -- MODAL STATES --

  // 1. Stock Entry/Withdrawal Modal
  const [stockModalProduct, setStockModalProduct] = useState<ProductWithDetails | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'entry' | 'withdrawal'>('entry');

  // New states for Entry Logic
  const [entrySupplierId, setEntrySupplierId] = useState<string>('');
  const [entryCost, setEntryCost] = useState<number>(0);

  // 2. Product Form Modal (Create / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    standard_cost: 0,
    cost_box: 0,
    cost_bag: 0,
    cost_label: 0,
    suggested_price: 0,
    supplier_id: '',
    min_stock_level: 5,
    stock_quantity: 0
  });

  // Load Data
  const loadData = async () => {
    const [productsData, suppliersData] = await Promise.all([
      db.getProductsWithDetails(),
      db.getSuppliers()
    ]);
    setProducts(productsData);
    setSuppliers(suppliersData);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Logic
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.supplier_name.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // -- HANDLERS --

  // Open Edit/Create Modal
  const handleOpenForm = (product?: ProductWithDetails) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name,
        standard_cost: product.standard_cost,
        cost_box: product.cost_box || 0,
        cost_bag: product.cost_bag || 0,
        cost_label: product.cost_label || 0,
        suggested_price: product.suggested_price || 0,
        supplier_id: product.supplier_id || '',
        min_stock_level: product.min_stock_level,
        stock_quantity: product.stock_quantity
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        standard_cost: 0,
        cost_box: 0,
        cost_bag: 0,
        cost_label: 0,
        suggested_price: 0,
        supplier_id: '',
        min_stock_level: 5,
        stock_quantity: 0
      });
    }
    setIsFormOpen(true);
  };

  // Save Product (Create/Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // Update
      const productToUpdate: Product = {
        id: editingId,
        name: formData.name!,
        standard_cost: Number(formData.standard_cost),
        cost_box: Number(formData.cost_box),
        cost_bag: Number(formData.cost_bag),
        cost_label: Number(formData.cost_label),
        suggested_price: Number(formData.suggested_price),
        stock_quantity: formData.stock_quantity!,
        min_stock_level: Number(formData.min_stock_level),
        supplier_id: formData.supplier_id
      };
      await db.updateProduct(productToUpdate);
    } else {
      // Create
      await db.addNewProduct({
        name: formData.name!,
        standard_cost: Number(formData.standard_cost),
        cost_box: Number(formData.cost_box),
        cost_bag: Number(formData.cost_bag),
        cost_label: Number(formData.cost_label),
        suggested_price: Number(formData.suggested_price),
        stock_quantity: Number(formData.stock_quantity),
        min_stock_level: Number(formData.min_stock_level),
        supplier_id: formData.supplier_id
      });
    }

    setIsFormOpen(false);
    loadData();
  };

  // Stock Adjustment Trigger
  const openStockModal = (prod: ProductWithDetails, type: 'entry' | 'withdrawal') => {
    setStockModalProduct(prod);
    setAdjustmentType(type);
    setAdjustmentQty(0);

    // Initialize Entry fields
    if (type === 'entry') {
      setEntrySupplierId(prod.supplier_id || '');
      setEntryCost(prod.standard_cost);
    }
  };

  // Handle Supplier Change in Entry Modal
  const handleEntrySupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const supId = e.target.value;
    setEntrySupplierId(supId);

    if (stockModalProduct) {
      const supplier = suppliers.find(s => s.id === supId);
      // Try to find matching item in catalog to pull price
      // Simple fuzzy match: checks if product name contains catalog model or vice versa
      const catalogItem = supplier?.catalog?.find(item =>
        stockModalProduct.name.toLowerCase().includes(item.model.toLowerCase()) ||
        item.model.toLowerCase().includes(stockModalProduct.name.toLowerCase())
      );

      if (catalogItem) {
        setEntryCost(catalogItem.price);
      }
    }
  };

  // Stock Adjustment Submit
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;

    let newTotal = stockModalProduct.stock_quantity;

    if (adjustmentType === 'entry') {
      // ENTRY LOGIC
      newTotal += Number(adjustmentQty);

      // Update product cost and supplier linkage as well
      const updatedProduct: Product = {
        ...stockModalProduct,
        stock_quantity: newTotal,
        standard_cost: Number(entryCost),
        supplier_id: entrySupplierId || stockModalProduct.supplier_id // Update supplier if selected
      };

      // Use db.updateProduct to save cost changes + quantity
      await db.updateProduct(updatedProduct);

    } else {
      // WITHDRAWAL LOGIC
      newTotal -= Number(adjustmentQty);
      newTotal = Math.max(0, newTotal);
      await db.updateProductStock(stockModalProduct.id, newTotal);
    }

    setStockModalProduct(null);
    setAdjustmentQty(0);
    loadData();
  };

  // Helper for total expenses
  const getTotalExpenses = (p: Partial<Product>) => {
    return (Number(p.cost_box) || 0) + (Number(p.cost_bag) || 0) + (Number(p.cost_label) || 0);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 relative">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <PackageIcon className="w-6 h-6 text-blue-500" />
            Estoque Financeiro
          </h2>
          <p className="text-sm text-zinc-500">Gerencie produtos, custos e margem de lucro.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar modelo..."
              className="pl-9 pr-4 py-2 border border-border rounded-lg bg-card text-zinc-200 placeholder:text-zinc-600 focus:ring-1 focus:ring-blue-500 outline-none w-full md:w-64 text-sm"
            />
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <PlusIcon className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* PRODUCT MODAL (Create/Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-900/50">
              <h3 className="font-bold text-lg text-zinc-100">
                {editingId ? 'Editar Produto & Custos' : 'Novo Produto'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-zinc-500 hover:text-zinc-100">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Nome do Modelo</label>
                <input
                  required
                  placeholder="Ex: Nike Air Force 1"
                  className="w-full p-3 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Financial Block */}
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-4">
                <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2">
                  <CalculatorIcon className="w-3 h-3" /> Precificação
                </h4>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Custo Tênis (Fornecedor)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="w-full pl-8 p-2 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.standard_cost || ''}
                      onChange={e => setFormData({ ...formData, standard_cost: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Caixinha</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full p-2 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.cost_box || ''}
                      onChange={e => setFormData({ ...formData, cost_box: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Saquinho</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full p-2 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.cost_bag || ''}
                      onChange={e => setFormData({ ...formData, cost_bag: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Etiqueta</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full p-2 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.cost_label || ''}
                      onChange={e => setFormData({ ...formData, cost_label: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Preço de Venda (Sugerido)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full pl-8 p-2 border border-blue-500/30 rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.suggested_price || ''}
                      onChange={e => setFormData({ ...formData, suggested_price: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Live Preview of Profit */}
                {Number(formData.suggested_price) > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">Lucro Bruto Estimado:</span>
                    <span className="font-bold text-emerald-500">
                      R$ {(Number(formData.suggested_price) - (Number(formData.standard_cost) + getTotalExpenses(formData))).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Inventory Block */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Fornecedor</label>
                  <select
                    required
                    className="w-full p-3 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                    value={formData.supplier_id}
                    onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Estoque Mínimo</label>
                  <input
                    required
                    type="number"
                    className="w-full p-3 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                    value={formData.min_stock_level}
                    onChange={e => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {!editingId && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-lg font-bold hover:bg-zinc-700">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500">{editingId ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg mb-1 text-zinc-100">
              {adjustmentType === 'entry' ? 'Entrada Rápida' : 'Retirada Rápida'}
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              {adjustmentType === 'entry' ? 'Adicionar ao' : 'Retirar do'} produto: <span className="font-semibold text-blue-400">{stockModalProduct.name}</span>
            </p>
            <form onSubmit={handleUpdateStock}>

              {/* ENTRY: Supplier & Cost Selection */}
              {adjustmentType === 'entry' && (
                <div className="mb-4 space-y-3 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Fornecedor da Compra</label>
                    <select
                      className="w-full p-2 border border-border rounded text-sm bg-zinc-900 text-zinc-100 outline-none"
                      value={entrySupplierId}
                      onChange={handleEntrySupplierChange}
                    >
                      <option value="">Selecione...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Custo Unitário (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-2 border border-border rounded text-sm bg-zinc-900 text-zinc-100 outline-none"
                      value={entryCost}
                      onChange={e => setEntryCost(parseFloat(e.target.value))}
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Este valor atualizará o custo padrão do produto.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 items-center mb-6">
                <input
                  autoFocus
                  type="number"
                  min="1"
                  className="flex-1 border border-border p-4 rounded-xl text-2xl font-bold text-center bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                  value={adjustmentQty || ''}
                  onChange={e => setAdjustmentQty(parseInt(e.target.value))}
                  placeholder="Qtd"
                />
                <span className="text-zinc-500 font-medium">unidades</span>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStockModalProduct(null)} className="flex-1 bg-zinc-800 text-zinc-300 py-3 rounded-lg font-bold hover:bg-zinc-700">Cancelar</button>
                <button
                  type="submit"
                  className={`flex-1 ${adjustmentType === 'entry' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-red-600 hover:bg-red-500 shadow-red-900/20'} text-white py-3 rounded-lg font-bold shadow-lg`}
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredProducts.map(prod => {
          const isLowStock = prod.stock_quantity <= prod.min_stock_level;
          const isOutStock = prod.stock_quantity <= 0;

          const totalExpenses = (prod.cost_box || 0) + (prod.cost_bag || 0) + (prod.cost_label || 0);
          const totalCost = prod.standard_cost + totalExpenses;
          const estimatedProfit = (prod.suggested_price || 0) - totalCost;
          const margin = prod.suggested_price ? (estimatedProfit / prod.suggested_price) * 100 : 0;

          return (
            <div key={prod.id} className="bg-card border border-border rounded-xl p-5 hover:border-zinc-600 transition-all hover:shadow-lg group flex flex-col h-full animate-in zoom-in-95 duration-300 relative overflow-hidden">

              {/* Header */}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <PackageIcon className="w-6 h-6 text-zinc-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100 leading-tight">{prod.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1 truncate max-w-[150px]">{prod.supplier_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenForm(prod)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                  title="Editar Detalhes"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Financial Stats Breakdown */}
              <div className="bg-zinc-900/30 rounded-lg p-3 mb-4 space-y-2 border border-zinc-800/50">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Custo Tênis:</span>
                  <span className="text-zinc-300">R$ {prod.standard_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Despesas (Total):</span>
                  <span className="text-zinc-300">R$ {totalExpenses.toFixed(2)}</span>
                </div>
                <div className="border-t border-zinc-800 pt-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400">Preço Venda:</span>
                  <span className="font-bold text-zinc-200">R$ {(prod.suggested_price || 0).toFixed(2)}</span>
                </div>

                {/* Profit Highlight */}
                <div className={`mt-2 p-2 rounded flex justify-between items-center ${estimatedProfit > 0 ? 'bg-emerald-950/20 border border-emerald-900/30' : 'bg-zinc-800'}`}>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Lucro Previsto</span>
                  <div className="text-right">
                    <span className={`block font-bold ${estimatedProfit > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      R$ {estimatedProfit.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-500">{margin.toFixed(0)}% mg.</span>
                  </div>
                </div>
              </div>

              {/* Stock Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Estoque Atual</span>
                  <span className={isOutStock ? 'text-red-500 font-bold' : isLowStock ? 'text-amber-500 font-bold' : 'text-zinc-400'}>
                    {prod.stock_quantity} un
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isOutStock ? 'bg-red-500' : isLowStock ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((prod.stock_quantity / (prod.min_stock_level * 3)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons (Dual) */}
              <div className="flex gap-2">
                <button
                  onClick={() => openStockModal(prod, 'entry')}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-3 h-3 text-blue-500" /> Entrada
                </button>
                <button
                  onClick={() => openStockModal(prod, 'withdrawal')}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 flex items-center justify-center gap-2"
                >
                  <MinusIcon className="w-3 h-3 text-red-500" /> Retirada
                </button>
              </div>

            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <div className="flex justify-center mb-3">
              <PackageIcon className="w-8 h-8 opacity-50" />
            </div>
            <p>Nenhum produto encontrado para "{searchQuery}"</p>
            <button onClick={() => handleOpenForm()} className="text-blue-500 text-sm mt-2 hover:underline">
              Cadastrar novo produto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};