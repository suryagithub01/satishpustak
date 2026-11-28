import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, PackageCheck, FileText, Scissors } from 'lucide-react';
import { formatINR } from '../utils/api';

export default function InvoiceModal({ order, settings, initialMode = 'invoice', onClose }) {
  const [mode, setMode] = useState(initialMode); // 'invoice' | 'label'
  const printRef = useRef(null);

  useEffect(() => {
    setMode(initialMode || 'invoice');
  }, [initialMode, order]);

  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const totalQty = (order.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
  const isCOD = order.paymentMethod === 'COD';

  const handlePrint = () => {
    const content = printRef.current?.innerHTML || '';
    const win = window.open('', '_blank', 'width=820,height=900');
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${mode === 'label' ? 'Shipping Slip' : 'Invoice'} ${order.orderNumber} — ${
      settings?.shopName || 'Satish Pustak Bhandar'
    }</title>
          <style>
            * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { margin: 20px; color: #1f242d; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a5f; padding-bottom: 14px; margin-bottom: 18px; }
            .shop-name { font-size: 22px; font-weight: 700; color: #1e3a5f; margin: 0; }
            .muted { color: #555; font-size: 12px; margin: 3px 0; }
            .meta { text-align: right; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background: #f4efe6; color: #1e3a5f; text-align: left; padding: 8px 10px; border-bottom: 1px solid #d4c8b8; }
            td { padding: 8px 10px; border-bottom: 1px solid #eee; }
            .num { text-align: right; }
            .totals { width: 260px; margin-left: auto; margin-top: 16px; font-size: 13px; }
            .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
            .grand { border-top: 2px solid #1e3a5f; margin-top: 6px; padding-top: 8px !important; font-weight: 700; font-size: 15px; color: #1e3a5f; }
            .footer { margin-top: 28px; border-top: 1px dashed #ccc; padding-top: 12px; text-align: center; font-size: 11px; color: #666; }
            /* Shipping Label Print Styles */
            .parcel-box { max-width: 520px; margin: 0 auto; border: 2.5px dashed #1f242d; padding: 18px; border-radius: 10px; }
            .parcel-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 14px; }
            .parcel-order { font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #111; }
            .cod-box { background: #111; color: #fff; padding: 10px 14px; border-radius: 8px; text-align: center; font-weight: 800; font-size: 15px; margin-bottom: 14px; letter-spacing: 0.5px; }
            .ship-block { border: 1.5px solid #111; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
            .ship-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: #555; margin-bottom: 4px; }
            .ship-name { font-size: 18px; font-weight: 800; color: #111; }
            .ship-addr { font-size: 13px; line-height: 1.5; margin-top: 4px; }
            .ship-phone { font-size: 14px; font-weight: 700; margin-top: 6px; }
            .note-box { background: #fff7ed; border: 1.5px solid #d96b27; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #9a3412; margin-bottom: 12px; }
            .pack-list { font-size: 12px; border-top: 1.5px solid #111; padding-top: 10px; margin-top: 10px; }
            .pack-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ccc; }
            .from-block { font-size: 11px; color: #444; margin-top: 12px; border-top: 1px solid #ddd; padding-top: 8px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE8DC] pb-3">
          <div className="inline-flex rounded-full border border-[#E2D9CB] bg-[#FAF7F2] p-1">
            <button
              onClick={() => setMode('invoice')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                mode === 'invoice' ? 'bg-[#1E3A5F] text-white shadow-xs' : 'text-[#4B5563]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Tax Invoice / Bill
            </button>
            <button
              onClick={() => setMode('label')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                mode === 'label' ? 'bg-[#D96B27] text-white shadow-xs' : 'text-[#4B5563]'
              }`}
            >
              <PackageCheck className="h-3.5 w-3.5" />
              Parcel Slip (Paste on Box)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#162C49]"
            >
              <Printer className="h-4 w-4" />
              {mode === 'label' ? 'Print Parcel Slip' : 'Print / Save PDF'}
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[#6B7280] hover:bg-[#FAF7F2]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div ref={printRef}>
          {mode === 'label' ? (
            /* PARCEL / SHIPPING SLIP TO PASTE OVER ITEMS */
            <div className="parcel-box mx-auto max-w-lg rounded-xl border-2 border-dashed border-[#1F242D] bg-white p-5">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">
                <span className="inline-flex items-center gap-1">
                  <Scissors className="h-3 w-3" /> Cut &amp; Paste on Parcel / Gift Box
                </span>
                <span>Date: {formattedDate}</span>
              </div>

              <div className="parcel-top flex items-center justify-between border-b-2 border-[#1F242D] pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  {settings?.logoUrl && (
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      style={{ height: 36, width: 36, objectFit: 'contain' }}
                      className="h-9 w-9 rounded-md border border-[#EAE2D6] object-contain p-0.5"
                    />
                  )}
                  <div>
                    <div className="font-display text-base font-bold text-[#1E3A5F]">
                      {settings?.shopName || 'Satish Pustak Bhandar'}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">Stationery &amp; Gift Parcel</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-[#6B7280]">Order ID</div>
                  <div className="parcel-order font-mono text-xl font-extrabold text-[#111]">
                    {order.orderNumber}
                  </div>
                </div>
              </div>

              {/* Payment Banner */}
              <div className="cod-box mb-4 rounded-lg bg-[#1F242D] px-4 py-2.5 text-center text-sm font-extrabold tracking-wide text-white">
                {isCOD
                  ? `CASH ON DELIVERY (COD) — COLLECT ${formatINR(order.total)}`
                  : `PREPAID (${order.paymentMethod}) — ${formatINR(order.total)}`}
              </div>

              {/* Deliver To */}
              <div className="ship-block mb-3 rounded-lg border-2 border-[#1F242D] p-3.5">
                <div className="ship-label text-[10px] font-extrabold uppercase tracking-widest text-[#6B7280]">
                  DELIVER TO (SHIP TO)
                </div>
                <div className="ship-name mt-1 text-lg font-extrabold text-[#111]">
                  {order.customerName}
                </div>
                <div className="ship-addr mt-1 text-sm leading-snug text-[#1F242D]">
                  {order.address}
                  {order.city ? `, ${order.city}` : ''}
                  {order.pincode ? ` — PIN: ${order.pincode}` : ''}
                </div>
                <div className="ship-phone mt-2 text-sm font-bold text-[#111]">
                  Mob: {order.phone}
                </div>
              </div>

              {/* Special Note / Gift Wrap */}
              {order.notes && (
                <div className="note-box mb-3 rounded-lg border border-[#D96B27] bg-orange-50 px-3 py-2 text-xs font-bold text-[#9A3412]">
                  PACKING / GIFT NOTE: {order.notes}
                </div>
              )}

              {/* Packing Checklist */}
              <div className="pack-list border-t-2 border-[#1F242D] pt-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#1F242D]">
                  <span>Items Inside Parcel</span>
                  <span>Total Qty: {totalQty}</span>
                </div>
                {order.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="pack-item flex items-center justify-between border-b border-dotted border-[#D4C8B8] py-1.5 text-xs"
                  >
                    <span className="font-medium text-[#1F242D]">
                      {idx + 1}. {it.name}
                    </span>
                    <span className="ml-3 shrink-0 font-extrabold text-[#111]">
                      × {it.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Return Address */}
              <div className="from-block mt-3 border-t border-[#E5E7EB] pt-2.5 text-[11px] text-[#4B5563]">
                <strong>If Undelivered, Return To:</strong> {settings?.shopName} •{' '}
                {settings?.address} • Ph: {settings?.phone}
              </div>
            </div>
          ) : (
            /* FULL TAX INVOICE / BILL */
            <div className="rounded-xl border border-[#EAE2D6] p-5 text-sm">
              <div className="header flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#1E3A5F] pb-4">
                <div className="flex items-start gap-3">
                  {settings?.logoUrl && (
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      style={{ height: 48, width: 48, objectFit: 'contain' }}
                      className="h-12 w-12 rounded-lg border border-[#EAE2D6] object-contain p-1"
                    />
                  )}
                  <div>
                    <h1 className="shop-name font-display text-xl font-bold text-[#1E3A5F]">
                      {settings?.shopName || 'Satish Pustak Bhandar'}
                    </h1>
                    <p className="muted text-xs text-[#6B7280]">{settings?.address}</p>
                    <p className="muted text-xs text-[#6B7280]">
                      Phone: {settings?.phone} • {settings?.email}
                    </p>
                    {settings?.gstNumber && (
                      <p className="muted text-xs font-semibold text-[#1E3A5F]">
                        GSTIN: {settings.gstNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="meta text-right text-xs">
                  <div className="text-sm font-bold text-[#1E3A5F]">TAX INVOICE</div>
                  <div className="font-semibold">Order #: {order.orderNumber}</div>
                  <div>Date: {formattedDate}</div>
                  <div>Payment: {order.paymentMethod}</div>
                  <div>Status: {order.status}</div>
                </div>
              </div>

              <div className="my-4 text-xs">
                <div className="font-bold uppercase tracking-wider text-[#8A8175]">Billed To</div>
                <div className="mt-1 text-sm font-bold text-[#1F242D]">{order.customerName}</div>
                <div>
                  Phone: {order.phone}
                  {order.customerEmail ? ` • ${order.customerEmail}` : ''}
                </div>
                <div>
                  {order.address}
                  {order.city ? `, ${order.city}` : ''}
                  {order.pincode ? ` - ${order.pincode}` : ''}
                </div>
                {order.notes && (
                  <div className="mt-1 italic text-[#D96B27]">Note: {order.notes}</div>
                )}
              </div>

              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#FAF7F2] text-[#1E3A5F] border-b border-[#E2D9CB]">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Item Description</th>
                    <th className="num px-3 py-2 text-right">Qty</th>
                    <th className="num px-3 py-2 text-right">Rate</th>
                    <th className="num px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-[#F3EDE3]">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{it.name}</td>
                      <td className="num px-3 py-2 text-right">{it.quantity}</td>
                      <td className="num px-3 py-2 text-right">{formatINR(it.price)}</td>
                      <td className="num px-3 py-2 text-right font-semibold">
                        {formatINR(it.price * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="totals ml-auto mt-4 w-full max-w-xs space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Subtotal</span>
                  <span>{formatINR(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount ({order.couponCode})</span>
                    <span>-{formatINR(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Delivery Charge</span>
                  <span>
                    {order.deliveryCharge === 0 ? 'FREE' : formatINR(order.deliveryCharge)}
                  </span>
                </div>
                <div className="grand flex justify-between border-t-2 border-[#1E3A5F] pt-2 text-base font-bold text-[#1E3A5F]">
                  <span>Grand Total</span>
                  <span>{formatINR(order.total)}</span>
                </div>
              </div>

              <div className="footer mt-6 border-t border-dashed border-[#D4C8B8] pt-3 text-center text-[11px] text-[#6B7280]">
                Thank you for shopping at {settings?.shopName || 'Satish Pustak Bhandar'}! For
                queries or bulk school orders, WhatsApp us at {settings?.phone}.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
