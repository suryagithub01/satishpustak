import React, { useState } from 'react';
import { X, ShoppingBag, MessageCircle, Check, Minus, Plus, PackageCheck } from 'lucide-react';
import { formatINR, buildWhatsAppProductUrl } from '../utils/api';

export default function ProductModal({ product, categoryName, settings, onClose, onAddToCart }) {
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const waUrl = buildWhatsAppProductUrl(settings.whatsappNumber, product, settings.shopName);

  const handleAdd = () => {
    onAddToCart(product, qty);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative grid max-h-[90vh] w-full max-w-3xl grid-cols-1 overflow-y-auto rounded-2xl bg-white shadow-2xl md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1F242D] shadow-sm transition hover:bg-[#FAF7F2]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        <div className="relative bg-[#FAF7F2] p-6 flex items-center justify-center">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full rounded-xl object-cover shadow-xs"
          />
          {product.badge && (
            <span className="absolute left-8 top-8 rounded-full bg-[#D96B27] px-3 py-1 text-xs font-semibold text-white shadow-sm">
              {product.badge}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D96B27]">
              <span>{categoryName}</span>
              <span className="text-[#D4C8B8]">•</span>
              <span className="text-[#6B7280] font-normal">SKU: {product.sku}</span>
            </div>

            <h2 className="mt-2 font-display text-2xl font-bold leading-snug text-[#1E3A5F]">
              {product.name}
            </h2>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-2xl font-bold text-[#1F242D]">{formatINR(product.price)}</span>
              {product.mrp > product.price && (
                <>
                  <span className="text-sm text-[#9A9185] line-through">
                    {formatINR(product.mrp)}
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
              <PackageCheck className="h-4 w-4 text-emerald-600" />
              {product.stock > 0 ? (
                <span className="text-emerald-700">
                  In Stock ({product.stock} units ready to dispatch)
                </span>
              ) : (
                <span className="text-rose-600">Currently Out of Stock</span>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#4B5563]">{product.description}</p>

            {product.highlights?.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {product.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D96B27]" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-[#EFE8DC] pt-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border border-[#E2D9CB] bg-[#FAF7F2]">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="p-2.5 text-[#1E3A5F] hover:text-[#D96B27]"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
                  className="p-2.5 text-[#1E3A5F] hover:text-[#D96B27]"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleAdd}
                disabled={product.stock <= 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1E3A5F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162C49] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Cart • {formatINR(product.price * qty)}
              </button>
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#25D366] bg-[#25D366]/10 px-5 py-2.5 text-sm font-semibold text-[#128C7E] transition hover:bg-[#25D366]/20"
            >
              <MessageCircle className="h-4 w-4" />
              Order / Ask on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
