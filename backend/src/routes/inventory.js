const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all inventory items with filters
router.get('/', async (req, res) => {
    try {
        const { search, categoryId, lowStock, active } = req.query;

        const where = {};

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { sku: { contains: search } },
                { barcode: { contains: search } }
            ];
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        if (lowStock === 'true') {
            where.currentStock = { lte: prisma.inventoryItem.fields.reorderLevel };
        }

        if (active !== undefined) {
            where.isActive = active === 'true';
        }

        const items = await prisma.inventoryItem.findMany({
            where,
            include: { category: true },
            orderBy: { name: 'asc' }
        });

        res.json(items);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
    try {
        const items = await prisma.$queryRaw`
      SELECT i.*, c.name as categoryName 
      FROM InventoryItem i 
      LEFT JOIN Category c ON i.categoryId = c.id 
      WHERE i.currentStock <= i.reorderLevel AND i.isActive = true
      ORDER BY i.currentStock ASC
    `;
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get single item
router.get('/:id', async (req, res) => {
    try {
        const item = await prisma.inventoryItem.findUnique({
            where: { id: req.params.id },
            include: {
                category: true,
                stockMovements: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true } } }
                }
            }
        });
        if (!item) {
            return res.status(404).json({ error: { message: 'Item not found' } });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Search by barcode
router.get('/barcode/:barcode', async (req, res) => {
    try {
        const item = await prisma.inventoryItem.findFirst({
            where: { barcode: req.params.barcode, isActive: true },
            include: { category: true }
        });
        if (!item) {
            return res.status(404).json({ error: { message: 'Item not found' } });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Create item
router.post('/', async (req, res) => {
    try {
        const { name, sku, description, categoryId, costPrice, sellingPrice, currentStock, reorderLevel, unit, barcode } = req.body;

        const item = await prisma.inventoryItem.create({
            data: {
                name, sku, description, categoryId,
                costPrice: parseFloat(costPrice),
                sellingPrice: parseFloat(sellingPrice),
                currentStock: parseInt(currentStock) || 0,
                reorderLevel: parseInt(reorderLevel) || 10,
                unit, barcode
            },
            include: { category: true }
        });

        // Create initial stock movement if stock > 0
        if (currentStock > 0) {
            await prisma.stockMovement.create({
                data: {
                    inventoryItemId: item.id,
                    type: 'adjustment',
                    quantity: parseInt(currentStock),
                    costPrice: parseFloat(costPrice),
                    reference: 'Initial Stock',
                    userId: req.user.id
                }
            });
        }

        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Update item
router.put('/:id', async (req, res) => {
    try {
        const { name, sku, description, categoryId, costPrice, sellingPrice, reorderLevel, unit, barcode, isActive } = req.body;

        const item = await prisma.inventoryItem.update({
            where: { id: req.params.id },
            data: {
                name, sku, description, categoryId,
                costPrice: parseFloat(costPrice),
                sellingPrice: parseFloat(sellingPrice),
                reorderLevel: parseInt(reorderLevel),
                unit, barcode, isActive
            },
            include: { category: true }
        });

        res.json(item);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Add stock (purchase)
router.post('/:id/add-stock', async (req, res) => {
    try {
        const { quantity, costPrice, reference, notes } = req.body;
        const qty = parseInt(quantity);

        const [item] = await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: req.params.id },
                data: {
                    currentStock: { increment: qty },
                    ...(costPrice && { costPrice: parseFloat(costPrice) })
                }
            }),
            prisma.stockMovement.create({
                data: {
                    inventoryItemId: req.params.id,
                    type: 'purchase',
                    quantity: qty,
                    costPrice: costPrice ? parseFloat(costPrice) : null,
                    reference,
                    notes,
                    userId: req.user.id
                }
            })
        ]);

        res.json(item);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Adjust stock
router.post('/:id/adjust-stock', async (req, res) => {
    try {
        const { quantity, notes } = req.body;
        const qty = parseInt(quantity);

        const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
        const difference = qty - item.currentStock;

        await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: req.params.id },
                data: { currentStock: qty }
            }),
            prisma.stockMovement.create({
                data: {
                    inventoryItemId: req.params.id,
                    type: 'adjustment',
                    quantity: difference,
                    reference: 'Stock Adjustment',
                    notes,
                    userId: req.user.id
                }
            })
        ]);

        const updatedItem = await prisma.inventoryItem.findUnique({
            where: { id: req.params.id },
            include: { category: true }
        });

        res.json(updatedItem);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Delete item
router.delete('/:id', async (req, res) => {
    try {
        await prisma.inventoryItem.delete({ where: { id: req.params.id } });
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
