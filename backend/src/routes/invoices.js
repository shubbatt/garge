const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Generate invoice number
const generateInvoiceNumber = async () => {
    const today = new Date();
    const prefix = `INV${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastInvoice = await prisma.invoice.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: 'desc' }
    });

    if (lastInvoice) {
        const lastNum = parseInt(lastInvoice.invoiceNumber.slice(-4));
        return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
    }
    return `${prefix}0001`;
};

// Get all invoices
router.get('/', async (req, res) => {
    try {
        const { status, search, fromDate, toDate } = req.query;

        const where = {};

        if (status && status !== 'all') {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search } },
                { jobCard: { jobNumber: { contains: search } } },
                { jobCard: { customer: { name: { contains: search } } } }
            ];
        }

        if (fromDate) {
            where.createdAt = { ...where.createdAt, gte: new Date(fromDate) };
        }

        if (toDate) {
            where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                jobCard: {
                    include: {
                        customer: { select: { id: true, name: true, phone: true } },
                        vehicle: { select: { id: true, vehicleNo: true, make: true, model: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Get single invoice
router.get('/:id', async (req, res) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: {
                jobCard: {
                    include: {
                        customer: true,
                        vehicle: true,
                        jobServices: { include: { service: true } },
                        jobParts: { include: { inventoryItem: true } },
                        jobManualEntries: true
                    }
                },
                payments: true
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: { message: 'Invoice not found' } });
        }
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Create invoice from job card
router.post('/', async (req, res) => {
    try {
        const { jobCardId, taxRate, discount, notes } = req.body;

        // Check if job card already has an invoice
        const existingInvoice = await prisma.invoice.findUnique({ where: { jobCardId } });
        if (existingInvoice) {
            return res.status(400).json({ error: { message: 'Job card already has an invoice' } });
        }

        // Get job card with totals
        const jobCard = await prisma.jobCard.findUnique({
            where: { id: jobCardId },
            include: {
                jobServices: true,
                jobParts: true,
                jobManualEntries: true
            }
        });

        if (!jobCard) {
            return res.status(404).json({ error: { message: 'Job card not found' } });
        }

        // Calculate totals
        const servicesTotal = jobCard.jobServices.reduce((sum, s) => sum + s.total, 0);
        const partsTotal = jobCard.jobParts.reduce((sum, p) => sum + p.total, 0);
        const manualTotal = jobCard.jobManualEntries.reduce((sum, m) => sum + (m.actualCost || m.estimatedCost), 0);
        const subtotal = servicesTotal + partsTotal + manualTotal;
        const tax = parseFloat(taxRate) || 0;
        const taxAmount = subtotal * tax / 100;
        const disc = parseFloat(discount) || 0;
        const total = subtotal + taxAmount - disc;

        const invoiceNumber = await generateInvoiceNumber();

        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    jobCardId,
                    subtotal,
                    taxRate: tax,
                    taxAmount,
                    discount: disc,
                    total,
                    notes
                }
            });

            // Update job card status
            await tx.jobCard.update({
                where: { id: jobCardId },
                data: { status: 'invoiced' }
            });

            return newInvoice;
        });

        // Fetch complete invoice
        const completeInvoice = await prisma.invoice.findUnique({
            where: { id: invoice.id },
            include: {
                jobCard: {
                    include: {
                        customer: true,
                        vehicle: true,
                        jobServices: { include: { service: true } },
                        jobParts: { include: { inventoryItem: true } },
                        jobManualEntries: true
                    }
                }
            }
        });

        res.status(201).json(completeInvoice);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Add payment to invoice
router.post('/:id/payments', async (req, res) => {
    try {
        const { amount, method, reference, notes } = req.body;

        const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
        if (!invoice) {
            return res.status(404).json({ error: { message: 'Invoice not found' } });
        }

        const paymentAmount = parseFloat(amount);
        const newPaidAmount = invoice.paidAmount + paymentAmount;
        const newStatus = newPaidAmount >= invoice.total ? 'paid' : 'partial';

        await prisma.$transaction(async (tx) => {
            await tx.payment.create({
                data: {
                    invoiceId: req.params.id,
                    amount: paymentAmount,
                    method,
                    reference,
                    notes
                }
            });

            await tx.invoice.update({
                where: { id: req.params.id },
                data: {
                    paidAmount: newPaidAmount,
                    status: newStatus,
                    paidAt: newStatus === 'paid' ? new Date() : null
                }
            });

            if (newStatus === 'paid') {
                await tx.jobCard.update({
                    where: { id: invoice.jobCardId },
                    data: { status: 'paid', paidAt: new Date() }
                });
            }
        });

        const updatedInvoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: { payments: true }
        });

        res.json(updatedInvoice);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// Cancel invoice
router.post('/:id/cancel', async (req, res) => {
    try {
        const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });

        if (invoice.status === 'paid') {
            return res.status(400).json({ error: { message: 'Cannot cancel a paid invoice' } });
        }

        await prisma.$transaction([
            prisma.invoice.update({
                where: { id: req.params.id },
                data: { status: 'cancelled' }
            }),
            prisma.jobCard.update({
                where: { id: invoice.jobCardId },
                data: { status: 'ready' }
            })
        ]);

        res.json({ message: 'Invoice cancelled' });
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

module.exports = router;
