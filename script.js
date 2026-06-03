// CONFIG object - Centrally houses all configuration values
const CONFIG = {
  whatsappNumber: '8801305041433', // Numeric international format (no leading + or 00)
  googleScriptURL: 'https://script.google.com/macros/s/AKfycbw9Mgpo6l1vzpEBcI79gEjaDsTn3TosMH78v3q-8JRp00yLDlSNvlB1Tf4DEdFcvSCm/exec',
  cartKey: 'scentmark-cart',
  phoneRegex: /^01[3-9]\d{8}$/, // Bangladesh mobile validation
  bkashNumber: '+8801305041433',
  nagadNumber: '+8801305041433',
  rocketNumber: '+8801305041433-4'
};

// Global State
let allProducts = [];
let cart = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('current-year').textContent = new Date().getFullYear();
  cart = loadCart();
  updateCartUI();
  loadProducts();
});

/* ==========================================================================
   Section 1 — Utilities
   ========================================================================== */

// XSS-safe HTML escaping
function esc(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Strip HTML tags, trim, and collapse duplicate spaces
function sanitise(str) {
  if (typeof str !== 'string') return '';
  let clean = str.replace(/<\/?[^>]+(>|$)/g, "");
  return clean.trim().replace(/\s+/g, ' ');
}

// Load and structurally validate Cart data
function loadCart() {
  try {
    const raw = localStorage.getItem(CONFIG.cartKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Strict schema check
    return parsed.filter(item => {
      return (
        item &&
        typeof item.id === 'number' &&
        typeof item.name === 'string' &&
        typeof item.price === 'number' &&
        typeof item.qty === 'number' &&
        item.qty > 0
      );
    });
  } catch (err) {
    return [];
  }
}

// Toast notification controller
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'show';
  if (type) toast.classList.add(type);

  // Clear existing timeouts
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  
  window.toastTimeout = setTimeout(() => {
    toast.className = '';
  }, 4000);
}

/* ==========================================================================
   Section 2 — Data loading
   ========================================================================== */

async function loadProducts() {
  const grid = document.getElementById('product-grid');
  try {
    const response = await fetch(`products.json?v=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Network error loading database');
    
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Database format error');

    // Structural validation of fetched products
    allProducts = data.filter(p => {
      const isValid = (
        p &&
        typeof p.id === 'number' &&
        typeof p.name === 'string' &&
        typeof p.price === 'number' &&
        typeof p.old_price === 'number' &&
        typeof p.image === 'string'
      );
      if (!isValid) console.warn('Discarded invalid product payload:', p);
      return isValid;
    });

    renderProducts(allProducts);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="full-width text-center error-message">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Failed to load products. Please check back shortly.</p>
      </div>
    `;
  }
}

/* ==========================================================================
   Section 3 — Render logic
   ========================================================================== */

function renderProducts(list) {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';

  if (list.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'full-width text-center';
    emptyMsg.textContent = 'No matching fragrances found.';
    grid.appendChild(emptyMsg);
    return;
  }

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card animate-fade';
    card.onclick = () => showDetail(p.id);

    // Image container with badge
    const imgWrap = document.createElement('div');
    imgWrap.className = 'product-img-wrap';

    if (p.old_price > p.price) {
      const discount = Math.round(((p.old_price - p.price) / p.old_price) * 100);
      const badge = document.createElement('span');
      badge.className = 'discount-badge';
      badge.textContent = `-${discount}%`;
      imgWrap.appendChild(badge);
    }

    const img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    img.onerror = () => { img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23eeeeee"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" fill="%23888888"%3ENo Image%3C/text%3E%3C/svg%3E'; };
    imgWrap.appendChild(img);

    // Product Title
    const title = document.createElement('h3');
    title.textContent = p.name;

    // Pricing Row
    const prices = document.createElement('div');
    prices.className = 'product-prices';
    const salePrice = document.createElement('span');
    salePrice.className = 'price-sale';
    salePrice.textContent = `৳ ${p.price.toLocaleString()}`;
    prices.appendChild(salePrice);

    if (p.old_price > p.price) {
      const oldPrice = document.createElement('span');
      oldPrice.className = 'price-old';
      oldPrice.textContent = `৳ ${p.old_price.toLocaleString()}`;
      prices.appendChild(oldPrice);
    }

    // View Details Hint
    const hint = document.createElement('p');
    hint.className = 'view-hint';
    hint.textContent = '👆 Tap card for details';

    // Add to Cart Button
    const btn = document.createElement('button');
    btn.className = 'btn-primary btn-add';
    btn.textContent = 'Add to Cart';
    btn.onclick = (e) => {
      e.stopPropagation();
      addToCart(p.id);
    };

    // Assembly
    card.appendChild(imgWrap);
    card.appendChild(title);
    card.appendChild(prices);
    card.appendChild(hint);
    card.appendChild(btn);

    grid.appendChild(card);
  });
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  // Keep desktop and mobile search inputs synchronized
  document.getElementById('search-input-desktop').value = query;
  document.getElementById('search-input-mobile').value = query;

  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query));
  renderProducts(filtered);
}

function toggleMobileSearch() {
  const bar = document.getElementById('mobile-search-wrap');
  bar.classList.toggle('hidden');
}

/* ==========================================================================
   Section 4 — Cart logic
   ========================================================================== */

function addToCart(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty: 1
    });
  }
  saveAndUpdate();
  showToast(`Added ${product.name} to cart`, 'ok');
}

function changeQty(id, delta) {
  const item = cart.find(item => item.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }
  saveAndUpdate();
  
  // Live update the checkout list if active
  if (!document.getElementById('checkout-view').classList.contains('hidden')) {
    renderCheckoutSummary();
  }
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveAndUpdate();
  
  if (!document.getElementById('checkout-view').classList.contains('hidden')) {
    renderCheckoutSummary();
  }
}

function saveAndUpdate() {
  localStorage.setItem(CONFIG.cartKey, JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const container = document.getElementById('cart-items-container');
  const totalAmountEl = document.getElementById('cart-total-amount');
  const badge = document.getElementById('cart-badge');

  container.innerHTML = '';
  let subtotal = 0;
  let totalItemsCount = 0;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-message">
        <i class="fa-solid fa-basket-shopping"></i>
        <p>Your shopping cart is empty.</p>
      </div>
    `;
    totalAmountEl.textContent = '৳ 0';
    badge.textContent = '0';
    return;
  }

  cart.forEach(item => {
    subtotal += item.price * item.qty;
    totalItemsCount += item.qty;

    const row = document.createElement('div');
    row.className = 'cart-item';

    // Image
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name;
    img.className = 'cart-item-img';
    img.onerror = () => { img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"%3E%3Crect width="60" height="60" fill="%23eee"/%3E%3C/svg%3E'; };

    // Info wrapper
    const info = document.createElement('div');
    info.className = 'cart-item-info';

    const name = document.createElement('div');
    name.className = 'cart-item-name';
    name.textContent = item.name;

    const price = document.createElement('div');
    price.className = 'cart-item-price';
    price.textContent = `৳ ${item.price.toLocaleString()}`;

    const controls = document.createElement('div');
    controls.className = 'cart-item-controls';

    const btnDec = document.createElement('button');
    btnDec.type = 'button';
    btnDec.textContent = '-';
    btnDec.onclick = () => changeQty(item.id, -1);

    const qtyVal = document.createElement('span');
    qtyVal.textContent = item.qty;

    const btnInc = document.createElement('button');
    btnInc.type = 'button';
    btnInc.textContent = '+';
    btnInc.onclick = () => changeQty(item.id, 1);

    controls.appendChild(btnDec);
    controls.appendChild(qtyVal);
    controls.appendChild(btnInc);

    info.appendChild(name);
    info.appendChild(price);
    info.appendChild(controls);

    // Delete Trigger
    const btnRemove = document.createElement('button');
    btnRemove.className = 'cart-item-remove';
    btnRemove.ariaLabel = `Remove ${item.name}`;
    btnRemove.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
    btnRemove.onclick = () => removeFromCart(item.id);

    row.appendChild(img);
    row.appendChild(info);
    row.appendChild(btnRemove);

    container.appendChild(row);
  });

  totalAmountEl.textContent = `৳ ${subtotal.toLocaleString()}`;
  badge.textContent = totalItemsCount;
}

function toggleCart(forceOpen) {
  const overlay = document.getElementById('cart-overlay');
  const sidebar = document.getElementById('cart-sidebar');
  
  const show = (typeof forceOpen === 'boolean') ? forceOpen : !sidebar.classList.contains('active');
  
  if (show) {
    overlay.classList.add('active');
    sidebar.classList.add('active');
  } else {
    overlay.classList.remove('active');
    sidebar.classList.remove('active');
  }
}

/* ==========================================================================
   Section 5 — Navigation
   ========================================================================== */

function hideAllViews() {
  document.getElementById('home-view').classList.add('hidden');
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('checkout-view').classList.add('hidden');
  document.getElementById('confirm-view').classList.add('hidden');
  document.getElementById('mobile-search-wrap').classList.add('hidden');
}

function showHome() {
  hideAllViews();
  document.getElementById('home-view').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDetail(id) {
  const p = allProducts.find(item => item.id === id);
  if (!p) return;

  hideAllViews();
  
  const detailView = document.getElementById('detail-view');
  
  // Populating Image and Badges
  const badgeEl = document.getElementById('detail-badge');
  const imgEl = document.getElementById('detail-img');
  imgEl.src = p.image;
  imgEl.alt = p.name;
  imgEl.onerror = () => { imgEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect width="600" height="600" fill="%23f6f6f6"%3E%3C/rect%3E%3C/svg%3E'; };

  if (p.old_price > p.price) {
    const savings = p.old_price - p.price;
    const discount = Math.round((savings / p.old_price) * 100);
    badgeEl.textContent = `-${discount}% Off`;
    badgeEl.style.display = 'inline-block';
    
    document.getElementById('detail-savings').textContent = `Save ৳ ${savings.toLocaleString()}`;
    document.getElementById('detail-savings').style.display = 'inline-block';
    document.getElementById('detail-price-old').textContent = `৳ ${p.old_price.toLocaleString()}`;
    document.getElementById('detail-price-old').style.display = 'inline-block';
  } else {
    badgeEl.style.display = 'none';
    document.getElementById('detail-savings').style.display = 'none';
    document.getElementById('detail-price-old').style.display = 'none';
  }

  // Core product details
  document.getElementById('detail-title').textContent = p.name;
  document.getElementById('detail-price-sale').textContent = `৳ ${p.price.toLocaleString()}`;

  // Process Optional Description
  const descEl = document.getElementById('detail-desc');
  const descWrap = document.getElementById('detail-desc-container');
  if (p.description) {
    descEl.textContent = p.description;
    descWrap.style.display = 'block';
  } else {
    descWrap.style.display = 'none';
  }

  // Process Optional Features
  const listEl = document.getElementById('detail-features-list');
  const listWrap = document.getElementById('detail-features-container');
  listEl.innerHTML = '';
  if (p.features && p.features.length > 0) {
    p.features.forEach(feat => {
      const li = document.createElement('li');
      li.textContent = feat;
      listEl.appendChild(li);
    });
    listWrap.style.display = 'block';
  } else {
    listWrap.style.display = 'none';
  }

  // Detail Add Button Action Override
  const addBtn = document.getElementById('detail-add-btn');
  addBtn.onclick = () => addToCart(p.id);

  detailView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToCheckout() {
  if (cart.length === 0) {
    showToast('Cannot checkout. Your cart is empty.', 'warn');
    return;
  }
  toggleCart(false);
  hideAllViews();
  
  // Render fresh state
  renderCheckoutSummary();
  
  // Reset payment UI states
  const cards = document.querySelectorAll('.payment-card');
  cards.forEach(c => c.classList.remove('selected'));
  const checkedInput = document.querySelector('input[name="payment_method"]:checked');
  if (checkedInput) {
    checkedInput.closest('.payment-card').classList.add('selected');
  }

  document.getElementById('checkout-view').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkout-summary-items');
  const totalEl = document.getElementById('checkout-summary-total');
  container.innerHTML = '';

  let total = 0;
  cart.forEach(item => {
    total += item.price * item.qty;

    const row = document.createElement('div');
    row.className = 'summary-row';

    const details = document.createElement('span');
    details.textContent = `${item.name} (x${item.qty})`;

    const price = document.createElement('span');
    price.textContent = `৳ ${(item.price * item.qty).toLocaleString()}`;

    row.appendChild(details);
    row.appendChild(price);
    container.appendChild(row);
  });

  totalEl.textContent = `৳ ${total.toLocaleString()}`;
}

function selectPayment(method, element) {
  const cards = document.querySelectorAll('.payment-card');
  cards.forEach(c => c.classList.remove('selected'));
  
  element.classList.add('selected');
  const input = element.querySelector('input[type="radio"]');
  input.checked = true;

  const trxContainer = document.getElementById('trx-field-container');
  if (method !== 'cod') {
    trxContainer.classList.remove('hidden');
  } else {
    trxContainer.classList.add('hidden');
  }
}

function showConfirmation(orderId, phone, whatsappURL) {
  hideAllViews();
  
  document.getElementById('confirm-phone').textContent = phone;
  document.getElementById('confirm-order-id').textContent = orderId;
  
  const waBtn = document.getElementById('confirm-whatsapp-btn');
  waBtn.href = whatsappURL;

  document.getElementById('confirm-view').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================================================
   Section 6 — Order & integrations
   ========================================================================== */

function placeOrder() {
  const rawName = document.getElementById('checkout-name').value;
  const rawPhone = document.getElementById('checkout-phone').value;
  const rawEmail = document.getElementById('checkout-email').value;
  const rawAddress = document.getElementById('checkout-address').value;
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
  const rawTrxId = document.getElementById('checkout-trx-id').value;

  // Sanitisation
  const name = sanitise(rawName);
  const phone = sanitise(rawPhone);
  const email = sanitise(rawEmail);
  const address = sanitise(rawAddress);
  const trxId = sanitise(rawTrxId);

  // Phone Validation
  if (!CONFIG.phoneRegex.test(phone)) {
    showToast('Please enter a valid Bangladesh phone number.', 'warn');
    document.getElementById('checkout-phone').focus();
    return;
  }

  // Transaction ID required for mobile payment
  if (paymentMethod !== 'cod' && !trxId) {
    showToast('Transaction ID is required for mobile payments.', 'warn');
    document.getElementById('checkout-trx-id').focus();
    return;
  }

  const spinner = document.getElementById('order-spinner');
  const btnText = document.getElementById('btn-submit-text');
  const submitBtn = document.getElementById('btn-submit-order');

  // Prevent double triggers
  submitBtn.disabled = true;
  spinner.classList.remove('hidden');
  btnText.textContent = 'Processing Order...';

  // Order Details preparation
  const orderId = 'SM-' + crypto.randomUUID().toUpperCase().split('-')[0];
  let totalAmount = 0;
  const cartSnapshot = cart.map(item => {
    totalAmount += item.price * item.qty;
    return { ...item };
  });

  // Construct WhatsApp URL immediately in click context to prevent browser popup block
  const whatsappURL = buildWhatsAppURL(orderId, name, phone, email, address, paymentMethod, trxId, totalAmount, cartSnapshot);

  // Prepare Server Payload
  const formData = {
    order_id: orderId,
    name: name,
    phone: phone,
    email: email,
    address: address,
    payment_method: paymentMethod.toUpperCase(),
    transaction_id: paymentMethod !== 'cod' ? trxId : 'N/A',
    total_amount: totalAmount,
    items: JSON.stringify(cartSnapshot.map(i => ({ id: i.id, name: i.name, qty: i.qty, subtotal: i.price * i.qty })))
  };

  // Safe fetch using complete asynchronous handling
  fetch(CONFIG.googleScriptURL, {
    method: 'POST',
    mode: 'no-cors', // Standard setting for Google Sheets macro redirection
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  .then(() => {
    afterOrderSuccess(orderId, phone, submitBtn, whatsappURL);
  })
  .catch((err) => {
    console.error('Failed API Post:', err);
    // Completing even on network failure so user is never locked out from finishing order
    afterOrderSuccess(orderId, phone, submitBtn, whatsappURL);
  });
}

function afterOrderSuccess(orderId, phone, btn, whatsappURL) {
  // Reset Button States
  btn.disabled = false;
  document.getElementById('order-spinner').classList.add('hidden');
  document.getElementById('btn-submit-text').textContent = 'Place Order via WhatsApp';

  // Clear Global Cart State & UI
  cart = [];
  localStorage.removeItem(CONFIG.cartKey);
  updateCartUI();

  // Redirect to Confirmation Page
  showConfirmation(orderId, phone, whatsappURL);
}

function buildWhatsAppURL(orderId, name, phone, email, address, paymentMethod, trxId, totalAmount, cartSnapshot) {
  let itemStrings = cartSnapshot.map(i => `• ${i.name} (x${i.qty}) - ৳ ${(i.price * i.qty).toLocaleString()}`);
  
  let text = `*NEW ORDER - scentmark*\n`;
  text += `---------------------------\n`;
  text += `*Order ID:* ${orderId}\n`;
  text += `*Name:* ${name}\n`;
  text += `*Phone:* ${phone}\n`;
  if (email) text += `*Email:* ${email}\n`;
  text += `*Address:* ${address}\n\n`;
  
  text += `*Products Ordered:*\n${itemStrings.join('\n')}\n\n`;
  text += `*Payment Method:* ${paymentMethod.toUpperCase()}\n`;
  if (paymentMethod !== 'cod') text += `*Transaction ID:* ${trxId}\n`;
  text += `---------------------------\n`;
  text += `*Grand Total:* ৳ ${totalAmount.toLocaleString()}`;

  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}