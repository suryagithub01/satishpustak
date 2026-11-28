import React, { useState } from 'react';
import { X, User, Phone, Mail, Lock, Loader2, Sparkles } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function AuthModal({ isOpen, onClose, settings, promptMessage, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    identifier: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data =
        mode === 'login'
          ? await apiFetch('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({
                identifier: form.identifier,
                password: form.password,
              }),
            })
          : await apiFetch('/api/auth/signup', {
              method: 'POST',
              body: JSON.stringify({
                name: form.name,
                phone: form.phone,
                email: form.email,
                password: form.password,
              }),
            });

      localStorage.setItem('spb_user_token', data.token);
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[#6B7280] hover:bg-[#FAF7F2]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF7F2] px-3 py-1 text-[11px] font-bold text-[#D96B27]">
          <Sparkles className="h-3.5 w-3.5" />
          {settings?.shopName || 'Satish Pustak Bhandar'}
        </div>

        <h2 className="mt-3 font-display text-2xl font-bold text-[#1E3A5F]">
          {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
        </h2>
        <p className="mt-1 text-xs text-[#6B7280]">
          {mode === 'login'
            ? 'Sign in to view your orders, saved wishlist, and faster checkout.'
            : 'Join for 1-click checkout, order history, and saved wishlist.'}
        </p>

        {promptMessage && (
          <div className="mt-3 rounded-xl border border-[#D96B27]/30 bg-[#D96B27]/10 px-3.5 py-2.5 text-xs font-semibold text-[#9A4211]">
            {promptMessage}
          </div>
        )}

        {/* Mode Switcher */}
        <div className="mt-5 grid grid-cols-2 rounded-full bg-[#FAF7F2] p-1 border border-[#EAE2D6]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`rounded-full py-2 text-xs font-bold transition ${
              mode === 'login' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-[#6B7280]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`rounded-full py-2 text-xs font-bold transition ${
              mode === 'signup' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-[#6B7280]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'signup' ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9185]" />
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full rounded-xl border border-[#E2D9CB] py-2.5 pl-10 pr-3.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  10-Digit Mobile / WhatsApp Number *
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9185]" />
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-[#E2D9CB] py-2.5 pl-10 pr-3.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Email Address * (for Order Confirmation)
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9185]" />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#E2D9CB] py-2.5 pl-10 pr-3.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#374151]">
                Phone Number or Email *
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9185]" />
                <input
                  required
                  type="text"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  placeholder="10-digit phone or email"
                  className="w-full rounded-xl border border-[#E2D9CB] py-2.5 pl-10 pr-3.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#374151]">Password *</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9185]" />
              <input
                required
                type="password"
                minLength={4}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 4 characters"
                className="w-full rounded-xl border border-[#E2D9CB] py-2.5 pl-10 pr-3.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1E3A5F] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162C49] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
