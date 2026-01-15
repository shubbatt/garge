const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Generate job number
const generateJobNumber = async () => {
    const today = new Date();
    const prefix = `JC${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastJob = await prisma.jobCard.findFirst({
        where: { jobNumber: { startsWith: prefix } },
        orderBy: { jobNumber: 'desc' }
    });

    if (lastJob) {
        const lastNum = parseInt(lastJob.jobNumber.slice(-4));
        return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
    }
    return `${prefix}0001`;
};

// Calculate job totals
const calculateJobTotals = async (jobCardId) => {
    const jobCard = await prisma.jobCard.findUnique({
        where: { id: jobCardId },
        include: {
            jobServices: true,
            jobParts: true,
            jobManualEntries: true
        }
    });

    const servicesTotal = jobCard.jobServices.reduce((sum, s) => sum + s.total, 0);
    const partsTotal = jobCard.jobParts.reduce((sum, p) => sum + p.total, 0);
    const manualTotal = jobCard.jobManualEntries.reduce((sum, m) => sum + (m.actualCost || m.estimatedCost), 0);

    const total = servicesTotal + partsTotal + manualTotal;

    await prisma.jobCard.update({
        where: { id: jobCardId },
        data: { actualTotal: total }
    });

    return total;
};

// Get all job cards with filters
router.get('/', async (req, res) => {
    try {
        const { status, search, customerId, assignedToId, fromDate, toDate } = req.query;

        const where = {};

        if (status && status !== 'all') {
            where.status = status;
        }

        if (assignedToId) {
            where.assignedToId = assignedToId;
        }

        if (search) {
            where.OR = [
                { jobNumber: { contains: search } },
                { vehicle: { vehicleNo: { contains: search } } },
                { customer: { name: { contains: search } } }
            ];
        }

        if (customerId) {
            where.customerId = customerId;
        }

        if (fromDate) {
            where.createdAt = { ...where.createdAt, gte: new Date(fromDate) };
        }

        if (toDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
        }

        const jobCards = await prisma.jobCard.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                vehicle: { select: { id: true, vehicleNo: true, make: true, model: true, color: true } },
                assignedTo: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(jobCards);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get job card stats
router.get('/stats', async (req, res) => {
    try {
        const [pending, inProgress, qualityCheck, ready, invoiced] = await Promise.all([
            prisma.jobCard.count({ where: { status: 'pending' } }),
            prisma.jobCard.count({ where: { status: 'in_progress' } }),
            prisma.jobCard.count({ where: { status: 'quality_check' } }),
            prisma.jobCard.count({ where: { status: 'ready' } }),
            prisma.jobCard.count({ where: { status: 'invoiced' } })
        ]);

        res.json({ pending, inProgress, qualityCheck, ready, invoiced });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get single job card with all details
router.get('/:id', async (req, res) => {
    try {
        const jobCard = await prisma.jobCard.findUnique({
            where: { id: req.params.id },
            include: {
                customer: true,
                vehicle: true,
                assignedTo: { select: { id: true, name: true } },
                jobServices: { include: { service: true } },
                jobParts: { include: { inventoryItem: { include: { category: true } } } },
                jobManualEntries: true,
                invoice: { include: { payments: true } }
            }
        });

        if (!jobCard) {
            return res.status(404).json({ error: { message: 'Job card not found' } });
        }
        res.json(jobCard);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Create job card
router.post('/', async (req, res) => {
    try {
        const { customerId, vehicleId, odometer, notes, assignedToId } = req.body;

        const jobNumber = await generateJobNumber();

        const jobCard = await prisma.jobCard.create({
            data: {
                jobNumber,
                customerId,
                vehicleId,
                odometer: odometer ? parseInt(odometer) : null,
                notes,
                assignedToId
            },
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                vehicle: { select: { id: true, vehicleNo: true, make: true, model: true, color: true } }
            }
        });

        res.status(201).json(jobCard);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Update job card
router.put('/:id', async (req, res) => {
    try {
        const { odometer, notes, assignedToId, status } = req.body;

        const updateData = {
            odometer: odometer ? parseInt(odometer) : null,
            notes,
            assignedToId
        };

        if (status) {
            updateData.status = status;
            if (status === 'ready' || status === 'invoiced') {
                updateData.completedAt = new Date();
            }
            if (status === 'paid') {
                updateData.paidAt = new Date();
            }
        }

        const jobCard = await prisma.jobCard.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                vehicle: { select: { id: true, vehicleNo: true, make: true, model: true, color: true } },
                assignedTo: { select: { id: true, name: true } }
            }
        });

        res.json(jobCard);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Update job card status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        const updateData = { status };

        if (status === 'ready' || status === 'invoiced') {
            updateData.completedAt = new Date();
        }
        if (status === 'paid') {
            updateData.paidAt = new Date();
        }

        const jobCard = await prisma.jobCard.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                vehicle: { select: { id: true, vehicleNo: true, make: true, model: true, color: true } }
            }
        });

        res.json(jobCard);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Add service to job card
router.post('/:id/services', async (req, res) => {
    try {
        const { serviceId, quantity, unitPrice, discount, notes } = req.body;
        const qty = parseInt(quantity) || 1;
        const price = parseFloat(unitPrice);
        const disc = parseFloat(discount) || 0;
        const total = (qty * price) - disc;

        const jobService = await prisma.jobService.create({
            data: {
                jobCardId: req.params.id,
                serviceId,
                quantity: qty,
                unitPrice: price,
                discount: disc,
                total,
                notes
            },
            include: { service: true }
        });

        await calculateJobTotals(req.params.id);
        res.status(201).json(jobService);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Remove service from job card
router.delete('/:id/services/:serviceId', async (req, res) => {
    try {
        await prisma.jobService.delete({ where: { id: req.params.serviceId } });
        await calculateJobTotals(req.params.id);
        res.json({ message: 'Service removed' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Add part to job card (deducts from inventory)
router.post('/:id/parts', async (req, res) => {
    try {
        const { inventoryItemId, quantity, unitPrice, discount, notes } = req.body;
        const qty = parseInt(quantity);
        const price = parseFloat(unitPrice);
        const disc = parseFloat(discount) || 0;
        const total = (qty * price) - disc;

        // Check stock availability
        const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
        if (item.currentStock < qty) {
            return res.status(400).json({ error: { message: `Insufficient stock. Available: ${item.currentStock}` } });
        }

        // Create part entry and deduct stock
        const [jobPart] = await prisma.$transaction([
            prisma.jobPart.create({
                data: {
                    jobCardId: req.params.id,
                    inventoryItemId,
                    quantity: qty,
                    unitPrice: price,
                    discount: disc,
                    total,
                    notes
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
                    type: 'job_usage',
                    quantity: -qty,
                    reference: (await prisma.jobCard.findUnique({ where: { id: req.params.id } })).jobNumber,
                    userId: req.user.id
                }
            })
        ]);

        await calculateJobTotals(req.params.id);
        res.status(201).json(jobPart);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Remove part from job card (returns to inventory)
router.delete('/:id/parts/:partId', async (req, res) => {
    try {
        const part = await prisma.jobPart.findUnique({ where: { id: req.params.partId } });

        await prisma.$transaction([
            prisma.jobPart.delete({ where: { id: req.params.partId } }),
            prisma.inventoryItem.update({
                where: { id: part.inventoryItemId },
                data: { currentStock: { increment: part.quantity } }
            }),
            prisma.stockMovement.create({
                data: {
                    inventoryItemId: part.inventoryItemId,
                    type: 'adjustment',
                    quantity: part.quantity,
                    reference: 'Part removed from job',
                    userId: req.user.id
                }
            })
        ]);

        await calculateJobTotals(req.params.id);
        res.json({ message: 'Part removed and returned to stock' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Add manual entry (tinkering/painting)
router.post('/:id/manual-entries', async (req, res) => {
    try {
        const { description, category, estimatedCost, actualCost, notes } = req.body;

        const entry = await prisma.jobManualEntry.create({
            data: {
                jobCardId: req.params.id,
                description,
                category: category || 'other',
                estimatedCost: parseFloat(estimatedCost),
                actualCost: actualCost ? parseFloat(actualCost) : null,
                notes
            }
        });

        await calculateJobTotals(req.params.id);
        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Update manual entry
router.put('/:id/manual-entries/:entryId', async (req, res) => {
    try {
        const { description, category, estimatedCost, actualCost, notes } = req.body;

        const entry = await prisma.jobManualEntry.update({
            where: { id: req.params.entryId },
            data: {
                description,
                category,
                estimatedCost: parseFloat(estimatedCost),
                actualCost: actualCost ? parseFloat(actualCost) : null,
                notes
            }
        });

        await calculateJobTotals(req.params.id);
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Remove manual entry
router.delete('/:id/manual-entries/:entryId', async (req, res) => {
    try {
        await prisma.jobManualEntry.delete({ where: { id: req.params.entryId } });
        await calculateJobTotals(req.params.id);
        res.json({ message: 'Manual entry removed' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Delete job card
router.delete('/:id', async (req, res) => {
    try {
        // Return parts to inventory first
        const parts = await prisma.jobPart.findMany({ where: { jobCardId: req.params.id } });

        for (const part of parts) {
            await prisma.inventoryItem.update({
                where: { id: part.inventoryItemId },
                data: { currentStock: { increment: part.quantity } }
            });
        }

        await prisma.jobCard.delete({ where: { id: req.params.id } });
        res.json({ message: 'Job card deleted' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
