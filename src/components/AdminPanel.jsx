import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  Settings,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Upload,
  MessageCircle,
  ArrowLeft,
  AlertTriangle,
  IndianRupee,
  CheckCircle2,
  Clock,
  Lock,
  Loader2,
  X,
  Menu,
  Image as ImageIcon,
  Globe,
  PhoneCall,
  Printer,
  TicketPercent,
  ClipboardList,
  Users,
  Mail,
  Download,
  Send,
  ExternalLink,
} from 'lucide-react';
import { apiFetch, formatINR, buildWhatsAppCustomerUpdateUrl, buildWhatsAppChatUrl } from '../utils/api';
import InvoiceModal from './InvoiceModal';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

const STATUS_BADGE = {
  Pending: 'bg-amber-100 text-amber-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Packed: 'bg-indigo-100 text-indigo-800',
  Shipped: 'bg-purple-100 text-purple-800',
  Delivered: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-rose-100 text-rose-700',
};

export default function AdminPanel({ onBackToStore, onStoreMutated }) {
  const [token, setToken] = useState(() => localStorage.getItem('spb_admin_token') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [promoForm, setPromoForm] = useState({
    target: 'all',
    subject: 'Festive & Back-to-School Sale at Satish Pustak Bhandar!',
    message:
      'Namaste! Enjoy special discounts on notebooks, fountain pen gift sets, art supplies, and festive gift hampers. Visit our store or order online today!',
    couponCode: 'FESTIVE10',
  });
  const [sendingPromo, setSendingPromo] = useState(false);
  const [promoResult, setPromoResult] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [invoiceMode, setInvoiceMode] = useState('invoice'); // 'invoice' | 'label'
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'flat',
    value: '',
    minOrder: 299,
    description: '',
  });

  // Filters & Modals
  const [orderFilter, setOrderFilter] = useState('All');
  const [productSearch, setProductSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState(null); // null | 'new' | product obj
  const [productForm, setProductForm] = useState({});
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingBrand, setUploadingBrand] = useState(''); // '' | 'logoUrl' | 'heroImageUrl'
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/bootstrap');
      setDashboard(data.dashboard);
      setProducts(data.products || []);
      setCategories(data.categories || []);
      setOrders(data.orders || []);
      setSettings(data.settings || {});
      setCoupons(data.coupons || []);
      setQuotes(data.quotes || []);
      setCustomers(data.customers || []);
    } catch (err) {
      if (String(err.message).toLowerCase().includes('unauthorized')) {
        localStorage.removeItem('spb_admin_token');
        setToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadAllAdminData();
    const timer = setInterval(() => {
      apiFetch('/api/admin/bootstrap')
        .then((data) => {
          setDashboard(data.dashboard);
          setProducts(data.products || []);
          setCategories(data.categories || []);
          setOrders(data.orders || []);
          setCoupons(data.coupons || []);
          setQuotes(data.quotes || []);
          setCustomers(data.customers || []);
        })
        .catch(() => {});
    }, 20000);
    return () => clearInterval(timer);
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const data = await apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });
      localStorage.setItem('spb_admin_token', data.token);
      setToken(data.token);
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spb_admin_token');
    setToken('');
  };

  // Product modal handlers
  const openNewProduct = () => {
    setProductForm({
      name: '',
      sku: '',
      categoryId: categories[0]?.id || '',
      price: '',
      mrp: '',
      stock: 20,
      image: '/images/products/notebooks-set.jpg',
      featured: false,
      badge: '',
      description: '',
      highlights: '',
      active: true,
    });
    setEditingProduct('new');
  };

  const openEditProduct = (p) => {
    setProductForm({
      ...p,
      highlights: Array.isArray(p.highlights) ? p.highlights.join('\n') : p.highlights || '',
    });
    setEditingProduct(p);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const data = await apiFetch('/api/admin/upload', { method: 'POST', body: fd });
      setProductForm((prev) => ({ ...prev, image: data.url }));
      showToast('Image uploaded!');
    } catch (err) {
      showToast(`Upload error: ${err.message}`);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleBrandImageUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBrand(field);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const data = await apiFetch('/api/admin/upload', { method: 'POST', body: fd });
      setSettings((prev) => ({ ...prev, [field]: data.url }));
      showToast(field === 'logoUrl' ? 'Logo uploaded! Click Save Settings to publish.' : 'Hero banner uploaded! Click Save Settings to publish.');
    } catch (err) {
      showToast(`Upload error: ${err.message}`);
    } finally {
      setUploadingBrand('');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct === 'new') {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(productForm),
        });
        showToast('Product added!');
      } else {
        await apiFetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(productForm),
        });
        showToast('Product updated!');
      }
      setEditingProduct(null);
      await loadAllAdminData();
      onStoreMutated();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      showToast('Product deleted.');
      await loadAllAdminData();
      onStoreMutated();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(`Order marked as ${status}`);
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim(), icon: 'Tag' }),
      });
      setNewCategoryName('');
      showToast('Category added!');
      await loadAllAdminData();
      onStoreMutated();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      showToast('Category deleted.');
      await loadAllAdminData();
      onStoreMutated();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(couponForm),
      });
      setCouponForm({ code: '', type: 'flat', value: '', minOrder: 299, description: '' });
      showToast('Coupon created!');
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleToggleCoupon = async (c) => {
    try {
      await apiFetch(`/api/admin/coupons/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !c.active }),
      });
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteCoupon = async (id) => {
    try {
      await apiFetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      showToast('Coupon deleted.');
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleUpdateQuoteStatus = async (id, status) => {
    try {
      await apiFetch(`/api/admin/booklist-quotes/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(`Quote marked as ${status}`);
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteQuote = async (id) => {
    try {
      await apiFetch(`/api/admin/booklist-quotes/${id}`, { method: 'DELETE' });
      showToast('Quote removed.');
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleExportCustomersCSV = () => {
    const header = ['Name', 'Phone', 'Email', 'Address', 'City', 'Pincode', 'Total Orders', 'Total Spent (INR)'];
    const rows = customers.map((c) => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.city || ''}"`,
      `"${c.pincode || ''}"`,
      c.totalOrders || 0,
      c.totalSpent || 0,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'satish-pustak-bhandar-customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendPromoEmail = async (e) => {
    e.preventDefault();
    setSendingPromo(true);
    setPromoResult(null);
    try {
      const recipients =
        promoForm.target === 'all'
          ? customers.map((c) => c.email).filter(Boolean)
          : [promoForm.target];
      const res = await apiFetch('/api/admin/customers/send-email', {
        method: 'POST',
        body: JSON.stringify({
          recipients,
          subject: promoForm.subject,
          message: promoForm.message,
          couponCode: promoForm.couponCode,
        }),
      });
      setPromoResult(res);
      showToast(`Offer email ready/sent for ${res.sentCount} customer(s)!`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSendingPromo(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...settings,
          ...(newPassword.trim() ? { newPassword: newPassword.trim() } : {}),
        }),
      });
      setNewPassword('');
      showToast('Store settings saved!');
      await loadAllAdminData();
      onStoreMutated();
    } catch (err) {
      showToast(err.message);
    }
  };

  // ==========================================
  // LOGIN VIEW
  // ==========================================
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#EAE2D6] bg-white p-8 shadow-xl">
          <button
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#1E3A5F]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Storefront
          </button>

          <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E3A5F] text-white">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-[#1E3A5F]">
            Satish Pustak Bhandar
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">Authorized Store Manager Sign In</p>

          {loginError && (
            <div className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#374151]">Username</label>
              <input
                required
                type="text"
                name="username"
                autoComplete="username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="Enter store admin username"
                className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#374151]">Password</label>
              <input
                required
                type="password"
                name="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Enter store admin password"
                className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1E3A5F] py-3 text-sm font-semibold text-white transition hover:bg-[#162C49]"
            >
              {loggingIn && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In to Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const filteredAdminProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(productSearch.toLowerCase())
  );
  const filteredOrders =
    orderFilter === 'All' ? orders : orders.filter((o) => o.status === orderFilter);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: `Products (${products.length})`, icon: Package },
    { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingCart },
    { id: 'customers', label: `Customers (${customers.length})`, icon: Users },
    { id: 'quotes', label: `Booklist Quotes (${quotes.length})`, icon: ClipboardList },
    { id: 'coupons', label: `Coupons (${coupons.length})`, icon: TicketPercent },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'settings', label: 'Logo, Contact & Shop', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-[#1E3A5F] px-4 py-3 text-white shadow-sm lg:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-8 w-8 rounded-lg bg-white object-contain p-0.5 shrink-0"
            />
          ) : null}
          <div className="truncate">
            <div className="truncate font-display text-base font-bold">
              {settings?.shopName || 'Satish Pustak Bhandar'}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/65">Admin Panel</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToStore}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Store
          </button>
          <button
            onClick={() => setMobileNavOpen((o) => !o)}
            className="rounded-lg bg-white/10 p-2 text-white"
            aria-label="Toggle admin menu"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar (Desktop always visible, Mobile slide-down drawer) */}
      <aside
        className={`${
          mobileNavOpen ? 'flex' : 'hidden'
        } lg:flex w-full lg:w-64 shrink-0 bg-[#1E3A5F] text-white flex-col justify-between lg:sticky lg:top-0 lg:h-screen`}
      >
        <div>
          <div className="hidden lg:flex items-center gap-3 border-b border-white/10 px-5 py-5">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Shop Logo"
                className="h-10 w-10 rounded-xl bg-white object-contain p-1 shrink-0"
              />
            ) : null}
            <div className="min-w-0">
              <div className="truncate font-display text-base font-bold leading-snug">
                {settings?.shopName || 'Satish Pustak Bhandar'}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-white/65">
                Admin Control Center
              </div>
            </div>
          </div>

          <nav className="p-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    active ? 'bg-[#D96B27] text-white shadow-xs' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-3 flex lg:flex-col gap-2">
          <button
            onClick={onBackToStore}
            className="flex flex-1 items-center justify-center lg:justify-start gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            View Storefront
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center lg:justify-start gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {toast && (
          <div className="fixed right-6 top-6 z-50 rounded-xl bg-[#1E3A5F] px-4 py-3 text-sm font-semibold text-white shadow-lg">
            {toast}
          </div>
        )}

        {loading && !dashboard ? (
          <div className="flex h-64 items-center justify-center text-[#1E3A5F]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : null}

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">Shop Overview</h1>
                <p className="text-sm text-[#6B7280]">
                  Real-time sales, order queue, and inventory health.
                </p>
              </div>
              <button
                onClick={() => {
                  setTab('products');
                  openNewProduct();
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#D96B27] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#C15B1D]"
              >
                <Plus className="h-4 w-4" />
                Add New Item
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-[#6B7280]">
                  <span>Total Revenue</span>
                  <IndianRupee className="h-4 w-4 text-emerald-600 shrink-0" />
                </div>
                <div className="mt-2 text-lg sm:text-2xl font-bold text-[#1E3A5F]">
                  {formatINR(dashboard.stats.totalRevenue)}
                </div>
              </div>

              <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-[#6B7280]">
                  <span>Total Orders</span>
                  <ShoppingCart className="h-4 w-4 text-[#1E3A5F] shrink-0" />
                </div>
                <div className="mt-2 text-lg sm:text-2xl font-bold text-[#1E3A5F]">
                  {dashboard.stats.totalOrders}
                </div>
              </div>

              <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-[#6B7280]">
                  <span>Pending Orders</span>
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                </div>
                <div className="mt-2 text-lg sm:text-2xl font-bold text-amber-600">
                  {dashboard.stats.pendingOrders}
                </div>
              </div>

              <div className="rounded-2xl border border-[#EAE2D6] bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-[#6B7280]">
                  <span>Low Stock Items</span>
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                </div>
                <div className="mt-2 text-lg sm:text-2xl font-bold text-rose-600">
                  {dashboard.stats.lowStockCount}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* Recent Orders */}
              <div className="xl:col-span-2 rounded-2xl border border-[#EAE2D6] bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#1E3A5F]">Recent Orders</h2>
                  <button
                    onClick={() => setTab('orders')}
                    className="text-xs font-semibold text-[#D96B27] hover:underline"
                  >
                    Manage All
                  </button>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#EFE8DC] text-xs text-[#6B7280]">
                        <th className="pb-2.5">Order ID</th>
                        <th className="pb-2.5">Customer</th>
                        <th className="pb-2.5">Total</th>
                        <th className="pb-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3EDE3]">
                      {dashboard.recentOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="py-3 font-semibold text-[#1E3A5F]">{o.orderNumber}</td>
                          <td className="py-3">
                            <div className="font-medium text-[#1F242D]">{o.customerName}</div>
                            <div className="text-xs text-[#8A8175]">{o.phone}</div>
                          </td>
                          <td className="py-3 font-semibold">{formatINR(o.total)}</td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                STATUS_BADGE[o.status] || 'bg-gray-100'
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Stock Alert */}
              <div className="rounded-2xl border border-[#EAE2D6] bg-white p-5">
                <h2 className="font-display text-lg font-bold text-[#1E3A5F]">Low Stock Alerts</h2>
                <p className="text-xs text-[#6B7280]">Items with 10 or fewer units remaining</p>
                <div className="mt-4 space-y-3">
                  {dashboard.lowStockProducts.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      All products are well stocked!
                    </div>
                  ) : (
                    dashboard.lowStockProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#EFE8DC] p-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover shrink-0"
                          />
                          <div className="truncate">
                            <div className="truncate text-xs font-semibold text-[#1F242D]">
                              {p.name}
                            </div>
                            <div className="text-[11px] font-bold text-rose-600">
                              Only {p.stock} left
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setTab('products');
                            openEditProduct(p);
                          }}
                          className="shrink-0 rounded-full bg-[#FAF7F2] px-3 py-1 text-xs font-semibold text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                        >
                          Restock
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">
                  Products &amp; Inventory
                </h1>
                <p className="text-sm text-[#6B7280]">
                  Add, edit, upload images, and update stock or pricing.
                </p>
              </div>
              <div className="flex w-full sm:w-auto flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search name or SKU..."
                  className="flex-1 sm:flex-none rounded-full border border-[#E2D9CB] bg-white px-4 py-2 text-sm focus:border-[#1E3A5F] focus:outline-none"
                />
                <button
                  onClick={openNewProduct}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1E3A5F] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#162C49]"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#EAE2D6] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#EFE8DC] bg-[#FAF7F2] text-xs font-semibold uppercase text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price / MRP</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3EDE3]">
                  {filteredAdminProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FFFDF9]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-12 w-12 rounded-lg object-cover bg-[#FAF7F2] shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-[#1F242D]">{p.name}</div>
                            <div className="text-xs text-[#8A8175]">
                              SKU: {p.sku}{' '}
                              {p.featured && (
                                <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[#4B5563]">
                        {catMap[p.categoryId] || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#1E3A5F]">{formatINR(p.price)}</span>
                        {p.mrp > p.price && (
                          <span className="ml-1.5 text-xs text-[#9A9185] line-through">
                            {formatINR(p.mrp)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            p.stock <= 5
                              ? 'bg-rose-100 text-rose-700'
                              : p.stock <= 15
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.stock} in stock
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditProduct(p)}
                            className="rounded-lg border border-[#E2D9CB] p-2 text-[#1E3A5F] hover:bg-[#FAF7F2]"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">Order Management</h1>
                <p className="text-sm text-[#6B7280]">
                  Update order statuses and send instant WhatsApp updates to customers.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['All', ...ORDER_STATUSES].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderFilter(st)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      orderFilter === st
                        ? 'bg-[#1E3A5F] text-white'
                        : 'bg-white border border-[#E2D9CB] text-[#4B5563] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-[#EAE2D6] bg-white p-10 text-center text-sm text-[#6B7280]">
                  No orders in this status.
                </div>
              ) : (
                filteredOrders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-2xl border border-[#EAE2D6] bg-white p-5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F3EDE3] pb-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-bold text-[#1E3A5F]">
                            {o.orderNumber}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              STATUS_BADGE[o.status] || 'bg-gray-100'
                            }`}
                          >
                            {o.status}
                          </span>
                          <span className="rounded-full bg-[#FAF7F2] px-2.5 py-0.5 text-xs font-medium text-[#6B7280]">
                            {o.paymentMethod}
                          </span>
                        </div>
                        <div className="mt-1.5 text-sm font-semibold text-[#1F242D]">
                          {o.customerName} • <span className="text-[#4B5563]">{o.phone}</span>
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          {o.address}
                          {o.city ? `, ${o.city}` : ''}
                          {o.pincode ? ` - ${o.pincode}` : ''}
                        </div>
                        {o.notes && (
                          <div className="mt-1 text-xs font-medium text-[#D96B27]">
                            Note: {o.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          className="rounded-full border border-[#E2D9CB] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold text-[#1E3A5F] focus:border-[#1E3A5F] focus:outline-none"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            setInvoiceMode('label');
                            setInvoiceOrder(o);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#D96B27] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#C15B1D]"
                          title="Print shipping slip to paste on box"
                        >
                          <Package className="h-3.5 w-3.5" />
                          Parcel Slip
                        </button>

                        <button
                          onClick={() => {
                            setInvoiceMode('invoice');
                            setInvoiceOrder(o);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#1E3A5F] bg-white px-3.5 py-2 text-xs font-semibold text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Tax Invoice
                        </button>

                        <a
                          href={buildWhatsAppCustomerUpdateUrl(o, settings?.shopName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1EB958]"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      </div>
                    </div>

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE8DC] text-[#8A8175]">
                            <th className="pb-2 pr-2">Item</th>
                            <th className="pb-2 px-2 text-center whitespace-nowrap">Qty</th>
                            <th className="pb-2 px-2 text-right whitespace-nowrap">Rate</th>
                            <th className="pb-2 pl-2 text-right whitespace-nowrap">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F7F3EC]">
                          {o.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2 pr-2 font-medium text-[#1F242D]">{it.name}</td>
                              <td className="py-2 px-2 text-center font-bold text-[#1E3A5F] whitespace-nowrap">
                                × {it.quantity}
                              </td>
                              <td className="py-2 px-2 text-right text-[#6B7280] whitespace-nowrap">
                                {formatINR(it.price)}
                              </td>
                              <td className="py-2 pl-2 text-right font-semibold text-[#1F242D] whitespace-nowrap">
                                {formatINR(it.price * it.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EFE8DC] pt-2.5 text-xs">
                        <div className="flex flex-wrap gap-3 text-[#6B7280]">
                          <span>Subtotal: {formatINR(o.subtotal)}</span>
                          {o.discount > 0 && (
                            <span className="font-semibold text-emerald-700">
                              Discount ({o.couponCode}): -{formatINR(o.discount)}
                            </span>
                          )}
                          <span>
                            Delivery:{' '}
                            {o.deliveryCharge === 0 ? 'FREE' : formatINR(o.deliveryCharge)}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-[#1E3A5F]">
                          Grand Total: {formatINR(o.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CUSTOMERS & UPSELL CRM TAB */}
        {tab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">
                  Customers &amp; Upsell Marketing
                </h1>
                <p className="text-sm text-[#6B7280]">
                  Every registered user &amp; buyer is saved here automatically for future sales,
                  WhatsApp offers, and email campaigns.
                </p>
              </div>
              <button
                onClick={handleExportCustomersCSV}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#1E3A5F] bg-white px-4 py-2 text-xs font-semibold text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
              >
                <Download className="h-4 w-4" />
                Export CSV (Excel)
              </button>
            </div>

            {/* Promotional / Sale Email Composer */}
            <form
              onSubmit={handleSendPromoEmail}
              className="rounded-2xl border border-[#EAE2D6] bg-white p-5 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-[#EFE8DC] pb-3">
                <Mail className="h-4 w-4 text-[#D96B27]" />
                <h2 className="font-display text-lg font-bold text-[#1E3A5F]">
                  Send Sale / Upsell Email Campaign
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Send To
                  </label>
                  <select
                    value={promoForm.target}
                    onChange={(e) => setPromoForm({ ...promoForm, target: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3 py-2 text-sm"
                  >
                    <option value="all">
                      All Customers with Email ({customers.filter((c) => c.email).length})
                    </option>
                    {customers
                      .filter((c) => c.email)
                      .map((c) => (
                        <option key={c.id} value={c.email}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Email Subject *
                  </label>
                  <input
                    required
                    type="text"
                    value={promoForm.subject}
                    onChange={(e) => setPromoForm({ ...promoForm, subject: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Highlight Coupon Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={promoForm.couponCode}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, couponCode: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. FESTIVE10"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3 py-2 text-sm uppercase font-semibold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Offer / Sale Message *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={promoForm.message}
                    onChange={(e) => setPromoForm({ ...promoForm, message: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={sendingPromo}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1E3A5F] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#162C49] disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendingPromo ? 'Sending...' : 'Send Offer Email'}
                </button>
                {promoResult?.previewUrl && (
                  <a
                    href={promoResult.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#D96B27] underline"
                  >
                    Preview Campaign Email ({promoResult.sentCount} recipient
                    {promoResult.sentCount === 1 ? '' : 's'})
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </form>

            {/* Customer Directory Table */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#1E3A5F]">
                  Saved Customer Directory ({customers.length})
                </h2>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search name, phone, email, city..."
                  className="rounded-full border border-[#E2D9CB] bg-white px-4 py-2 text-sm focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#EAE2D6] bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#EFE8DC] bg-[#FAF7F2] text-xs font-semibold uppercase text-[#6B7280]">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Contact &amp; Email</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3 whitespace-nowrap">Orders / Spend</th>
                      <th className="px-4 py-3 text-right">Upsell Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EDE3]">
                    {customers
                      .filter((c) => {
                        const q = customerSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          (c.name || '').toLowerCase().includes(q) ||
                          (c.phone || '').toLowerCase().includes(q) ||
                          (c.email || '').toLowerCase().includes(q) ||
                          (c.city || '').toLowerCase().includes(q)
                        );
                      })
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-[#FFFDF9]">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#1E3A5F]">{c.name}</div>
                            {c.lastOrderNumber && (
                              <div className="text-[11px] text-[#8A8175]">
                                Last Order: {c.lastOrderNumber}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-semibold text-[#1F242D]">{c.phone}</div>
                            <div className="text-[#6B7280]">{c.email || '—'}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#4B5563]">
                            {c.city || c.address || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-bold text-[#1E3A5F]">
                              {formatINR(c.totalSpent)}
                            </div>
                            <div className="text-[11px] text-[#6B7280]">
                              {c.totalOrders} {c.totalOrders === 1 ? 'order' : 'orders'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <a
                                href={buildWhatsAppChatUrl(
                                  c.phone,
                                  `Namaste ${c.name}! Special offer from *${
                                    settings?.shopName || 'Satish Pustak Bhandar'
                                  }* — Use code *FESTIVE10* for 10% OFF on stationery, notebooks & gift hampers!`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1EB958]"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp Offer
                              </a>
                              {c.email && (
                                <button
                                  onClick={() =>
                                    setPromoForm((prev) => ({ ...prev, target: c.email }))
                                  }
                                  className="inline-flex items-center gap-1 rounded-full border border-[#E2D9CB] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  Email
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* BOOKLIST QUOTES TAB */}
        {tab === 'quotes' && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">
                School Booklist &amp; Photo Quote Requests
              </h1>
              <p className="text-sm text-[#6B7280]">
                Review uploaded school booklist photos and send quotes directly on WhatsApp.
              </p>
            </div>

            {quotes.length === 0 ? (
              <div className="rounded-2xl border border-[#EAE2D6] bg-white p-10 text-center text-sm text-[#6B7280]">
                No booklist requests yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {quotes.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-[#EAE2D6] bg-white p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex gap-4">
                      {q.imageUrl && (
                        <a
                          href={q.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={q.imageUrl}
                            alt="Booklist"
                            className="h-24 w-24 rounded-xl border border-[#EAE2D6] object-cover"
                          />
                        </a>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#1E3A5F] truncate">{q.customerName}</span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              q.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : q.status === 'Quoted'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {q.status}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[#4B5563]">{q.phone}</div>
                        {q.schoolOrClass && (
                          <div className="mt-1 text-xs font-semibold text-[#D96B27]">
                            {q.schoolOrClass}
                          </div>
                        )}
                        {q.notes && <p className="mt-1 text-xs text-[#6B7280]">{q.notes}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F3EDE3] pt-3">
                      <select
                        value={q.status}
                        onChange={(e) => handleUpdateQuoteStatus(q.id, e.target.value)}
                        className="rounded-full border border-[#E2D9CB] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#1E3A5F]"
                      >
                        {['New', 'Quoted', 'Completed'].map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <a
                          href={buildWhatsAppChatUrl(
                            q.phone,
                            `Namaste ${q.customerName}! Regarding your booklist / stationery request (${q.schoolOrClass || 'Custom List'}) at ${settings?.shopName || 'Satish Pustak Bhandar'} — your bundle is ready! Total quote: ₹`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1EB958]"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Reply Quote
                        </a>
                        <button
                          onClick={() => handleDeleteQuote(q.id)}
                          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COUPONS TAB */}
        {tab === 'coupons' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">
                Promo &amp; Festive Discount Coupons
              </h1>
              <p className="text-sm text-[#6B7280]">
                Create flat (₹) or percentage (%) discount codes customers can apply at checkout.
              </p>
            </div>

            <form
              onSubmit={handleAddCoupon}
              className="grid grid-cols-1 gap-3 rounded-2xl border border-[#EAE2D6] bg-white p-5 sm:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Coupon Code *
                </label>
                <input
                  required
                  type="text"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SCHOOL15"
                  className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm uppercase font-semibold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Discount Type
                </label>
                <select
                  value={couponForm.type}
                  onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                  className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                >
                  <option value="flat">Flat Amount (₹)</option>
                  <option value="percent">Percentage (%)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Discount Value *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={couponForm.value}
                  onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })}
                  placeholder={couponForm.type === 'percent' ? 'e.g. 10 (%)' : 'e.g. 50 (₹)'}
                  className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Minimum Order (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={couponForm.minOrder}
                  onChange={(e) => setCouponForm({ ...couponForm, minOrder: e.target.value })}
                  className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <input
                  type="text"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  placeholder="Short description (optional)"
                  className="flex-1 rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1E3A5F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#162C49]"
                >
                  <Plus className="h-4 w-4" />
                  Create
                </button>
              </div>
            </form>

            <div className="divide-y divide-[#F3EDE3] rounded-2xl border border-[#EAE2D6] bg-white">
              {coupons.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-[#FAF7F2] border border-[#E2D9CB] px-2.5 py-1 font-mono text-sm font-bold text-[#1E3A5F]">
                        {c.code}
                      </span>
                      <span className="text-sm font-bold text-[#D96B27]">
                        {c.type === 'percent' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                      </span>
                      <span className="text-xs text-[#6B7280]">Min ₹{c.minOrder}</span>
                    </div>
                    {c.description && <p className="mt-1 text-xs text-[#6B7280]">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleCoupon(c)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        c.active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.active ? 'Active' : 'Paused'}
                    </button>
                    <button
                      onClick={() => handleDeleteCoupon(c.id)}
                      className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {tab === 'categories' && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">Categories</h1>
              <p className="text-sm text-[#6B7280]">Organize your stationery &amp; gift sections.</p>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name (e.g. Exam Guides)"
                className="flex-1 rounded-full border border-[#E2D9CB] bg-white px-4 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1E3A5F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#162C49]"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </form>

            <div className="divide-y divide-[#F3EDE3] rounded-2xl border border-[#EAE2D6] bg-white">
              {categories.map((cat) => {
                const count = products.filter((p) => p.categoryId === cat.id).length;
                return (
                  <div key={cat.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <div className="font-semibold text-[#1F242D]">{cat.name}</div>
                      <div className="text-xs text-[#8A8175]">{count} products</div>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                      title="Delete category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && settings && (
          <form onSubmit={handleSaveSettings} className="max-w-4xl space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1E3A5F]">
                Logo, Branding &amp; Contact Settings
              </h1>
              <p className="text-sm text-[#6B7280]">
                Fully customize your shop logo, hero banner, contact details, WhatsApp ordering
                number, delivery charges, and admin password.
              </p>
            </div>

            {/* Section 1: Logo & Branding */}
            <div className="rounded-2xl border border-[#EAE2D6] bg-white p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-[#EFE8DC] pb-3">
                <ImageIcon className="h-4 w-4 text-[#D96B27]" />
                <h2 className="font-display text-lg font-bold text-[#1E3A5F]">
                  Shop Logo &amp; Hero Branding
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Logo Uploader */}
                <div className="sm:col-span-2 rounded-xl border border-[#EFE8DC] bg-[#FAF7F2] p-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                    Shop Logo (Shown in Navbar, Footer &amp; Admin)
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E2D9CB] bg-white p-1.5">
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt="Shop Logo Preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] font-semibold text-[#9A9185] text-center">
                          Default Icon
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-[200px] space-y-2">
                      <input
                        type="text"
                        value={settings.logoUrl || ''}
                        onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                        placeholder="Paste logo image URL or upload from device"
                        className="w-full rounded-xl border border-[#E2D9CB] bg-white px-3.5 py-2 text-sm"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1E3A5F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#162C49]">
                          <Upload className="h-3.5 w-3.5" />
                          {uploadingBrand === 'logoUrl' ? 'Uploading...' : 'Upload Logo'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleBrandImageUpload('logoUrl', e)}
                            className="hidden"
                          />
                        </label>
                        {settings.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, logoUrl: '' })}
                            className="rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Reset to Default Icon
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hero Banner Uploader */}
                <div className="sm:col-span-2 rounded-xl border border-[#EFE8DC] bg-[#FAF7F2] p-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                    Homepage Hero Banner Image
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <img
                      src={settings.heroImageUrl || '/images/hero-banner.jpg'}
                      alt="Hero Preview"
                      className="h-16 w-28 shrink-0 rounded-xl border border-[#E2D9CB] object-cover"
                    />
                    <div className="flex-1 min-w-[200px] flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={settings.heroImageUrl || ''}
                        onChange={(e) => setSettings({ ...settings, heroImageUrl: e.target.value })}
                        className="flex-1 min-w-[180px] rounded-xl border border-[#E2D9CB] bg-white px-3.5 py-2 text-sm"
                      />
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white border border-[#E2D9CB] px-3.5 py-2 text-xs font-semibold text-[#1E3A5F] hover:bg-[#EFE8DC]">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingBrand === 'heroImageUrl' ? 'Uploading...' : 'Upload Banner'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleBrandImageUpload('heroImageUrl', e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    value={settings.shopName || ''}
                    onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">Tagline</label>
                  <input
                    type="text"
                    value={settings.tagline || ''}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Hero Headline
                  </label>
                  <input
                    type="text"
                    value={settings.heroTitle || ''}
                    onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Hero Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={settings.heroSubtitle || ''}
                    onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Top Announcement Banner
                  </label>
                  <input
                    type="text"
                    value={settings.announcementBanner || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, announcementBanner: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Location Details */}
            <div className="rounded-2xl border border-[#EAE2D6] bg-white p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EFE8DC] pb-3">
                <PhoneCall className="h-4 w-4 text-[#25D366]" />
                <h2 className="font-display text-lg font-bold text-[#1E3A5F]">
                  Contact, WhatsApp &amp; Store Location
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#128C7E]">
                    WhatsApp Number (with country code, e.g. 919876543210)
                  </label>
                  <input
                    type="text"
                    value={settings.whatsappNumber || ''}
                    onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    className="w-full rounded-xl border border-[#25D366] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Primary Phone Number
                  </label>
                  <input
                    type="text"
                    value={settings.phone || ''}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Alternate Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.alternatePhone || ''}
                    onChange={(e) => setSettings({ ...settings, alternatePhone: e.target.value })}
                    placeholder="e.g. +91 98290 00000"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={settings.email || ''}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Full Shop Address
                  </label>
                  <input
                    type="text"
                    value={settings.address || ''}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Google Maps Link (for &ldquo;Get Directions&rdquo; button)
                  </label>
                  <input
                    type="url"
                    value={settings.googleMapsUrl || ''}
                    onChange={(e) => setSettings({ ...settings, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Opening Hours
                  </label>
                  <input
                    type="text"
                    value={settings.openingHours || ''}
                    onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Instagram Page URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={settings.instagramUrl || ''}
                    onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                    placeholder="https://instagram.com/..."
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Facebook Page URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={settings.facebookUrl || ''}
                    onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                    placeholder="https://facebook.com/..."
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Delivery, Payments & Security */}
            <div className="rounded-2xl border border-[#EAE2D6] bg-white p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EFE8DC] pb-3">
                <Globe className="h-4 w-4 text-[#1E3A5F]" />
                <h2 className="font-display text-lg font-bold text-[#1E3A5F]">
                  Delivery, UPI &amp; Admin Security
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">UPI ID</label>
                  <input
                    type="text"
                    value={settings.upiId || ''}
                    onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.gstNumber || ''}
                    onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                    placeholder="e.g. 08AAAAA0000A1Z5"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Free Delivery Above (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.freeDeliveryAbove ?? 499}
                    onChange={(e) =>
                      setSettings({ ...settings, freeDeliveryAbove: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Standard Delivery Charge (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.deliveryCharge ?? 40}
                    onChange={(e) => setSettings({ ...settings, deliveryCharge: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Change Admin Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 4 characters)"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Order Confirmation Email (SMTP) */}
            <div className="rounded-2xl border border-[#EAE2D6] bg-white p-5 sm:p-6 space-y-4">
              <div className="border-b border-[#EFE8DC] pb-3">
                <h2 className="font-display text-lg font-bold text-[#1E3A5F]">
                  Order Confirmation Email (SMTP)
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Enter your Gmail App Password or SMTP details to send live confirmation emails to
                  customers&rsquo; inboxes. (Leave blank to generate instant email receipt previews.)
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    SMTP Host (e.g. smtp.gmail.com)
                  </label>
                  <input
                    type="text"
                    value={settings.smtpHost || ''}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settings.smtpPort ?? 587}
                    onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    SMTP Email / Username
                  </label>
                  <input
                    type="email"
                    value={settings.smtpUser || ''}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    placeholder="yourshop@gmail.com"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    SMTP Password / Gmail App Password
                  </label>
                  <input
                    type="password"
                    value={settings.smtpPass || ''}
                    onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                    placeholder="16-char App Password"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto rounded-full bg-[#1E3A5F] px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#162C49]"
            >
              Save All Settings
            </button>
          </form>
        )}
      </main>

      {/* PRINTABLE INVOICE & PARCEL SLIP MODAL */}
      <InvoiceModal
        order={invoiceOrder}
        settings={settings}
        initialMode={invoiceMode}
        onClose={() => setInvoiceOrder(null)}
      />

      {/* ADD / EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setEditingProduct(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-[#6B7280] hover:bg-[#FAF7F2]"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="font-display text-xl font-bold text-[#1E3A5F]">
              {editingProduct === 'new' ? 'Add New Product' : 'Edit Product'}
            </h2>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Product Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={productForm.name || ''}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Category *
                  </label>
                  <select
                    required
                    value={productForm.categoryId || ''}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">SKU</label>
                  <input
                    type="text"
                    value={productForm.sku || ''}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="Auto-generated if blank"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Selling Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">MRP (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.mrp || ''}
                    onChange={(e) => setProductForm({ ...productForm, mrp: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock ?? 0}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Badge (Optional)
                  </label>
                  <input
                    type="text"
                    value={productForm.badge || ''}
                    onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                    placeholder="e.g. Bestseller, Gift Pick"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                {/* Image Upload + URL */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Product Image (Upload Photo or Paste URL)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {productForm.image && (
                      <img
                        src={productForm.image}
                        alt="Preview"
                        className="h-14 w-14 rounded-xl object-cover border border-[#EAE2D6]"
                      />
                    )}
                    <input
                      type="text"
                      value={productForm.image || ''}
                      onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                      className="flex-1 rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#FAF7F2] border border-[#E2D9CB] px-3.5 py-2 text-xs font-semibold text-[#1E3A5F] hover:bg-[#EFE8DC]">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingImg ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={productForm.description || ''}
                    onChange={(e) =>
                      setProductForm({ ...productForm, description: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Key Highlights (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={productForm.highlights || ''}
                    onChange={(e) => setProductForm({ ...productForm, highlights: e.target.value })}
                    placeholder="100 GSM paper&#10;Free gift wrapping"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2 text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#374151]">
                  <input
                    type="checkbox"
                    checked={Boolean(productForm.featured)}
                    onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                  />
                  Mark as Featured Product
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-full border border-[#E2D9CB] px-5 py-2 text-sm font-semibold text-[#4B5563]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#1E3A5F] px-6 py-2 text-sm font-semibold text-white hover:bg-[#162C49]"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
