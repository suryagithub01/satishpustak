import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, MessageCircle, ArrowRight, Truck } from 'lucide-react';
import { formatINR, buildWhatsAppCartUrl } from '../utils/api';

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  settings,
  onUpdateQty,
  onRemove,
  onCheckout,
}) {
  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const freeAbove = settings.freeDeliveryAbove ?? 499;
  const deliveryCharge = subtotal === 0 || subtotal >= freeAbove ? 0 : (settings.deliveryCharge ?? 40);
  const total = subtotal + deliveryCharge;
  const remainingForFree = Math.max(0, freeAbove - subtotal);
  const progress = Math.min(100, Math.round((subtotal / Math.max(1, freeAbove)) * 100));

  const waCartUrl = buildWhatsAppCartUrl(
    settings.whatsappNumber,
    cart,
    subtotal,
    deliveryCharge,
    total,
    settings.shopName
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EFE8DC] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#1E3A5F]" />
            <h2 className="font-display text-xl font-bold text-[#1E3A5F]">Your Shopping Bag</h2>
            <span className="rounded-full bg-[#FAF7F2] px-2.5 py-0.5 text-xs font-semibold text-[#6B7280]">
              {(() => {
                const count = cart.reduce((s, i) => s + i.quantity, 0);
                return `${count} ${count === 1 ? 'item' : 'items'}`;
              })()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#6B7280] transition hover:bg-[#FAF7F2] hover:text-[#1F242D]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Delivery Progress */}
        {cart.length > 0 && (
          <div className="border-b border-[#EFE8DC] bg-[#FAF7F2] px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[#1E3A5F]">
              <Truck className="h-4 w-4 text-[#D96B27]" />
              {remainingForFree > 0 ? (
                <span>
                  Add <strong>{formatINR(remainingForFree)}</strong> more for{' '}
                  <strong>FREE Delivery</strong>
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">
                  Yay! Your order qualifies for FREE Local Delivery
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E6DDD0]">
              <div
                className="h-full rounded-full bg-[#D96B27] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF7F2] text-[#B8A791]">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-[#1E3A5F]">
                Your bag is empty
              </p>
              <p className="mt-1 text-sm text-[#6B7280]">
                Explore our notebooks, pens, art kits, and festive gift hampers.
              </p>
              <button
                onClick={onClose}
                className="mt-5 rounded-full bg-[#1E3A5F] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#162C49]"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-3.5 rounded-xl border border-[#EFE8DC] bg-[#FFFEFC] p-3"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover bg-[#FAF7F2]"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="line-clamp-2 text-sm font-semibold text-[#1F242D]">
                        {item.name}
                      </h4>
                      <button
                        onClick={() => onRemove(item.productId)}
                        className="text-[#9A9185] hover:text-rose-600"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-[#E2D9CB] bg-[#FAF7F2]">
                        <button
                          onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                          className="p-1.5 text-[#1E3A5F] hover:text-[#D96B27]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                          className="p-1.5 text-[#1E3A5F] hover:text-[#D96B27]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-[#1E3A5F]">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-[#EFE8DC] bg-[#FAF7F2] px-5 py-4 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#4B5563]">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#4B5563]">
                <span>Delivery</span>
                <span className={deliveryCharge === 0 ? 'font-semibold text-emerald-700' : ''}>
                  {deliveryCharge === 0 ? 'FREE' : formatINR(deliveryCharge)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E6DDD0] pt-2 text-base font-bold text-[#1E3A5F]">
                <span>Total Payable</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1E3A5F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162C49]"
            >
              Proceed to Checkout
              <ArrowRight className="h-4 w-4" />
            </button>

            <a
              href={waCartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1EB958]"
            >
              <MessageCircle className="h-4 w-4" />
              Quick Order via WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
