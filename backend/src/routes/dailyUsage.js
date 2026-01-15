const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all daily usages
router.get('/', async (req, res) => {
    try {
        const { fromDate, toDate, reason } = req.query;

        const where = {};

        if (reason) {
            where.reason = reason;
        }

        if (fromDate) {
            where.createdAt = { ...where.createdAt, gte: new Date(fromDate) };
        }

        if (toDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
        }

        const usages = await prisma.dailyUsage.findMany({
            where,
            include: {
                inventoryItem: { include: { category: true } },
                user: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json(usages);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get today's usage summary
router.get('/today-summary', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const usages = await prisma.dailyUsage.findMany({
            where: {
                createdAt: { gte: today, lt: tomorrow }
            },
            include: { inventoryItem: true }
        });

        const totalItems = usages.reduce((sum, u) => sum + u.quantity, 0);
        const totalCost = usages.reduce((sum, u) => sum + (u.quantity * u.inventoryItem.costPrice), 0);

        const byReason = usages.reduce((acc, u) => {
            acc[u.reason] = (acc[u.reason] || 0) + u.quantity;
            return acc;
        }, {});

        res.json({ totalItems, totalCost, byReason, count: usages.length });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Log daily usage (deducts from inventory)
router.post('/', async (req, res) => {
    try {
        const { inventoryItemId, quantity, reason, notes } = req.body;
        const qty = parseInt(quantity);

        // Check stock availability
        const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
        if (item.currentStock < qty) {
            return res.status(400).json({ error: { message: `Insufficient stock. Available: ${item.currentStock}` } });
        }

        // Create usage and deduct stock
        const [usage] = await prisma.$transaction([
            prisma.dailyUsage.create({
                data: {
                    inventoryItemId,
                    quantity: qty,
                    reason: reason || 'shop_floor',
                    notes,
                    userId: req.user.id
                },
                include: { inventoryItem: { include: { category: true } } }
            }),
            prisma.inventoryItem.update({
                where: { id: inventoryItemId },
                data: { currentStock: { decrement: qty } }
            }),
            prisma.stockMovement.create({
                data: {
                    inventoryItemId,
                    type: 'shop_use',
                    quantity: -qty,
                    reference: `Shop Use: ${reason || 'shop_floor'}`,
                    notes,
                    userId: req.user.id
                }
            })
        ]);

        res.status(201).json(usage);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Delete usage (returns to inventory)
router.delete('/:id', async (req, res) => {
    try {
        const usage = await prisma.dailyUsage.findUnique({ where: { id: req.params.id } });

        if (!usage) {
            return res.status(404).json({ error: { message: 'Usage record not found' } });
        }

        await prisma.$transaction([
            prisma.dailyUsage.delete({ where: { id: req.params.id } }),
            prisma.inventoryItem.update({
                where: { id: usage.inventoryItemId },
                data: { currentStock: { increment: usage.quantity } }
            }),
            prisma.stockMovement.create({
                data: {
                    inventoryItemId: usage.inventoryItemId,
                    type: 'adjustment',
                    quantity: usage.quantity,
                    reference: 'Shop use deletion reversal',
                    userId: req.user.id
                }
            })
        ]);

        res.json({ message: 'Usage record deleted and stock returned' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
