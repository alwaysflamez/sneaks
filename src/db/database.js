const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'sneaks.db');
const PRODUCTS_JSON = path.join(DB_DIR, 'products.json');
const ORDERS_JSON = path.join(DB_DIR, 'orders.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbInstance = null;

function initDatabase() {
    if (dbInstance) return dbInstance;

    try {
        dbInstance = new DatabaseSync(DB_PATH);

        // Enable WAL mode for better concurrency and performance
        dbInstance.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
        `);

        // Create Products Table
        dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                originalPrice REAL,
                tag TEXT,
                category TEXT NOT NULL,
                image TEXT NOT NULL,
                fallbackImage TEXT,
                description TEXT,
                inventory TEXT NOT NULL,
                createdAt TEXT DEFAULT (datetime('now')),
                updatedAt TEXT DEFAULT (datetime('now'))
            );
        `);

        // Create Orders Table
        dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS orders (
                orderRef TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                updatedAt TEXT,
                customer TEXT NOT NULL,
                payment TEXT NOT NULL,
                delivery TEXT NOT NULL,
                items TEXT NOT NULL,
                subtotal REAL NOT NULL,
                totalAmount REAL NOT NULL,
                whatsappDispatchUrl TEXT
            );
        `);

        // Seed products from products.json if empty or missing items
        seedProductsIfNecessary(dbInstance);

        // Seed orders from orders.json if table is empty
        seedOrdersIfNecessary(dbInstance);

        console.log(`[SQLite] Database initialized successfully at ${DB_PATH}`);
        return dbInstance;
    } catch (err) {
        console.error('[SQLite] Database initialization error:', err);
        throw err;
    }
}

function seedProductsIfNecessary(db) {
    try {
        if (!fs.existsSync(PRODUCTS_JSON)) return;
        const fileData = fs.readFileSync(PRODUCTS_JSON, 'utf8');
        const jsonProducts = JSON.parse(fileData || '[]');
        if (!Array.isArray(jsonProducts) || jsonProducts.length === 0) return;

        const countRow = db.prepare('SELECT COUNT(*) as count FROM products').get();
        const existingCount = countRow ? countRow.count : 0;

        // If table is empty or missing items from JSON, seed/sync them
        if (existingCount < jsonProducts.length) {
            const insertOrReplace = db.prepare(`
                INSERT INTO products (id, name, price, originalPrice, tag, category, image, fallbackImage, description, inventory, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    price = excluded.price,
                    originalPrice = excluded.originalPrice,
                    tag = excluded.tag,
                    category = excluded.category,
                    image = excluded.image,
                    fallbackImage = excluded.fallbackImage,
                    description = excluded.description,
                    inventory = excluded.inventory,
                    updatedAt = excluded.updatedAt
            `);

            const now = new Date().toISOString();
            for (const p of jsonProducts) {
                const invStr = typeof p.inventory === 'object' ? JSON.stringify(p.inventory) : (p.inventory || '{}');
                insertOrReplace.run(
                    p.id,
                    p.name,
                    Number(p.price) || 0,
                    Number(p.originalPrice) || Number(p.price) || 0,
                    p.tag || 'New Drop',
                    p.category || 'Casual',
                    p.image,
                    p.fallbackImage || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
                    p.description || '',
                    invStr,
                    p.createdAt || now,
                    now
                );
            }
            console.log(`[SQLite] Seeded ${jsonProducts.length} sneakers into SQLite products table.`);
        }
    } catch (err) {
        console.error('[SQLite] Error seeding products:', err);
    }
}

function seedOrdersIfNecessary(db) {
    try {
        if (!fs.existsSync(ORDERS_JSON)) return;
        const fileData = fs.readFileSync(ORDERS_JSON, 'utf8');
        const jsonOrders = JSON.parse(fileData || '[]');
        if (!Array.isArray(jsonOrders) || jsonOrders.length === 0) return;

        const countRow = db.prepare('SELECT COUNT(*) as count FROM orders').get();
        const existingCount = countRow ? countRow.count : 0;

        if (existingCount === 0) {
            const insert = db.prepare(`
                INSERT OR IGNORE INTO orders (orderRef, status, createdAt, updatedAt, customer, payment, delivery, items, subtotal, totalAmount, whatsappDispatchUrl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const o of jsonOrders) {
                insert.run(
                    o.orderRef,
                    o.status || 'pending_dispatch',
                    o.createdAt || new Date().toISOString(),
                    o.updatedAt || new Date().toISOString(),
                    JSON.stringify(o.customer || {}),
                    JSON.stringify(o.payment || {}),
                    JSON.stringify(o.delivery || {}),
                    JSON.stringify(o.items || []),
                    Number(o.subtotal) || 0,
                    Number(o.totalAmount) || 0,
                    o.whatsappDispatchUrl || ''
                );
            }
            console.log(`[SQLite] Seeded ${jsonOrders.length} orders into SQLite orders table.`);
        }
    } catch (err) {
        console.error('[SQLite] Error seeding orders:', err);
    }
}

function getDb() {
    if (!dbInstance) {
        return initDatabase();
    }
    return dbInstance;
}

// Backup sync utility to keep JSON files updated for offline or standalone fallback
function syncBackups() {
    try {
        const db = getDb();
        const productsRaw = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
        const products = productsRaw.map(r => ({
            ...r,
            inventory: JSON.parse(r.inventory || '{}')
        }));
        fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(products, null, 2), 'utf8');

        const ordersRaw = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
        const orders = ordersRaw.map(r => ({
            orderRef: r.orderRef,
            status: r.status,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            customer: JSON.parse(r.customer || '{}'),
            payment: JSON.parse(r.payment || '{}'),
            delivery: JSON.parse(r.delivery || '{}'),
            items: JSON.parse(r.items || '[]'),
            subtotal: r.subtotal,
            totalAmount: r.totalAmount,
            whatsappDispatchUrl: r.whatsappDispatchUrl
        }));
        fs.writeFileSync(ORDERS_JSON, JSON.stringify(orders, null, 2), 'utf8');
    } catch (err) {
        console.error('[SQLite] Error syncing backups to JSON:', err);
    }
}

module.exports = {
    getDb,
    initDatabase,
    syncBackups,
    DB_PATH
};
