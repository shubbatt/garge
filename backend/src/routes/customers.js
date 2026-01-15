const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all customers
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;

        const where = search ? {
            OR: [
                { name: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } }
            ]
        } : {};

        const customers = await prisma.customer.findMany({
            where,
            include: {
                _count: { select: { vehicles: true, jobCards: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get single customer with vehicles
router.get('/:id', async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.params.id },
            include: {
                vehicles: true,
                jobCards: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { vehicle: true }
                }
            }
        });
        if (!customer) {
            return res.status(404).json({ error: { message: 'Customer not found' } });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Create customer
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, address, notes } = req.body;
        const customer = await prisma.customer.create({
            data: { name, phone, email, address, notes }
        });
        res.status(201).json(customer);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Update customer
router.put('/:id', async (req, res) => {
    try {
        const { name, phone, email, address, notes } = req.body;
        const customer = await prisma.customer.update({
            where: { id: req.params.id },
            data: { name, phone, email, address, notes }
        });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        await prisma.customer.delete({ where: { id: req.params.id } });
        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
