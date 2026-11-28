import React, { Suspense, lazy, useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Navbar from './components/Navbar';
import Storefront from './components/Storefront';
import { apiFetch } from './utils/api';

const ProductModal = lazy(() => import('./components/ProductModal'));
const CartDrawer = lazy(() => import('./components/CartDrawer'));
const CheckoutModal = lazy(() => import('./components/CheckoutModal'));
const OrderTrackerModal = lazy(() => import('./components/OrderTrackerModal'));
const BooklistQuoteModal = lazy(() => import('./components/BooklistQuoteModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const UserAccountModal = lazy(() => import('./components/UserAccountModal'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

function isAdminPath() {
  return (
    window.location.pathname === '/admin' ||
    window.location.pathname.startsWith('/admin/') ||
    window.location.hash === '#admin'
  );
}

function readStoreCache() {
  try {
    return JSON.parse(localStorage.getItem('spb_store_cache') || 'null');
  } catch {
    return null;
  }
}

export default function App() {
  const initialCache = readStoreCache();

  const [view, setView] = useState(() => (isAdminPath() ? 'admin' : 'store'));
  const [loading, setLoading] = useState(() => !initialCache);
  const [settings, setSettings] = useState(
    () =>
      initialCache?.settings || {
        shopName: 'Satish Pustak Bhandar',
        tagline: 'Books, Fine Stationery & Thoughtful Gifts',
        whatsappNumber: '919876543210',
      }
  );
  const [categories, setCategories] = useState(() => initialCache?.categories || []);
  const [products, setProducts] = useState(() => initialCache?.products || []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [booklistOpen, setBooklistOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState('');
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState('');

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('spb_cart') || '[]');
    } catch {
      return [];
    }
  });

  const loadStore = async () => {
    try {
      const data = await apiFetch('/api/store');
      setSettings(data.settings || {});
      setCategories(data.categories || []);
      setProducts(data.products || []);
      try {
        localStorage.setItem(
          'spb_store_cache',
          JSON.stringify({
            settings: data.settings || {},
            categories: data.categories || [],
            products: data.products || [],
          })
        );
      } catch {
        // ignore storage quota errors
      }
    } catch (err) {
      console.error('Failed to load store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
    if (localStorage.getItem('spb_user_token')) {
      apiFetch('/api/auth/me')
        .then((d) => setUser(d.user))
        .catch(() => localStorage.removeItem('spb_user_token'));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('spb_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const syncRoute = () => {
      setView(isAdminPath() ? 'admin' : 'store');
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const backToStore = () => {
    window.history.pushState({}, '', '/');
    setView('store');
    loadStore();
  };

  const handleAddToCart = (product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(product.stock || 99, i.quantity + qty) }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: qty,
        },
      ];
    });
    showToast(`Added "${product.name}" to bag`);
  };

  const handleUpdateQty = (productId, newQty) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: newQty } : i))
    );
  };

  const handleRemoveCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleOrderPlaced = (data) => {
    setCart([]);
    loadStore();
    if (data?.token) {
      localStorage.setItem('spb_user_token', data.token);
    }
    if (data?.user) {
      setUser(data.user);
    } else if (localStorage.getItem('spb_user_token')) {
      apiFetch('/api/auth/me').then((d) => setUser(d.user)).catch(() => {});
    }
  };

  const handleToggleWishlist = async (productId) => {
    if (!user) {
      setAuthOpen(true);
      showToast('Sign in to save items to your wishlist');
      return;
    }
    try {
      const data = await apiFetch(`/api/auth/wishlist/${productId}`, { method: 'POST' });
      setUser(data.user);
      const saved = (data.wishlist || []).includes(productId);
      showToast(saved ? 'Saved to your wishlist' : 'Removed from wishlist');
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleUserLogout = () => {
    localStorage.removeItem('spb_user_token');
    setUser(null);
    showToast('Signed out');
  };

  if (view === 'admin') {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] text-[#1E3A5F]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <AdminPanel onBackToStore={backToStore} onStoreMutated={loadStore} />
      </Suspense>
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const categoryNameMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Navbar
        settings={settings}
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenTracker={() => setTrackerOpen(true)}
        onOpenAuth={() => {
          setAuthPrompt('');
          setPendingCheckout(false);
          setAuthOpen(true);
        }}
        onOpenAccount={() => setAccountOpen(true)}
      />

      {loading ? (
        <div className="flex h-[60vh] items-center justify-center text-[#1E3A5F]">
          <Loader2 className="h-9 w-9 animate-spin" />
        </div>
      ) : (
        <Storefront
          settings={settings}
          categories={categories}
          products={products}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddToCart={handleAddToCart}
          onSelectProduct={setSelectedProduct}
          onOpenTracker={() => setTrackerOpen(true)}
          onOpenBooklist={() => setBooklistOpen(true)}
          wishlist={user?.wishlist || []}
          onToggleWishlist={handleToggleWishlist}
        />
      )}

      <Suspense fallback={null}>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            categoryName={categoryNameMap[selectedProduct.categoryId] || ''}
            settings={settings}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
        )}

        {cartOpen && (
          <CartDrawer
            isOpen={cartOpen}
            onClose={() => setCartOpen(false)}
            cart={cart}
            settings={settings}
            onUpdateQty={handleUpdateQty}
            onRemove={handleRemoveCart}
            onCheckout={() => {
              setCartOpen(false);
              setCheckoutOpen(true);
            }}
          />
        )}

        {checkoutOpen && (
          <CheckoutModal
            isOpen={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            cart={cart}
            settings={settings}
            user={user}
            onOrderPlaced={handleOrderPlaced}
            onOpenAuth={() => {
              setCheckoutOpen(false);
              setPendingCheckout(true);
              setAuthPrompt('Sign in to auto-fill your saved address & view your orders.');
              setAuthOpen(true);
            }}
            onOpenAccount={() => {
              setCheckoutOpen(false);
              setAccountOpen(true);
            }}
          />
        )}

        {trackerOpen && (
          <OrderTrackerModal isOpen={trackerOpen} onClose={() => setTrackerOpen(false)} />
        )}

        {booklistOpen && (
          <BooklistQuoteModal
            isOpen={booklistOpen}
            onClose={() => setBooklistOpen(false)}
            settings={settings}
          />
        )}

        {authOpen && (
          <AuthModal
            isOpen={authOpen}
            onClose={() => {
              setAuthOpen(false);
              setAuthPrompt('');
              setPendingCheckout(false);
            }}
            settings={settings}
            promptMessage={authPrompt}
            onAuthSuccess={(u) => {
              setUser(u);
              setAuthPrompt('');
              showToast(`Welcome, ${u.name}!`);
              if (pendingCheckout) {
                setPendingCheckout(false);
                setCheckoutOpen(true);
              }
            }}
          />
        )}

        {accountOpen && (
          <UserAccountModal
            isOpen={accountOpen}
            onClose={() => setAccountOpen(false)}
            user={user}
            products={products}
            settings={settings}
            onUserUpdated={setUser}
            onLogout={handleUserLogout}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
          />
        )}
      </Suspense>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1E3A5F] px-5 py-2.5 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-[#25D366]" />
          {toast}
        </div>
      )}
    </div>
  );
}
