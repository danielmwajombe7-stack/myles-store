(() => {
const KEY = 'myles_store_2026', VIS = 'myles_visits_2026';
const fmt = n => 'TSh ' + Number(n || 0).toLocaleString('en-US');
const $ = id => document.getElementById(id);
const credentials = { user: 'myles', pass: 'myles123' };

let db = load(), pendingImage = '';

function load() {
    try {
        return JSON.parse(localStorage.getItem(KEY)) || { products: [], orders: [], transactions: [], promotions: {} };
    } catch (e) {
        return { products: [], orders: [], transactions: [], promotions: {} };
    }
}

function save() {
    localStorage.setItem(KEY, JSON.stringify(db));
}

function esc(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(s) {
    let t = $('toast');
    if (!t) return;
    t.textContent = s;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
}

function login() {
    if (sessionStorage.getItem('myles_admin') === 'yes') {
        showApp();
        return;
    }
    let l = $('login');
    if (l) l.classList.remove('hidden');
}

function showApp() {
    let l = $('login'), a = $('app');
    if (l) l.classList.add('hidden');
    if (a) a.classList.remove('hidden');
    refreshAll();
}

const loginForm = $('loginForm');
if (loginForm) {
    loginForm.onsubmit = e => {
        e.preventDefault();
        let f = new FormData(e.target);
        if (f.get('username') === credentials.user && f.get('password') === credentials.pass) {
            sessionStorage.setItem('myles_admin', 'yes');
            showApp();
        } else {
            let err = $('loginError');
            if (err) err.textContent = 'Username au password si sahihi.';
        }
    };
}

const logoutBtn = $('logout');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        sessionStorage.removeItem('myles_admin');
        location.reload();
    };
}

function nav(view) {
    document.querySelectorAll('.view').forEach(x => x.classList.add('hidden'));
    let targetView = $('view-' + view);
    if (targetView) targetView.classList.remove('hidden');
    
    document.querySelectorAll('.nav').forEach(x => x.classList.toggle('active', x.dataset.view === view));
    
    let viewTitle = $('viewTitle');
    if (viewTitle) viewTitle.textContent = view[0].toUpperCase() + view.slice(1);
    
    renderView(view);
}

document.querySelectorAll('.nav').forEach(b => b.onclick = () => nav(b.dataset.view));
document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => nav(b.dataset.goto));

function expireOrders() {
    let now = Date.now(), changed = false;
    db.orders.forEach(o => {
        // Angalia kama ni oda ya kawaida na muda wa dakika 15 umeisha bila malipo kuthibitishwa
        if (o.status === 'PENDING' && now > o.expiresAt && !o.isVipOrder) {
            o.status = 'EXPIRED';
            o.paymentStatus = 'UNPAID';
            o.expiredAt = new Date().toISOString();
            
            if (!o.stockReturned) {
                o.items.forEach(it => {
                    let p = db.products.find(x => x.id === it.id);
                    if (p) p.stock += it.qty;
                });
                o.stockReturned = true;
            }
            
            let tx = db.transactions.find(t => t.orderId === o.id);
            if (tx) tx.status = 'EXPIRED';
            changed = true;
        }
    });
    if (changed) {
        save();
        showAlert('Order expired', 'Muda wa malipo umeisha bila uthibitisho. Oda ime-expire na stock imerudishwa.');
    }
}

function showAlert(t, m) {
    let titleEl = $('alertTitle'), bodyEl = $('alertBody'), noticeEl = $('overlayNotice');
    if (titleEl) titleEl.textContent = t;
    if (bodyEl) bodyEl.textContent = m;
    if (noticeEl) noticeEl.classList.remove('hidden');
}

function refreshAll() {
    db = load();
    expireOrders();
    db = load();
    
    let paid = db.orders.filter(o => ['PAID', 'PACKING', 'SHIPPED', 'DELIVERED'].includes(o.status));
    
    if ($('statSales')) $('statSales').textContent = fmt(paid.reduce((a, o) => a + o.total, 0));
    if ($('statPending')) $('statPending').textContent = db.orders.filter(o => o.status === 'PENDING').length;
    if ($('statProducts')) $('statProducts').textContent = db.products.length;
    if ($('statCustomers')) $('statCustomers').textContent = new Set(db.orders.map(o => o.customer.phone)).size;
    
    let visits = [];
    try { visits = JSON.parse(localStorage.getItem(VIS) || '[]'); } catch (e) { visits = []; }
    if ($('statVisits')) $('statVisits').textContent = visits.length;
    if ($('statLow')) $('statLow').textContent = db.products.filter(p => p.stock <= 5).length;
    
    let pendingCount = db.orders.filter(o => o.status === 'PENDING').length;
    if ($('pendingBadge')) $('pendingBadge').textContent = pendingCount;
    
    let dateLabel = $('dateLabel');
    if (dateLabel) dateLabel.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    
    let activeNav = document.querySelector('.nav.active');
    renderView(activeNav?.dataset.view || 'overview');
}

function renderView(v) {
    if (v === 'overview') renderRecent();
    if (v === 'products') renderProducts();
    if (v === 'orders') renderOrders();
    if (v === 'customers') renderCustomers();
    if (v === 'visitors') renderVisitors();
    if (v === 'transactions') renderTransactions();
    if (v === 'promotions') renderPromotions();
    if (v === 'inventory') renderInventory();
    if (v === 'reports') renderReports();
}

function table(headers, rows) {
    return `<div class="table-scroll"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty-cell">Hakuna taarifa bado.</td></tr>`}</tbody></table></div>`;
}

function pill(s) {
    return `<span class="pill ${String(s).toLowerCase()}">${esc(s)}</span>`;
}

function renderRecent() {
    let rows = db.orders.slice(0, 7).map(o => `<tr><td><b>${o.id}</b><small>${new Date(o.createdAt).toLocaleString()}</small></td><td>${esc(o.customer.name)}<small>${esc(o.customer.phone)}</small></td><td>${fmt(o.total)}</td><td>${pill(o.status)}</td><td><button class="outline-btn" data-order="${o.id}">OPEN</button></td></tr>`).join('');
    let el = $('recentOrders');
    if (el) el.innerHTML = table(['ORDER', 'CUSTOMER', 'TOTAL', 'STATUS', 'ACTION'], rows);
}

function renderProducts() {
    let rows = db.products.map(p => `<tr><td><div class="item-cell">${p.image ? `<img src="${p.image}">` : '<span class="thumb-empty">M</span>'}<span><b>${esc(p.name)}</b><small>${esc(p.sku || 'No SKU')}</small></span></div></td><td>${esc(p.category)}</td><td>${fmt(p.price)}</td><td>${p.stock}</td><td>${pill(p.status)}</td><td><button class="outline-btn" data-edit="${p.id}">EDIT</button> <button class="danger-mini" data-delete="${p.id}">DELETE</button></td></tr>`).join('');
    let el = $('productTable');
    if (el) el.innerHTML = table(['PRODUCT', 'CATEGORY', 'PRICE', 'STOCK', 'STATUS', 'ACTIONS'], rows);
}

function renderOrders() {
    let filterEl = $('orderFilter');
    let filter = filterEl ? filterEl.value : 'all';
    let list = db.orders.filter(o => filter === 'all' || o.status === filter);
    let rows = list.map(o => `<tr><td><b>${o.id}</b><small>${new Date(o.createdAt).toLocaleString()}</small></td><td>${esc(o.customer.name)}<small>${esc(o.customer.phone)} ${o.customer.altPhone ? ' / ' + esc(o.customer.altPhone) : ''}</small></td><td>${o.items.map(i => esc(i.name) + ' ×' + i.qty).join('<br>')}</td><td>${fmt(o.total)}</td><td>${pill(o.status)}<small>${o.status === 'PENDING' ? (o.isVipOrder ? 'VIP (48h)' : remaining(o.expiresAt)) : o.paymentStatus}</small></td><td><button class="outline-btn" data-order="${o.id}">DETAIL</button>${o.status === 'PENDING' ? ` <button class="confirm-btn" data-confirm="${o.id}">VERIFY PAID</button> <button class="danger-mini" data-cancel="${o.id}">CANCEL</button>` : ''}${o.status === 'PAID' ? ` <button class="outline-btn" data-pack="${o.id}">PACK</button>` : ''}${o.status === 'PACKING' ? ` <button class="outline-btn" data-ship="${o.id}">SHIP</button>` : ''}${o.status === 'SHIPPED' ? ` <button class="outline-btn" data-deliver="${o.id}">DELIVERED</button>` : ''}</td></tr>`).join('');
    let el = $('orderTable');
    if (el) el.innerHTML = table(['ORDER', 'CUSTOMER', 'ITEMS', 'TOTAL', 'STATUS', 'ACTIONS'], rows);
}

function remaining(t) {
    let n = Math.max(0, Math.ceil((t - Date.now()) / 60000));
    return n + ' min left';
}

function renderCustomers() {
    let map = new Map();
    db.orders.forEach(o => {
        let c = o.customer, k = c.phone;
        if (!map.has(k)) map.set(k, { ...c, count: 0, spent: 0, last: o.createdAt });
        let x = map.get(k);
        x.count++;
        if (['PAID', 'PACKING', 'SHIPPED', 'DELIVERED'].includes(o.status)) x.spent += o.total;
        if (o.createdAt > x.last) x.last = o.createdAt;
    });
    let rows = [...map.values()].map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone)}</td><td>${esc(c.altPhone || '—')}</td><td>${esc([c.region, c.district, c.ward, c.address].filter(Boolean).join(', '))}</td><td>${c.count}</td><td>${fmt(c.spent)}</td><td>${new Date(c.last).toLocaleDateString()}</td></tr>`).join('');
    let el = $('customerTable');
    if (el) el.innerHTML = table(['CUSTOMER', 'PHONE', 'ALTERNATE', 'LOCATION', 'ORDERS', 'CONFIRMED SPEND', 'LAST ORDER'], rows);
}

function renderVisitors() {
    let v = [];
    try { v = JSON.parse(localStorage.getItem(VIS) || '[]'); } catch (e) { v = []; }
    let rows = v.map(x => `<tr><td>${esc(x.id)}</td><td>${new Date(x.first).toLocaleString()}</td><td>${new Date(x.last).toLocaleString()}</td><td>${esc(x.device)}</td><td>${esc(x.pages.join(', '))}</td></tr>`).join('');
    let el = $('visitorTable');
    if (el) el.innerHTML = table(['SESSION', 'FIRST VISIT', 'LAST ACTIVITY', 'DEVICE', 'PAGES'], rows);
}

function renderTransactions() {
    let rows = db.transactions.map(t => `<tr><td>${esc(t.id)}</td><td>${esc(t.orderId)}</td><td>${esc(t.method)}</td><td>${esc(t.reference || 'Not provided')}</td><td>${fmt(t.amount)}</td><td>${pill(t.status)}</td><td>${new Date(t.createdAt).toLocaleString()}</td></tr>`).join('');
    let el = $('transactionTable');
    if (el) el.innerHTML = table(['TRANSACTION', 'ORDER', 'METHOD', 'REFERENCE', 'AMOUNT', 'STATUS', 'TIME'], rows);
}

function renderPromotions() {
    let p = db.promotions || {};
    if ($('promoTitle')) $('promoTitle').value = p.title || 'MYLES LOYALTY REWARD';
    if ($('promoQty')) $('promoQty').value = p.qty || 10;
    if ($('promoReward')) $('promoReward').value = p.reward || '';
    if ($('promoDesc')) $('promoDesc').value = p.desc || '';
    let cur = $('promoCurrent');
    if (cur) cur.innerHTML = `<div class="notice"><b>${esc(p.title || 'MYLES LOYALTY REWARD')}</b><p>Wateja wenye items ${p.qty || 10}+ kwenye bag: ${esc(p.reward || 'Offer not set')}</p></div>`;
}

function renderInventory() {
    let rows = db.products.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.sku || '—')}</td><td>${esc(p.category)}</td><td>${p.stock}</td><td>${p.stock <= 5 ? pill('LOW STOCK') : pill('OK')}</td></tr>`).join('');
    let el = $('inventoryTable');
    if (el) el.innerHTML = table(['PRODUCT', 'SKU', 'CATEGORY', 'AVAILABLE STOCK', 'STATUS'], rows);
}

function renderReports() {
    let total = db.orders.length, paid = db.orders.filter(o => ['PAID', 'PACKING', 'SHIPPED', 'DELIVERED'].includes(o.status)), exp = db.orders.filter(o => o.status === 'EXPIRED'), gross = paid.reduce((a, o) => a + o.total, 0);
    let el = $('reportSummary');
    if (el) el.innerHTML = `<div class="stats"><article><label>ALL ORDERS</label><b>${total}</b></article><article><label>PAID / CONFIRMED</label><b>${paid.length}</b></article><article><label>EXPIRED ORDERS</label><b>${exp.length}</b></article><article><label>CONFIRMED VALUE</label><b>${fmt(gross)}</b></article></div><p>Taarifa hizi zinatokana na local storage ya browser yako.</p>`;
}

function orderDetail(id) {
    let o = db.orders.find(x => x.id === id);
    if (!o) return;
    let el = $('detailBody');
    if (el) {
        el.innerHTML = `<label>ORDER DETAILS</label><h2>${o.id}</h2><p>${pill(o.status)} · ${new Date(o.createdAt).toLocaleString()}</p><h3>${esc(o.customer.name)}</h3><p>Phone: ${esc(o.customer.phone)}<br>Alternate: ${esc(o.customer.altPhone || '—')}<br>Address: ${esc([o.customer.region, o.customer.district, o.customer.ward, o.customer.address].filter(Boolean).join(', '))}<br>Notes: ${esc(o.customer.notes || '—')}</p><hr>${o.items.map(i => `<p>${esc(i.name)} × ${i.qty} — ${fmt(i.price * i.qty)}</p>`).join('')}<hr><p>Subtotal: ${fmt(o.subtotal)}<br>Delivery: ${fmt(o.delivery)}<br><b>Total: ${fmt(o.total)}</b></p><p>Payment Method: ${esc(o.payment.method)}<br>Transaction Reference: <b>${esc(o.payment.reference)}</b><br>Payment status: ${esc(o.paymentStatus)}</p>${o.status === 'PENDING' ? `<button class="confirm-btn" data-confirm="${o.id}">VERIFY PAYMENT & CONFIRM</button>` : ''}`;
    }
    let shade = $('detailShade');
    if (shade) shade.classList.remove('hidden');
}

function confirmOrder(id) {
    let o = db.orders.find(x => x.id === id);
    if (!o || o.status !== 'PENDING') return;
    let tx = db.transactions.find(t => t.orderId === id);
    o.status = 'PAID';
    o.paymentStatus = 'VERIFIED BY ADMIN';
    o.paidAt = new Date().toISOString();
    if (tx) tx.status = 'VERIFIED';
    save();
    refreshAll();
    showAlert('Payment confirmed', `Oda ${id} imethibitishwa. Sasa unaweza kuanza kufunga mzigo.`);
}

function cancelOrder(id) {
    let o = db.orders.find(x => x.id === id);
    if (!o || !['PENDING', 'PAID'].includes(o.status)) return;
    if (!o.stockReturned) {
        o.items.forEach(i => {
            let p = db.products.find(x => x.id === i.id);
            if (p) p.stock += i.qty;
        });
        o.stockReturned = true;
    }
    o.status = 'CANCELLED';
    o.paymentStatus = 'CANCELLED / REVIEW REFUND';
    let tx = db.transactions.find(t => t.orderId === id);
    if (tx) tx.status = 'CANCELLED';
    save();
    refreshAll();
    toast('Oda imecancel na stock imerudishwa.');
}

function status(id, s) {
    let o = db.orders.find(x => x.id === id);
    if (o) {
        o.status = s;
        save();
        refreshAll();
        toast('Order status updated: ' + s);
    }
}

function compress(file) {
    return new Promise((resolve, reject) => {
        let img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => {
            let scale = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement('canvas');
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL('image/jpeg', .78));
        };
        img.onerror = reject;
        img.src = url;
    });
}

let photoFile = $('photoFile');
if (photoFile) {
    photoFile.onchange = async e => {
        let f = e.target.files[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) return toast('Chagua image file.');
        try {
            pendingImage = await compress(f);
            let prev = $('photoPreview');
            if (prev) prev.innerHTML = `<img src="${pendingImage}">`;
        } catch (err) {
            toast('Picha haikuweza kusomwa.');
        }
    };
}

function openEditor(id) {
    let p = db.products.find(x => x.id === id), f = $('productForm');
    if (f) f.reset();
    pendingImage = '';
    let prev = $('photoPreview');
    if (prev) prev.textContent = 'IMAGE PREVIEW';
    if (f && f.elements.id) f.elements.id.value = p?.id || '';
    let edTitle = $('editorTitle');
    if (edTitle) edTitle.textContent = p ? 'Edit product' : 'Add product';
    if (p && f) {
        ['name', 'sku', 'category', 'target', 'price', 'oldPrice', 'stock', 'sizes', 'colors', 'material', 'description', 'status'].forEach(k => {
            if (f.elements[k]) f.elements[k].value = p[k] ?? '';
        });
        pendingImage = p.image || '';
        if (p.image && prev) prev.innerHTML = `<img src="${p.image}">`;
    }
    let shade = $('editorShade');
    if (shade) shade.classList.remove('hidden');
}

let addProdBtn = $('addProduct');
if (addProdBtn) addProdBtn.onclick = () => openEditor();

let productForm = $('productForm');
if (productForm) {
    productForm.onsubmit = async e => {
        e.preventDefault();
        let f = e.target, d = Object.fromEntries(new FormData(f).entries()), old = db.products.find(p => p.id === d.id);
        if (!pendingImage && !old?.image) return toast('Pakia picha ya bidhaa kwanza.');
        let p = {
            id: d.id || 'P' + Date.now(),
            name: d.name,
            sku: d.sku,
            category: d.category,
            target: d.target,
            price: Number(d.price),
            oldPrice: Number(d.oldPrice || 0),
            stock: Number(d.stock),
            sizes: d.sizes,
            colors: d.colors,
            material: d.material,
            description: d.description,
            status: d.status,
            image: pendingImage || old.image,
            updatedAt: new Date().toISOString()
        };
        if (old) db.products = db.products.map(x => x.id === p.id ? p : x);
        else db.products.unshift(p);
        save();
        let shade = $('editorShade');
        if (shade) shade.classList.add('hidden');
        refreshAll();
        toast('Product saved successfully.');
    };
}

document.addEventListener('click', e => {
    let b = e.target.closest('[data-edit]');
    if (b) openEditor(b.dataset.edit);
    
    b = e.target.closest('[data-delete]');
    if (b && confirm('Delete this product?')) {
        db.products = db.products.filter(p => p.id !== b.dataset.delete);
        save();
        refreshAll();
    }
    
    b = e.target.closest('[data-order]');
    if (b) orderDetail(b.dataset.order);
    
    b = e.target.closest('[data-confirm]');
    if (b) confirmOrder(b.dataset.confirm);
    
    b = e.target.closest('[data-cancel]');
    if (b) cancelOrder(b.dataset.cancel);
    
    for (let [a, s] of [['pack', 'PACKING'], ['ship', 'SHIPPED'], ['deliver', 'DELIVERED']]) {
        b = e.target.closest('[data-' + a + ']');
        if (b) status(b.dataset[a], s);
    }
    
    b = e.target.closest('[data-close]');
    if (b) {
        let target = $(b.dataset.close);
        if (target) target.classList.add('hidden');
    }
});

let orderFilter = $('orderFilter');
if (orderFilter) orderFilter.onchange = renderOrders;

let refreshVisitors = $('refreshVisitors');
if (refreshVisitors) refreshVisitors.onclick = renderVisitors;

let savePromo = $('savePromo');
if (savePromo) {
    savePromo.onclick = () => {
        db.promotions = {
            title: $('promoTitle')?.value || '',
            qty: Number($('promoQty')?.value || 10),
            reward: $('promoReward')?.value || '',
            desc: $('promoDesc')?.value || ''
        };
        save();
        renderPromotions();
        toast('Promotion saved.');
    };
}

let exportCsv = $('exportCsv');
if (exportCsv) {
    exportCsv.onclick = () => {
        let rows = [['Order', 'Date', 'Customer', 'Phone', 'Alternate', 'Status', 'Subtotal', 'Delivery', 'Total', 'Payment', 'Reference'], ...db.orders.map(o => [o.id, o.createdAt, o.customer.name, o.customer.phone, o.customer.altPhone, o.status, o.subtotal, o.delivery, o.total, o.payment.method, o.payment.reference])];
        let csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
        let a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = 'myles-store-orders.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    };
}

let clearDemo = $('clearDemo');
if (clearDemo) {
    clearDemo.onclick = () => {
        if (confirm('Hii itafuta bidhaa, oda, transactions na promotions zote kwenye browser hii. Endelea?')) {
            localStorage.removeItem(KEY);
            localStorage.removeItem(VIS);
            db = load();
            refreshAll();
            toast('Local demo data cleared.');
        }
    };
}

window.addEventListener('storage', () => {
    db = load();
    refreshAll();
});

setInterval(() => {
    if (sessionStorage.getItem('myles_admin') === 'yes') refreshAll();
}, 30000);

login();
})();