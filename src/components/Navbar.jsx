import React from 'react';
import {
  Search,
  ShoppingBag,
  PackageSearch,
  BookOpen,
  MessageCircle,
  User,
  X,
} from 'lucide-react';
import { buildWhatsAppChatUrl } from '../utils/api';

export default function Navbar({
  settings,
  user,
  searchQuery,
  setSearchQuery,
  cartCount,
  onOpenCart,
  onOpenTracker,
  onOpenAuth,
  onOpenAccount,
}) {
  const waUrl = buildWhatsAppChatUrl(
    settings.whatsappNumber,
    `Hello ${settings.shopName}! I would like to inquire about stationery & gift items.`
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[#EAE2D6] bg-[#FAF7F2]/95 backdrop-blur-md">
      {/* Announcement Strip */}
      {settings.announcementBanner && (
        <div className="bg-[#1E3A5F] px-3 py-1.5 text-center text-[11px] sm:text-xs font-medium leading-snug tracking-wide text-[#FAF7F2]">
          {settings.announcementBanner}
        </div>
      )}

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 py-3 sm:px-6 sm:py-3.5 lg:px-8">
        {/* Brand */}
        <a
          href="#top"
          className="flex min-w-0 flex-1 sm:flex-none items-center gap-2 sm:gap-3 group"
        >
          {settings.logoUrl ? (
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E2D9CB] bg-white p-1 shadow-xs transition-transform group-hover:scale-105">
              <img
                src={settings.logoUrl}
                alt={settings.shopName || 'Shop Logo'}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#1E3A5F] text-[#FAF7F2] shadow-sm transition-transform group-hover:scale-105">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-bold leading-tight text-[#1E3A5F] sm:text-xl">
              {settings.shopName || 'Satish Pustak Bhandar'}
            </div>
            <div className="hidden text-[11px] font-medium tracking-wide text-[#6B7280] sm:block">
              {settings.tagline || 'Books, Fine Stationery & Thoughtful Gifts'}
            </div>
          </div>
        </a>

        {/* Search */}
        <div className="relative hidden max-w-md flex-1 lg:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8175]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notebooks, pens, gift hampers, art kits..."
            className="w-full rounded-full border border-[#E2D9CB] bg-white py-2.5 pl-10 pr-9 text-sm text-[#1F242D] placeholder-[#9A9185] shadow-xs transition focus:border-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/15"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8175] hover:text-[#1F242D]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={onOpenTracker}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E2D9CB] bg-white px-2.5 py-2 text-xs font-semibold text-[#1E3A5F] transition hover:border-[#1E3A5F] hover:bg-[#F5EFE6] sm:px-3.5 sm:text-sm"
            title="Track Order"
          >
            <PackageSearch className="h-4 w-4" />
            <span className="hidden lg:inline">Track Order</span>
          </button>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-full bg-[#25D366]/12 px-3.5 py-2 text-xs font-semibold text-[#128C7E] transition hover:bg-[#25D366]/20 sm:inline-flex sm:text-sm"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden xl:inline">WhatsApp</span>
          </a>

          {user ? (
            <button
              onClick={onOpenAccount}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1E3A5F]/25 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1E3A5F] transition hover:border-[#1E3A5F] hover:bg-[#F5EFE6] sm:px-3 sm:text-sm"
              title="My Account"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D96B27] text-[11px] font-bold text-white">
                {(user.name || 'U').charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline max-w-[90px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E2D9CB] bg-white px-2.5 py-2 text-xs font-semibold text-[#1E3A5F] transition hover:border-[#1E3A5F] hover:bg-[#F5EFE6] sm:px-3.5 sm:text-sm"
              title="Sign In / Sign Up"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          <button
            onClick={onOpenCart}
            className="relative inline-flex items-center gap-1.5 rounded-full bg-[#1E3A5F] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#162C49] sm:gap-2 sm:px-4 sm:text-sm"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D96B27] px-1.5 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Search */}
      <div className="border-t border-[#EFE8DC] px-4 py-2.5 lg:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8175]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stationery, books & gifts..."
            className="w-full rounded-full border border-[#E2D9CB] bg-white py-2 pl-10 pr-8 text-sm focus:border-[#1E3A5F] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8175]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
