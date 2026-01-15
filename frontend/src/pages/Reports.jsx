import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    TrendingUp,
    Package,
    Wrench,
    DollarSign,
    AlertTriangle,
    Loader2,
    Calendar,
} from 'lucide-react';
import { reportsAPI } from '../lib/api';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';

const reportTypes = [
    { id: 'sales', label: 'Sales Report', icon: TrendingUp },
    { id: 'inventory', label: 'Inventory Report', icon: Package },
    { id: 'profitability', label: 'Job Profitability', icon: DollarSign },
    { id: 'usage', label: 'Daily Usage', icon: Wrench },
];

export default function Reports() {
    const [activeReport, setActiveReport] = useState('sales');
    const [dateRange, setDateRange] = useState({
        fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
    });

    return (
        <div className="space-y-6">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports</h1>
                    <p className="page-subtitle">Analytics and business insights</p>
                </div>
            </div>

            {/* Report Type Tabs */}
            <div className="flex gap-2 flex-wrap">
                {reportTypes.map((report) => (
                    <button
                        key={report.id}
                        onClick={() => setActiveReport(report.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeReport === report.id
                                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                            }`}
                    >
                        <report.icon className="w-4 h-4" />
                        {report.label}
                    </button>
                ))}
            </div>

            {/* Date Range (for applicable reports) */}
            {['sales', 'profitability', 'usage'].includes(activeReport) && (
                <div className="card p-4">
                    <div className="flex items-center gap-4">
                        <Calendar className="w-5 h-5 text-dark-400" />
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                className="input w-40"
                                value={dateRange.fromDate}
                                onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                            />
                            <span className="text-dark-400">to</span>
                            <input
                                type="date"
                                className="input w-40"
                                value={dateRange.toDate}
                                onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Report Content */}
            {activeReport === 'sales' && <SalesReport dateRange={dateRange} />}
            {activeReport === 'inventory' && <InventoryReport />}
            {activeReport === 'profitability' && <ProfitabilityReport dateRange={dateRange} />}
            {activeReport === 'usage' && <UsageReport dateRange={dateRange} />}
        </div>
    );
}

function SalesReport({ dateRange }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-sales', dateRange],
        queryFn: () => reportsAPI.getSales(dateRange).then((r) => r.data),
    });

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                    <p className="stat-card-label">Total Revenue</p>
                    <p className="stat-card-value">{formatCurrency(data?.totalRevenue)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">POS Sales</p>
                    <p className="stat-card-value">{formatCurrency(data?.posSales)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Job Card Sales</p>
                    <p className="stat-card-value">{formatCurrency(data?.jobCardSales)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Transactions</p>
                    <p className="stat-card-value">{formatNumber(data?.transactionCount)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-6">
                    <h3 className="font-semibold text-white mb-4">Revenue by Type</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-dark-400">Parts</span>
                                <span className="text-white">{formatCurrency(data?.partsRevenue)}</span>
                            </div>
                            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500"
                                    style={{ width: `${(data?.partsRevenue / data?.totalRevenue) * 100 || 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-dark-400">Services</span>
                                <span className="text-white">{formatCurrency(data?.servicesRevenue)}</span>
                            </div>
                            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${(data?.servicesRevenue / data?.totalRevenue) * 100 || 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-dark-400">Labor</span>
                                <span className="text-white">{formatCurrency(data?.laborRevenue)}</span>
                            </div>
                            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500"
                                    style={{ width: `${(data?.laborRevenue / data?.totalRevenue) * 100 || 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InventoryReport() {
    const { data, isLoading } = useQuery({
        queryKey: ['report-inventory'],
        queryFn: () => reportsAPI.getInventory().then((r) => r.data),
    });

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                    <p className="stat-card-label">Total Items</p>
                    <p className="stat-card-value">{formatNumber(data?.totalItems)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Stock Value (Cost)</p>
                    <p className="stat-card-value">{formatCurrency(data?.totalValue)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Retail Value</p>
                    <p className="stat-card-value">{formatCurrency(data?.retailValue)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Potential Profit</p>
                    <p className="stat-card-value text-emerald-400">{formatCurrency(data?.potentialProfit)}</p>
                </div>
            </div>

            {/* Alerts */}
            {(data?.lowStockCount > 0 || data?.outOfStockCount > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data?.lowStockCount > 0 && (
                        <div className="card p-4 border-l-4 border-amber-500">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-amber-400" />
                                <div>
                                    <p className="font-medium text-white">{data.lowStockCount} items low on stock</p>
                                    <p className="text-sm text-dark-400">Below reorder level</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {data?.outOfStockCount > 0 && (
                        <div className="card p-4 border-l-4 border-red-500">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                                <div>
                                    <p className="font-medium text-white">{data.outOfStockCount} items out of stock</p>
                                    <p className="text-sm text-dark-400">Zero quantity</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* By Category */}
            <div className="card">
                <div className="p-4 border-b border-dark-700/50">
                    <h3 className="font-semibold text-white">Stock by Category</h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th className="text-center">Items</th>
                                <th className="text-center">Stock</th>
                                <th className="text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data?.byCategory || {}).map(([name, cat]) => (
                                <tr key={name}>
                                    <td className="text-white">{name}</td>
                                    <td className="text-center">{cat.count}</td>
                                    <td className="text-center">{formatNumber(cat.stock)}</td>
                                    <td className="text-right font-mono">{formatCurrency(cat.value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Low Stock Items */}
            {data?.lowStockItems?.length > 0 && (
                <div className="card">
                    <div className="p-4 border-b border-dark-700/50">
                        <h3 className="font-semibold text-white">Low Stock Items</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th className="text-center">Current</th>
                                    <th className="text-center">Reorder</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.lowStockItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="text-white">{item.name}</td>
                                        <td className="text-dark-400 font-mono text-xs">{item.sku}</td>
                                        <td className="text-dark-300">{item.category}</td>
                                        <td className="text-center text-red-400 font-medium">{item.currentStock}</td>
                                        <td className="text-center text-dark-400">{item.reorderLevel}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProfitabilityReport({ dateRange }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-profitability', dateRange],
        queryFn: () => reportsAPI.getJobProfitability(dateRange).then((r) => r.data),
    });

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="stat-card">
                    <p className="stat-card-label">Total Jobs</p>
                    <p className="stat-card-value">{formatNumber(data?.summary?.totalJobs)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Total Revenue</p>
                    <p className="stat-card-value">{formatCurrency(data?.summary?.totalRevenue)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Total Profit</p>
                    <p className="stat-card-value text-emerald-400">{formatCurrency(data?.summary?.totalProfit)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Avg. Margin</p>
                    <p className="stat-card-value">{data?.summary?.averageMargin?.toFixed(1)}%</p>
                </div>
            </div>

            <div className="card">
                <div className="p-4 border-b border-dark-700/50">
                    <h3 className="font-semibold text-white">Job Details</h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Invoice</th>
                                <th>Customer</th>
                                <th>Vehicle</th>
                                <th className="text-right">Revenue</th>
                                <th className="text-right">Cost</th>
                                <th className="text-right">Profit</th>
                                <th className="text-right">Margin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.jobs?.map((job) => (
                                <tr key={job.invoiceNumber}>
                                    <td className="text-primary-400">{job.invoiceNumber}</td>
                                    <td className="text-white">{job.customer}</td>
                                    <td className="text-dark-300">{job.vehicle}</td>
                                    <td className="text-right font-mono">{formatCurrency(job.totalRevenue)}</td>
                                    <td className="text-right font-mono text-dark-400">{formatCurrency(job.totalCost)}</td>
                                    <td className="text-right font-mono text-emerald-400">{formatCurrency(job.profit)}</td>
                                    <td className="text-right">
                                        <span className={job.margin >= 30 ? 'text-emerald-400' : job.margin >= 15 ? 'text-amber-400' : 'text-red-400'}>
                                            {job.margin.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function UsageReport({ dateRange }) {
    const { data, isLoading } = useQuery({
        queryKey: ['report-usage', dateRange],
        queryFn: () => reportsAPI.getDailyUsage(dateRange).then((r) => r.data),
    });

    if (isLoading) {
        return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card">
                    <p className="stat-card-label">Total Cost</p>
                    <p className="stat-card-value text-red-400">{formatCurrency(data?.summary?.totalCost)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Total Quantity</p>
                    <p className="stat-card-value">{formatNumber(data?.summary?.totalQuantity)}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Records</p>
                    <p className="stat-card-value">{formatNumber(data?.summary?.recordCount)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                    <div className="p-4 border-b border-dark-700/50">
                        <h3 className="font-semibold text-white">By Reason</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {Object.entries(data?.byReason || {}).map(([reason, info]) => (
                            <div key={reason} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                                <span className="capitalize text-white">{reason.replace('_', ' ')}</span>
                                <div className="text-right">
                                    <p className="text-white">{info.quantity} items</p>
                                    <p className="text-sm text-red-400">{formatCurrency(info.cost)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="p-4 border-b border-dark-700/50">
                        <h3 className="font-semibold text-white">By Category</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {Object.entries(data?.byCategory || {}).map(([category, info]) => (
                            <div key={category} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                                <span className="text-white">{category}</span>
                                <div className="text-right">
                                    <p className="text-white">{info.quantity} items</p>
                                    <p className="text-sm text-red-400">{formatCurrency(info.cost)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
