const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all service categories
router.get('/', async (req, res) => {
    try {
        const categories = await prisma.serviceCategory.findMany({
            include: { _count: { select: { services: true } } },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Create category
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await prisma.serviceCategory.create({
            data: { name, description }
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await prisma.serviceCategory.update({
            where: { id: req.params.id },
            data: { name, description }
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Delete category
router.delete('/:id', async (req, res) => {
    try {
        await prisma.serviceCategory.delete({ where: { id: req.params.id } });
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
