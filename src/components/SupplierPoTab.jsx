import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  PackagePlus,
} from 'lucide-react';
import { apiFetch, formatINR, buildWhatsAppSupplierPoUrl } from '../utils/api';

export default function SupplierPoTab({
  suppliers = [],
  purchaseOrders = [],
  products = [],
  settings = {},
  onMutated,
  showToast,
}) {
  const [supForm, setSupForm] = useState({
    name: '',
    company: '',
    whatsapp: '',
    city: '',
    notes: '',
  });
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poSupplierName, setPoSupplierName] = useState('');
  const [poSupplierWa, setPoSupplierWa] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState([]);
  const [pickProductId, setPickProductId] = useState('');
  const [pickQty, setPickQty] = useState(20);
  const [pickCost, setPickCost] = useState('');
  const [creatingPo, setCreatingPo] = useState(false);

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/suppliers', {
        method: 'POST',
        body: JSON.stringify(supForm),
      });
      setSupForm({ name: '', company: '', whatsapp: '', city: '', notes: '' });
      showToast('Supplier saved!');
      onMutated();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteSupplier = async (id) => {
    try {
      await apiFetch(`/api/admin/suppliers/${id}`, { method: 'DELETE' });
      showToast('Supplier removed.');
      onMutated();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSelectSupplier = (id) => {
    setSelectedSupplierId(id);
    const s = suppliers.find((x) => x.id === id);
    if (s) {
      setPoSupplierName(s.company ? `${s.name} (${s.company})` : s.name);
      setPoSupplierWa(s.whatsapp);
    }
  };

  const handleAutoFillLowStock = () => {
    const low = products.filter((p) => p.stock <= 15);
    if (low.length === 0) {
      showToast('All products currently have plenty of stock (>15 units).');
      return;
    }
    setPoItems(
      low.map((p) => ({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        quantity: Math.max(10, 30 - (p.stock || 0)),
        unitCost: Math.round((p.price || 0) * 0.7),
      }))
    );
    showToast(`Added ${low.length} low-stock item(s) to Purchase Order!`);
  };

  const handleAddPoItem = () => {
    const prod = products.find((p) => p.id === pickProductId);
    if (!prod) return;
    setPoItems((prev) => {
      const exists = prev.find((i) => i.productId === prod.id);
      if (exists) {
        return prev.map((i) =>
          i.productId === prod.id ? { ...i, quantity: i.quantity + (Number(pickQty) || 10) } : i
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          quantity: Math.max(1, Number(pickQty) || 10),
          unitCost: Number(pickCost) || Math.round((prod.price || 0) * 0.7),
        },
      ];
    });
    setPickProductId('');
    setPickCost('');
  };

  const handleCreateAndSendPo = async (e) => {
    e.preventDefault();
    if (poItems.length === 0) {
      showToast('Add at least one item to the Purchase Order.');
      return;
    }
    setCreatingPo(true);
    try {
      const data = await apiFetch('/api/admin/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          supplierName: poSupplierName,
          supplierWhatsapp: poSupplierWa,
          notes: poNotes,
          items: poItems,
        }),
      });
      const waUrl = buildWhatsAppSupplierPoUrl(data.purchaseOrder, settings);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setPoItems([]);
      setPoNotes('');
      showToast(`PO ${data.purchaseOrder.poNumber} saved & opened in WhatsApp!`);
      onMutated();
    } catch (err) {
      showToast(err.message);
    } finally {
      setCreatingPo(false);
    }
  };

  const handlePoStatus = async (poId, status) => {
    try {
      await apiFetch(`/api/admin/purchase-orders/${poId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(
        status === 'Received'
          ? 'PO marked Received & inventory stock automatically updated!'
          : `PO marked as ${status}`
      );
      onMutated();
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">
          Suppliers &amp; 1-Click WhatsApp Purchase Orders (PO)
        </h1>
        <p className="text-sm text-[#6B7280]">
          Save your wholesale suppliers, auto-fill low stock items, and send formatted Purchase
          Orders straight to your supplier&rsquo;s WhatsApp in one click.
        </p>
      </div>

      {/* Create Purchase Order Card */}
      <form
        onSubmit={handleCreateAndSendPo}
        className="rounded-2xl border border-[#EAE2D6] bg-white p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE8DC] pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#D96B27]" />
            <h2 className="font-display text-lg font-bold text-[#1E3A5F]">
              Create &amp; Send Supplier PO
            </h2>
          </div>
          <button
            type="button"
            onClick={handleAutoFillLowStock}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Auto-Fill Low Stock Items
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#374151]">
              Choose Saved Supplier
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => handleSelectSupplier(e.target.value)}
              className="w-full rounded-xl border border-[#E2D9CB] px-3 py-2 text-sm"
            >
              <option value="">-- Enter Manually or Pick --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.company ? `(${s.company})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#374151]">
              Supplier Name *
            </label>
            <input
              required
              type="text"
              value={poSupplierName}
              onChange={(e) => setPoSupplierName(e.target.value)}
              placeholder="e.g. Rajesh Stationery Distributors"
              className="w-full rounded-xl border border-[#E2D9CB] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#128C7E]">
              Supplier WhatsApp Number *
            </label>
            <input
              required
              type="tel"
              value={poSupplierWa}
              onChange={(e) => setPoSupplierWa(e.target.value)}
              placeholder="10-digit or 91XXXXXXXXXX"
              className="w-full rounded-xl border border-[#25D366] px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Add Item Row */}
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-[#FAF7F2] p-3 border border-[#EFE8DC]">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-[11px] font-semibold text-[#6B7280]">
              Add Product to PO
            </label>
            <select
              value={pickProductId}
              onChange={(e) => setPickProductId(e.target.value)}
              className="w-full rounded-xl border border-[#E2D9CB] bg-white px-3 py-2 text-xs sm:text-sm"
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.stock})
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="mb-1 block text-[11px] font-semibold text-[#6B7280]">Qty</label>
            <input
              type="number"
              min="1"
              value={pickQty}
              onChange={(e) => setPickQty(e.target.value)}
              className="w-full rounded-xl border border-[#E2D9CB] bg-white px-3 py-2 text-xs sm:text-sm"
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-[11px] font-semibold text-[#6B7280]">
              Rate ₹ (opt)
            </label>
            <input
              type="number"
              min="0"
              value={pickCost}
              onChange={(e) => setPickCost(e.target.value)}
              placeholder="Auto"
              className="w-full rounded-xl border border-[#E2D9CB] bg-white px-3 py-2 text-xs sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAddPoItem}
            className="inline-flex items-center gap-1 rounded-full bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162C49]"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {/* PO Items List */}
        {poItems.length > 0 && (
          <div className="divide-y divide-[#F3EDE3] rounded-xl border border-[#EAE2D6]">
            {poItems.map((it, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
              >
                <div className="font-semibold text-[#1F242D]">
                  {idx + 1}. {it.name}{' '}
                  {it.sku && <span className="text-[#8A8175]">({it.sku})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) =>
                      setPoItems((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x
                        )
                      )
                    }
                    className="w-16 rounded-lg border border-[#E2D9CB] px-2 py-1 text-center font-bold"
                  />
                  <span className="text-[#6B7280]">
                    × {formatINR(it.unitCost)} = <strong>{formatINR(it.quantity * it.unitCost)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPoItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={poNotes}
            onChange={(e) => setPoNotes(e.target.value)}
            placeholder="Delivery note for supplier (e.g. Send before Friday with GST bill)"
            className="flex-1 min-w-[200px] rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={creatingPo}
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#1EB958]"
          >
            <MessageCircle className="h-4 w-4" />
            {creatingPo ? 'Saving...' : 'Send PO on WhatsApp (1-Click)'}
          </button>
        </div>
      </form>

      {/* Saved Suppliers + PO History Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Saved Suppliers */}
        <div className="rounded-2xl border border-[#EAE2D6] bg-white p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#1E3A5F]">
            Saved Suppliers ({suppliers.length})
          </h2>
          <form onSubmit={handleAddSupplier} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input
              required
              type="text"
              value={supForm.name}
              onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
              placeholder="Contact Name *"
              className="rounded-xl border border-[#E2D9CB] px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={supForm.company}
              onChange={(e) => setSupForm({ ...supForm, company: e.target.value })}
              placeholder="Agency / Distributor Name"
              className="rounded-xl border border-[#E2D9CB] px-3 py-2 text-xs"
            />
            <input
              required
              type="tel"
              value={supForm.whatsapp}
              onChange={(e) => setSupForm({ ...supForm, whatsapp: e.target.value })}
              placeholder="WhatsApp Number *"
              className="rounded-xl border border-[#E2D9CB] px-3 py-2 text-xs"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={supForm.city}
                onChange={(e) => setSupForm({ ...supForm, city: e.target.value })}
                placeholder="City / Market"
                className="flex-1 rounded-xl border border-[#E2D9CB] px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-full bg-[#1E3A5F] px-3.5 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </form>

          <div className="divide-y divide-[#F3EDE3]">
            {suppliers.length === 0 ? (
              <p className="py-4 text-xs text-[#8A8175]">No suppliers saved yet.</p>
            ) : (
              suppliers.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <div className="font-bold text-[#1E3A5F]">
                      {s.name} {s.company ? `• ${s.company}` : ''}
                    </div>
                    <div className="text-[#6B7280]">
                      WhatsApp: {s.whatsapp} {s.city ? `• ${s.city}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSelectSupplier(s.id)}
                      className="rounded-full bg-[#FAF7F2] border border-[#E2D9CB] px-2.5 py-1 font-semibold text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                    >
                      Use in PO
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(s.id)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Purchase Order History */}
        <div className="rounded-2xl border border-[#EAE2D6] bg-white p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#1E3A5F]">
            Purchase Orders History ({purchaseOrders.length})
          </h2>
          {purchaseOrders.length === 0 ? (
            <p className="text-xs text-[#8A8175]">
              No Purchase Orders created yet. Use the form above to send your first PO on WhatsApp!
            </p>
          ) : (
            <div className="space-y-3">
              {purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  className="rounded-xl border border-[#EFE8DC] bg-[#FFFEFC] p-3.5 text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#1E3A5F]">{po.poNumber}</span>
                      <span className="ml-2 text-[#4B5563]">{po.supplierName}</span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        po.status === 'Received'
                          ? 'bg-emerald-100 text-emerald-700'
                          : po.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>
                  <div className="text-[#6B7280]">
                    {po.items.length} item(s) • Est. {formatINR(po.estimatedTotal)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={buildWhatsAppSupplierPoUrl(po, settings)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1.5 font-semibold text-white hover:bg-[#1EB958]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Re-Send WhatsApp
                    </a>
                    {po.status !== 'Received' && (
                      <button
                        onClick={() => handlePoStatus(po.id, 'Received')}
                        className="inline-flex items-center gap-1 rounded-full bg-[#1E3A5F] px-3 py-1.5 font-semibold text-white hover:bg-[#162C49]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Received (+Restock)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
