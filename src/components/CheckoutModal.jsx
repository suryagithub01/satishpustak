import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Loader2,
  Tag,
  QrCode,
  Sparkles,
  MailCheck,
  ExternalLink,
} from 'lucide-react';
import { apiFetch, formatINR, buildWhatsAppOrderUrl } from '../utils/api';

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  settings,
  user,
  onOrderPlaced,
  onOpenAuth,
  onOpenAccount,
}) {
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    notes: '',
    accountPassword: '',
    paymentMethod: 'COD',
  });

  useEffect(() => {
    if (isOpen && user) {
      setForm((prev) => ({
        ...prev,
        customerName: prev.customerName || user.name || '',
        customerEmail: prev.customerEmail || user.email || '',
        phone: prev.phone || user.phone || '',
        address: prev.address || user.address || '',
        city: prev.city || user.city || '',
        pincode: prev.pincode || user.pincode || '',
        paymentMethod: user.preferredPayment || prev.paymentMethod || 'COD',
      }));
    }
  }, [isOpen, user]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [accountCreated, setAccountCreated] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const freeAbove = settings.freeDeliveryAbove ?? 499;
  const deliveryCharge = discountedSubtotal >= freeAbove ? 0 : (settings.deliveryCharge ?? 40);
  const total = discountedSubtotal + deliveryCharge;

  const activeAmount = placedOrder ? placedOrder.total : total;
  const showQr =
    isOpen &&
    (placedOrder
      ? placedOrder.paymentMethod === 'WhatsApp UPI'
      : form.paymentMethod === 'WhatsApp UPI');

  useEffect(() => {
    if (!showQr || !activeAmount) {
      setQrDataUrl('');
      return;
    }
    const upiId = settings.upiId || 'satishpustak@upi';
    const shopName = settings.shopName || 'Satish Pustak Bhandar';
    const note = placedOrder ? `Order ${placedOrder.orderNumber}` : `Order at ${shopName}`;
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      shopName
    )}&am=${Number(activeAmount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

    QRCode.toDataURL(upiUri, { width: 220, margin: 2, color: { dark: '#1E3A5F', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [showQr, activeAmount, settings.upiId, settings.shopName, placedOrder]);

  if (!isOpen) return null;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    setApplyingCoupon(true);
    try {
      const data = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });
      setAppliedCoupon({ ...data.coupon, discount: data.discount });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Invalid coupon code.');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          couponCode: appliedCoupon ? appliedCoupon.code : '',
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        }),
      });
      setPlacedOrder(data.order);
      setEmailStatus(data.emailStatus || null);
      setAccountCreated(Boolean(data.isNewAccount));
      onOrderPlaced(data);
    } catch (err) {
      setError(err.message || 'Could not place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setPlacedOrder(null);
    setEmailStatus(null);
    setAccountCreated(false);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[#6B7280] hover:bg-[#FAF7F2]"
        >
          <X className="h-5 w-5" />
        </button>

        {placedOrder ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-[#1E3A5F]">
              Order Placed Successfully!
            </h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              Thank you, <strong>{placedOrder.customerName}</strong>! Your order has been received
              by {settings.shopName}.
            </p>

            <div className="mt-5 rounded-xl border border-[#EAE2D6] bg-[#FAF7F2] p-4 text-left text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Order ID</span>
                <span className="font-bold text-[#1E3A5F]">{placedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Payment Mode</span>
                <span className="font-semibold">{placedOrder.paymentMethod}</span>
              </div>
              {placedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon ({placedOrder.couponCode})</span>
                  <span className="font-semibold">-{formatINR(placedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Total Payable</span>
                <span className="font-bold text-[#D96B27]">{formatINR(placedOrder.total)}</span>
              </div>
            </div>

            {emailStatus?.to && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <MailCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Confirmation email {emailStatus.mode === 'smtp' ? 'sent' : 'ready'} for{' '}
                    <strong>{emailStatus.to}</strong>
                  </span>
                </div>
                {emailStatus.previewUrl && (
                  <a
                    href={emailStatus.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#1E3A5F] underline"
                  >
                    View Email
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {placedOrder.paymentMethod === 'WhatsApp UPI' && qrDataUrl && (
              <div className="mt-4 rounded-xl border border-[#1E3A5F]/20 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                  Scan to Pay via GPay / PhonePe / Paytm
                </div>
                <img
                  src={qrDataUrl}
                  alt="UPI Payment QR"
                  className="mx-auto mt-2 h-40 w-40 rounded-lg border border-[#EAE2D6]"
                />
                <div className="mt-1 text-xs font-semibold text-[#4B5563]">
                  UPI ID: <span className="text-[#1E3A5F]">{settings.upiId || 'satishpustak@upi'}</span> •{' '}
                  {formatINR(placedOrder.total)}
                </div>
              </div>
            )}

            {accountCreated && (
              <div className="mt-3 rounded-xl border border-[#1E3A5F]/20 bg-[#1E3A5F]/5 px-4 py-2.5 text-xs text-[#1E3A5F]">
                <strong>Your account has been created &amp; signed in!</strong> You can now track
                your orders, profile, and payment details anytime.
              </div>
            )}

            <div className="mt-6 space-y-2.5">
              <button
                onClick={() => {
                  handleClose();
                  onOpenAccount?.();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1E3A5F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162C49]"
              >
                View My Orders &amp; Payment Details
              </button>

              <a
                href={buildWhatsAppOrderUrl(settings.whatsappNumber, placedOrder, settings.shopName)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1EB958]"
              >
                <MessageCircle className="h-4 w-4" />
                Send Order Confirmation on WhatsApp
              </a>

              <button
                onClick={handleClose}
                className="w-full rounded-full border border-[#E2D9CB] py-2.5 text-sm font-semibold text-[#1E3A5F] hover:bg-[#FAF7F2]"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="font-display text-2xl font-bold text-[#1E3A5F]">Complete Your Order</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Enter your details below — we&rsquo;ll automatically create your account &amp; send an
              order confirmation email.
            </p>

            {!user && onOpenAuth && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-[#EAE2D6] bg-[#FAF7F2] px-3.5 py-2 text-xs">
                <span className="text-[#4B5563]">Already have an account?</span>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="font-bold text-[#D96B27] hover:underline"
                >
                  Sign In to Auto-Fill
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    WhatsApp / Phone Number *
                  </label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Email Address * (Order confirmation will be sent here)
                </label>
                <input
                  required
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="yourname@gmail.com"
                  className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              {!user && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Set Account Password (Optional — defaults to your mobile number)
                  </label>
                  <input
                    type="password"
                    minLength={4}
                    value={form.accountPassword}
                    onChange={(e) => setForm({ ...form, accountPassword: e.target.value })}
                    placeholder="Choose a password to sign in later"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Delivery Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House/Shop No., Street, Landmark"
                  className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="City / Town"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">Pincode</label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    placeholder="e.g. 302001"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Gift Wrapping / Delivery Note (Optional)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Please gift wrap, deliver after 5 PM"
                  className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              {/* Coupon Code Box */}
              <div className="rounded-xl border border-[#EAE2D6] bg-[#FAF7F2] p-3.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#1E3A5F]">
                    <Tag className="h-3.5 w-3.5 text-[#D96B27]" />
                    Have a Promo Coupon?
                  </label>
                  <span className="text-[11px] text-[#6B7280]">
                    Try <strong className="text-[#D96B27]">WELCOME50</strong> or{' '}
                    <strong className="text-[#D96B27]">FESTIVE10</strong>
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-xl border border-[#E2D9CB] bg-white px-3 py-2 text-xs font-semibold uppercase focus:border-[#1E3A5F] focus:outline-none"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput('');
                      }}
                      className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={applyingCoupon}
                      className="rounded-xl bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162C49]"
                    >
                      {applyingCoupon ? '...' : 'Apply'}
                    </button>
                  )}
                </div>
                {couponError && <p className="mt-1.5 text-xs font-medium text-rose-600">{couponError}</p>}
                {appliedCoupon && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Applied {appliedCoupon.code} — You save {formatINR(appliedCoupon.discount)}!
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#374151]">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['COD', 'WhatsApp UPI'].map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setForm({ ...form, paymentMethod: method })}
                      className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                        form.paymentMethod === method
                          ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 text-[#1E3A5F]'
                          : 'border-[#E2D9CB] text-[#4B5563] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      {method === 'COD' ? 'Cash on Delivery' : 'Scan UPI QR Code'}
                      <span className="block text-[11px] font-normal text-[#6B7280]">
                        {method === 'COD'
                          ? 'Pay at your doorstep'
                          : 'GPay / PhonePe / Paytm'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live UPI QR Preview */}
              {form.paymentMethod === 'WhatsApp UPI' && qrDataUrl && (
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-[#1E3A5F]/20 bg-[#FAF7F2] p-4">
                  <img
                    src={qrDataUrl}
                    alt="Scan UPI QR Code"
                    className="h-32 w-32 shrink-0 rounded-xl border border-[#E2D9CB] bg-white p-1"
                  />
                  <div className="text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#1E3A5F]">
                      <QrCode className="h-4 w-4 text-[#D96B27]" />
                      Instant UPI Payment
                    </div>
                    <p className="mt-1 text-xs text-[#4B5563]">
                      Scan with any UPI app to pay <strong>{formatINR(total)}</strong> directly to{' '}
                      <strong>{settings.shopName}</strong>.
                    </p>
                    <p className="mt-1.5 text-xs font-semibold text-[#1E3A5F]">
                      UPI ID: {settings.upiId || 'satishpustak@upi'}
                    </p>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="rounded-xl border border-[#EAE2D6] bg-[#FAF7F2] p-4 text-sm space-y-1">
                <div className="flex justify-between text-[#4B5563]">
                  <span>Items ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>Coupon Discount ({appliedCoupon.code})</span>
                    <span>-{formatINR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#4B5563]">
                  <span>Delivery</span>
                  <span>{deliveryCharge === 0 ? 'FREE' : formatINR(deliveryCharge)}</span>
                </div>
                <div className="flex justify-between border-t border-[#E6DDD0] pt-1.5 text-base font-bold text-[#1E3A5F]">
                  <span>Total Payable</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1E3A5F] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162C49] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Confirm &amp; Place Order • {formatINR(total)}
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
