export function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export function cleanPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildWhatsAppChatUrl(whatsappNumber, message) {
  const num = cleanPhone(whatsappNumber || '919876543210');
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppProductUrl(whatsappNumber, product, shopName = 'Satish Pustak Bhandar') {
  const msg = [
    `Hello ${shopName}!`,
    `I am interested in ordering this item:`,
    `• Product: ${product.name}`,
    `• SKU: ${product.sku}`,
    `• Price: ${formatINR(product.price)}`,
    ``,
    `Is this available for delivery / pickup?`,
  ].join('\n');
  return buildWhatsAppChatUrl(whatsappNumber, msg);
}

export function buildWhatsAppCartUrl(
  whatsappNumber,
  cartItems,
  subtotal,
  deliveryCharge,
  total,
  shopName = 'Satish Pustak Bhandar'
) {
  const lines = cartItems.map(
    (item, idx) => `${idx + 1}. ${item.name} × ${item.quantity} = ${formatINR(item.price * item.quantity)}`
  );
  const msg = [
    `Hello ${shopName}! I would like to place an order:`,
    ``,
    ...lines,
    ``,
    `Subtotal: ${formatINR(subtotal)}`,
    `Delivery: ${deliveryCharge === 0 ? 'FREE' : formatINR(deliveryCharge)}`,
    `*Total Payable: ${formatINR(total)}*`,
    ``,
    `Please confirm availability and delivery timing.`,
  ].join('\n');
  return buildWhatsAppChatUrl(whatsappNumber, msg);
}

export function buildWhatsAppOrderUrl(whatsappNumber, order, shopName = 'Satish Pustak Bhandar') {
  const lines = (order.items || []).map(
    (item, idx) => `${idx + 1}. ${item.name} × ${item.quantity} = ${formatINR(item.price * item.quantity)}`
  );
  const msg = [
    `Hello ${shopName}! I just placed an order on your website.`,
    ``,
    `*Order ID:* ${order.orderNumber}`,
    `*Customer:* ${order.customerName} (${order.phone})`,
    `*Address:* ${order.address}${order.city ? `, ${order.city}` : ''}${order.pincode ? ` - ${order.pincode}` : ''}`,
    `*Payment:* ${order.paymentMethod}`,
    order.notes ? `*Notes:* ${order.notes}` : null,
    ``,
    `*Items:*`,
    ...lines,
    ``,
    `*Total: ${formatINR(order.total)}*`,
  ]
    .filter(Boolean)
    .join('\n');
  return buildWhatsAppChatUrl(whatsappNumber, msg);
}

export function buildWhatsAppCustomerUpdateUrl(order, shopName = 'Satish Pustak Bhandar') {
  const msg = [
    `Namaste ${order.customerName}!`,
    `Update from *${shopName}* regarding your order *${order.orderNumber}*:`,
    ``,
    `Current Status: *${order.status}*`,
    `Order Total: *${formatINR(order.total)}*`,
    ``,
    `Thank you for shopping with ${shopName}! Reply here if you need anything else.`,
  ].join('\n');
  return buildWhatsAppChatUrl(order.phone, msg);
}

export function buildWhatsAppSupplierPoUrl(po, settings = {}) {
  const shopName = settings.shopName || 'Satish Pustak Bhandar';
  const lines = (po.items || []).map(
    (it, idx) =>
      `${idx + 1}. ${it.name}${it.sku ? ` (${it.sku})` : ''} — Qty: *${it.quantity}*${
        it.unitCost > 0 ? ` @ ${formatINR(it.unitCost)}` : ''
      }`
  );
  const msg = [
    `*PURCHASE ORDER — ${po.poNumber}*`,
    `From: *${shopName}*`,
    settings.address ? `Address: ${settings.address}` : null,
    settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : null,
    settings.phone ? `Contact: ${settings.phone}` : null,
    ``,
    `Namaste ${po.supplierName}, please supply the following items:`,
    ``,
    ...lines,
    ``,
    po.estimatedTotal > 0 ? `*Estimated Total:* ${formatINR(po.estimatedTotal)}` : null,
    po.notes ? `*Notes:* ${po.notes}` : null,
    ``,
    `Please confirm stock availability & dispatch timeline. Thank you!`,
  ]
    .filter(Boolean)
    .join('\n');
  return buildWhatsAppChatUrl(po.supplierWhatsapp, msg);
}

export async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const adminToken = localStorage.getItem('spb_admin_token');
  const userToken = localStorage.getItem('spb_user_token');
  if (adminToken && url.startsWith('/api/admin')) {
    headers.Authorization = `Bearer ${adminToken}`;
  } else if (userToken && (url.startsWith('/api/auth') || url === '/api/orders')) {
    headers.Authorization = `Bearer ${userToken}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
