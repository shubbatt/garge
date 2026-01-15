const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Sales Report
router.get('/sales', async (req, res) => {
    try {
        const { fromDate, toDate, groupBy } = req.query;

        const from = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const to = toDate ? new Date(toDate) : new Date();
        to.setHours(23, 59, 59, 999);

        // Get POS sales
        const posSales = await prisma.posSale.findMany({
            where: {
                createdAt: { gte: from, lte: to },
                status: 'completed'
            }
        });

        // Get paid invoices
        const invoices = await prisma.invoice.findMany({
            where: {
                paidAt: { gte: from, lte: to },
                status: 'paid'
            },
            include: {
                jobCard: {
                    include: {
                        jobServices: true,
                        jobParts: true,
                        jobManualEntries: true
                    }
                }
            }
        });

        // Calculate totals
        const posTotal = posSales.reduce((sum, s) => sum + s.total, 0);
        const invoiceTotal = invoices.reduce((sum, i) => sum + i.total, 0);

        const partsRevenue = invoices.reduce((sum, i) =>
            sum + i.jobCard.jobParts.reduce((ps, p) => ps + p.total, 0), 0) + posTotal;

        const servicesRevenue = invoices.reduce((sum, i) =>
            sum + i.jobCard.jobServices.reduce((ss, s) => ss + s.total, 0), 0);

        const laborRevenue = invoices.reduce((sum, i) =>
            sum + i.jobCard.jobManualEntries.reduce((ms, m) => ms + (m.actualCost || m.estimatedCost), 0), 0);

        res.json({
            period: { from, to },
            totalRevenue: posTotal + invoiceTotal,
            posSales: posTotal,
            jobCardSales: invoiceTotal,
            partsRevenue,
            servicesRevenue,
            laborRevenue,
            transactionCount: posSales.length + invoices.length
        });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Inventory Report
router.get('/inventory', async (req, res) => {
    try {
        const items = await prisma.inventoryItem.findMany({
            where: { isActive: true },
            include: { category: true }
        });

        const totalItems = items.length;
        const totalStock = items.reduce((sum, i) => sum + i.currentStock, 0);
        const totalValue = items.reduce((sum, i) => sum + (i.currentStock * i.costPrice), 0);
        const retailValue = items.reduce((sum, i) => sum + (i.currentStock * i.sellingPrice), 0);
        const lowStockItems = items.filter(i => i.currentStock <= i.reorderLevel);
        const outOfStock = items.filter(i => i.currentStock === 0);

        // Group by category
        const byCategory = items.reduce((acc, item) => {
            const cat = item.category?.name || 'Uncategorized';
            if (!acc[cat]) {
                acc[cat] = { count: 0, stock: 0, value: 0 };
            }
            acc[cat].count++;
            acc[cat].stock += item.currentStock;
            acc[cat].value += item.currentStock * item.costPrice;
            return acc;
        }, {});

        res.json({
            totalItems,
            totalStock,
            totalValue,
            retailValue,
            potentialProfit: retailValue - totalValue,
            lowStockCount: lowStockItems.length,
            outOfStockCount: outOfStock.length,
            byCategory,
            lowStockItems: lowStockItems.map(i => ({
                id: i.id,
                name: i.name,
                sku: i.sku,
                currentStock: i.currentStock,
                reorderLevel: i.reorderLevel,
                category: i.category?.name
            }))
        });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Job Profitability Report
router.get('/job-profitability', async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        const from = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const to = toDate ? new Date(toDate) : new Date();
        to.setHours(23, 59, 59, 999);

        const invoices = await prisma.invoice.findMany({
            where: {
                createdAt: { gte: from, lte: to },
                status: { in: ['paid', 'partial'] }
            },
            include: {
                jobCard: {
                    include: {
                        customer: { select: { name: true } },
                        vehicle: { select: { vehicleNo: true } },
                        jobServices: { include: { service: true } },
                        jobParts: { include: { inventoryItem: true } },
                        jobManualEntries: true
                    }
                }
            }
        });

        const jobs = invoices.map(inv => {
            const partsRevenue = inv.jobCard.jobParts.reduce((sum, p) => sum + p.total, 0);
            const partsCost = inv.jobCard.jobParts.reduce((sum, p) => sum + (p.quantity * p.inventoryItem.costPrice), 0);
            const servicesRevenue = inv.jobCard.jobServices.reduce((sum, s) => sum + s.total, 0);
            const laborRevenue = inv.jobCard.jobManualEntries.reduce((sum, m) => sum + (m.actualCost || m.estimatedCost), 0);

            const totalRevenue = partsRevenue + servicesRevenue + laborRevenue;
            const totalCost = partsCost; // Labor/services are assumed 100% margin for simplicity
            const profit = totalRevenue - totalCost;
            const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

            return {
                invoiceNumber: inv.invoiceNumber,
                jobNumber: inv.jobCard.jobNumber,
                customer: inv.jobCard.customer?.name,
                vehicle: inv.jobCard.vehicle?.vehicleNo,
                partsRevenue,
                partsCost,
                servicesRevenue,
                laborRevenue,
                totalRevenue,
                totalCost,
                profit,
                margin: Math.round(margin * 100) / 100,
                date: inv.createdAt
            };
        });

        const summary = {
            totalJobs: jobs.length,
            totalRevenue: jobs.reduce((sum, j) => sum + j.totalRevenue, 0),
            totalCost: jobs.reduce((sum, j) => sum + j.totalCost, 0),
            totalProfit: jobs.reduce((sum, j) => sum + j.profit, 0),
            averageMargin: jobs.length > 0
                ? jobs.reduce((sum, j) => sum + j.margin, 0) / jobs.length
                : 0
        };

        res.json({ period: { from, to }, summary, jobs });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Daily Usage Report (Operational Expenses)
router.get('/daily-usage', async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        const from = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const to = toDate ? new Date(toDate) : new Date();
        to.setHours(23, 59, 59, 999);

        const usages = await prisma.dailyUsage.findMany({
            where: {
                createdAt: { gte: from, lte: to }
            },
            include: {
                inventoryItem: { include: { category: true } },
                user: { select: { name: true } }
            }
        });

        const totalCost = usages.reduce((sum, u) => sum + (u.quantity * u.inventoryItem.costPrice), 0);
        const totalQuantity = usages.reduce((sum, u) => sum + u.quantity, 0);

        // Group by reason
        const byReason = usages.reduce((acc, u) => {
            if (!acc[u.reason]) {
                acc[u.reason] = { quantity: 0, cost: 0, items: [] };
            }
            acc[u.reason].quantity += u.quantity;
            acc[u.reason].cost += u.quantity * u.inventoryItem.costPrice;
            acc[u.reason].items.push({
                item: u.inventoryItem.name,
                quantity: u.quantity,
                cost: u.quantity * u.inventoryItem.costPrice
            });
            return acc;
        }, {});

        // Group by category
        const byCategory = usages.reduce((acc, u) => {
            const cat = u.inventoryItem.category?.name || 'Uncategorized';
            if (!acc[cat]) {
                acc[cat] = { quantity: 0, cost: 0 };
            }
            acc[cat].quantity += u.quantity;
            acc[cat].cost += u.quantity * u.inventoryItem.costPrice;
            return acc;
        }, {});

        res.json({
            period: { from, to },
            summary: { totalCost, totalQuantity, recordCount: usages.length },
            byReason,
            byCategory
        });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
