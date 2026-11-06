import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

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

// Kusoma data zote Real-time kutoka Firebase
onSnapshot(collection(db, "products"), (snapshot) => {
    productsList = [];
    snapshot.forEach((d) => {
        productsList.push({ id: d.id, ...d.data() });
    });
    refreshAll();
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
}

document.querySelectorAll('.nav').forEach(b => b.onclick = () => nav(b.dataset.view));

function refreshAll() {
    if ($('statProducts')) $('statProducts').textContent = productsList.length;
    renderProducts();
}

function table(headers, rows) {
    return `<div class="table-scroll"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty-cell">Hakuna taarifa bado.</td></tr>`}</tbody></table></div>`;
}

function renderProducts() {
    let rows = productsList.map(p => `<tr><td><div class="item-cell">${p.image ? `<img src="${p.image}" style="width:40px;height:40px;object-fit:cover;">` : '<span class="thumb-empty">M</span>'}<span><b>${p.name}</b></span></div></td><td>${p.category || 'Gen'}</td><td>${fmt(p.price)}</td><td>${p.stock || 10}</td><td><button class="outline-btn" data-delete="${p.id}">DELETE</button></td></tr>`).join('');
    let el = $('productTable');
    if (el) el.innerHTML = table(['PRODUCT', 'CATEGORY', 'PRICE', 'STOCK', 'ACTIONS'], rows);
}

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
            if (prev) prev.innerHTML = `<img src="${pendingImage}" style="max-height:100px;">`;
        } catch (err) {
            alert('Picha haikusomeka.');
        }
    };
}

let productForm = $('productForm');
if (productForm) {
    productForm.onsubmit = async e => {
        e.preventDefault();
        let f = e.target, d = Object.fromEntries(new FormData(f).entries());
        if (!pendingImage) return alert('Tafadhali pakia picha ya bidhaa.');

        try {
            await addDoc(collection(db, "products"), {
                name: d.name,
                category: d.category || 'General',
                price: Number(d.price),
                stock: Number(d.stock || 10),
                image: pendingImage,
                createdAt: new Date().toISOString()
            });
            alert('Bidhaa imehifadhiwa mtandaoni!');
            productForm.reset();
            pendingImage = '';
            $('photoPreview').textContent = 'IMAGE PREVIEW';
        } catch (err) {
            console.error(err);
            alert('Imeshindikana kuhifadhi bidhaa.');
        }
    };
}

document.addEventListener('click', async e => {
    let b = e.target.closest('[data-delete]');
    if (b && confirm('Unataka kufuta bidhaa hii?')) {
        await deleteDoc(doc(db, "products", b.dataset.delete));
    }
});

login();
