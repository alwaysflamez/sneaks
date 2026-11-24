const crypto = require('crypto');

const activeTokens = new Map();
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function createAdminToken(pin) {
    const configuredPin = process.env.ADMIN_PIN;
    if (!configuredPin) return null;

    const supplied = Buffer.from(String(pin || ''));
    const configured = Buffer.from(configuredPin);
    if (supplied.length !== configured.length || !crypto.timingSafeEqual(supplied, configured)) {
        return null;
    }

    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.set(token, Date.now() + TOKEN_TTL_MS);
    return token;
}

function requireAdmin(req, res, next) {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    const expiresAt = activeTokens.get(token);

    if (!expiresAt || expiresAt < Date.now()) {
        if (expiresAt) activeTokens.delete(token);
        return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    }

    next();
}

module.exports = { createAdminToken, requireAdmin };
