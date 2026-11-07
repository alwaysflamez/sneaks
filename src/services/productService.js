const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

function readProducts() {
    try {
        if (!fs.existsSync(PRODUCTS_FILE)) {
            fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        return JSON.parse(data || '[]');
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
            description: productData.description || 'Authentic limited edition sneakers sourced and verified by SnEAKs Vault.'
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

        products[index] = updated;
        writeProducts(products);
        return updated;
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

