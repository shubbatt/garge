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

// MIRA GST Report (For Maldives GST Return Form MIRA 205)
router.get('/gst', async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        // Default to current month
        const from = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const to = toDate ? new Date(toDate) : new Date();
        to.setHours(23, 59, 59, 999);

        // Get settings for GST rate
        const settings = await prisma.setting.findMany();
        const taxRateSetting = settings.find(s => s.key === 'tax_rate');
        const gstRate = parseFloat(taxRateSetting?.value) || 8; // Default MIRA rate is 8%

        // Get business info from settings
        const businessName = settings.find(s => s.key === 'business_name')?.value || '';
        const gstTin = settings.find(s => s.key === 'gst_tin')?.value || '';
        const taxableActivityNo = settings.find(s => s.key === 'taxable_activity_number')?.value || '';

        // ========== OUTPUT TAX (Sales) ==========

        // Get POS sales
        const posSales = await prisma.posSale.findMany({
            where: {
                createdAt: { gte: from, lte: to },
                status: 'completed'
            },
            include: {
                items: {
                    include: { inventoryItem: true }
                }
            }
        });

        // Get paid invoices
        const invoices = await prisma.invoice.findMany({
            where: {
                createdAt: { gte: from, lte: to },
                status: { in: ['paid', 'partial', 'pending'] }
            },
            include: {
                jobCard: {
                    include: {
                        jobServices: { include: { service: true } },
                        jobParts: { include: { inventoryItem: true } },
                        jobManualEntries: true
                    }
                }
            }
        });

        // Calculate sales totals (GST inclusive amounts)
        const posSalesTotalInclusive = posSales.reduce((sum, s) => sum + s.total, 0);
        const invoiceTotalInclusive = invoices.reduce((sum, i) => sum + i.total, 0);
        const totalSalesInclusive = posSalesTotalInclusive + invoiceTotalInclusive;

        // Extract GST from sales (Output Tax)
        const posGstCollected = posSales.reduce((sum, s) => sum + s.taxAmount, 0);
        const invoiceGstCollected = invoices.reduce((sum, i) => sum + i.taxAmount, 0);
        const totalOutputTax = posGstCollected + invoiceGstCollected;

        // Sales exclusive of GST
        const totalSalesExclusive = totalSalesInclusive - totalOutputTax;

        // ========== INPUT TAX (Purchases) ==========

        // Get stock purchases in the period (assumes purchases are recorded as stock movements)
        const purchases = await prisma.stockMovement.findMany({
            where: {
                createdAt: { gte: from, lte: to },
                type: 'purchase'
            },
            include: {
                inventoryItem: true
            }
        });

        // Calculate purchase totals (assuming cost price is exclusive of GST)
        const totalPurchasesExclusive = purchases.reduce((sum, p) =>
            sum + (p.quantity * (p.costPrice || p.inventoryItem.costPrice)), 0
        );

        // Estimated input tax (assuming GST was paid on purchases)
        // Note: In practice, you'd track actual GST paid on each purchase
        const estimatedInputTax = totalPurchasesExclusive * (gstRate / 100);

        // ========== NET GST ==========
        const netGstPayable = totalOutputTax - estimatedInputTax;

        // ========== BREAKDOWN BY TYPE ==========

        // Parts/Products sales
        const partsSales = invoices.reduce((sum, inv) =>
            sum + inv.jobCard.jobParts.reduce((ps, p) => ps + p.total, 0), 0
        ) + posSalesTotalInclusive;

        // Services sales
        const servicesSales = invoices.reduce((sum, inv) =>
            sum + inv.jobCard.jobServices.reduce((ss, s) => ss + s.total, 0), 0
        );

        // Labor/Manual entries
        const laborSales = invoices.reduce((sum, inv) =>
            sum + inv.jobCard.jobManualEntries.reduce((ms, m) => ms + (m.actualCost || m.estimatedCost), 0), 0
        );

        // ========== MONTHLY BREAKDOWN ==========
        const monthlySales = await generateMonthlySalesBreakdown(from, to, prisma);

        // ========== TRANSACTION DETAILS ==========
        const transactions = [
            ...posSales.map(s => ({
                date: s.createdAt,
                type: 'POS Sale',
                reference: s.saleNumber,
                description: `POS Sale - ${s.items.length} items`,
                grossAmount: s.total,
                gstAmount: s.taxAmount,
                netAmount: s.subtotal
            })),
            ...invoices.map(inv => ({
                date: inv.createdAt,
                type: 'Invoice',
                reference: inv.invoiceNumber,
                description: `Job Card ${inv.jobCard.jobNumber}`,
                grossAmount: inv.total,
                gstAmount: inv.taxAmount,
                netAmount: inv.subtotal
            }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            // For MIRA Form Header
            taxpayerInfo: {
                businessName,
                gstTin,
                taxableActivityNo,
                taxablePeriod: { from, to }
            },

            // GST Rate
            gstRate,

            // For MIRA Form - Output Tax (Box 1-3)
            outputTax: {
                totalSalesInclusive,           // Total revenue including GST
                totalSalesExclusive,           // Revenue excluding GST
                gstCollected: totalOutputTax,  // Output Tax

                // Breakdown
                posSales: {
                    count: posSales.length,
                    inclusive: posSalesTotalInclusive,
                    gst: posGstCollected
                },
                invoices: {
                    count: invoices.length,
                    inclusive: invoiceTotalInclusive,
                    gst: invoiceGstCollected
                }
            },

            // For MIRA Form - Input Tax (Box 4-6)
            inputTax: {
                totalPurchasesExclusive,       // Purchases excluding GST
                gstPaid: estimatedInputTax,    // Input Tax (estimated)
                purchaseCount: purchases.length
            },

            // Net GST Payable/Refundable (Box 7)
            netGst: {
                outputTax: totalOutputTax,
                inputTax: estimatedInputTax,
                netPayable: netGstPayable,     // Positive = Pay, Negative = Refund
                status: netGstPayable > 0 ? 'PAYABLE' : 'REFUNDABLE'
            },

            // Sales breakdown by type
            salesByType: {
                parts: partsSales,
                services: servicesSales,
                labor: laborSales
            },

            // Monthly breakdown for the period
            monthlySales,

            // Transaction details for verification
            transactions,

            // Summary stats
            summary: {
                totalTransactions: posSales.length + invoices.length,
                totalRevenue: totalSalesInclusive,
                totalGstCollected: totalOutputTax,
                avgTransactionValue: (totalSalesInclusive / (posSales.length + invoices.length)) || 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Helper function for monthly breakdown
async function generateMonthlySalesBreakdown(from, to, prisma) {
    const months = [];
    const current = new Date(from);

    while (current <= to) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

        const posSales = await prisma.posSale.findMany({
            where: {
                createdAt: { gte: monthStart, lte: monthEnd },
                status: 'completed'
            }
        });

        const invoices = await prisma.invoice.findMany({
            where: {
                createdAt: { gte: monthStart, lte: monthEnd }
            }
        });

        months.push({
            month: monthStart.toLocaleString('default', { month: 'long', year: 'numeric' }),
            posTotal: posSales.reduce((sum, s) => sum + s.total, 0),
            posGst: posSales.reduce((sum, s) => sum + s.taxAmount, 0),
            invoiceTotal: invoices.reduce((sum, i) => sum + i.total, 0),
            invoiceGst: invoices.reduce((sum, i) => sum + i.taxAmount, 0),
            totalSales: posSales.reduce((sum, s) => sum + s.total, 0) + invoices.reduce((sum, i) => sum + i.total, 0),
            totalGst: posSales.reduce((sum, s) => sum + s.taxAmount, 0) + invoices.reduce((sum, i) => sum + i.taxAmount, 0)
        });

        current.setMonth(current.getMonth() + 1);
    }

    return months;
}

module.exports = router;

