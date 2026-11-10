const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = process.env.PORT || 5000;

// Try loading Express and CORS if installed
let expressApp = null;
try {
    const express = require('express');
    const cors = require('cors');

    const productRoutes = require('./src/routes/productRoutes');
    const orderRoutes = require('./src/routes/orderRoutes');
    const paymentRoutes = require('./src/routes/paymentRoutes');

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Request Logger
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
        next();
    });

    // Health Endpoint
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'online',
            service: 'SnEAKs Vault Ghana Backend API',
            mode: 'Express.js',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            officialMoMoLine: process.env.MOMO_OFFICIAL_NUMBER || '0256514988',
            whatsappSupport: `+${process.env.WHATSAPP_SUPPORT_PHONE || '233501019565'}`
        });
    });

    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/payments', paymentRoutes);

    // Static Frontend Serving
    app.use(express.static(path.join(__dirname)));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

    // 404 handler
    app.use('/api/*', (req, res) => {
        res.status(404).json({ success: false, message: `Route "${req.originalUrl}" not found.` });
    });

    expressApp = app;
} catch (err) {
    // Express not installed yet - Native Node.js HTTP fallback will handle requests
}

// Native Node.js HTTP Server Fallback (Zero npm dependencies required)
const productService = require('./src/services/productService');
const orderService = require('./src/services/orderService');

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

const nativeServer = http.createServer(async (req, res) => {
    // Enable CORS for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:5000'}`);
    const pathname = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams.entries());

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    try {
        // --- API ROUTES ---

        // Health
        if (pathname === '/api/health' && req.method === 'GET') {
            return sendJson(res, 200, {
                status: 'online',
                service: 'SnEAKs Vault Ghana Backend API',
                mode: 'Native Node.js (Zero Dependency)',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                officialMoMoLine: process.env.MOMO_OFFICIAL_NUMBER || '0256514988',
                whatsappSupport: `+${process.env.WHATSAPP_SUPPORT_PHONE || '233501019565'}`
            });
        }

        // Products Categories
        if (pathname === '/api/products/categories' && req.method === 'GET') {
            return sendJson(res, 200, { success: true, data: productService.getCategories() });
        }

        // Products List
        if (pathname === '/api/products' && req.method === 'GET') {
            const list = productService.getAll(query);
            return sendJson(res, 200, { success: true, count: list.length, data: list });
        }

        // Single Product
        const prodMatch = pathname.match(/^\/api\/products\/(\d+)$/);
        if (prodMatch && req.method === 'GET') {
            const prod = productService.getById(prodMatch[1]);
            return prod
                ? sendJson(res, 200, { success: true, data: prod })
                : sendJson(res, 404, { success: false, message: 'Sneaker not found' });
        }

        // Product Inventory Update
        const invMatch = pathname.match(/^\/api\/products\/(\d+)\/inventory$/);
        if (invMatch && req.method === 'PATCH') {
            const body = await parseBody(req);
            const updated = productService.updateInventory(invMatch[1], body.inventory);
            return updated
                ? sendJson(res, 200, { success: true, message: 'Inventory updated', data: updated })
                : sendJson(res, 404, { success: false, message: 'Sneaker not found' });
        }

        // Create Product
        if (pathname === '/api/products' && req.method === 'POST') {
            const body = await parseBody(req);
            const created = productService.create(body);
            return sendJson(res, 201, { success: true, data: created });
        }

        // Orders List
        if (pathname === '/api/orders' && req.method === 'GET') {
            const orders = orderService.getAll(query);
            return sendJson(res, 200, { success: true, ...orders });
        }

        // Place Order
        if (pathname === '/api/orders' && req.method === 'POST') {
            const body = await parseBody(req);
            const order = orderService.create(body);
            return sendJson(res, 201, { success: true, message: 'Order created', data: order });
        }

        // Track Order by Ref (GET /api/orders/:ref)
        const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
        if (orderMatch && req.method === 'GET') {
            const order = orderService.getByRef(decodeURIComponent(orderMatch[1]));
            return order
                ? sendJson(res, 200, { success: true, data: order })
                : sendJson(res, 404, { success: false, message: 'Order not found' });
        }

        // Update Order Status (PATCH /api/orders/:ref or PATCH /api/orders/:ref/status)
        const statusMatch = pathname.match(/^\/api\/orders\/([^/]+)(?:\/status)?$/);
        if (statusMatch && req.method === 'PATCH') {
            const body = await parseBody(req);
            const updated = orderService.updateStatus(decodeURIComponent(statusMatch[1]), body.status);
            return updated
                ? sendJson(res, 200, { success: true, data: updated })
                : sendJson(res, 404, { success: false, message: 'Order not found' });
        }

        // MoMo Info
        if (pathname === '/api/payments/momo/info' && req.method === 'GET') {
            return sendJson(res, 200, {
                success: true,
                data: {
                    officialMoMoNumber: process.env.MOMO_OFFICIAL_NUMBER || '0256514988',
                    networks: ['MTN MoMo', 'Telecel Cash', 'AT Money']
                }
            });
        }

        // MoMo Verify
        if (pathname === '/api/payments/momo/verify' && req.method === 'POST') {
            const body = await parseBody(req);
            const verified = orderService.verifyMoMoPayment(body.orderRef, body.transactionRef);
            return verified
                ? sendJson(res, 200, { success: true, data: verified })
                : sendJson(res, 404, { success: false, message: 'Order not found' });
        }

        // --- STATIC FILE SERVING (Frontend) ---
        let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentTypes = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'text/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon'
            };
            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
            return fs.createReadStream(filePath).pipe(res);
        }

        // Not Found
        if (pathname.startsWith('/api/')) {
            return sendJson(res, 404, { success: false, message: `Route "${pathname}" not found.` });
        }

        // Fallback to index.html for single-page app
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return fs.createReadStream(indexPath).pipe(res);
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    } catch (e) {
        console.error('Server error:', e);
        sendJson(res, 500, { success: false, message: e.message || 'Server error' });
    }
});

// Start Server (Express if installed, otherwise Native HTTP)
const serverToRun = expressApp || nativeServer;

if (require.main === module) {
    serverToRun.listen(PORT, () => {
        const mode = expressApp ? 'Express.js Mode' : 'Native Zero-Dependency Mode';
        console.log(`=================================================`);
        console.log(`👟 SnEAKs Vault Ghana Backend is online!`);
        console.log(`⚡ Engine:              ${mode}`);
        console.log(`🚀 Live URL:            http://localhost:${PORT}`);
        console.log(`📡 API Health Check:    http://localhost:${PORT}/api/health`);
        console.log(`📦 Products Endpoint:   http://localhost:${PORT}/api/products`);
        console.log(`📋 Orders Endpoint:     http://localhost:${PORT}/api/orders`);
        console.log(`=================================================`);
    });
}

module.exports = serverToRun;
