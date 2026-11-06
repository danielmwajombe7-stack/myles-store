import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDRfl1eK-Hs4i3vhcEiE2gfAhE6-cKcrGI",
    authDomain: "myles-store.firebaseapp.com",
    projectId: "myles-store",
    storageBucket: "myles-store.firebasestorage.app",
    messagingSenderId: "685481505770",
    appId: "1:685481505770:web:d728a7d7cf2471d466f893"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const fmt = n => 'TSh ' + Number(n || 0).toLocaleString('en-US');
const $ = id => document.getElementById(id);
const credentials = { user: 'myles', pass: 'myles123' };

let productsList = [], ordersList = [], pendingImage = '';

// Kusoma bidhaa kutoka Firebase moja kwa moja (Real-time)
onSnapshot(collection(db, "products"), (snapshot) => {
    productsList = [];
    snapshot.forEach((d) => {
        productsList.push({ id: d.id, ...d.data() });
    });
    renderProducts();
});

// Kusoma oda za wateja kutoka Firebase moja kwa moja
onSnapshot(collection(db, "orders"), (snapshot) => {
    ordersList = [];
    snapshot.forEach((d) => {
        ordersList.push({ id: d.id, ...d.data() });
    });
    renderOrders();
    let pendingCount = ordersList.filter(o => o.status === 'PENDING').length;
    if($('pendingBadge')) $('pendingBadge').textContent = pendingCount;
});

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
    let dateLabel = $('dateLabel');
    if (dateLabel) dateLabel.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
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
    document.querySelectorAll('.sidebar-menu li').forEach(x => x.classList.toggle('active', x.dataset.view === view));
    let viewTitle = $('viewTitle');
    if (viewTitle) viewTitle.textContent = view === 'products' ? 'Usimamizi wa Bidhaa' : 'Oda za Wateja';
}

document.querySelectorAll('.sidebar-menu li').forEach(b => {
    b.onclick = () => nav(b.dataset.view);
});

function table(headers, rows) {
    return `<div class="table-scroll"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty-cell">Hakuna taarifa bado.</td></tr>`}</tbody></table></div>`;
}

function renderProducts() {
    let rows = productsList.map(p => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${p.image ? `<img src="${p.image}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">` : '<span style="background:#eee;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:4px;">M</span>'}
                    <span><b>${p.name}</b></span>
                </div>
            </td>
            <td>${p.category || '—'}</td>
            <td>${fmt(p.price)}</td>
            <td>${p.stock || 10}</td>
            <td><button class="danger-btn" data-delete="${p.id}">Futa</button></td>
        </tr>
    `).join('');
    let el = $('productTable');
    if (el) el.innerHTML = table(['BIDHAA', 'AINA', 'BEI', 'STOO', 'VITENDO'], rows);
}

function renderOrders() {
    let rows = ordersList.map(o => `
        <tr>
            <td><b>${o.id.slice(0, 6)}...</b><br><small>${new Date(o.createdAt).toLocaleString()}</small></td>
            <td>${o.customer.name}<br><small>${o.customer.phone}</small></td>
            <td>${o.items.map(i => `${i.name} (×${i.qty})`).join('<br>')}</td>
            <td><b>${fmt(o.total)}</b></td>
            <td><span style="background:#fff3cd; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold;">${o.status}</span></td>
        </tr>
    `).join('');
    let el = $('orderTable');
    if (el) el.innerHTML = table(['ODA ID', 'MTEJA', 'BIDHAA', 'JUMLA', 'HALI'], rows);
}

// Mfumo wa kubana picha (Compress) ili iweze kuingia vizuri kwenye database
function compress(file) {
    return new Promise((resolve, reject) => {
        let img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => {
            let scale = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement('canvas');
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL('image/jpeg', .75));
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
        try {
            pendingImage = await compress(f);
            let prev = $('photoPreview');
            if (prev) prev.innerHTML = `<img src="${pendingImage}">`;
        } catch (err) {
            alert('Picha haikuweza kusomwa.');
        }
    };
}

let productForm = $('productForm');
if (productForm) {
    productForm.onsubmit = async e => {
        e.preventDefault();
        let f = e.target, d = Object.fromEntries(new FormData(f).entries());
        if (!pendingImage) return alert('Tafadhali chagua picha ya bidhaa kutoka kwenye kompyuta yako.');

        try {
            await addDoc(collection(db, "products"), {
                name: d.name,
                category: d.category,
                price: Number(d.price),
                stock: Number(d.stock),
                image: pendingImage,
                createdAt: new Date().toISOString()
            });
            alert('Bidhaa imehifadhiwa mtandaoni kwa mafanikio!');
            productForm.reset();
            pendingImage = '';
            $('photoPreview').textContent = 'Hakuna Picha';
        } catch (err) {
            console.error(err);
            alert('Imeshindikana kuhifadhi bidhaa.');
        }
    };
}

document.addEventListener('click', async e => {
    let b = e.target.closest('[data-delete]');
    if (b && confirm('Unataka kufuta bidhaa hii kabisa kwenye mtandao?')) {
        try {
            await deleteDoc(doc(db, "products", b.dataset.delete));
            alert('Bidhaa imefutwa.');
        } catch (err) {
            alert('Imeshindikana kufuta.');
        }
    }
});

login();
