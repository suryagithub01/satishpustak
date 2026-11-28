import React, { useState } from 'react';
import { X, Search, CheckCircle2, Clock, Package, Truck, XCircle } from 'lucide-react';
import { apiFetch, formatINR } from '../utils/api';

const STEPS = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];

export default function OrderTrackerModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const data = await apiFetch(`/api/orders/track/${encodeURIComponent(query.trim())}`);
      setOrder(data.order);
    } catch (err) {
      setError(err.message || 'Order not found.');
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = order ? STEPS.indexOf(order.status) : -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[#6B7280] hover:bg-[#FAF7F2]"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-display text-2xl font-bold text-[#1E3A5F]">Track Your Order</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Enter your Order ID (e.g. <span className="font-semibold text-[#1E3A5F]">SPB-1001</span>{' '}
          or <span className="font-semibold text-[#1E3A5F]">SPB-1003</span>) to check live status.
        </p>

        <form onSubmit={handleTrack} className="mt-4 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Order ID (e.g. SPB-1003)"
            className="flex-1 rounded-full border border-[#E2D9CB] px-4 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1E3A5F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162C49]"
          >
            <Search className="h-4 w-4" />
            Track
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {order && (
          <div className="mt-5 rounded-xl border border-[#EAE2D6] bg-[#FAF7F2] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-[#6B7280]">Order ID</div>
                <div className="text-lg font-bold text-[#1E3A5F]">{order.orderNumber}</div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  order.status === 'Cancelled'
                    ? 'bg-rose-100 text-rose-700'
                    : order.status === 'Delivered'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {order.status}
              </span>
            </div>

            {order.status === 'Cancelled' ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700">
                <XCircle className="h-4 w-4" />
                This order was cancelled. Contact us on WhatsApp if you need assistance.
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-5 gap-1 text-center">
                {STEPS.map((step, idx) => {
                  const done = idx <= currentIdx;
                  const Icon =
                    idx === 0
                      ? Clock
                      : idx === 1
                      ? CheckCircle2
                      : idx === 2
                      ? Package
                      : idx === 3
                      ? Truck
                      : CheckCircle2;
                  return (
                    <div key={step} className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          done ? 'bg-[#1E3A5F] text-white' : 'bg-[#E6DDD0] text-[#8A8175]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={`mt-1.5 text-[10px] font-semibold ${
                          done ? 'text-[#1E3A5F]' : 'text-[#8A8175]'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 border-t border-[#E6DDD0] pt-3 space-y-1.5 text-xs">
              <div className="font-semibold text-[#1E3A5F]">Items Ordered:</div>
              {order.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-[#4B5563]">
                  <span>
                    {it.name} × {it.quantity}
                  </span>
                  <span className="font-medium">{formatINR(it.price * it.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-[#E6DDD0] pt-2 text-sm font-bold text-[#1E3A5F]">
                <span>Total ({order.paymentMethod})</span>
                <span>{formatINR(order.total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
