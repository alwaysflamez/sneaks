const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');
const DEFAULT_INVENTORY = {
    'EU 39': 5,
    'EU 40': 5,
    'EU 41': 6,
    'EU 42': 8,
    'EU 43': 7,
    'EU 44': 5,
    'EU 45': 3
};

function ensureInventory(p) {
    if (!p.inventory || typeof p.inventory !== 'object') {
        p.inventory = { ...DEFAULT_INVENTORY };
    }
    return p.inventory;
}

function readProducts() {
    try {
        if (!fs.existsSync(PRODUCTS_FILE)) {
            fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        const list = JSON.parse(data || '[]');
        return list.map(p => {
            ensureInventory(p);
            return p;
        });
    } catch (err) {
        console.error('Error reading products.json:', err);
        return [];
    }
}

function writeProducts(products) {
    try {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing products.json:', err);
        throw new Error('Failed to persist product data');
    }
}

const productService = {
    getAll({ category, search, sort, minPrice, maxPrice }) {
        let items = readProducts();

        // Filter by category
        if (category && category !== 'All') {
            items = items.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }

        // Search in name, category, tag, or description
        if (search && search.trim() !== '') {
            const q = search.trim().toLowerCase();
            items = items.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                (p.tag && p.tag.toLowerCase().includes(q)) ||
                (p.description && p.description.toLowerCase().includes(q))
            );
        }

        // Price range
        if (minPrice !== undefined && !isNaN(Number(minPrice))) {
            items = items.filter(p => p.price >= Number(minPrice));
        }
        if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
            items = items.filter(p => p.price <= Number(maxPrice));
        }

        // Sorting
        if (sort === 'price-low') {
            items.sort((a, b) => a.price - b.price);
        } else if (sort === 'price-high') {
            items.sort((a, b) => b.price - a.price);
        } else if (sort === 'name-az') {
            items.sort((a, b) => a.name.localeCompare(b.name));
        }

        return items;
    },

    getById(id) {
        const numericId = Number(id);
        const products = readProducts();
        return products.find(p => p.id === numericId) || null;
    },

    getCategories() {
        const products = readProducts();
        const set = new Set(products.map(p => p.category));
        return ['All', ...Array.from(set)];
    },

    create(productData) {
        const products = readProducts();

        // Validation
        if (!productData.name || typeof productData.price !== 'number') {
            throw new Error('Product "name" and numeric "price" are required.');
        }

        const maxId = products.reduce((max, p) => (p.id > max ? p.id : max), 0);
        const newProduct = {
            id: maxId + 1,
            name: productData.name.trim(),
            price: Number(productData.price),
            originalPrice: productData.originalPrice ? Number(productData.originalPrice) : Number(productData.price),
            tag: productData.tag || 'New Drop',
            category: productData.category || 'Lifestyle',
            image: productData.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
            fallbackImage: productData.fallbackImage || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
            description: productData.description || 'Authentic limited edition sneakers sourced and verified by SnEAKs Vault.',
            inventory: productData.inventory && typeof productData.inventory === 'object'
                ? { ...productData.inventory }
                : { ...DEFAULT_INVENTORY }
        };

        products.push(newProduct);
        writeProducts(products);
        return newProduct;
    },

    update(id, updates) {
        const numericId = Number(id);
        const products = readProducts();
        const index = products.findIndex(p => p.id === numericId);

        if (index === -1) {
            return null;
        }

        const current = products[index];
        const updated = {
            ...current,
            ...updates,
            id: current.id // Ensure ID remains immutable
        };

        if (updates.price !== undefined) updated.price = Number(updates.price);
        if (updates.originalPrice !== undefined) updated.originalPrice = Number(updates.originalPrice);
        if (updates.inventory && typeof updates.inventory === 'object') {
            updated.inventory = { ...current.inventory, ...updates.inventory };
        }

        products[index] = updated;
        writeProducts(products);
        return updated;
    },

    decrementStock(id, size, quantity = 1) {
        if (!id) return null;
        const numericId = Number(id);
        const products = readProducts();
        const product = products.find(p => p.id === numericId);
        if (!product) return null;

        ensureInventory(product);
        const normalizedSize = size || 'EU 42';
        const currentQty = product.inventory[normalizedSize] !== undefined ? product.inventory[normalizedSize] : 5;
        const newQty = Math.max(0, currentQty - (parseInt(quantity, 10) || 1));
        product.inventory[normalizedSize] = newQty;

        writeProducts(products);
        return product;
    },

    incrementStock(id, size, quantity = 1) {
        if (!id) return null;
        const numericId = Number(id);
        const products = readProducts();
        const product = products.find(p => p.id === numericId);
        if (!product) return null;

        ensureInventory(product);
        const normalizedSize = size || 'EU 42';
        const currentQty = product.inventory[normalizedSize] !== undefined ? product.inventory[normalizedSize] : 0;
        product.inventory[normalizedSize] = currentQty + (parseInt(quantity, 10) || 1);

        writeProducts(products);
        return product;
    },

    updateInventory(id, inventoryObj) {
        const numericId = Number(id);
        const products = readProducts();
        const product = products.find(p => p.id === numericId);
        if (!product) return null;

        ensureInventory(product);
        if (inventoryObj && typeof inventoryObj === 'object') {
            Object.keys(inventoryObj).forEach(sizeKey => {
                const val = parseInt(inventoryObj[sizeKey], 10);
                if (!isNaN(val) && val >= 0) {
                    product.inventory[sizeKey] = val;
                }
            });
        }

        writeProducts(products);
        return product;
    },

    delete(id) {
        const numericId = Number(id);
        const products = readProducts();
        const index = products.findIndex(p => p.id === numericId);

        if (index === -1) {
            return false;
        }

        const [removed] = products.splice(index, 1);
        writeProducts(products);
        return removed;
    }
};

module.exports = productService;

