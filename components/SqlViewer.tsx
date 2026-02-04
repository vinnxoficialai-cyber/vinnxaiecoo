import React from 'react';

const SQL_CONTENT = `-- 1. Tabela de Produtos
create table products (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  standard_cost numeric not null default 0,
  image_url text
);

-- 2. Tabela de Plataformas (Marketplaces)
create table platforms (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  standard_fee_percent numeric default 0,
  color text default '#64748B'
);

-- 3. Tabela de Vendas
create table sales (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  product_id uuid references products(id) not null,
  platform_id uuid references platforms(id) not null,
  cost_product_snapshot numeric not null,
  cost_packaging numeric default 0,
  cost_other numeric default 0,
  value_gross numeric not null,
  value_received numeric not null,
  profit_final numeric generated always as (value_received - (cost_product_snapshot + cost_packaging + cost_other)) stored,
  date_sale timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('Pendente', 'Enviado', 'Entregue', 'Devolvido')) default 'Pendente'
);`;

export const SqlViewer = () => (
  <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-20">
    <h3 className="text-lg font-bold text-zinc-100 mb-2">Código SQL Supabase</h3>
    <p className="text-sm text-zinc-500 mb-4">Copie e cole este código no editor SQL do seu painel Supabase.</p>
    <div className="bg-black rounded-lg p-4 overflow-x-auto border border-zinc-800">
      <pre className="text-xs text-emerald-400 font-mono">
        {SQL_CONTENT}
      </pre>
    </div>
  </div>
);