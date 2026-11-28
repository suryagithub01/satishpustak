import nodemailer from 'nodemailer';
import { savePublicFile } from './db.js';

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export function buildOrderEmailHtml(order, settings) {
  const shopName = settings?.shopName || 'Satish Pustak Bhandar';
  const rows = (order.items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #efe8dc;color:#1f242d;font-size:14px;">${it.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #efe8dc;text-align:center;color:#4b5563;font-size:14px;">${it.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #efe8dc;text-align:right;font-weight:600;color:#1e3a5f;font-size:14px;">${formatINR(it.price * it.quantity)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Order Confirmation ${order.orderNumber}</title></head>
<body style="margin:0;padding:24px;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f242d;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eae2d6;border-radius:16px;overflow:hidden;">
    <div style="background:#1e3a5f;padding:24px 28px;color:#ffffff;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:#fde6c4;font-weight:700;">Order Confirmed</div>
      <h1 style="margin:6px 0 0;font-size:24px;font-family:Georgia,serif;">${shopName}</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#d9e4f2;">${settings?.tagline || 'Books, Fine Stationery & Thoughtful Gifts'}</p>
    </div>

    <div style="padding:24px 28px;">
      <p style="margin:0 0 12px;font-size:15px;">Namaste <strong>${order.customerName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b5563;">
        Thank you for shopping with <strong>${shopName}</strong>! We have received your order <strong>${order.orderNumber}</strong> and are preparing your items for dispatch.
      </p>

      <div style="background:#faf7f2;border:1px solid #eae2d6;border-radius:12px;padding:14px 16px;margin-bottom:20px;font-size:13px;">
        <div><strong>Order ID:</strong> ${order.orderNumber}</div>
        <div style="margin-top:4px;"><strong>Payment Mode:</strong> ${order.paymentMethod}</div>
        <div style="margin-top:4px;"><strong>Delivery Address:</strong> ${order.address}${order.city ? `, ${order.city}` : ''}${order.pincode ? ` - ${order.pincode}` : ''}</div>
        ${order.notes ? `<div style="margin-top:4px;color:#d96b27;"><strong>Note:</strong> ${order.notes}</div>` : ''}
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#faf7f2;color:#1e3a5f;font-size:12px;text-transform:uppercase;">
            <th style="padding:10px 12px;text-align:left;">Item</th>
            <th style="padding:10px 12px;text-align:center;">Qty</th>
            <th style="padding:10px 12px;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="margin-top:16px;padding-top:12px;border-top:2px solid #1e3a5f;font-size:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#6b7280;">Subtotal:</span>
          <strong>${formatINR(order.subtotal)}</strong>
        </div>
        ${
          order.discount > 0
            ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#047857;">
                <span>Coupon (${order.couponCode}):</span>
                <strong>-${formatINR(order.discount)}</strong>
              </div>`
            : ''
        }
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="color:#6b7280;">Delivery:</span>
          <strong>${order.deliveryCharge === 0 ? 'FREE' : formatINR(order.deliveryCharge)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:17px;color:#1e3a5f;margin-top:8px;">
          <strong>Total Payable:</strong>
          <strong>${formatINR(order.total)}</strong>
        </div>
      </div>

      <div style="margin-top:24px;padding-top:16px;border-top:1px dashed #d4c8b8;font-size:12px;color:#6b7280;line-height:1.6;">
        Need help with your order? Call or WhatsApp us at <strong>${settings?.phone || ''}</strong>.<br/>
        Visit us: ${settings?.address || ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(order, settings) {
  const to = String(order.customerEmail || '').trim();
  if (!to) {
    return { sent: false, mode: 'skipped', reason: 'No customer email provided' };
  }

  const html = buildOrderEmailHtml(order, settings);
  const subject = `Order Confirmed (${order.orderNumber}) — ${settings?.shopName || 'Satish Pustak Bhandar'}`;

  const fileName = `order-${order.orderNumber}.html`;
  const localPreviewUrl = await savePublicFile('emails', fileName, Buffer.from(html, 'utf8'), 'text/html');

  const smtpHost = (settings?.smtpHost || process.env.SMTP_HOST || '').trim();
  const smtpUser = (settings?.smtpUser || process.env.SMTP_USER || '').trim();
  const smtpPass = (settings?.smtpPass || process.env.SMTP_PASS || '').trim();
  const smtpPort = Number(settings?.smtpPort || process.env.SMTP_PORT || 587);
  const fromEmail =
    (settings?.smtpFrom || process.env.SMTP_FROM || smtpUser || settings?.email || 'orders@satishpustakbhandar.in').trim();

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"${settings?.shopName || 'Satish Pustak Bhandar'}" <${fromEmail}>`,
        to,
        subject,
        html,
      });

      return { sent: true, mode: 'smtp', to, previewUrl: localPreviewUrl };
    } catch (err) {
      console.error('SMTP email send failed, falling back to local preview:', err.message);
      return {
        sent: false,
        mode: 'preview',
        to,
        previewUrl: localPreviewUrl,
        error: err.message,
      };
    }
  }

  return {
    sent: true,
    mode: 'preview',
    to,
    previewUrl: localPreviewUrl,
  };
}

export async function sendPromoEmail({ recipients, subject, message, couponCode, settings }) {
  const shopName = settings?.shopName || 'Satish Pustak Bhandar';
  const cleanRecipients = [
    ...new Set(
      (recipients || [])
        .map((e) => String(e || '').trim().toLowerCase())
        .filter((e) => e.includes('@'))
    ),
  ];
  if (cleanRecipients.length === 0) {
    return { sentCount: 0, mode: 'skipped', error: 'No valid customer email addresses found.' };
  }

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:24px;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f242d;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eae2d6;border-radius:16px;overflow:hidden;">
    <div style="background:#1e3a5f;padding:24px 28px;color:#ffffff;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:#fde6c4;font-weight:700;">Special Offer</div>
      <h1 style="margin:6px 0 0;font-size:24px;font-family:Georgia,serif;">${shopName}</h1>
    </div>
    <div style="padding:24px 28px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#1e3a5f;">${subject}</h2>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#374151;white-space:pre-line;">${message}</p>
      ${
        couponCode
          ? `<div style="background:#faf7f2;border:2px dashed #d96b27;border-radius:12px;padding:14px 18px;text-align:center;margin:20px 0;">
              <div style="font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:700;">Use Promo Code at Checkout</div>
              <div style="font-size:22px;font-weight:800;color:#d96b27;letter-spacing:2px;margin-top:4px;">${couponCode}</div>
            </div>`
          : ''
      }
      <div style="margin-top:24px;padding-top:16px;border-top:1px dashed #d4c8b8;font-size:12px;color:#6b7280;">
        Order online or WhatsApp us at <strong>${settings?.phone || ''}</strong><br/>
        ${settings?.address || ''}
      </div>
    </div>
  </div>
</body>
</html>`;

  const fileName = `promo-${Date.now()}.html`;
  const localPreviewUrl = await savePublicFile('emails', fileName, Buffer.from(html, 'utf8'), 'text/html');

  const smtpHost = (settings?.smtpHost || process.env.SMTP_HOST || '').trim();
  const smtpUser = (settings?.smtpUser || process.env.SMTP_USER || '').trim();
  const smtpPass = (settings?.smtpPass || process.env.SMTP_PASS || '').trim();
  const smtpPort = Number(settings?.smtpPort || process.env.SMTP_PORT || 587);
  const fromEmail =
    (settings?.smtpFrom || process.env.SMTP_FROM || smtpUser || settings?.email || 'orders@satishpustakbhandar.in').trim();

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"${shopName}" <${fromEmail}>`,
        bcc: cleanRecipients,
        subject,
        html,
      });
      return { sentCount: cleanRecipients.length, mode: 'smtp', previewUrl: localPreviewUrl };
    } catch (err) {
      return {
        sentCount: 0,
        mode: 'preview',
        previewUrl: localPreviewUrl,
        error: err.message,
      };
    }
  }

  return { sentCount: cleanRecipients.length, mode: 'preview', previewUrl: localPreviewUrl };
}
