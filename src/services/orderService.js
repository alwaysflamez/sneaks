const fs = require('fs');
const path = require('path');
const productService = require('./productService');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');
const DISPATCH_WHATSAPP = process.env.WHATSAPP_SUPPORT_PHONE || '233501019565';
const OFFICIAL_MOMO_NUMBER = process.env.MOMO_OFFICIAL_NUMBER || '0256514988';
const FREE_DELIVERY_THRESHOLD = 800.00;

function readOrders() {
    try {
        if (!fs.existsSync(ORDERS_FILE)) {
            fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const data = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error('Error reading orders.json:', err);
        return [];
    }
}

function writeOrders(orders) {
    try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing orders.json:', err);
        throw new Error('Failed to persist order data');
    }
}

function generateOrderRef() {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `#SNK-${randomDigits}`;
}

const orderService = {
    getAll({ status, search, limit = 50, page = 1 } = {}) {
        let orders = readOrders();

        if (status) {
            orders = orders.filter(o => o.status.toLowerCase() === status.toLowerCase());
        }

        if (search && search.trim() !== '') {
            const q = search.trim().toLowerCase();
            orders = orders.filter(o =>
                o.orderRef.toLowerCase().includes(q) ||
                o.customer.name.toLowerCase().includes(q) ||
                o.customer.phone.includes(q) ||
                (o.customer.email && o.customer.email.toLowerCase().includes(q))
            );
        }

        // Sort latest orders first
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const startIndex = (page - 1) * limit;
        const paginated = orders.slice(startIndex, startIndex + Number(limit));

        return {
            total: orders.length,
            page: Number(page),
            limit: Number(limit),
            orders: paginated
        };
    },

    getByRef(orderRef) {
        const cleanRef = orderRef.trim().toUpperCase();
        const orders = readOrders();
        return orders.find(o => o.orderRef.toUpperCase() === cleanRef) || null;
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

        const validPaymentMethods = ['cod', 'momo'];
        // Default strictly to cash on delivery (cod)
        const method = 'cod';

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
        const deliveryFee = 0.00; // Free promo/included
        const totalAmount = subtotal + deliveryFee;

        const orderRef = generateOrderRef();
        const paymentLabel = 'Cash on Delivery (Pay rider upon arrival)';

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

        const newOrder = {
            orderRef,
            status: 'pending_dispatch',
            createdAt: new Date().toISOString(),
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

        const orders = readOrders();
        orders.push(newOrder);
        writeOrders(orders);

        // Decrement sneaker stock for each item ordered
        try {
            sanitizedItems.forEach(item => {
                if (item.id) {
                    productService.decrementStock(item.id, item.size, item.quantity);
                }
            });
        } catch (stockErr) {
            console.error('Inventory decrement warning:', stockErr);
        }

        return newOrder;
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

        const orders = readOrders();
        const index = orders.findIndex(o => o.orderRef.toUpperCase() === orderRef.toUpperCase());

        if (index === -1) {
            return null;
        }

        const previousStatus = orders[index].status;
        orders[index].status = newStatus;
        orders[index].updatedAt = new Date().toISOString();

        if (newStatus === 'payment_verified') {
            orders[index].payment.status = 'verified';
        }

        // If order was cancelled and wasn't already cancelled, restock the sneaker inventory
        if (newStatus === 'cancelled' && previousStatus !== 'cancelled') {
            try {
                (orders[index].items || []).forEach(item => {
                    if (item.id) {
                        productService.incrementStock(item.id, item.size, item.quantity);
                    }
                });
            } catch (restockErr) {
                console.error('Inventory restock warning:', restockErr);
            }
        }

        writeOrders(orders);
        return orders[index];
    },

    verifyMoMoPayment(orderRef, transactionRef) {
        const orders = readOrders();
        const index = orders.findIndex(o => o.orderRef.toUpperCase() === orderRef.toUpperCase());

        if (index === -1) {
            return null;
        }

        orders[index].payment.momoTransactionRef = transactionRef;
        orders[index].payment.status = 'verified';
        orders[index].status = 'payment_verified';
        orders[index].updatedAt = new Date().toISOString();

        writeOrders(orders);
        return orders[index];
    }
};

module.exports = orderService;

