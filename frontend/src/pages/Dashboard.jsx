import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    Package,
    ClipboardList,
    AlertTriangle,
    DollarSign,
    ShoppingCart,
    FileText,
    ArrowRight,
    Car,
    Clock,
} from 'lucide-react';
import { dashboardAPI } from '../lib/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '../lib/utils';

export default function Dashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: () => dashboardAPI.get().then((r) => r.data),
        refetchInterval: 30000,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome to Ramboo Engineering Workshop</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/job-cards/new" className="btn-primary">
                        <ClipboardList className="w-5 h-5" />
                        New Job Card
                    </Link>
                    <Link to="/pos" className="btn-secondary">
                        <ShoppingCart className="w-5 h-5" />
                        POS Sale
                    </Link>
                </div>
            </div>

            {/* Revenue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-card-label">Today's Revenue</p>
                            <p className="stat-card-value">{formatCurrency(data?.revenue?.today)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-xs">
                        <span className="text-dark-400">
                            POS: <span className="text-dark-200">{formatCurrency(data?.revenue?.todayPos)}</span>
                        </span>
                        <span className="text-dark-400">
                            Jobs: <span className="text-dark-200">{formatCurrency(data?.revenue?.todayInvoices)}</span>
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-card-label">Monthly Revenue</p>
                            <p className="stat-card-value">{formatCurrency(data?.revenue?.month)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-primary-400" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-xs">
                        <span className="text-dark-400">
                            POS: <span className="text-dark-200">{formatCurrency(data?.revenue?.monthPos)}</span>
                        </span>
                        <span className="text-dark-400">
                            Jobs: <span className="text-dark-200">{formatCurrency(data?.revenue?.monthInvoices)}</span>
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-card-label">Pending Payments</p>
                            <p className="stat-card-value">{formatCurrency(data?.revenue?.pendingAmount)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-dark-400">
                        {data?.revenue?.pendingInvoiceCount} unpaid invoices
                    </p>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-card-label">Low Stock Items</p>
                            <p className="stat-card-value text-red-400">{data?.inventory?.lowStockCount || 0}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                    </div>
                    <Link to="/inventory?lowStock=true" className="mt-4 text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                        View items <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            {/* Job Card Status */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Pending', value: data?.jobCards?.pending, color: 'amber', status: 'pending' },
                    { label: 'In Progress', value: data?.jobCards?.inProgress, color: 'blue', status: 'in_progress' },
                    { label: 'Quality Check', value: data?.jobCards?.qualityCheck, color: 'purple', status: 'quality_check' },
                    { label: 'Ready', value: data?.jobCards?.ready, color: 'emerald', status: 'ready' },
                    { label: 'Today\'s Jobs', value: data?.jobCards?.todayNew, color: 'primary', status: null },
                ].map((item) => (
                    <Link
                        key={item.label}
                        to={item.status ? `/job-cards?status=${item.status}` : '/job-cards'}
                        className="card hover:border-dark-600 transition-all p-4"
                    >
                        <p className="text-2xl font-bold text-white">{item.value || 0}</p>
                        <p className="text-sm text-dark-400 mt-1">{item.label}</p>
                        <div className={`h-1 w-12 rounded-full mt-3 bg-${item.color}-500`} />
                    </Link>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Job Cards */}
                <div className="card">
                    <div className="flex items-center justify-between p-4 border-b border-dark-700/50">
                        <h3 className="font-semibold text-white">Recent Job Cards</h3>
                        <Link to="/job-cards" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
                            View all <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-dark-700/50">
                        {data?.recentJobs?.length === 0 && (
                            <p className="p-4 text-dark-400 text-center">No recent job cards</p>
                        )}
                        {data?.recentJobs?.map((job) => (
                            <Link
                                key={job.id}
                                to={`/job-cards/${job.id}`}
                                className="flex items-center gap-4 p-4 hover:bg-dark-800/50 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center">
                                    <Car className="w-5 h-5 text-primary-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-white">{job.jobNumber}</p>
                                        <span className={`badge ${getStatusColor(job.status)}`}>
                                            {getStatusLabel(job.status)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-dark-400 mt-1 truncate">
                                        {job.vehicle?.vehicleNo} - {job.customer?.name}
                                        {job.assignedTo && <span className="text-primary-400"> • {job.assignedTo.name}</span>}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">{formatCurrency(job.actualTotal)}</p>
                                    <p className="text-xs text-dark-400">{formatDateTime(job.createdAt)}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent POS Sales */}
                <div className="card">
                    <div className="flex items-center justify-between p-4 border-b border-dark-700/50">
                        <h3 className="font-semibold text-white">Recent POS Sales</h3>
                        <Link to="/pos" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
                            View all <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-dark-700/50">
                        {data?.recentSales?.length === 0 && (
                            <p className="p-4 text-dark-400 text-center">No recent sales</p>
                        )}
                        {data?.recentSales?.map((sale) => (
                            <div
                                key={sale.id}
                                className="flex items-center gap-4 p-4"
                            >
                                <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center">
                                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">{sale.saleNumber}</p>
                                    <p className="text-xs text-dark-400 mt-1">
                                        {sale.customer?.name || 'Walk-in'} • {sale.user?.name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-emerald-400">{formatCurrency(sale.total)}</p>
                                    <p className="text-xs text-dark-400 flex items-center gap-1 justify-end">
                                        <Clock className="w-3 h-3" />
                                        {formatDateTime(sale.createdAt)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
