const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get all vehicles
router.get('/', async (req, res) => {
    try {
        const { search, customerId } = req.query;

        const where = {};

        if (search) {
            where.OR = [
                { vehicleNo: { contains: search } },
                { make: { contains: search } },
                { model: { contains: search } }
            ];
        }

        if (customerId) {
            where.customerId = customerId;
        }

        const vehicles = await prisma.vehicle.findMany({
            where,
            include: { customer: { select: { id: true, name: true, phone: true } } },
            orderBy: { vehicleNo: 'asc' }
        });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Search vehicles by number
router.get('/search/:vehicleNo', async (req, res) => {
    try {
        const vehicles = await prisma.vehicle.findMany({
            where: { vehicleNo: { contains: req.params.vehicleNo } },
            include: { customer: { select: { id: true, name: true, phone: true } } },
            take: 10
        });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get single vehicle
router.get('/:id', async (req, res) => {
    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: req.params.id },
            include: {
                customer: true,
                jobCards: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!vehicle) {
            return res.status(404).json({ error: { message: 'Vehicle not found' } });
        }
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Create vehicle
router.post('/', async (req, res) => {
    try {
        const { customerId, vehicleNo, make, model, color, year, vin, notes } = req.body;
        const vehicle = await prisma.vehicle.create({
            data: { customerId, vehicleNo, make, model, color, year: year ? parseInt(year) : null, vin, notes },
            include: { customer: { select: { id: true, name: true, phone: true } } }
        });
        res.status(201).json(vehicle);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Update vehicle
router.put('/:id', async (req, res) => {
    try {
        const { vehicleNo, make, model, color, year, vin, notes } = req.body;
        const vehicle = await prisma.vehicle.update({
            where: { id: req.params.id },
            data: { vehicleNo, make, model, color, year: year ? parseInt(year) : null, vin, notes },
            include: { customer: { select: { id: true, name: true, phone: true } } }
        });
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
    try {
        await prisma.vehicle.delete({ where: { id: req.params.id } });
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
