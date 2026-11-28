import React, { useEffect, useState } from 'react';
import {
  X,
  Package,
  Heart,
  User,
  LogOut,
  ShoppingBag,
  MessageCircle,
  RotateCcw,
  Loader2,
  CheckCircle2,
  MapPin,
  CreditCard,
  IndianRupee,
} from 'lucide-react';
import { apiFetch, formatINR, buildWhatsAppChatUrl } from '../utils/api';

const STATUS_STYLE = {
  Pending: 'bg-amber-100 text-amber-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Packed: 'bg-indigo-100 text-indigo-800',
  Shipped: 'bg-purple-100 text-purple-800',
  Delivered: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-rose-100 text-rose-700',
};

export default function UserAccountModal({
  isOpen,
  onClose,
  user,
  products,
  settings,
  onUserUpdated,
  onLogout,
  onAddToCart,
  onToggleWishlist,
}) {
  const [tab, setTab] = useState('orders'); // 'orders' | 'wishlist' | 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
    preferredPayment: 'COD',
    savedUpiId: '',
    newPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setProfileForm({
      name: user.name || '',
      email: user.email || '',
      address: user.address || '',
      city: user.city || '',
      pincode: user.pincode || '',
      preferredPayment: user.preferredPayment || 'COD',
      savedUpiId: user.savedUpiId || '',
      newPassword: '',
    });
    setLoadingOrders(true);
    apiFetch('/api/auth/orders')
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const wishlistProducts = products.filter((p) => (user.wishlist || []).includes(p.id));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const data = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      onUserUpdated(data.user);
      setProfileForm((prev) => ({ ...prev, newPassword: '' }));
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleReorder = (order) => {
    for (const it of order.items || []) {
      const prod = products.find((p) => p.id === it.productId);
      if (prod && prod.stock > 0) {
        onAddToCart(prod, it.quantity);
      }
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#FAF7F2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-[#1E3A5F] px-5 py-4 sm:px-6 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D96B27] font-display text-lg font-bold text-white">
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg sm:text-xl font-bold">{user.name}</h2>
              <p className="truncate text-xs text-white/75">
                {user.phone} {user.email ? `• ${user.email}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500/80"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-[#EAE2D6] bg-white px-3 sm:px-6">
          {[
            { id: 'orders', label: `My Orders (${orders.length})`, icon: Package },
            { id: 'payments', label: 'Payment Details', icon: CreditCard },
            { id: 'wishlist', label: `Wishlist (${wishlistProducts.length})`, icon: Heart },
            { id: 'profile', label: 'My Profile', icon: User },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition ${
                  active
                    ? 'border-[#D96B27] text-[#1E3A5F]'
                    : 'border-transparent text-[#6B7280] hover:text-[#1E3A5F]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* MY ORDERS */}
          {tab === 'orders' && (
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="flex h-40 items-center justify-center text-[#1E3A5F]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-2xl border border-[#EAE2D6] bg-white p-10 text-center">
                  <Package className="mx-auto h-10 w-10 text-[#B8A791]" />
                  <p className="mt-3 font-display text-lg font-bold text-[#1E3A5F]">
                    No orders yet
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Your stationery &amp; gift orders will appear here with live status tracking.
                  </p>
                </div>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-2xl border border-[#EAE2D6] bg-white p-4 sm:p-5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F3EDE3] pb-3">
                      <div>
                        <span className="font-bold text-[#1E3A5F]">{o.orderNumber}</span>
                        <span className="ml-2 text-xs text-[#8A8175]">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          STATUS_STYLE[o.status] || 'bg-gray-100'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-[#4B5563]">
                          <span>
                            {it.name} × <strong>{it.quantity}</strong>
                          </span>
                          <span className="font-semibold">{formatINR(it.price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#F3EDE3] pt-3">
                      <div className="text-sm font-bold text-[#1E3A5F]">
                        Total: {formatINR(o.total)}{' '}
                        <span className="text-xs font-normal text-[#6B7280]">
                          ({o.paymentMethod})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReorder(o)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#1E3A5F] px-3 py-1.5 text-xs font-semibold text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Order Again
                        </button>
                        <a
                          href={buildWhatsAppChatUrl(
                            settings.whatsappNumber,
                            `Namaste ${settings.shopName}! I need help with my order ${o.orderNumber}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1EB958]"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Help
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PAYMENT DETAILS */}
          {tab === 'payments' && (
            <div className="space-y-5">
              {/* Summary Row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#6B7280]">
                    <span>Total Spent</span>
                    <IndianRupee className="h-4 w-4 text-[#1E3A5F]" />
                  </div>
                  <div className="mt-1.5 text-xl font-bold text-[#1E3A5F]">
                    {formatINR(
                      orders
                        .filter((o) => o.status !== 'Cancelled')
                        .reduce((s, o) => s + (o.total || 0), 0)
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4">
                  <div className="text-xs font-semibold text-[#6B7280]">Coupon Savings</div>
                  <div className="mt-1.5 text-xl font-bold text-emerald-700">
                    {formatINR(orders.reduce((s, o) => s + (o.discount || 0), 0))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4">
                  <div className="text-xs font-semibold text-[#6B7280]">Saved Payment Mode</div>
                  <div className="mt-1.5 text-base font-bold text-[#D96B27]">
                    {profileForm.preferredPayment === 'WhatsApp UPI'
                      ? 'UPI QR Payment'
                      : 'Cash on Delivery'}
                  </div>
                </div>
              </div>

              {/* Preferred Payment Settings */}
              <form
                onSubmit={handleSaveProfile}
                className="rounded-2xl border border-[#EAE2D6] bg-white p-5 space-y-4"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-[#1E3A5F]">
                  <CreditCard className="h-4 w-4 text-[#D96B27]" />
                  Saved Payment Preferences
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#374151]">
                      Preferred Checkout Payment Mode
                    </label>
                    <select
                      value={profileForm.preferredPayment}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, preferredPayment: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                    >
                      <option value="COD">Cash on Delivery (COD)</option>
                      <option value="WhatsApp UPI">UPI QR Payment (GPay / PhonePe / Paytm)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#374151]">
                      Your UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={profileForm.savedUpiId}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, savedUpiId: e.target.value })
                      }
                      placeholder="e.g. yourname@okicici"
                      className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-full bg-[#1E3A5F] px-5 py-2 text-xs font-semibold text-white hover:bg-[#162C49]"
                  >
                    {savingProfile ? 'Saving...' : 'Save Payment Preferences'}
                  </button>
                  {profileSaved && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved!
                    </span>
                  )}
                </div>
              </form>

              {/* Payment History */}
              <div className="rounded-2xl border border-[#EAE2D6] bg-white p-5">
                <h3 className="font-display text-base font-bold text-[#1E3A5F]">
                  Your Payment History
                </h3>
                {orders.length === 0 ? (
                  <p className="mt-3 text-xs text-[#6B7280]">No payment transactions yet.</p>
                ) : (
                  <div className="mt-3 divide-y divide-[#F3EDE3]">
                    {orders.map((o) => {
                      const payStatus =
                        o.status === 'Delivered'
                          ? 'Paid'
                          : o.status === 'Cancelled'
                          ? 'Cancelled'
                          : o.paymentStatus ||
                            (o.paymentMethod === 'WhatsApp UPI'
                              ? 'UPI Payment'
                              : 'Pay on Delivery');
                      return (
                        <div
                          key={o.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs sm:text-sm"
                        >
                          <div>
                            <div className="font-bold text-[#1E3A5F]">{o.orderNumber}</div>
                            <div className="text-[11px] text-[#8A8175]">
                              {new Date(o.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              • {o.paymentMethod}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#1F242D]">{formatINR(o.total)}</div>
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                payStatus === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : payStatus === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {payStatus}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WISHLIST */}
          {tab === 'wishlist' && (
            <div>
              {wishlistProducts.length === 0 ? (
                <div className="rounded-2xl border border-[#EAE2D6] bg-white p-10 text-center">
                  <Heart className="mx-auto h-10 w-10 text-[#B8A791]" />
                  <p className="mt-3 font-display text-lg font-bold text-[#1E3A5F]">
                    Your wishlist is empty
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Tap the heart icon on any stationery or gift item to save it here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {wishlistProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex gap-3 rounded-2xl border border-[#EAE2D6] bg-white p-3"
                    >
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover bg-[#FAF7F2]"
                      />
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <div className="line-clamp-2 text-xs font-bold text-[#1F242D]">
                            {p.name}
                          </div>
                          <div className="mt-1 text-sm font-bold text-[#1E3A5F]">
                            {formatINR(p.price)}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              onAddToCart(p, 1);
                              onClose();
                            }}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#1E3A5F] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#162C49]"
                          >
                            <ShoppingBag className="h-3 w-3" />
                            Add to Cart
                          </button>
                          <button
                            onClick={() => onToggleWishlist(p.id)}
                            className="rounded-full border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE & ADDRESS */}
          {tab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="rounded-2xl border border-[#EAE2D6] bg-white p-5 space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[#1E3A5F]">
                <MapPin className="h-4 w-4 text-[#D96B27]" />
                Saved Profile &amp; Default Delivery Address
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Delivery Address (Auto-filled at Checkout)
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    placeholder="House/Shop No., Street, Landmark"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">City</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">Pincode</label>
                  <input
                    type="text"
                    value={profileForm.pincode}
                    onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Change Password (optional)
                  </label>
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, newPassword: e.target.value })
                    }
                    placeholder="Leave blank to keep current password"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-full bg-[#1E3A5F] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#162C49]"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
                {profileSaved && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Profile saved!
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
