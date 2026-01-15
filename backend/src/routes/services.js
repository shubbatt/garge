const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all services
router.get('/', async (req, res) => {
    try {
        const { categoryId, active } = req.query;

        const where = {};
        if (categoryId) where.categoryId = categoryId;
        if (active !== undefined) where.isActive = active === 'true';

        const services = await prisma.service.findMany({
            where,
            include: { category: true },
            orderBy: { name: 'asc' }
        });
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get single service
router.get('/:id', async (req, res) => {
    try {
        const service = await prisma.service.findUnique({
            where: { id: req.params.id },
            include: { category: true }
        });
        if (!service) {
            return res.status(404).json({ error: { message: 'Service not found' } });
        }
        res.json(service);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Create service
router.post('/', async (req, res) => {
    try {
        const { categoryId, name, description, basePrice, duration, isActive } = req.body;
        const service = await prisma.service.create({
            data: {
                categoryId, name, description,
                basePrice: parseFloat(basePrice),
                duration: duration ? parseInt(duration) : null,
                isActive: isActive !== false
            },
            include: { category: true }
        });
        res.status(201).json(service);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Update service
router.put('/:id', async (req, res) => {
    try {
        const { categoryId, name, description, basePrice, duration, isActive } = req.body;
        const service = await prisma.service.update({
            where: { id: req.params.id },
            data: {
                categoryId, name, description,
                basePrice: parseFloat(basePrice),
                duration: duration ? parseInt(duration) : null,
                isActive
            },
            include: { category: true }
        });
        res.json(service);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Delete service
router.delete('/:id', async (req, res) => {
    try {
        await prisma.service.delete({ where: { id: req.params.id } });
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
