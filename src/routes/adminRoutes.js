const express = require('express');
const router = express.Router();
const { createAdminToken } = require('../middleware/adminAuth');

router.post('/login', (req, res) => {
    const token = createAdminToken(req.body && req.body.pin);
    if (!token) {
        return res.status(401).json({ success: false, message: 'Invalid admin PIN.' });
    }
    res.json({ success: true, token, expiresIn: 28800 });
});

module.exports = router;
