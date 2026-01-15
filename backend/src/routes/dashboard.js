const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Get dashboard data
router.get('/', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        // Job card stats
        const [pending, inProgress, qualityCheck, ready, todayJobs] = await Promise.all([
            prisma.jobCard.count({ where: { status: 'pending' } }),
            prisma.jobCard.count({ where: { status: 'in_progress' } }),
            prisma.jobCard.count({ where: { status: 'quality_check' } }),
            prisma.jobCard.count({ where: { status: 'ready' } }),
            prisma.jobCard.count({ where: { createdAt: { gte: today, lt: tomorrow } } })
        ]);

        // Today's revenue
        const todayPosSales = await prisma.posSale.findMany({
            where: { createdAt: { gte: today, lt: tomorrow }, status: 'completed' }
        });
        const todayPosRevenue = todayPosSales.reduce((sum, s) => sum + s.total, 0);

        const todayPayments = await prisma.payment.findMany({
            where: { createdAt: { gte: today, lt: tomorrow } }
        });
        const todayInvoiceRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);

        // Monthly revenue
        const monthPosSales = await prisma.posSale.findMany({
            where: { createdAt: { gte: thisMonth, lt: nextMonth }, status: 'completed' }
        });
        const monthPosRevenue = monthPosSales.reduce((sum, s) => sum + s.total, 0);

        const monthPayments = await prisma.payment.findMany({
            where: { createdAt: { gte: thisMonth, lt: nextMonth } }
        });
        const monthInvoiceRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

        // Pending invoices
        const pendingInvoices = await prisma.invoice.findMany({
            where: { status: { in: ['pending', 'partial'] } }
        });
        const pendingAmount = pendingInvoices.reduce((sum, i) => sum + (i.total - i.paidAmount), 0);

        // Low stock items
        const lowStockItems = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM InventoryItem 
      WHERE currentStock <= reorderLevel AND isActive = true
    `;

        // Recent job cards
        const recentJobs = await prisma.jobCard.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { name: true } },
                vehicle: { select: { vehicleNo: true, make: true, model: true } },
                assignedTo: { select: { name: true } }
            }
        });

        // Recent POS sales
        const recentSales = await prisma.posSale.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { name: true } },
                user: { select: { name: true } }
            }
        });

        res.json({
            jobCards: {
                pending,
                inProgress,
                qualityCheck,
                ready,
                todayNew: todayJobs
            },
            revenue: {
                today: todayPosRevenue + todayInvoiceRevenue,
                todayPos: todayPosRevenue,
                todayInvoices: todayInvoiceRevenue,
                month: monthPosRevenue + monthInvoiceRevenue,
                monthPos: monthPosRevenue,
                monthInvoices: monthInvoiceRevenue,
                pendingAmount,
                pendingInvoiceCount: pendingInvoices.length
            },
            inventory: {
                lowStockCount: Number(lowStockItems[0]?.count || 0)
            },
            recentJobs,
            recentSales
        });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
