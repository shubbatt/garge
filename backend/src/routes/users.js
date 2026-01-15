const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// Get all users (admin/manager only)
router.get('/', requireRole('admin', 'manager'), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
            orderBy: { name: 'asc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get single user
router.get('/:id', requireRole('admin', 'manager'), async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, email: true, name: true, role: true, active: true, createdAt: true }
        });
        if (!user) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Update user (admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
    try {
        const { email, name, role, active, password } = req.body;
        const data = { email, name, role, active };

        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
            select: { id: true, email: true, name: true, role: true, active: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Delete user (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
