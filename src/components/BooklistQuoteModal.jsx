import React, { useState } from 'react';
import { X, Upload, CheckCircle2, MessageCircle, FileImage, Loader2 } from 'lucide-react';
import { apiFetch, buildWhatsAppChatUrl } from '../utils/api';

export default function BooklistQuoteModal({ isOpen, onClose, settings }) {
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    schoolOrClass: '',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedQuote, setSubmittedQuote] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('customerName', form.customerName);
      fd.append('phone', form.phone);
      fd.append('schoolOrClass', form.schoolOrClass);
      fd.append('notes', form.notes);
      if (file) fd.append('photo', file);
      const data = await apiFetch('/api/booklist-quotes', {
        method: 'POST',
        body: fd,
      });
      setSubmittedQuote(data.quote);
    } catch (err) {
      setError(err.message || 'Could not submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmittedQuote(null);
    setForm({ customerName: '', phone: '', schoolOrClass: '', notes: '' });
    setFile(null);
    setPreview('');
    setError('');
    onClose();
  };

  const waUrl = submittedQuote
    ? buildWhatsAppChatUrl(
        settings.whatsappNumber,
        [
          `Namaste ${settings.shopName}! I just uploaded a School Booklist / Bulk Quote Request on your website.`,
          `• Name: ${submittedQuote.customerName} (${submittedQuote.phone})`,
          submittedQuote.schoolOrClass ? `• School / Class: ${submittedQuote.schoolOrClass}` : null,
          submittedQuote.notes ? `• Details: ${submittedQuote.notes}` : null,
          `Please share the quote & availability.`,
        ]
          .filter(Boolean)
          .join('\n')
      )
    : '#';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[#6B7280] hover:bg-[#FAF7F2]"
        >
          <X className="h-5 w-5" />
        </button>

        {submittedQuote ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-[#1E3A5F]">
              Booklist Request Received!
            </h2>
            <p className="mt-2 text-sm text-[#4B5563]">
              Thank you, <strong>{submittedQuote.customerName}</strong>. Our team at{' '}
              {settings.shopName} will review your list and send you the best quote shortly.
            </p>
            <div className="mt-6 space-y-3">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1EB958]"
              >
                <MessageCircle className="h-4 w-4" />
                Ping Us on WhatsApp for Faster Quote
              </a>
              <button
                onClick={handleClose}
                className="w-full rounded-full border border-[#E2D9CB] py-2.5 text-sm font-semibold text-[#1E3A5F]"
              >
                Back to Store
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="font-display text-2xl font-bold text-[#1E3A5F]">
              Upload School Booklist / Bulk Order
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Snap a photo of your school booklist, stationery slip, or gift requirement — we will
              prepare a ready-to-pick bundle &amp; quote!
            </p>

            {error && (
              <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    Your Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Parent / Student Name"
                    className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#374151]">
                    WhatsApp / Phone *
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
                  School Name &amp; Class / Occasion
                </label>
                <input
                  type="text"
                  value={form.schoolOrClass}
                  onChange={(e) => setForm({ ...form, schoolOrClass: e.target.value })}
                  placeholder="e.g. DPS Class 8, or 25 Return Gift Hampers"
                  className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Upload List Photo (Optional)
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D4C8B8] bg-[#FAF7F2] p-5 text-center transition hover:border-[#1E3A5F]">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Booklist preview"
                      className="max-h-40 rounded-xl object-contain"
                    />
                  ) : (
                    <>
                      <FileImage className="h-8 w-8 text-[#D96B27]" />
                      <span className="mt-2 text-xs font-semibold text-[#1E3A5F]">
                        Click to upload photo of your booklist
                      </span>
                      <span className="mt-0.5 text-[11px] text-[#8A8175]">
                        JPG, PNG up to 5 MB
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#374151]">
                  Additional Notes / Items Needed
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Need brown covers, name labels, and spiral registers..."
                  className="w-full rounded-xl border border-[#E2D9CB] px-3.5 py-2.5 text-sm focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1E3A5F] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#162C49] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit Booklist for Quote
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
