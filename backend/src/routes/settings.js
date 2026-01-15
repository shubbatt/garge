const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// Get all settings
router.get('/', async (req, res) => {
    try {
        const settings = await prisma.setting.findMany();
        const settingsObj = settings.reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {});
        res.json(settingsObj);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get single setting
router.get('/:key', async (req, res) => {
    try {
        const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
        if (!setting) {
            return res.status(404).json({ error: { message: 'Setting not found' } });
        }
        res.json(setting);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Upsert setting (admin only)
router.put('/:key', requireRole('admin'), async (req, res) => {
    try {
        const { value } = req.body;
        const setting = await prisma.setting.upsert({
            where: { key: req.params.key },
            update: { value },
            create: { key: req.params.key, value }
        });
        res.json(setting);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Bulk update settings (admin only)
router.post('/bulk', requireRole('admin'), async (req, res) => {
    try {
        const { settings } = req.body;

        await prisma.$transaction(
            Object.entries(settings).map(([key, value]) =>
                prisma.setting.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) }
                })
            )
        );

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
