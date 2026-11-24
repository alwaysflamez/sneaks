const { getDb, syncBackups } = require('../db/database');

const DEFAULT_INVENTORY = {
    'EU 39': 5,
    'EU 40': 5,
    'EU 41': 6,
    'EU 42': 8,
    'EU 43': 7,
    'EU 44': 5,
    'EU 45': 3
};

function parseProductRow(row) {
    if (!row) return null;
    let inv = {};
    try {
        inv = typeof row.inventory === 'string' ? JSON.parse(row.inventory) : (row.inventory || {});
    } catch (e) {
        inv = { ...DEFAULT_INVENTORY };
    }
    return {
        id: Number(row.id),
        name: row.name,
        price: Number(row.price),
        originalPrice: Number(row.originalPrice || row.price),
        tag: row.tag || 'New Drop',
        category: row.category,
        image: row.image,
        fallbackImage: row.fallbackImage || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
        description: row.description || '',
        inventory: inv,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}

function validateTextField(value, fieldName, maxLength = 500) {
    if (typeof value !== 'string') throw new Error(`${fieldName} must be text.`);
    const clean = value.trim();
    if (!clean) throw new Error(`${fieldName} is required.`);
    if (clean.length > maxLength) throw new Error(`${fieldName} is too long.`);
    if (/[<>&]/.test(clean)) throw new Error(`${fieldName} contains unsupported characters.`);
    return clean;
}

function validateImageUrl(value, fieldName) {
    if (typeof value !== 'string') throw new Error(`${fieldName} must be a URL.`);
    if (!/^https?:\/\//i.test(value)) throw new Error(`${fieldName} must use HTTP or HTTPS.`);
    if (value.length > 2000) throw new Error(`${fieldName} is too long.`);
    return value;
}

const productService = {
    getAll({ category, search, sort, minPrice, maxPrice } = {}) {
        const db = getDb();
        const conditions = [];
        const params = [];

        if (category && category !== 'All') {
            conditions.push('LOWER(category) = LOWER(?)');
            params.push(category);
        }

        if (search && search.trim() !== '') {
            const term = `%${search.trim().toLowerCase()}%`;
            conditions.push('(LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(tag) LIKE ? OR LOWER(description) LIKE ?)');
            params.push(term, term, term, term);
        }

        if (minPrice !== undefined && !isNaN(Number(minPrice))) {
            conditions.push('price >= ?');
            params.push(Number(minPrice));
        }

        if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
            conditions.push('price <= ?');
            params.push(Number(maxPrice));
        }

        let orderBy = 'id ASC';
        if (sort === 'price-low') {
            orderBy = 'price ASC';
        } else if (sort === 'price-high') {
            orderBy = 'price DESC';
        } else if (sort === 'name-az') {
            orderBy = 'name COLLATE NOCASE ASC';
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `SELECT * FROM products ${whereClause} ORDER BY ${orderBy}`;
        const stmt = db.prepare(sql);
        const rows = stmt.all(...params);

        return rows.map(parseProductRow);
    },

    getById(id) {
        const numericId = Number(id);
        if (isNaN(numericId)) return null;

        const db = getDb();
        const row = db.prepare('SELECT * FROM products WHERE id = ?').get(numericId);
        return parseProductRow(row);
    },

    getCategories() {
        const db = getDb();
        const rows = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category ASC').all();
        const categories = rows.map(r => r.category);
        return ['All', ...categories];
    },

    create(productData) {
        if (typeof productData.price !== 'number' || !Number.isFinite(productData.price) || productData.price < 0) {
            throw new Error('Product numeric "price" is required.');
        }
        const name = validateTextField(productData.name, 'Product name', 120);
        const description = validateTextField(
            productData.description || 'Authentic limited edition sneakers sourced and verified by SnEAKs Vault.',
            'Product description',
            1000
        );
        const image = validateImageUrl(
            productData.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
            'Product image'
        );
        const fallbackImage = validateImageUrl(
            productData.fallbackImage || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
            'Fallback product image'
        );

        const db = getDb();
        const maxRow = db.prepare('SELECT MAX(id) as maxId FROM products').get();
        const nextId = (maxRow && maxRow.maxId ? Number(maxRow.maxId) : 0) + 1;

        const inventory = productData.inventory && typeof productData.inventory === 'object'
            ? { ...productData.inventory }
            : { ...DEFAULT_INVENTORY };

        const now = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO products (id, name, price, originalPrice, tag, category, image, fallbackImage, description, inventory, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            nextId,
            name,
            Number(productData.price),
            productData.originalPrice ? Number(productData.originalPrice) : Number(productData.price),
            productData.tag || 'New Drop',
            productData.category || 'Lifestyle',
            image,
            fallbackImage,
            description,
            JSON.stringify(inventory),
            now,
            now
        );

        syncBackups();
        return this.getById(nextId);
    },

    update(id, updates) {
        const current = this.getById(id);
        if (!current) return null;

        const db = getDb();
        const updatedName = updates.name !== undefined
            ? validateTextField(updates.name, 'Product name', 120)
            : current.name;
        const updatedPrice = updates.price !== undefined ? Number(updates.price) : current.price;
        const updatedOriginalPrice = updates.originalPrice !== undefined ? Number(updates.originalPrice) : current.originalPrice;
        const updatedTag = updates.tag !== undefined ? updates.tag : current.tag;
        const updatedCategory = updates.category !== undefined ? updates.category : current.category;
        const updatedImage = updates.image !== undefined
            ? validateImageUrl(updates.image, 'Product image')
            : current.image;
        const updatedFallbackImage = updates.fallbackImage !== undefined
            ? validateImageUrl(updates.fallbackImage, 'Fallback product image')
            : current.fallbackImage;
        const updatedDescription = updates.description !== undefined
            ? validateTextField(updates.description, 'Product description', 1000)
            : current.description;

        let updatedInventory = { ...current.inventory };
        if (updates.inventory && typeof updates.inventory === 'object') {
            updatedInventory = { ...updatedInventory, ...updates.inventory };
        }

        const now = new Date().toISOString();
        const stmt = db.prepare(`
            UPDATE products SET
                name = ?,
                price = ?,
                originalPrice = ?,
                tag = ?,
                category = ?,
                image = ?,
                fallbackImage = ?,
                description = ?,
                inventory = ?,
                updatedAt = ?
            WHERE id = ?
        `);

        stmt.run(
            updatedName,
            updatedPrice,
            updatedOriginalPrice,
            updatedTag,
            updatedCategory,
            updatedImage,
            updatedFallbackImage,
            updatedDescription,
            JSON.stringify(updatedInventory),
            now,
            Number(id)
        );

        syncBackups();
        return this.getById(id);
    },

    decrementStock(id, size, quantity = 1) {
        const product = this.getById(id);
        if (!product) return null;

        const normalizedSize = size || 'EU 42';
        const currentQty = product.inventory[normalizedSize] !== undefined ? product.inventory[normalizedSize] : 5;
        const newQty = Math.max(0, currentQty - (parseInt(quantity, 10) || 1));
        product.inventory[normalizedSize] = newQty;

        const db = getDb();
        const now = new Date().toISOString();
        db.prepare('UPDATE products SET inventory = ?, updatedAt = ? WHERE id = ?')
            .run(JSON.stringify(product.inventory), now, Number(id));

        syncBackups();
        return product;
    },

    incrementStock(id, size, quantity = 1) {
        const product = this.getById(id);
        if (!product) return null;

        const normalizedSize = size || 'EU 42';
        const currentQty = product.inventory[normalizedSize] !== undefined ? product.inventory[normalizedSize] : 0;
        product.inventory[normalizedSize] = currentQty + (parseInt(quantity, 10) || 1);

        const db = getDb();
        const now = new Date().toISOString();
        db.prepare('UPDATE products SET inventory = ?, updatedAt = ? WHERE id = ?')
            .run(JSON.stringify(product.inventory), now, Number(id));

        syncBackups();
        return product;
    },

    updateInventory(id, inventoryObj) {
        const product = this.getById(id);
        if (!product) return null;

        if (inventoryObj && typeof inventoryObj === 'object') {
            Object.keys(inventoryObj).forEach(sizeKey => {
                const val = parseInt(inventoryObj[sizeKey], 10);
                if (!isNaN(val) && val >= 0) {
                    product.inventory[sizeKey] = val;
                }
            });
        }

        const db = getDb();
        const now = new Date().toISOString();
        db.prepare('UPDATE products SET inventory = ?, updatedAt = ? WHERE id = ?')
            .run(JSON.stringify(product.inventory), now, Number(id));

        syncBackups();
        return product;
    },

    delete(id) {
        const product = this.getById(id);
        if (!product) return false;

        const db = getDb();
        db.prepare('DELETE FROM products WHERE id = ?').run(Number(id));
        syncBackups();
        return product;
    }
};

module.exports = productService;
