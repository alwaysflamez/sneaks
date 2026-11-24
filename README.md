# 👟 SnEAKs Vault Ghana — Backend API

Modern RESTful API and backend server for **SnEAKs Vault**, Ghana's exclusive sneaker drops and custom kicks store. Built with Node.js and Express.js, featuring real-time product discovery, catalog management, order processing, and Mobile Money (MoMo) integration.

---

## 🚀 Features

- **Product Catalog API**: Full CRUD, category filtering, keyword search, price range filters, and multi-mode sorting (`price-low`, `price-high`, `name-az`, `featured`).
- **Inventory Stock Control**: Real-time size-level inventory decrementing upon order placement, restock upon cancellation, low stock indicators, and instant admin inventory adjustments.
- **Admin PIN Security Gate**: Server-configured `ADMIN_PIN` and short-lived bearer tokens protect administrative Orders Desk operations.
- **Live Order Tracking**: Instant customer lookup via `#SNK-` reference code with a 4-step delivery progress stepper (`Order Placed` ➔ `Payment Verified` ➔ `Dispatched` ➔ `Delivered`).
- **Order Management API**: Submit orders with items, calculate subtotal and free express dispatch thresholds (GH₵ 800+), generate unique `#SNK-XXXXX` order reference codes, and track status (`pending_payment`, `payment_verified`, `pending_dispatch`, `dispatched`, `delivered`, `cancelled`).
- **Mobile Money (MoMo) Integration**: Pre-formatted WhatsApp order dispatch receipts, official MoMo line verification (`0256514988`), and transaction logging.
- **Persistent Data Store**: Native SQLite database (`src/data/sneaks.db`) with zero external binary dependencies via Node.js `node:sqlite`, with public catalog fallback synchronization (`src/data/products.json`).
- **Apple Design & Mobile Optimization**: iOS-inspired Bottom Sheet modal system, responsive 2-column mobile sneaker grid, swipeable horizontal category filter rail, safe-area inset adaptation, and a floating mobile bottom navigation bar.
- **Static Frontend Serving**: Serves the `index.html` storefront directly at `http://localhost:5000`.
- **CORS Restricted**: Configure allowed storefront origins with `CORS_ORIGINS`.

---

## 📁 Directory Structure

```text
Sneaks/
├── server.js                      # Express/Native server entry point & static host
├── package.json                   # Dependencies, scripts (start, dev, db:init)
├── .env                           # Environment variables (local, git-ignored)
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules (includes db-wal/shm)
├── README.md                      # Documentation & API reference
├── index.html                     # Responsive, Apple-grade frontend storefront
├── start-server.bat               # Windows batch server launcher
├── start-server.ps1               # Windows PowerShell server launcher
├── .agents/                       # Agent & UI/UX design intelligence skills
│   └── skills/
│       ├── anti-ai-slop-ui/       # Human craft & anti-slop guidelines
│       ├── apple-design-fluid/    # Apple fluid motion & micro-interactions
│       ├── apple-design-hig/      # Apple HIG patterns & Bottom Sheet design
│       ├── ui-ux-pro-max/         # UI/UX design intelligence database
│       └── unslop/                # Comprehensive redesign & redline passes
└── src/
    ├── data/
    │   ├── sneaks.db              # SQLite database (products & orders)
    │   ├── products.json          # 22 authentic sneaker items (backup sync)
    │   └── orders.json            # Order records database (backup sync)
    ├── db/
    │   └── database.js            # Native SQLite layer (node:sqlite) & migrations
    ├── services/
    │   ├── productService.js      # Product query, search, and SQLite CRUD logic
    │   └── orderService.js        # Order validation, ref generator, & SQLite persistence
    ├── controllers/
    │   ├── productController.js   # Product request handlers
    │   ├── orderController.js     # Order request handlers
    │   └── paymentController.js   # MoMo payment verification handlers
    └── routes/
        ├── productRoutes.js       # Product endpoints
        ├── orderRoutes.js         # Order endpoints
        └── paymentRoutes.js       # Payment endpoints
```

---

## 🛠️ Quick Start

### 1. Prerequisite: Node.js
If you don't have Node.js installed, install it via:
* **Option A (Windows winget)**:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
* **Option B**: Download directly from [nodejs.org](https://nodejs.org).

### 2. Install Dependencies
Open your terminal in the `Sneaks` directory and run:
```bash
npm install
```

### 3. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Start the Server
* **Production mode**:
  ```bash
  npm start
  ```
* **Development mode (auto-reload)**:
  ```bash
  npm run dev
  ```
* **Initialize/Seed SQLite Database manually (optional - runs automatically on server start)**:
  ```bash
  npm run db:init
  ```

Server will start on: **`http://localhost:5000`**

---

## 📡 API Reference

### 1. System Health
* **`GET /api/health`**
  * Returns backend status, supported payment methods, and API routes.

---

### 2. Products

* **`GET /api/products`**
  * Query parameters:
    * `category`: Filter by category (e.g. `Lifestyle`, `Streetwear`, `Low Tops`, `High Tops`, `Chunky`, `Performance`, `Court`, `Runners`).
    * `search`: Search sneaker name, category, or tag (e.g. `?search=jordan`).
    * `sort`: `price-low`, `price-high`, `name-az`, or `featured`.
    * `minPrice` / `maxPrice`: Numerical price boundaries.
* **`GET /api/products/categories`**
  * Returns list of all available categories.
* **`GET /api/products/:id`**
  * Returns product details for a specific sneaker ID.
* **`PATCH /api/products/:id/inventory`**
  * Adjust size-level inventory for a sneaker model (Admin).
  * Request Body:
    ```json
    {
      "inventory": {
        "EU 39": 5,
        "EU 40": 5,
        "EU 41": 6,
        "EU 42": 8,
        "EU 43": 7,
        "EU 44": 5,
        "EU 45": 3
      }
    }
    ```
* **`POST /api/products`**
  * Add a new sneaker to catalog (Admin).
  * Request Body:
    ```json
    {
      "name": "Nike Dunk Low Retro White Black",
      "price": 650.00,
      "originalPrice": 750.00,
      "tag": "Bestseller",
      "category": "Low Tops",
      "image": "https://example.com/shoe.jpg",
      "description": "Iconic panda colorway."
    }
    ```
* **`PUT /api/products/:id`**
  * Update product details or price.
* **`DELETE /api/products/:id`**
  * Remove sneaker from catalog.

---

### 3. Orders

* **`POST /api/orders`**
  * Submit a new customer order.
  * Request Body:
    ```json
    {
      "customer": {
        "name": "Kwame Mensah",
        "phone": "0244123456",
        "email": "kwame@example.com",
        "address": "House No. 14, East Legon",
        "region": "Accra - East Legon / Airport / Cantonments"
      },
      "paymentMethod": "momo",
      "items": [
        {
          "id": 7,
          "name": "Air Jordan 1 High OG",
          "size": "US 10",
          "color": "Bred",
          "price": 500.00,
          "quantity": 1
        }
      ]
    }
    ```
  * Response (`201 Created`):
    ```json
    {
      "success": true,
      "message": "Order placed successfully.",
      "data": {
        "orderRef": "#SNK-59281",
        "status": "pending_payment",
        "subtotal": 500.00,
        "totalAmount": 500.00,
        "whatsappDispatchUrl": "https://wa.me/233501019565?text=...",
        ...
      }
    }
    ```
* **`GET /api/orders`**
  * Retrieve all orders (optional query: `?status=pending_payment` or `?search=0244123456`).
* **`GET /api/orders/:ref`**
  * Retrieve specific order by reference (e.g. `/api/orders/%23SNK-59281` or `/api/orders/#SNK-59281`).
* **`PATCH /api/orders/:ref/status`**
  * Update order status:
    ```json
    { "status": "dispatched" }
    ```

---

### 4. Payments (MoMo Desk)

* **`GET /api/payments/momo/info`**
  * Official MoMo account line and payment instructions.
* **`POST /api/payments/momo/verify`**
  * Mark an order verified with customer's MoMo transaction reference:
    ```json
    {
      "orderRef": "#SNK-59281",
      "transactionRef": "MTN-TXN-9823419"
    }
    ```

---

## 🔒 Security & Best Practices

- Input sanitization on all client payloads.
- Dynamic reference generation avoiding collisions.
- CORS configured for secure local and remote access.
- Ready for production deployment on Render, Railway, Vercel, or AWS.

