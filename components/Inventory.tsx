import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { ProductWithDetails, Supplier, Product, ProductVariation, Platform } from '../types';
import { PackageIcon, PlusIcon, SearchIcon, PencilIcon, XIcon, CalculatorIcon, MinusIcon, TrashIcon, DollarSignIcon, ChevronRightIcon, AlertTriangleIcon } from './ui/Icons';
import { ImageUpload } from './ImageUpload';

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // -- MODAL STATES --

  // 1. Stock Entry/Withdrawal Modal
  const [stockModalProduct, setStockModalProduct] = useState<ProductWithDetails | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'entry' | 'withdrawal'>('entry');

  // New states for Entry Logic
  const [entrySupplierId, setEntrySupplierId] = useState<string>('');
  const [entryCost, setEntryCost] = useState<number>(0);

  // 2. Product Form Modal (Create / Edit) - WIZARD
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
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
    stock_quantity: 0,
    image_url: ''
  });

  // 3. Quick Add Supplier
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickCatalog, setQuickCatalog] = useState<{ model: string, price: number }[]>([]);
  const [quickTempItem, setQuickTempItem] = useState({ model: '', price: '' });

  // 4. Variations State
  const [variations, setVariations] = useState<Partial<ProductVariation>[]>([]);
  const [tempVariation, setTempVariation] = useState({ color: '', size: '', qty: '' });

  // 5. Simulation Overrides (Fee % and Fixed Fee)
  const [simulationOverrides, setSimulationOverrides] = useState<Record<string, { fee: number, fixed: number }>>({});

  // Load Data
  const loadData = async () => {
    const [productsData, suppliersData, platformsData] = await Promise.all([
      db.getProductsWithDetails(),
      db.getSuppliers(),
      db.getPlatforms()
    ]);
    setProducts(productsData);
    setSuppliers(suppliersData);
    setPlatforms(platformsData);
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
  const handleOpenForm = async (product?: ProductWithDetails) => {
    setCurrentStep(1); // Reset to step 1
    setSimulationOverrides({}); // Reset simulation overrides
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
        stock_quantity: product.stock_quantity,
        image_url: product.image_url || ''
      });
      // Load Variations
      const vars = await db.getProductVariations(product.id);
      setVariations(vars);
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
        stock_quantity: 0,
        image_url: ''
      });
      setVariations([]);
    }
    setIsFormOpen(true);
  };

  // Save Product (Create/Update)
  const handleSaveProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let productIdToSaveVars = editingId;

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
        supplier_id: formData.supplier_id,
        image_url: formData.image_url
      };
      await db.updateProduct(productToUpdate);
    } else {
      // Create
      const newProd = await db.addNewProduct({
        name: formData.name!,
        standard_cost: Number(formData.standard_cost),
        cost_box: Number(formData.cost_box),
        cost_bag: Number(formData.cost_bag),
        cost_label: Number(formData.cost_label),
        suggested_price: Number(formData.suggested_price),
        stock_quantity: Number(formData.stock_quantity),
        min_stock_level: Number(formData.min_stock_level),
        supplier_id: formData.supplier_id,
        image_url: formData.image_url
      });

      // Update the ID for variation saving logic below
      if (newProd) {
        productIdToSaveVars = newProd.id;
      }
    }

    // Save Variations (Common for Create & Update)
    if (productIdToSaveVars && variations.length > 0) {
      console.log('Salvando variações para o produto:', productIdToSaveVars);
      for (const v of variations) {
        if (!v.id && v.color && v.size) {
          console.log('Inserindo variação:', v);
          const res = await db.addVariation({
            product_id: productIdToSaveVars,
            color: v.color,
            size: v.size,
            stock_quantity: v.stock_quantity || 0
          });
          if (!res) console.error('Falha ao salvar variação:', v);
        }
      }
    }

    setIsFormOpen(false);
    loadData();
  };

  const handleAddVariation = () => {
    if (!tempVariation.color || !tempVariation.size) return;
    setVariations([...variations, {
      color: tempVariation.color,
      size: tempVariation.size,
      stock_quantity: Number(tempVariation.qty) || 0
    }]);
    setTempVariation({ color: '', size: '', qty: '' });
  };

  const handleRemoveVariation = async (index: number) => {
    const v = variations[index];
    if (v.id) {
      await db.deleteVariation(v.id);
    }
    setVariations(variations.filter((_, i) => i !== index));
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      await db.deleteProduct(id);
      loadData();
    }
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

      {/* --- WIZARD PRODUCT FORM --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-900/50">
              <h3 className="font-bold text-lg text-zinc-100">
                {editingId ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-zinc-500 hover:text-zinc-100">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">

              {/* STEPS INDICATOR */}
              <div className="flex items-center justify-between mb-6 px-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className={`flex items-center gap-2 ${currentStep >= step ? 'text-blue-500' : 'text-zinc-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 
                      ${currentStep >= step ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 bg-zinc-800'}`}>
                      {step}
                    </div>
                    <span className="text-xs font-bold uppercase hidden sm:block">
                      {step === 1 && 'Básico'}
                      {step === 2 && 'Custos'}
                      {step === 3 && 'Simulação'}
                    </span>
                    {step < 3 && <div className={`h-1 w-8 rounded mx-2 ${currentStep > step ? 'bg-blue-500' : 'bg-zinc-800'}`} />}
                  </div>
                ))}
              </div>

              {/* STEP 1: BASIC INFO */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image Upload */}
                    <ImageUpload
                      currentImageUrl={formData.image_url}
                      productId={editingId || 'new'}
                      onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                    />

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Nome do Produto *</label>
                        <input
                          type="text"
                          required
                          className="w-full p-2.5 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Fornecedor</label>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 p-2.5 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                            value={formData.supplier_id}
                            onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                          >
                            <option value="">Selecione...</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowQuickSupplier(!showQuickSupplier)}
                            className="px-3 bg-zinc-800 hover:bg-blue-600 text-white rounded-lg transition-colors border border-zinc-700 font-bold"
                            title="Novo Fornecedor"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Variations Section */}
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2">
                      <PackageIcon className="w-4 h-4" /> Variações de Estoque
                    </h4>

                    <div className="flex gap-2">
                      <input
                        placeholder="Cor (Ex: Preto)"
                        className="flex-1 p-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                        value={tempVariation.color}
                        onChange={e => setTempVariation({ ...tempVariation, color: e.target.value })}
                      />
                      <input
                        placeholder="Tam (40)"
                        className="w-20 p-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                        value={tempVariation.size}
                        onChange={e => setTempVariation({ ...tempVariation, size: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Qtd"
                        className="w-20 p-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                        value={tempVariation.qty}
                        onChange={e => setTempVariation({ ...tempVariation, qty: e.target.value })}
                      />
                      <button type="button" onClick={handleAddVariation} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded font-bold transition-colors">+</button>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {variations.map((v, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-zinc-900 p-2 rounded border border-zinc-800 text-sm">
                          <span className="text-zinc-300">
                            <span className="font-bold text-white uppercase">{v.color}</span> - Tam: {v.size}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-blue-400 font-bold">{v.stock_quantity} un</span>
                            <button type="button" onClick={() => handleRemoveVariation(idx)} className="text-zinc-600 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                      {variations.length === 0 && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-900/20 text-yellow-500 rounded text-xs border border-yellow-900/30">
                          <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                          <span>Adicione pelo menos uma variação (cor/tamanho).</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* General Stock Fallback (Hidden if variations exist, or visible as Total) */}
                  {!variations.length && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Estoque Total</label>
                      <input
                        type="number"
                        className="w-full p-2.5 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                        value={formData.stock_quantity}
                        onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                      />
                    </div>
                  )}

                  {/* Stock Min Level */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Estoque Mínimo (Alerta)</label>
                    <input
                      type="number"
                      className="w-full p-2.5 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.min_stock_level}
                      onChange={e => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: COSTS */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800">
                    <h4 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                      <DollarSignIcon className="w-5 h-5 text-emerald-500" /> Custo Base
                    </h4>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Custo do Produto (Fábrica)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full pl-8 p-2.5 border border-border rounded-lg text-lg font-bold bg-zinc-900 text-emerald-400 focus:border-emerald-500 outline-none"
                          value={formData.standard_cost || ''}
                          onChange={e => setFormData({ ...formData, standard_cost: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800">
                    <h4 className="text-sm font-bold text-zinc-100 mb-4">Despesas Extras (Embalagem/Logística)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Caixinha</label>
                        <input type="number" step="0.01" className="w-full p-2 border border-zinc-700 rounded bg-zinc-900 text-white text-sm"
                          value={formData.cost_box || ''} onChange={e => setFormData({ ...formData, cost_box: parseFloat(e.target.value) })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Saquinho</label>
                        <input type="number" step="0.01" className="w-full p-2 border border-zinc-700 rounded bg-zinc-900 text-white text-sm"
                          value={formData.cost_bag || ''} onChange={e => setFormData({ ...formData, cost_bag: parseFloat(e.target.value) })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Etiqueta/Fita</label>
                        <input type="number" step="0.01" className="w-full p-2 border border-zinc-700 rounded bg-zinc-900 text-white text-sm"
                          value={formData.cost_label || ''} onChange={e => setFormData({ ...formData, cost_label: parseFloat(e.target.value) })} />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Total de Custos:</span>
                      <span className="text-lg font-bold text-red-400">R$ {(Number(formData.standard_cost || 0) + getTotalExpenses(formData)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: PRICING & SIMULATION */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                    <label className="block text-sm font-bold text-blue-400 mb-2">Preço de Venda Sugerido</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-zinc-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-8 p-3 border border-blue-500/50 rounded-lg text-xl font-bold bg-zinc-900 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.suggested_price || ''}
                        onChange={e => setFormData({ ...formData, suggested_price: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* SIMULATION TABLE */}
                  {Number(formData.suggested_price) > 0 && (
                    <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                      <div className="bg-zinc-900/80 p-3 border-b border-zinc-800 flex justify-between items-center">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Simulação por Plataforma</h4>
                        <span className="text-[10px] text-zinc-500">Custos totais descontados: R$ {(Number(formData.standard_cost || 0) + getTotalExpenses(formData)).toFixed(2)}</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-zinc-500 bg-zinc-900 sticky top-0">
                            <tr>
                              <th className="px-4 py-2">Plataforma</th>
                              <th className="px-2 py-2 text-center w-20">Taxa %</th>
                              <th className="px-2 py-2 text-center w-24">Taxa Fixa</th>
                              <th className="px-4 py-2 text-right">Líquido</th>
                              <th className="px-4 py-2 text-right">Lucro</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                            {platforms.map(p => {
                              // Use override if exists, otherwise default
                              const override = simulationOverrides[p.id] || {};
                              const feePercent = override.fee !== undefined ? override.fee : (p.standard_fee_percent || 0);
                              const feeFixed = override.fixed !== undefined ? override.fixed : (p.standard_fixed_fee || 0);

                              const price = Number(formData.suggested_price || 0);
                              const totalCost = Number(formData.standard_cost || 0) + getTotalExpenses(formData);

                              // Calculation Logic: Price - (Price * %) - Fixed
                              const taxValue = (price * feePercent) / 100;
                              const liquid = price - taxValue - feeFixed;
                              const profit = liquid - totalCost;
                              const margin = (profit / price) * 100;

                              return (
                                <tr key={p.id} className="hover:bg-zinc-900/50">
                                  <td className="px-4 py-2 font-medium text-zinc-300 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }}></div>
                                    {p.name}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <input
                                      type="number"
                                      step="0.1"
                                      className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-1 text-center text-xs text-zinc-300 focus:border-blue-500 outline-none"
                                      value={feePercent}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setSimulationOverrides(prev => ({
                                          ...prev,
                                          [p.id]: { ...prev[p.id], fee: isNaN(val) ? 0 : val, fixed: feeFixed }
                                        }));
                                      }}
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <div className="relative">
                                      <span className="absolute left-1.5 top-1 text-[10px] text-zinc-500">R$</span>
                                      <input
                                        type="number"
                                        step="0.1"
                                        className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-1 pl-4 text-center text-xs text-zinc-300 focus:border-blue-500 outline-none"
                                        value={feeFixed}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          setSimulationOverrides(prev => ({
                                            ...prev,
                                            [p.id]: { ...prev[p.id], fee: feePercent, fixed: isNaN(val) ? 0 : val }
                                          }));
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right text-zinc-300">R$ {liquid.toFixed(2)}</td>
                                  <td className={`px-4 py-2 text-right font-bold ${profit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    R$ {profit.toFixed(2)}
                                    <span className="block text-[10px] opacity-70">{margin.toFixed(0)}%</span>
                                  </td>
                                </tr>
                              );
                            })}
                            {platforms.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-4 text-center text-zinc-500 italic">
                                  Nenhuma plataforma cadastrada. Rode o script Master para configurar.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NAVIGATION BUTTONS */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-800/50">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Voltar
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1 && !formData.name) {
                        alert("Digite o nome do produto!");
                        return;
                      }
                      setCurrentStep(prev => prev + 1);
                    }}
                    className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors flex items-center gap-2"
                  >
                    Próximo <ChevronRightIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSaveProduct()}
                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                  >
                    Salvar Produto
                  </button>
                )}
              </div>

              {/* QUICK SUPPLIER MODAL OVERLAY */}
              {showQuickSupplier && (
                <div className="mt-4 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-2">
                  <h4 className="font-bold text-zinc-100 mb-3">Novo Fornecedor Rápido</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome da Empresa"
                      value={quickSupplierName}
                      onChange={(e) => setQuickSupplierName(e.target.value)}
                      className="w-full p-2 border border-border rounded text-sm bg-zinc-900 text-zinc-100 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowQuickSupplier(false)}
                        className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          if (quickSupplierName.trim()) {
                            const newSupplier = await db.addSupplier({ name: quickSupplierName.trim() });
                            if (newSupplier) {
                              await loadData();
                              setFormData({ ...formData, supplier_id: newSupplier.id });
                              setQuickSupplierName('');
                              setShowQuickSupplier(false);
                            }
                          }
                        }}
                        className="flex-1 py-2 bg-blue-600 text-white rounded text-xs font-bold"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
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
          const hasVariations = prod.variations && prod.variations.length > 0;
          const displayedStock = hasVariations
            ? prod.variations!.reduce((acc, v) => acc + (v.stock_quantity || 0), 0)
            : prod.stock_quantity;

          const isLowStock = displayedStock <= prod.min_stock_level;
          const isOutStock = displayedStock <= 0;

          const totalExpenses = (prod.cost_box || 0) + (prod.cost_bag || 0) + (prod.cost_label || 0);
          const totalCost = prod.standard_cost + totalExpenses;
          const estimatedProfit = (prod.suggested_price || 0) - totalCost;
          const margin = prod.suggested_price ? (estimatedProfit / prod.suggested_price) * 100 : 0;

          return (
            <div key={prod.id} className="bg-card border border-border rounded-xl p-5 hover:border-zinc-600 transition-all hover:shadow-lg group flex flex-col h-full animate-in zoom-in-95 duration-300 relative overflow-hidden">

              {/* Header */}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <PackageIcon className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100 leading-tight">{prod.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${displayedStock > 0 ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-red-900/30 text-red-400 border border-red-900/50'}`}>
                        {displayedStock} un
                      </span>
                      <p className="text-xs text-zinc-500 truncate max-w-[120px]">{prod.supplier_name}</p>
                    </div>


                  </div>
                </div>
                <div className="flex gap-1 h-fit">
                  <button
                    onClick={() => handleOpenForm(prod)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                    title="Editar Detalhes"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                    title="Excluir Produto"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Variations Preview - Split Columns Vertical Flow */}
              {prod.variations && prod.variations.length > 0 && (
                <div className="mb-4 bg-zinc-950/50 rounded-lg p-3 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-3 border-b border-zinc-800/50 pb-1">Por Variação</div>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Column 1 */}
                    <div className="space-y-2">
                      {prod.variations.slice(0, Math.ceil(prod.variations.length / 2)).map((v, idx) => (
                        <div key={`l-${idx}`} className="flex justify-between text-xs items-center border-b border-zinc-800/30 pb-1.5">
                          <span className="text-zinc-400 flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0"></span>
                            {v.size} <span className="text-zinc-700">|</span> {v.color}
                          </span>
                          <span className={v.stock_quantity > 0 ? "text-zinc-200 font-bold" : "text-red-500 font-bold"}>
                            {v.stock_quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Column 2 */}
                    <div className="space-y-2">
                      {prod.variations.slice(Math.ceil(prod.variations.length / 2)).map((v, idx) => (
                        <div key={`r-${idx}`} className="flex justify-between text-xs items-center border-b border-zinc-800/30 pb-1.5">
                          <span className="text-zinc-400 flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0"></span>
                            {v.size} <span className="text-zinc-700">|</span> {v.color}
                          </span>
                          <span className={v.stock_quantity > 0 ? "text-zinc-200 font-bold" : "text-red-500 font-bold"}>
                            {v.stock_quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
                    {displayedStock} un
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isOutStock ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                      isLowStock ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                        'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                      }`}
                    style={{ width: `${Math.min((displayedStock / (prod.min_stock_level || 1)) * 50, 100)}%` }}
                  />
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