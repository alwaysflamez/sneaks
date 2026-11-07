# 👟 SnEAKs Vault Ghana — Backend API

Modern RESTful API and backend server for **SnEAKs Vault**, Ghana's exclusive sneaker drops and custom kicks store. Built with Node.js and Express.js, featuring real-time product discovery, catalog management, order processing, and Mobile Money (MoMo) integration.

---

## 🚀 Features

- **Product Catalog API**: Full CRUD, category filtering, keyword search, price range filters, and multi-mode sorting (`price-low`, `price-high`, `name-az`, `featured`).
- **Order Management API**: Submit orders with items, calculate subtotal and free express dispatch thresholds (GH₵ 800+), generate unique `#SNK-XXXXX` order reference codes, and track status (`pending_payment`, `payment_verified`, `pending_dispatch`, `dispatched`, `delivered`, `cancelled`).
- **Mobile Money (MoMo) Integration**: Pre-formatted WhatsApp order dispatch receipts, official MoMo line verification (`0256514988`), and transaction logging.
- **Persistent Data Store**: Clean JSON file-based database (`src/data/products.json` and `src/data/orders.json`), running out-of-the-box without requiring external database setups.
- **Static Frontend Serving**: Serves the `index.html` storefront directly at `http://localhost:5000`.
- **CORS Enabled**: Supports requests from any origin or standalone frontend.

---

## 📁 Directory Structure

```text
Sneaks/
├── server.js                      # Express server entry point & static file host
├── package.json                   # Dependencies and scripts
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules
├── README.md                      # Documentation & API reference
├── index.html                     # Frontend storefront
└── src/
    ├── data/
    │   ├── products.json          # 18 authentic sneaker products
    │   └── orders.json            # Order storage database
    ├── services/
    │   ├── productService.js      # Product query, search, and CRUD logic
    │   └── orderService.js        # Order validation, ref generator, and calculations
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

