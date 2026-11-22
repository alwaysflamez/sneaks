const { getDb, syncBackups } = require('../db/database');
const productService = require('./productService');

const DISPATCH_WHATSAPP = process.env.WHATSAPP_SUPPORT_PHONE || '233501019565';
const FREE_DELIVERY_THRESHOLD = 800.00;

function generateOrderRef() {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `#SNK-${randomDigits}`;
}

function parseOrderRow(row) {
    if (!row) return null;
    return {
        orderRef: row.orderRef,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        customer: typeof row.customer === 'string' ? JSON.parse(row.customer) : (row.customer || {}),
        payment: typeof row.payment === 'string' ? JSON.parse(row.payment) : (row.payment || {}),
        delivery: typeof row.delivery === 'string' ? JSON.parse(row.delivery) : (row.delivery || {}),
        items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
        subtotal: Number(row.subtotal),
        totalAmount: Number(row.totalAmount),
        whatsappDispatchUrl: row.whatsappDispatchUrl
    };
}

const orderService = {
    getAll({ status, search, limit = 50, page = 1 } = {}) {
        const db = getDb();
        const conditions = [];
        const params = [];

        if (status) {
            conditions.push('LOWER(status) = LOWER(?)');
            params.push(status);
        }

        if (search && search.trim() !== '') {
            const q = `%${search.trim().toLowerCase()}%`;
            conditions.push('(LOWER(orderRef) LIKE ? OR LOWER(customer) LIKE ?)');
            params.push(q, q);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countRow = db.prepare(`SELECT COUNT(*) as total FROM orders ${whereClause}`).get(...params);
        const total = countRow ? countRow.total : 0;

        const offset = (Number(page) - 1) * Number(limit);
        const sql = `SELECT * FROM orders ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        const rows = db.prepare(sql).all(...params, Number(limit), offset);

        return {
            total,
            page: Number(page),
            limit: Number(limit),
            orders: rows.map(parseOrderRow)
        };
    },

    getByRef(orderRef) {
        if (!orderRef) return null;
        const cleanRef = orderRef.trim().toUpperCase();
        const db = getDb();
        const row = db.prepare('SELECT * FROM orders WHERE UPPER(orderRef) = ?').get(cleanRef);
        return parseOrderRow(row);
    },

    create(payload) {
        const { customer, items, paymentMethod } = payload;

        // Validation
        if (!customer || !customer.name || !customer.phone || !customer.address) {
            throw new Error('Customer full name, phone number, and delivery address are required.');
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('Order must include at least one sneaker item.');
        }

        // Default strictly to cash on delivery (cod)
        const paymentLabel = 'Cash on Delivery (Pay rider upon arrival)';

        // Compute items with accurate pricing and formatting
        const sanitizedItems = items.map(item => {
            const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
            const price = parseFloat(item.price) || 0;
            return {
                id: item.id || null,
                name: item.name || 'Sneakers',
                size: item.size || 'EU 42',
                color: item.color || 'As shown',
                price: price,
                quantity: qty,
                total: price * qty
            };
        });

        const subtotal = sanitizedItems.reduce((sum, item) => sum + item.total, 0);
        const qualifiesFreeExpress = subtotal >= FREE_DELIVERY_THRESHOLD;
        const deliveryFee = 0.00;
        const totalAmount = subtotal + deliveryFee;

        const orderRef = generateOrderRef();

        // Build pre-formatted WhatsApp Dispatch Message
        let waMsg = `*NEW SNEAKER ORDER ${orderRef}*\n\n` +
            `👤 *Name:* ${customer.name}\n` +
            `📞 *Phone:* ${customer.phone}\n` +
            `📍 *Dropoff Address:* ${customer.address} (${customer.region || 'Accra'})\n` +
            `💳 *Payment Method:* ${paymentLabel}\n\n` +
            `*Items Ordered:*\n`;

        sanitizedItems.forEach((item, index) => {
            waMsg += `${index + 1}. ${item.name} x${item.quantity} [${item.size}, ${item.color}] - GH₵ ${item.total.toFixed(2)}\n`;
        });

        waMsg += `\n💰 *Total Due on Delivery:* GH₵ ${totalAmount.toFixed(2)}\n\n` +
            `Please confirm my order and dispatch timeline. I will pay in cash upon doorstep delivery. Thank you!`;

        const whatsappUrl = `https://wa.me/${DISPATCH_WHATSAPP}?text=${encodeURIComponent(waMsg)}`;

        const now = new Date().toISOString();
        const orderData = {
            orderRef,
            status: 'pending_dispatch',
            createdAt: now,
            updatedAt: now,
            customer: {
                name: customer.name.trim(),
                phone: customer.phone.trim(),
                email: customer.email ? customer.email.trim() : null,
                address: customer.address.trim(),
                region: customer.region || 'Accra'
            },
            payment: {
                method: 'cod',
                label: paymentLabel,
                status: 'payable_on_delivery'
            },
            delivery: {
                tier: qualifiesFreeExpress ? 'Free Express Dispatch' : 'Standard Delivery',
                fee: deliveryFee
            },
            items: sanitizedItems,
            subtotal: parseFloat(subtotal.toFixed(2)),
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            whatsappDispatchUrl: whatsappUrl
        };

        const db = getDb();
        const stmt = db.prepare(`
            INSERT INTO orders (orderRef, status, createdAt, updatedAt, customer, payment, delivery, items, subtotal, totalAmount, whatsappDispatchUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            orderData.orderRef,
            orderData.status,
            orderData.createdAt,
            orderData.updatedAt,
            JSON.stringify(orderData.customer),
            JSON.stringify(orderData.payment),
            JSON.stringify(orderData.delivery),
            JSON.stringify(orderData.items),
            orderData.subtotal,
            orderData.totalAmount,
            orderData.whatsappDispatchUrl
        );

        // Decrement sneaker stock in SQLite
        try {
            sanitizedItems.forEach(item => {
                if (item.id) {
                    productService.decrementStock(item.id, item.size, item.quantity);
                }
            });
        } catch (stockErr) {
            console.error('Inventory decrement warning:', stockErr);
        }

        syncBackups();
        return orderData;
    },

    updateStatus(orderRef, newStatus) {
        const allowedStatuses = [
            'pending_payment',
            'payment_verified',
            'pending_dispatch',
            'dispatched',
            'delivered',
            'cancelled'
        ];

        if (!allowedStatuses.includes(newStatus)) {
            throw new Error(`Invalid status "${newStatus}". Allowed: ${allowedStatuses.join(', ')}.`);
        }

        const existing = this.getByRef(orderRef);
        if (!existing) return null;

        const previousStatus = existing.status;
        const now = new Date().toISOString();
        const updatedPayment = { ...existing.payment };
        if (newStatus === 'payment_verified') {
            updatedPayment.status = 'verified';
        }

        const db = getDb();
        db.prepare('UPDATE orders SET status = ?, payment = ?, updatedAt = ? WHERE UPPER(orderRef) = ?')
            .run(newStatus, JSON.stringify(updatedPayment), now, orderRef.trim().toUpperCase());

        // If order was cancelled and wasn't already cancelled, restock sneaker inventory
        if (newStatus === 'cancelled' && previousStatus !== 'cancelled') {
            try {
                (existing.items || []).forEach(item => {
                    if (item.id) {
                        productService.incrementStock(item.id, item.size, item.quantity);
                    }
                });
            } catch (restockErr) {
                console.error('Inventory restock warning:', restockErr);
            }
        }

        syncBackups();
        return this.getByRef(orderRef);
    },

    verifyMoMoPayment(orderRef, transactionRef) {
        const existing = this.getByRef(orderRef);
        if (!existing) return null;

        const now = new Date().toISOString();
        const updatedPayment = {
            ...existing.payment,
            momoTransactionRef: transactionRef,
            status: 'verified'
        };

        const db = getDb();
        db.prepare('UPDATE orders SET status = ?, payment = ?, updatedAt = ? WHERE UPPER(orderRef) = ?')
            .run('payment_verified', JSON.stringify(updatedPayment), now, orderRef.trim().toUpperCase());

        syncBackups();
        return this.getByRef(orderRef);
    }
};

module.exports = orderService;
