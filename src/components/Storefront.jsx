import React, { useMemo, useState } from 'react';
import {
  ShoppingBag,
  MessageCircle,
  Sparkles,
  Truck,
  Gift,
  Clock,
  MapPin,
  Phone,
  Mail,
  SlidersHorizontal,
  BookOpen,
  PenTool,
  Palette,
  Calculator,
  Bookmark,
  Tag,
  Eye,
  ArrowRight,
  ShieldCheck,
  Upload,
  Heart,
} from 'lucide-react';
import { formatINR, buildWhatsAppChatUrl, buildWhatsAppProductUrl } from '../utils/api';

const ICON_MAP = {
  BookOpen,
  PenTool,
  Palette,
  Calculator,
  Gift,
  Bookmark,
  Tag,
};

export default function Storefront({
  settings,
  categories,
  products,
  searchQuery,
  setSearchQuery,
  onAddToCart,
  onSelectProduct,
  onOpenTracker,
  onOpenBooklist,
  wishlist = [],
  onToggleWishlist,
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  const categoryNameMap = useMemo(() => {
    const map = {};
    for (const c of categories) map[c.id] = c.name;
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (categoryNameMap[p.categoryId] || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'featured') list.sort((a, b) => Number(b.featured) - Number(a.featured));
    return list;
  }, [products, selectedCategory, searchQuery, sortBy, categoryNameMap]);

  const generalWaUrl = buildWhatsAppChatUrl(
    settings.whatsappNumber,
    `Namaste ${settings.shopName}! I would like help choosing stationery or gift items.`
  );

  const bulkWaUrl = buildWhatsAppChatUrl(
    settings.whatsappNumber,
    `Namaste ${settings.shopName}! I want to inquire about bulk school/office stationery or customized festive gift hampers.`
  );

  return (
    <div id="top">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-[#EAE2D6] bg-[#1E3A5F]">
        <div className="absolute inset-0">
          <img
            src={settings.heroImageUrl || '/images/hero-banner.jpg'}
            alt={settings.shopName || 'Satish Pustak Bhandar Stationery & Gift Emporium'}
            className="h-full w-full object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#142740]/95 via-[#142740]/80 to-[#142740]/30" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] sm:text-xs font-semibold tracking-wide text-[#FDE6C4] backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Trusted Neighbourhood Stationery &amp; Gift Boutique
            </div>

            <h1 className="mt-4 sm:mt-5 font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
              {settings.heroTitle || settings.shopName || 'Satish Pustak Bhandar'}
            </h1>

            <p className="mt-3 sm:mt-4 text-sm leading-relaxed text-[#E7EEF7] sm:text-lg">
              {settings.heroSubtitle ||
                'From crisp exam registers, fountain pens, and artist watercolor kits to ribbon-tied festive gift hampers — shop everything online or order directly on WhatsApp.'}
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <a
                href="#catalog"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D96B27] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#C15B1D]"
              >
                Explore Collection
                <ArrowRight className="h-4 w-4" />
              </a>

              <a
                href={generalWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1EB958]"
              >
                <MessageCircle className="h-4 w-4" />
                Order on WhatsApp
              </a>
            </div>

            <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 border-t border-white/15 pt-5 sm:pt-6 text-white/90">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 shrink-0 text-[#F4A261]" />
                <span className="text-xs font-medium">
                  Free Delivery above {formatINR(settings.freeDeliveryAbove ?? 499)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 shrink-0 text-[#F4A261]" />
                <span className="text-xs font-medium">Custom Gift Wrapping</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-[#25D366]" />
                <span className="text-xs font-medium">Instant WhatsApp Help</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHOP BY CATEGORY */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#D96B27]">
              Curated Aisles
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#1E3A5F] sm:text-3xl">
              Shop by Category
            </h2>
          </div>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs font-semibold text-[#D96B27] hover:underline"
            >
              Show All Items
            </button>
          )}
        </div>

        <div className="mt-5 flex gap-2.5 overflow-x-auto pb-2 no-scrollbar snap-x sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:pb-0 lg:grid-cols-7">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`snap-start shrink-0 w-28 sm:w-auto flex flex-col items-center justify-center rounded-2xl border p-3 sm:p-4 text-center transition ${
              selectedCategory === 'all'
                ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white shadow-sm'
                : 'border-[#EAE2D6] bg-white text-[#1E3A5F] hover:border-[#D96B27]/50 hover:bg-[#FFFDF9]'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="mt-1.5 text-xs font-semibold">All Items</span>
            <span
              className={`mt-0.5 text-[10px] sm:text-[11px] ${
                selectedCategory === 'all' ? 'text-white/75' : 'text-[#8A8175]'
              }`}
            >
              {products.length} products
            </span>
          </button>

          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.icon] || Tag;
            const count = products.filter((p) => p.categoryId === cat.id).length;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`snap-start shrink-0 w-32 sm:w-auto flex flex-col items-center justify-center rounded-2xl border p-3 sm:p-4 text-center transition ${
                  active
                    ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white shadow-sm'
                    : 'border-[#EAE2D6] bg-white text-[#1E3A5F] hover:border-[#D96B27]/50 hover:bg-[#FFFDF9]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug">
                  {cat.name}
                </span>
                <span
                  className={`mt-0.5 text-[10px] sm:text-[11px] ${
                    active ? 'text-white/75' : 'text-[#8A8175]'
                  }`}
                >
                  {count} items
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* CATALOG GRID */}
      <section id="catalog" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#1E3A5F] sm:text-3xl">
              {selectedCategory === 'all'
                ? 'All Stationery & Gift Items'
                : categoryNameMap[selectedCategory] || 'Products'}
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Showing {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'item' : 'items'}
              {searchQuery && (
                <>
                  {' '}
                  for "<span className="font-semibold text-[#1E3A5F]">{searchQuery}</span>"
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 text-[#8A8175]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-full border border-[#E2D9CB] bg-white px-4 py-2 text-xs font-semibold text-[#1E3A5F] focus:border-[#1E3A5F] focus:outline-none sm:text-sm"
            >
              <option value="featured">Featured First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-[#EAE2D6] bg-white p-12 text-center">
            <p className="font-display text-xl font-bold text-[#1E3A5F]">No matching items found</p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Try clearing your search or ask us directly on WhatsApp — we stock thousands of items
              in-store!
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="rounded-full bg-[#1E3A5F] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Reset Filters
              </button>
              <a
                href={generalWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" />
                Ask on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const discount =
                product.mrp > product.price
                  ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                  : 0;
              const outOfStock = product.stock <= 0;

              return (
                <div
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-[#EAE2D6] bg-white shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Image */}
                  <div
                    onClick={() => onSelectProduct(product)}
                    className="relative aspect-square cursor-pointer overflow-hidden bg-[#FAF7F2]"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute left-2 top-2 sm:left-3 sm:top-3 flex flex-col gap-1">
                      {product.badge && (
                        <span className="rounded-full bg-[#D96B27] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white shadow-xs">
                          {product.badge}
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="w-fit rounded-full bg-[#1E3A5F] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white shadow-xs">
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist?.(product.id);
                      }}
                      className={`absolute right-2 top-2 sm:right-3 sm:top-3 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full shadow-xs transition ${
                        wishlist.includes(product.id)
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/90 text-[#6B7280] hover:text-rose-500'
                      }`}
                      title={wishlist.includes(product.id) ? 'Saved in Wishlist' : 'Save to Wishlist'}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                          wishlist.includes(product.id) ? 'fill-current' : ''
                        }`}
                      />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(product);
                      }}
                      className="hidden sm:flex absolute bottom-3 right-3 h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1E3A5F] opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-[#1E3A5F] hover:text-white"
                      title="Quick View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-4">
                    <div>
                      <div className="truncate text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#9A9185]">
                        {categoryNameMap[product.categoryId] || 'Stationery'}
                      </div>
                      <h3
                        onClick={() => onSelectProduct(product)}
                        className="mt-1 line-clamp-2 cursor-pointer text-xs sm:text-sm font-bold leading-snug text-[#1F242D] group-hover:text-[#1E3A5F]"
                      >
                        {product.name}
                      </h3>

                      <div className="mt-1.5 sm:mt-2.5 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                        <span className="text-sm sm:text-lg font-bold text-[#1E3A5F]">
                          {formatINR(product.price)}
                        </span>
                        {product.mrp > product.price && (
                          <span className="text-[11px] sm:text-xs text-[#9A9185] line-through">
                            {formatINR(product.mrp)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2">
                      <button
                        disabled={outOfStock}
                        onClick={() => onAddToCart(product, 1)}
                        className="flex flex-1 items-center justify-center gap-1 sm:gap-1.5 rounded-full bg-[#1E3A5F] px-2.5 py-2 sm:px-3 sm:py-2.5 text-[11px] sm:text-xs font-semibold text-white transition hover:bg-[#162C49] disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{outOfStock ? 'Sold Out' : 'Add'}</span>
                        <span className="hidden sm:inline">{outOfStock ? '' : 'to Cart'}</span>
                      </button>

                      <a
                        href={buildWhatsAppProductUrl(
                          settings.whatsappNumber,
                          product,
                          settings.shopName
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Order this item on WhatsApp"
                        className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E] transition hover:bg-[#25D366] hover:text-white"
                      >
                        <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* BULK & CUSTOM GIFT HAMPERS BANNER */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#1E3A5F] px-6 py-10 text-white shadow-lg sm:px-12 sm:py-12">
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#FDE6C4]">
                <Gift className="h-3.5 w-3.5" />
                Bulk School Lists &amp; Custom Gift Hampers
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
                Have a School Booklist or Festive Gift Order?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#D9E4F2]">
                Simply snap a photo of your school stationery list or tell us your gift budget on
                WhatsApp. We pack everything neatly with custom gift wrapping and deliver it to your
                doorstep!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={onOpenBooklist}
                className="inline-flex items-center gap-2 rounded-full bg-[#D96B27] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#C15B1D]"
              >
                <Upload className="h-4 w-4" />
                Upload Booklist Photo
              </button>
              <a
                href={bulkWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#1EB958]"
              >
                <MessageCircle className="h-5 w-5" />
                Send on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT & VISIT US SECTION */}
      <section id="contact" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#EAE2D6] bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#D96B27]">
                Get in Touch
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#1E3A5F] sm:text-3xl">
                Visit or Contact {settings.shopName}
              </h2>
            </div>
            {settings.googleMapsUrl && (
              <a
                href={settings.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#1E3A5F] px-4 py-2 text-xs font-semibold text-[#1E3A5F] transition hover:bg-[#1E3A5F] hover:text-white"
              >
                <MapPin className="h-3.5 w-3.5" />
                Get Directions on Maps
              </a>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href={`tel:${(settings.phone || '').replace(/\s+/g, '')}`}
              className="flex flex-col justify-between rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-4 transition hover:border-[#D96B27]"
            >
              <Phone className="h-5 w-5 text-[#D96B27]" />
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase text-[#8A8175]">Call Us</div>
                <div className="mt-0.5 text-sm font-bold text-[#1E3A5F]">{settings.phone}</div>
                {settings.alternatePhone && (
                  <div className="text-xs text-[#6B7280]">{settings.alternatePhone}</div>
                )}
              </div>
            </a>

            <a
              href={generalWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col justify-between rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5 p-4 transition hover:border-[#25D366]"
            >
              <MessageCircle className="h-5 w-5 text-[#128C7E]" />
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase text-[#128C7E]">WhatsApp Orders</div>
                <div className="mt-0.5 text-sm font-bold text-[#1E3A5F]">Chat Instantly</div>
                <div className="text-xs text-[#6B7280]">Quick quotes &amp; photo orders</div>
              </div>
            </a>

            <div className="flex flex-col justify-between rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-4">
              <MapPin className="h-5 w-5 text-[#D96B27]" />
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase text-[#8A8175]">Store Address</div>
                <div className="mt-0.5 text-sm font-semibold text-[#1E3A5F]">
                  {settings.address}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-[#EFE8DC] bg-[#FAF7F2] p-4">
              <Clock className="h-5 w-5 text-[#D96B27]" />
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase text-[#8A8175]">Opening Hours</div>
                <div className="mt-0.5 text-xs font-semibold leading-relaxed text-[#1E3A5F]">
                  {settings.openingHours}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#EAE2D6] bg-white pb-20 sm:pb-0">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <div className="flex items-center gap-2.5">
              {settings.logoUrl ? (
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#E2D9CB] bg-white p-1">
                  <img
                    src={settings.logoUrl}
                    alt={settings.shopName}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A5F] text-white">
                  <BookOpen className="h-5 w-5" />
                </div>
              )}
              <div className="font-display text-xl font-bold text-[#1E3A5F]">
                {settings.shopName}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
              {settings.tagline}. Your one-stop shop for school supplies, office stationery,
              art &amp; craft kits, books, and memorable gifts.
            </p>
            {settings.gstNumber && (
              <p className="mt-2 text-xs font-medium text-[#8A8175]">
                GSTIN: {settings.gstNumber}
              </p>
            )}
          </div>

          <div className="space-y-2.5 text-sm text-[#4B5563]">
            <h3 className="font-display text-base font-bold text-[#1E3A5F]">Visit Our Shop</h3>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D96B27]" />
              <span>{settings.address}</span>
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-[#D96B27]" />
              <span>{settings.openingHours}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-[#D96B27]" />
              <span>
                {settings.phone}
                {settings.alternatePhone ? ` / ${settings.alternatePhone}` : ''}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-[#D96B27]" />
              <span>{settings.email}</span>
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-display text-base font-bold text-[#1E3A5F]">Quick Links</h3>
            <div className="flex flex-col items-start gap-2 text-sm text-[#4B5563]">
              <button onClick={onOpenTracker} className="hover:text-[#D96B27]">
                Track Your Order
              </button>
              <a
                href={generalWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#128C7E]"
              >
                WhatsApp Customer Care
              </a>
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#D96B27]"
                >
                  Instagram
                </a>
              )}
              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#D96B27]"
                >
                  Facebook
                </a>
              )}
              <button onClick={onOpenBooklist} className="hover:text-[#D96B27]">
                Upload School Booklist
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-[#EFE8DC] bg-[#FAF7F2] py-4 text-center text-xs text-[#8A8175]">
          © {new Date().getFullYear()} {settings.shopName}. All rights reserved.
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      <a
        href={generalWaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex h-12 w-12 sm:h-auto sm:w-auto items-center justify-center gap-2 rounded-full bg-[#25D366] sm:px-4 sm:py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-[#1EB958]"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">WhatsApp Us</span>
      </a>
    </div>
  );
}
