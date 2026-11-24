const path = require('path');
const fs = require('fs');
const http = require('http');
const { createAdminToken, requireAdmin } = require('./src/middleware/adminAuth');

// Auto-load environment variables from .env file
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        try {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const idx = trimmed.indexOf('=');
                    const key = trimmed.slice(0, idx).trim();
                    let val = trimmed.slice(idx + 1).trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            });
        } catch (e) { }
    }
}
loadEnv();

// Initialize SQLite database
const { initDatabase } = require('./src/db/database');
initDatabase();

const PORT = process.env.PORT || 5000;

// Try loading Express and CORS if installed
let expressApp = null;
try {
    const express = require('express');
    const cors = require('cors');
    const helmet = require('helmet');

    const productRoutes = require('./src/routes/productRoutes');
    const orderRoutes = require('./src/routes/orderRoutes');
    const paymentRoutes = require('./src/routes/paymentRoutes');
    const adminRoutes = require('./src/routes/adminRoutes');

    const app = express();
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const allowed = (process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
            if (allowed.length === 0 || allowed.includes(origin)) return callback(null, true);
            return callback(new Error('Origin not allowed'));
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    }));
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
            database: 'SQLite (node:sqlite)',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            paymentMethod: 'Cash on Delivery',
            whatsappSupport: `+${process.env.WHATSAPP_SUPPORT_PHONE || '233501019565'}`
        });
    });

    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/admin', adminRoutes);

    // Serve only the storefront entry point; private files are never static.
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
    app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

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

            function isNativeAdmin(req) {
                const authorization = req.headers.authorization || '';
                const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
                const expiresAt = nativeAdminTokens.get(token);
                if (!expiresAt || expiresAt < Date.now()) {
                    if (expiresAt) nativeAdminTokens.delete(token);
                    return false;
                }
                return true;
            }

            const nativeAdminTokens = new Map();
        });
        req.on('error', reject);
    });
}

const nativeServer = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
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
        if (pathname === '/api/admin/login' && req.method === 'POST') {
            const body = await parseBody(req);
            const token = createAdminToken(body.pin);
            if (!token) return sendJson(res, 401, { success: false, message: 'Invalid admin PIN.' });
            nativeAdminTokens.set(token, Date.now() + 8 * 60 * 60 * 1000);
            return sendJson(res, 200, { success: true, token, expiresIn: 28800 });
        }

        // Health
        if (pathname === '/api/health' && req.method === 'GET') {
            return sendJson(res, 200, {
                status: 'online',
                service: 'SnEAKs Vault Ghana Backend API',
                mode: 'Native Node.js (Zero Dependency)',
                database: 'SQLite (node:sqlite)',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                paymentMethod: 'Cash on Delivery',
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
            if (!isNativeAdmin(req)) return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
            const body = await parseBody(req);
            const updated = productService.updateInventory(invMatch[1], body.inventory);
            return updated
                ? sendJson(res, 200, { success: true, message: 'Inventory updated', data: updated })
                : sendJson(res, 404, { success: false, message: 'Sneaker not found' });
        }

        // Create Product
        if (pathname === '/api/products' && req.method === 'POST') {
            if (!isNativeAdmin(req)) return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
            const body = await parseBody(req);
            const created = productService.create(body);
            return sendJson(res, 201, { success: true, data: created });
        }

        // Orders List
        if (pathname === '/api/orders' && req.method === 'GET') {
            if (!isNativeAdmin(req)) return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
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
            const order = orderService.getPublicTracking(decodeURIComponent(orderMatch[1]));
            return order
                ? sendJson(res, 200, { success: true, data: order })
                : sendJson(res, 404, { success: false, message: 'Order not found' });
        }

        // Update Order Status (PATCH /api/orders/:ref or PATCH /api/orders/:ref/status)
        const statusMatch = pathname.match(/^\/api\/orders\/([^/]+)(?:\/status)?$/);
        if (statusMatch && req.method === 'PATCH') {
            if (!isNativeAdmin(req)) return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
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
            return sendJson(res, 503, {
                success: false,
                message: 'MoMo verification is unavailable. Payment is confirmed by the dispatch desk only.'
            });
        }

        // --- STATIC FILE SERVING (Frontend) ---
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
        console.log(`🗄️  Database:            SQLite (src/data/sneaks.db)`);
        console.log(`🚀 Live URL:            http://localhost:${PORT}`);
        console.log(`📡 API Health Check:    http://localhost:${PORT}/api/health`);
        console.log(`📦 Products Endpoint:   http://localhost:${PORT}/api/products`);
        console.log(`📋 Orders Endpoint:     http://localhost:${PORT}/api/orders`);
        console.log(`=================================================`);
    });
}

module.exports = serverToRun;
