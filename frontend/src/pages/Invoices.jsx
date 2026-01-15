import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
    FileText,
    Search,
    Loader2,
    DollarSign,
} from 'lucide-react';
import { invoicesAPI } from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils';

export default function Invoices() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState('');

    const status = searchParams.get('status') || 'all';

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['invoices', { search, status }],
        queryFn: () => invoicesAPI.getAll({ search, status: status === 'all' ? undefined : status }).then((r) => r.data),
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Invoices</h1>
                    <p className="page-subtitle">Manage job invoices and payments</p>
                </div>
            </div>

            {/* Status Filters */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'pending', 'partial', 'paid', 'cancelled'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setSearchParams({ status: s })}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === s
                                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                            }`}
                    >
                        {s === 'all' ? 'All' : getStatusLabel(s)}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="card p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                        type="text"
                        placeholder="Search by invoice number, job, or customer..."
                        className="input pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Invoices List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : invoices?.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-12 h-12 text-dark-500 mb-4" />
                    <p className="text-dark-400">No invoices found</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Job #</th>
                                    <th>Customer</th>
                                    <th>Vehicle</th>
                                    <th className="text-right">Total</th>
                                    <th className="text-right">Paid</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices?.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td>
                                            <Link to={`/invoices/${invoice.id}`} className="text-primary-400 hover:text-primary-300 font-medium">
                                                {invoice.invoiceNumber}
                                            </Link>
                                        </td>
                                        <td>
                                            <Link to={`/job-cards/${invoice.jobCard?.id}`} className="text-dark-200 hover:text-white">
                                                {invoice.jobCard?.jobNumber}
                                            </Link>
                                        </td>
                                        <td className="text-dark-200">{invoice.jobCard?.customer?.name}</td>
                                        <td className="text-dark-400">{invoice.jobCard?.vehicle?.vehicleNo}</td>
                                        <td className="text-right font-mono text-white">{formatCurrency(invoice.total)}</td>
                                        <td className="text-right font-mono text-emerald-400">{formatCurrency(invoice.paidAmount)}</td>
                                        <td>
                                            <span className={`badge ${getStatusColor(invoice.status)}`}>
                                                {getStatusLabel(invoice.status)}
                                            </span>
                                        </td>
                                        <td className="text-dark-400">{formatDate(invoice.createdAt)}</td>
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
