const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@ramboo.com' },
        update: {},
        create: {
            email: 'admin@ramboo.com',
            password: hashedPassword,
            name: 'Admin User',
            role: 'admin'
        }
    });
    console.log('✅ Admin user created:', admin.email);

    // Create staff users
    const staff = await prisma.user.upsert({
        where: { email: 'foreman@ramboo.com' },
        update: {},
        create: {
            email: 'foreman@ramboo.com',
            password: await bcrypt.hash('staff123', 10),
            name: 'Workshop Foreman',
            role: 'foreman'
        }
    });
    console.log('✅ Foreman user created:', staff.email);

    // Create inventory categories
    const categories = [
        { name: 'Spare Parts', description: 'Engine, brakes, suspension, electrical parts' },
        { name: 'Fluids & Lubricants', description: 'Engine oil, brake fluid, coolant, transmission fluid' },
        { name: 'Paint & Body', description: 'Paints, primers, body fillers, sandpaper' },
        { name: 'Consumables', description: 'Shop rags, tape, cleaners, disposables' },
        { name: 'Filters', description: 'Oil filters, air filters, fuel filters, cabin filters' },
        { name: 'Tyres & Wheels', description: 'Tyres, rims, wheel accessories' }
    ];

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: cat
        });
    }
    console.log('✅ Inventory categories created');

    // Get categories for reference
    const spareParts = await prisma.category.findUnique({ where: { name: 'Spare Parts' } });
    const fluids = await prisma.category.findUnique({ where: { name: 'Fluids & Lubricants' } });
    const paint = await prisma.category.findUnique({ where: { name: 'Paint & Body' } });
    const consumables = await prisma.category.findUnique({ where: { name: 'Consumables' } });
    const filters = await prisma.category.findUnique({ where: { name: 'Filters' } });

    // Create sample inventory items
    const inventoryItems = [
        { sku: 'OIL-5W30-5L', name: 'Engine Oil 5W-30 (5L)', categoryId: fluids.id, costPrice: 35, sellingPrice: 55, currentStock: 25, reorderLevel: 10, unit: 'pcs' },
        { sku: 'OIL-10W40-5L', name: 'Engine Oil 10W-40 (5L)', categoryId: fluids.id, costPrice: 30, sellingPrice: 48, currentStock: 20, reorderLevel: 10, unit: 'pcs' },
        { sku: 'BRK-PAD-FRT-001', name: 'Front Brake Pads (Universal)', categoryId: spareParts.id, costPrice: 25, sellingPrice: 45, currentStock: 15, reorderLevel: 5, unit: 'set' },
        { sku: 'BRK-PAD-RR-001', name: 'Rear Brake Pads (Universal)', categoryId: spareParts.id, costPrice: 20, sellingPrice: 38, currentStock: 12, reorderLevel: 5, unit: 'set' },
        { sku: 'FLT-OIL-001', name: 'Oil Filter (Standard)', categoryId: filters.id, costPrice: 5, sellingPrice: 12, currentStock: 50, reorderLevel: 20, unit: 'pcs' },
        { sku: 'FLT-AIR-001', name: 'Air Filter (Standard)', categoryId: filters.id, costPrice: 8, sellingPrice: 18, currentStock: 30, reorderLevel: 15, unit: 'pcs' },
        { sku: 'CLN-BRK-500ML', name: 'Brake Cleaner (500ml)', categoryId: consumables.id, costPrice: 4, sellingPrice: 8, currentStock: 40, reorderLevel: 20, unit: 'pcs' },
        { sku: 'CLN-RAG-PACK', name: 'Shop Rags (Pack of 50)', categoryId: consumables.id, costPrice: 10, sellingPrice: 18, currentStock: 15, reorderLevel: 5, unit: 'pack' },
        { sku: 'PNT-WHT-1L', name: 'White Paint (1L)', categoryId: paint.id, costPrice: 25, sellingPrice: 45, currentStock: 8, reorderLevel: 5, unit: 'pcs' },
        { sku: 'PNT-BLK-1L', name: 'Black Paint (1L)', categoryId: paint.id, costPrice: 25, sellingPrice: 45, currentStock: 10, reorderLevel: 5, unit: 'pcs' },
        { sku: 'SND-P80-SHEET', name: 'Sandpaper P80 (Sheet)', categoryId: paint.id, costPrice: 0.5, sellingPrice: 1.5, currentStock: 100, reorderLevel: 50, unit: 'sheet' },
        { sku: 'SND-P120-SHEET', name: 'Sandpaper P120 (Sheet)', categoryId: paint.id, costPrice: 0.5, sellingPrice: 1.5, currentStock: 100, reorderLevel: 50, unit: 'sheet' },
        { sku: 'THN-BULK-5L', name: 'Paint Thinner (5L)', categoryId: paint.id, costPrice: 15, sellingPrice: 28, currentStock: 5, reorderLevel: 3, unit: 'pcs' },
        { sku: 'COOL-GRN-4L', name: 'Coolant Green (4L)', categoryId: fluids.id, costPrice: 12, sellingPrice: 22, currentStock: 18, reorderLevel: 10, unit: 'pcs' }
    ];

    for (const item of inventoryItems) {
        await prisma.inventoryItem.upsert({
            where: { sku: item.sku },
            update: {},
            create: item
        });
    }
    console.log('✅ Sample inventory items created');

    // Create service categories
    const serviceCategories = [
        { name: 'General Service', description: 'Regular maintenance and inspections' },
        { name: 'Car Wash', description: 'Washing and detailing services' },
        { name: 'Mechanical Repair', description: 'Engine, brakes, suspension repairs' },
        { name: 'Electrical', description: 'Electrical system diagnosis and repair' },
        { name: 'Body Work', description: 'Dent repair, panel replacement' },
        { name: 'Painting', description: 'Full paint, touch-up, refinishing' }
    ];

    for (const cat of serviceCategories) {
        await prisma.serviceCategory.upsert({
            where: { name: cat.name },
            update: {},
            create: cat
        });
    }
    console.log('✅ Service categories created');

    // Get service categories for reference
    const generalService = await prisma.serviceCategory.findUnique({ where: { name: 'General Service' } });
    const carWash = await prisma.serviceCategory.findUnique({ where: { name: 'Car Wash' } });
    const mechanical = await prisma.serviceCategory.findUnique({ where: { name: 'Mechanical Repair' } });
    const painting = await prisma.serviceCategory.findUnique({ where: { name: 'Painting' } });

    // Create services
    const services = [
        { categoryId: generalService.id, name: 'General Service - Basic', basePrice: 75, duration: 60 },
        { categoryId: generalService.id, name: 'General Service - Full', basePrice: 150, duration: 120 },
        { categoryId: generalService.id, name: 'Oil Change', basePrice: 35, duration: 30 },
        { categoryId: carWash.id, name: 'Basic Wash', basePrice: 15, duration: 20 },
        { categoryId: carWash.id, name: 'Full Wash & Wax', basePrice: 45, duration: 60 },
        { categoryId: carWash.id, name: 'Interior Deep Clean', basePrice: 80, duration: 90 },
        { categoryId: mechanical.id, name: 'Brake Inspection', basePrice: 25, duration: 30 },
        { categoryId: mechanical.id, name: 'Brake Pad Replacement', basePrice: 50, duration: 60, description: 'Labor only - parts separate' },
        { categoryId: mechanical.id, name: 'Wheel Alignment', basePrice: 60, duration: 45 },
        { categoryId: mechanical.id, name: 'Suspension Check', basePrice: 40, duration: 45 },
        { categoryId: mechanical.id, name: 'Engine Diagnostics', basePrice: 55, duration: 60 },
        { categoryId: painting.id, name: 'Touch-up Paint', basePrice: 50, duration: 60 },
        { categoryId: painting.id, name: 'Panel Respray', basePrice: 200, duration: 240 },
        { categoryId: painting.id, name: 'Full Body Paint', basePrice: 800, duration: 960 }
    ];

    for (const service of services) {
        const existing = await prisma.service.findFirst({
            where: { name: service.name, categoryId: service.categoryId }
        });
        if (!existing) {
            await prisma.service.create({ data: service });
        }
    }
    console.log('✅ Services created');

    // Create sample customers
    const customers = [
        { name: 'Ahmed Hassan', phone: '+971501234567', email: 'ahmed@email.com', address: 'Dubai, UAE' },
        { name: 'Mohammed Ali', phone: '+971502345678', email: 'mohammed@email.com', address: 'Sharjah, UAE' },
        { name: 'Sara Khan', phone: '+971503456789', email: 'sara@email.com', address: 'Abu Dhabi, UAE' }
    ];

    for (const customer of customers) {
        const existing = await prisma.customer.findFirst({ where: { phone: customer.phone } });
        if (!existing) {
            const cust = await prisma.customer.create({ data: customer });

            // Create vehicles for each customer
            if (customer.name === 'Ahmed Hassan') {
                await prisma.vehicle.create({
                    data: { customerId: cust.id, vehicleNo: 'A12345', make: 'Toyota', model: 'Camry', color: 'White', year: 2020 }
                });
            } else if (customer.name === 'Mohammed Ali') {
                await prisma.vehicle.create({
                    data: { customerId: cust.id, vehicleNo: 'B67890', make: 'Honda', model: 'Accord', color: 'Black', year: 2019 }
                });
            } else if (customer.name === 'Sara Khan') {
                await prisma.vehicle.create({
                    data: { customerId: cust.id, vehicleNo: 'C11111', make: 'Nissan', model: 'Altima', color: 'Silver', year: 2021 }
                });
            }
        }
    }
    console.log('✅ Sample customers and vehicles created');

    // Create default settings
    const defaultSettings = [
        { key: 'company_name', value: 'Ramboo Engineering' },
        { key: 'company_address', value: 'Industrial Area, Dubai, UAE' },
        { key: 'company_phone', value: '+971 4 123 4567' },
        { key: 'company_email', value: 'info@ramboo.com' },
        { key: 'tax_rate', value: '5' },
        { key: 'currency', value: 'MVR' },
        { key: 'currency_symbol', value: 'MVR' }
    ];

    for (const setting of defaultSettings) {
        await prisma.setting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting
        });
    }
    console.log('✅ Default settings created');

    console.log('');
    console.log('🎉 Database seeding completed!');
    console.log('');
    console.log('📧 Admin Login: admin@ramboo.com / admin123');
    console.log('📧 Foreman Login: foreman@ramboo.com / staff123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
