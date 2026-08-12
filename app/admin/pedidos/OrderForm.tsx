'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';
import ProductPicker, { type PickerProduct } from './ProductPicker';

export interface OrderItemValue {
  product_id: string;
  product_name: string;
  quantity: string;
  sale_price: string;
  cost: string;
  makerworld_link: string;
}

interface OrderFormValues {
  order_date: string;
  client_name: string;
  payment_status: string;
  payment_method: string;
  order_status: string;
  items: OrderItemValue[];
}

interface OrderFormProps {
  action: (formData: FormData) => void | Promise<void>;
  products: PickerProduct[];
  initialValues?: OrderFormValues;
  error?: string;
  submitLabel: string;
}

interface ItemState {
  key: string;
  selectedProduct: PickerProduct | null;
  productName: string;
  quantity: string;
  salePrice: string;
  cost: string;
  makerworldLink: string;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function newItemKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function toItemState(value: OrderItemValue | undefined, products: PickerProduct[]): ItemState {
  return {
    key: newItemKey(),
    selectedProduct: products.find((p) => p.id === value?.product_id) ?? null,
    productName: value?.product_name ?? '',
    quantity: value?.quantity || '1',
    salePrice: value?.sale_price ?? '',
    cost: value?.cost ?? '',
    makerworldLink: value?.makerworld_link ?? '',
  };
}

export default function OrderForm({ action, products, initialValues, error, submitLabel }: OrderFormProps) {
  const [items, setItems] = useState<ItemState[]>(() => {
    const source = initialValues?.items?.length ? initialValues.items : [undefined];
    return source.map((v) => toItemState(v, products));
  });

  const updateItem = (key: string, patch: Partial<ItemState>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  // Autocompleta descripción, precio de venta y costo (precio/costo del
  // producto × cantidad) al elegir un producto o cambiar la cantidad de esa
  // línea. Ambos campos siguen siendo editables si hace falta ajustarlos.
  const selectProduct = (key: string, product: PickerProduct | null) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        if (!product) return { ...item, selectedProduct: null };
        const qty = Number(item.quantity) || 0;
        return {
          ...item,
          selectedProduct: product,
          productName: product.name,
          salePrice: String(Math.round(product.price * qty * 100) / 100),
          cost: product.cost != null ? String(Math.round(product.cost * qty * 100) / 100) : item.cost,
        };
      })
    );
  };

  const changeQuantity = (key: string, quantity: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        if (!item.selectedProduct) return { ...item, quantity };
        const qty = Number(quantity) || 0;
        return {
          ...item,
          quantity,
          salePrice: String(Math.round(item.selectedProduct.price * qty * 100) / 100),
          cost: item.selectedProduct.cost != null ? String(Math.round(item.selectedProduct.cost * qty * 100) / 100) : item.cost,
        };
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, toItemState(undefined, products)]);
  const removeItem = (key: string) => setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));

  const itemsPayload = items.map((item) => ({
    product_id: item.selectedProduct?.id ?? '',
    product_name: item.productName,
    quantity: item.quantity,
    sale_price: item.salePrice,
    cost: item.cost,
    makerworld_link: item.makerworldLink,
  }));

  const totalSale = items.reduce((sum, i) => sum + (Number(i.salePrice) || 0), 0);
  const totalCost = items.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);

  return (
    <form action={action} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 max-w-2xl space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="client_name" className={labelClass}>
            Cliente <span className="text-primary">*</span>
          </label>
          <input
            id="client_name"
            name="client_name"
            type="text"
            required
            defaultValue={initialValues?.client_name}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="order_date" className={labelClass}>
            Fecha
          </label>
          <input id="order_date" name="order_date" type="date" defaultValue={initialValues?.order_date} className={inputClass} />
        </div>
      </div>

      <div className="space-y-4">
        <label className={labelClass}>
          Productos <span className="text-primary">*</span>
        </label>

        {items.map((item, idx) => (
          <div key={item.key} className="border border-zinc-200 rounded-xl p-4 space-y-4 bg-zinc-50/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Producto {idx + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  aria-label="Quitar producto"
                  className="text-red-500 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div>
              <label className={labelClass}>Producto del catálogo</label>
              <div className="mt-2">
                <ProductPicker products={products} selected={item.selectedProduct} onSelect={(product) => selectProduct(item.key, product)} />
              </div>
            </div>

            {item.selectedProduct && (
              <div className="w-32">
                <label className={labelClass}>Cantidad</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => changeQuantity(item.key, e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className={labelClass}>
                Descripción <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={item.productName}
                onChange={(e) => updateItem(item.key, { productName: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Precio de venta (MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Sin definir"
                  value={item.salePrice}
                  onChange={(e) => updateItem(item.key, { salePrice: e.target.value })}
                  className={inputClass}
                />
                {item.selectedProduct && <p className="text-xs text-zinc-500 mt-1.5">Automático (precio × cantidad). Ajustable.</p>}
              </div>
              <div>
                <label className={labelClass}>Costo (MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Sin definir"
                  value={item.cost}
                  onChange={(e) => updateItem(item.key, { cost: e.target.value })}
                  className={inputClass}
                />
                {item.selectedProduct && <p className="text-xs text-zinc-500 mt-1.5">Automático (costo × cantidad). Ajustable.</p>}
              </div>
            </div>

            <div>
              <label className={labelClass}>Link del modelo (MakerWorld, etc.)</label>
              <input
                type="text"
                placeholder="https://makerworld.com/..."
                value={item.makerworldLink}
                onChange={(e) => updateItem(item.key, { makerworldLink: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Agregar otro producto
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm">
        <span className="text-zinc-500 font-medium">Total del pedido</span>
        <span className="font-bold text-zinc-900">
          Venta {currency.format(totalSale)} · Costo {currency.format(totalCost)} · Ganancia {currency.format(totalSale - totalCost)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
        <div>
          <label htmlFor="payment_status" className={labelClass}>
            Estatus de pago
          </label>
          <select id="payment_status" name="payment_status" defaultValue={initialValues?.payment_status ?? ''} className={inputClass}>
            <option value="">Sin definir</option>
            <option value="Pagado">Pagado</option>
            <option value="Pendiente">Pendiente</option>
          </select>
        </div>
        <div>
          <label htmlFor="payment_method" className={labelClass}>
            Método de pago
          </label>
          <input
            id="payment_method"
            name="payment_method"
            type="text"
            list="payment_method_options"
            placeholder="Ej. Transferencia Jesus"
            defaultValue={initialValues?.payment_method}
            className={inputClass}
          />
          <datalist id="payment_method_options">
            <option value="Efectivo Jesus" />
            <option value="Efectivo Adriana" />
            <option value="Efectivo Cajita" />
            <option value="Transferencia Jesus" />
            <option value="Transferencia Adriana" />
          </datalist>
        </div>
      </div>

      <div>
        <label htmlFor="order_status" className={labelClass}>
          Estatus del pedido <span className="text-primary">*</span>
        </label>
        <select
          id="order_status"
          name="order_status"
          required
          defaultValue={initialValues?.order_status ?? 'Pendiente Cotizar'}
          className={inputClass}
        >
          <option value="Pendiente Cotizar">Pendiente Cotizar</option>
          <option value="Imprimiendo">Imprimiendo</option>
          <option value="Entregado">Entregado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      <input type="hidden" name="items_json" value={JSON.stringify(itemsPayload)} />

      <SubmitButton className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
