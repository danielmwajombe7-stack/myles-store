MYLES STORE 2026 — INSTALLATION

1. Extract MYLES-STORE-2026.zip into C:\xampp\htdocs\
2. Start Apache in XAMPP.
3. Customer store: http://localhost/MYLES-STORE-2026/index.html
4. Admin: http://localhost/MYLES-STORE-2026/admin.html
5. Demo login: username myles | password myles123

FEATURES
- Premium dark/gold fashion storefront with timber-look 3D brand plaque and three hanger garments.
- Product catalogue and device photo uploads (compressed locally; no external product image URLs).
- Cart, checkout, customer main/alternate phone, delivery details and payment method.
- Orders start PENDING with a 15-minute deadline. If not verified by admin before expiry, order becomes EXPIRED and stock is restored.
- Admin modules: overview, products, orders, customers, visitor sessions, transactions, promotions, inventory, reports and settings.
- Admin can verify payment, cancel, pack, ship and mark delivered.
- Export orders to CSV.
- Promotion editor for customers buying 10+ items.

IMPORTANT LIMITATIONS
This edition is a browser/localStorage prototype. Data is shared only between pages opened in the same browser profile on the same computer. It is NOT yet a multi-device live online store.
Visitor analytics only show visits recorded in this browser profile, not all public visitors.
Mobile-money transactions are NOT automatically detected. Admin manually verifies the transaction/reference. Automatic M-Pesa/Mixx/Airtel Money/HaloPesa confirmation requires official merchant API credentials and a server-side payment integration.
For public deployment, connect a backend (PHP/MySQL), secure admin authentication, server-side order expiry/stock locking, image upload storage and payment callbacks. Do not use demo credentials on a public server.
