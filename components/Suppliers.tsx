import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Supplier, SupplierProduct } from '../types';
import {
  UsersIcon, PlusIcon, XIcon, PackageIcon, SearchIcon, FilterIcon,
  MapPinIcon, PhoneIcon, MailIcon, PencilIcon, TrashIcon
} from './ui/Icons';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '', contact_name: '', phone: '', address: '', email: '', catalog: []
  });

  // Catalog State (Inside Modal)
  const [tempItem, setTempItem] = useState({ model: '', price: '' });

  useEffect(() => {
    const loadData = async () => {
      const data = await db.getSuppliers();
      setSuppliers(data);
    };
    loadData();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return suppliers.filter(sup =>
      sup.name.toLowerCase().includes(query) ||
      (sup.contact_name && sup.contact_name.toLowerCase().includes(query)) ||
      (sup.address && sup.address.toLowerCase().includes(query))
    );
  }, [suppliers, searchQuery]);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({ ...supplier });
    } else {
      setEditingId(null);
      setFormData({ name: '', contact_name: '', phone: '', address: '', email: '', catalog: [] });
    }
    setIsModalOpen(true);
  };

  const handleAddCatalogItem = () => {
    if (!tempItem.model || !tempItem.price) return;
    const newItem: SupplierProduct = { model: tempItem.model, price: parseFloat(tempItem.price) };
    setFormData(prev => ({ ...prev, catalog: [...(prev.catalog || []), newItem] }));
    setTempItem({ model: '', price: '' });
  };

  const handleRemoveCatalogItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      catalog: prev.catalog?.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await db.updateSupplier({ ...formData, id: editingId } as Supplier);
    } else {
      await db.addSupplier(formData as Omit<Supplier, 'id'>);
    }
    const updated = await db.getSuppliers();
    setSuppliers(updated);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este fornecedor?')) {
      await db.deleteSupplier(id);
      const updated = await db.getSuppliers();
      setSuppliers(updated);
    }
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 relative">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-blue-500" />
            Fornecedores
          </h2>
          <p className="text-sm text-zinc-500">Gerencie parceiros e catálogos de produtos.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar fornecedor..."
              className="pl-9 pr-4 py-2 border border-border rounded-lg bg-card text-zinc-200 placeholder:text-zinc-600 focus:ring-1 focus:ring-blue-500 outline-none w-full md:w-64 text-sm"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <PlusIcon className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-zinc-900/50">
              <h3 className="font-bold text-lg text-zinc-100">
                {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-100">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase">Dados da Empresa</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      placeholder="Nome da Empresa"
                      className="w-full p-2.5 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                    <input
                      placeholder="Endereço Completo (Rua, Cidade, Estado)"
                      className="w-full p-2.5 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-500 mb-1 block uppercase">Contato</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      placeholder="Nome do Contato"
                      className="w-full p-2.5 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.contact_name}
                      onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                    />
                    <input
                      placeholder="Telefone / Zap"
                      className="w-full p-2.5 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <input
                      placeholder="Email (Opcional)"
                      className="w-full p-2.5 border border-border rounded-lg text-sm bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Catalog Section */}
              <div className="pt-4 border-t border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-blue-400 flex items-center gap-2">
                    <PackageIcon className="w-4 h-4" /> Catálogo de Produtos
                  </label>
                </div>

                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 mb-3 flex gap-2">
                  <input
                    placeholder="Modelo (Ex: Nike Dunk Low)"
                    className="flex-1 p-2 border border-border rounded text-xs bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                    value={tempItem.model}
                    onChange={e => setTempItem({ ...tempItem, model: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Preço R$"
                    className="w-24 p-2 border border-border rounded text-xs bg-zinc-900 text-zinc-100 focus:border-blue-500 outline-none"
                    value={tempItem.price}
                    onChange={e => setTempItem({ ...tempItem, price: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={handleAddCatalogItem}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 rounded text-xs font-bold transition-colors"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {formData.catalog?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-zinc-900/80 px-3 py-2 rounded-lg text-sm border border-zinc-800">
                      <span className="text-zinc-300 font-medium">{item.model}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-emerald-500 font-bold">R$ {item.price.toFixed(2)}</span>
                        <button type="button" onClick={() => handleRemoveCatalogItem(idx)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!formData.catalog || formData.catalog.length === 0) && (
                    <p className="text-center text-xs text-zinc-600 py-2 italic">Nenhum item no catálogo ainda.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredSuppliers.map((sup) => (
          <div key={sup.id} className="bg-card border border-border rounded-xl p-5 hover:border-zinc-600 transition-all hover:shadow-lg group flex flex-col h-full animate-in zoom-in-95 duration-300">

            {/* Card Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-blue-500 font-bold text-lg shadow-inner">
                  {sup.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 text-lg leading-tight truncate max-w-[150px]">{sup.name}</h3>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1 truncate max-w-[180px]">
                    <MapPinIcon className="w-3 h-3" /> {sup.address || 'Endereço n/a'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenModal(sup)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                  title="Editar"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(sup.id)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  title="Excluir"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card Body - Info */}
            <div className="space-y-3 mb-4 flex-1">
              <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                <span className="text-xs text-zinc-500 font-medium uppercase">Contato</span>
                <span className="text-sm text-zinc-300 font-bold">{sup.contact_name || '-'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                  <span className="text-zinc-500 block mb-1">Telefone</span>
                  <div className="font-medium text-zinc-300 truncate">{sup.phone || '-'}</div>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                  <span className="text-zinc-500 block mb-1">Email</span>
                  <div className="font-medium text-zinc-300 truncate" title={sup.email}>{sup.email || '-'}</div>
                </div>
              </div>

              {/* Catalog Mini-Preview */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <PackageIcon className="w-3 h-3" /> Catálogo
                  </span>
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 border border-zinc-700">
                    {sup.catalog?.length || 0} itens
                  </span>
                </div>
                <div className="space-y-1">
                  {sup.catalog?.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-zinc-400">
                      <span>{item.model}</span>
                      <span className="text-emerald-500">R$ {item.price.toFixed(0)}</span>
                    </div>
                  ))}
                  {(sup.catalog?.length || 0) > 2 && (
                    <p className="text-[10px] text-zinc-600 text-center pt-1">
                      + {(sup.catalog?.length || 0) - 2} outros modelos
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="flex gap-2 pt-2 mt-auto">
              <button
                onClick={() => sup.email && window.location.assign(`mailto:${sup.email}`)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${sup.email ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800' : 'bg-zinc-900/50 text-zinc-600 border-zinc-800 cursor-not-allowed'}`}
              >
                <MailIcon className="w-4 h-4" /> Email
              </button>
              <button
                onClick={() => handleWhatsApp(sup.phone)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-colors shadow-lg ${sup.phone ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-emerald-900/20' : 'bg-zinc-800 text-zinc-500 border-zinc-800 cursor-not-allowed'}`}
              >
                <PhoneIcon className="w-4 h-4" /> Zap
              </button>
            </div>
          </div>
        ))}

        {filteredSuppliers.length === 0 && (
          <div className="col-span-full py-16 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <div className="flex justify-center mb-3">
              <SearchIcon className="w-8 h-8 opacity-50" />
            </div>
            <p>Nenhum fornecedor encontrado para "{searchQuery}"</p>
            <button onClick={() => handleOpenModal()} className="text-blue-500 text-sm mt-2 hover:underline">
              Cadastrar novo fornecedor
            </button>
          </div>
        )}
      </div>
    </div>
  );
};