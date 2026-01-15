const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Generate sale number
const generateSaleNumber = async () => {
    const today = new Date();
    const prefix = `POS${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const lastSale = await prisma.posSale.findFirst({
        where: { saleNumber: { startsWith: prefix } },
        orderBy: { saleNumber: 'desc' }
    });

    if (lastSale) {
        const lastNum = parseInt(lastSale.saleNumber.slice(-4));
        return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
    }
    return `${prefix}0001`;
};

// Get all POS sales
router.get('/', async (req, res) => {
    try {
        const { fromDate, toDate, search } = req.query;

        const where = {};

        if (search) {
            where.OR = [
                { saleNumber: { contains: search } },
                { customer: { name: { contains: search } } }
            ];
        }

        if (fromDate) {
            where.createdAt = { ...where.createdAt, gte: new Date(fromDate) };
        }

        if (toDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
        }

        const sales = await prisma.posSale.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                user: { select: { id: true, name: true } },
                _count: { select: { items: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get today's sales summary
router.get('/today-summary', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const sales = await prisma.posSale.findMany({
            where: {
                createdAt: { gte: today, lt: tomorrow },
                status: 'completed'
            }
        });

        const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
        const totalTransactions = sales.length;
        const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
        const cardSales = sales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);

        res.json({ totalSales, totalTransactions, cashSales, cardSales });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get single sale with items
router.get('/:id', async (req, res) => {
    try {
        const sale = await prisma.posSale.findUnique({
            where: { id: req.params.id },
            include: {
                customer: true,
                user: { select: { id: true, name: true } },
                items: { include: { inventoryItem: { include: { category: true } } } }
            }
        });

        if (!sale) {
            return res.status(404).json({ error: { message: 'Sale not found' } });
        }
        res.json(sale);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Create POS sale (complete transaction)
router.post('/', async (req, res) => {
    try {
        const { customerId, items, paymentMethod, paidAmount, discount, taxRate, notes } = req.body;

        // Validate stock availability
        for (const item of items) {
            const invItem = await prisma.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
            if (invItem.currentStock < item.quantity) {
                return res.status(400).json({
                    error: { message: `Insufficient stock for ${invItem.name}. Available: ${invItem.currentStock}` }
                });
            }
        }

        const saleNumber = await generateSaleNumber();

        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxAmount = subtotal * (parseFloat(taxRate) || 0) / 100;
        const total = subtotal + taxAmount - (parseFloat(discount) || 0);
        const change = parseFloat(paidAmount) - total;

        // Create sale and items
        const sale = await prisma.$transaction(async (tx) => {
            const newSale = await tx.posSale.create({
                data: {
                    saleNumber,
                    customerId: customerId || null,
                    subtotal,
                    taxRate: parseFloat(taxRate) || 0,
                    taxAmount,
                    discount: parseFloat(discount) || 0,
                    total,
                    paymentMethod,
                    paidAmount: parseFloat(paidAmount),
                    change: change > 0 ? change : 0,
                    notes,
                    userId: req.user.id
                }
            });

            // Create sale items and deduct inventory
            for (const item of items) {
                const itemTotal = (item.quantity * item.unitPrice) - (item.discount || 0);

                await tx.posSaleItem.create({
                    data: {
                        posSaleId: newSale.id,
                        inventoryItemId: item.inventoryItemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount || 0,
                        total: itemTotal
                    }
                });

                await tx.inventoryItem.update({
                    where: { id: item.inventoryItemId },
                    data: { currentStock: { decrement: item.quantity } }
                });

                await tx.stockMovement.create({
                    data: {
                        inventoryItemId: item.inventoryItemId,
                        type: 'sale',
                        quantity: -item.quantity,
                        reference: saleNumber,
                        userId: req.user.id
                    }
                });
            }

            return newSale;
        });

        // Fetch complete sale
        const completeSale = await prisma.posSale.findUnique({
            where: { id: sale.id },
            include: {
                customer: true,
                user: { select: { id: true, name: true } },
                items: { include: { inventoryItem: true } }
            }
        });

        res.status(201).json(completeSale);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Refund/void sale
router.post('/:id/refund', async (req, res) => {
    try {
        const sale = await prisma.posSale.findUnique({
            where: { id: req.params.id },
            include: { items: true }
        });

        if (!sale) {
            return res.status(404).json({ error: { message: 'Sale not found' } });
        }

        if (sale.status === 'refunded') {
            return res.status(400).json({ error: { message: 'Sale already refunded' } });
        }

        // Return items to inventory
        await prisma.$transaction(async (tx) => {
            for (const item of sale.items) {
                await tx.inventoryItem.update({
                    where: { id: item.inventoryItemId },
                    data: { currentStock: { increment: item.quantity } }
                });

                await tx.stockMovement.create({
                    data: {
                        inventoryItemId: item.inventoryItemId,
                        type: 'adjustment',
                        quantity: item.quantity,
                        reference: `Refund: ${sale.saleNumber}`,
                        userId: req.user.id
                    }
                });
            }

            await tx.posSale.update({
                where: { id: req.params.id },
                data: { status: 'refunded' }
            });
        });

        res.json({ message: 'Sale refunded successfully' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
