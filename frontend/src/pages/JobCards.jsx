import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ClipboardList,
    Plus,
    Search,
    Filter,
    Car,
    Loader2,
} from 'lucide-react';
import { jobCardsAPI, usersAPI } from '../lib/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '../lib/utils';

const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'quality_check', label: 'Quality Check' },
    { value: 'ready', label: 'Ready' },
    { value: 'invoiced', label: 'Invoiced' },
    { value: 'paid', label: 'Paid' },
];

export default function JobCards() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');

    const status = searchParams.get('status') || 'all';
    const assignedToId = searchParams.get('assignedToId') || 'all';

    const { data: jobs, isLoading } = useQuery({
        queryKey: ['job-cards', { search, status, assignedToId }],
        queryFn: () => jobCardsAPI.getAll({
            search,
            status: status === 'all' ? undefined : status,
            assignedToId: assignedToId === 'all' ? undefined : assignedToId
        }).then((r) => r.data),
    });

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => usersAPI.getAll().then((r) => r.data),
    });

    const { data: stats } = useQuery({
        queryKey: ['job-cards-stats'],
        queryFn: () => jobCardsAPI.getStats().then((r) => r.data),
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Job Cards</h1>
                    <p className="page-subtitle">Manage work orders and service jobs</p>
                </div>
                <Link to="/job-cards/new" className="btn-primary">
                    <Plus className="w-5 h-5" />
                    New Job Card
                </Link>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Pending', count: stats?.pending, status: 'pending', color: 'amber' },
                    { label: 'In Progress', count: stats?.inProgress, status: 'in_progress', color: 'blue' },
                    { label: 'Quality Check', count: stats?.qualityCheck, status: 'quality_check', color: 'purple' },
                    { label: 'Ready', count: stats?.ready, status: 'ready', color: 'emerald' },
                    { label: 'Invoiced', count: stats?.invoiced, status: 'invoiced', color: 'cyan' },
                ].map((item) => (
                    <button
                        key={item.status}
                        onClick={() => setSearchParams({ status: item.status })}
                        className={`card p-4 text-left transition-all hover:border-dark-600 ${status === item.status ? 'border-primary-500/50 bg-primary-500/5' : ''
                            }`}
                    >
                        <p className="text-2xl font-bold text-white">{item.count || 0}</p>
                        <p className="text-sm text-dark-400 mt-1">{item.label}</p>
                        <div className={`h-1 w-12 rounded-full mt-3 bg-${item.color}-500`} />
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                        <input
                            type="text"
                            placeholder="Search by job number, vehicle, or customer..."
                            className="input pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="select w-full md:w-48"
                        value={status}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams);
                            params.set('status', e.target.value);
                            setSearchParams(params);
                        }}
                    >
                        {statuses.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>

                    <select
                        className="select w-full md:w-48"
                        value={assignedToId}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams);
                            params.set('assignedToId', e.target.value);
                            setSearchParams(params);
                        }}
                    >
                        <option value="all">All Technicians</option>
                        {users?.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Job Cards List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : jobs?.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-12 text-center">
                    <ClipboardList className="w-12 h-12 text-dark-500 mb-4" />
                    <p className="text-dark-400">No job cards found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {jobs?.map((job) => (
                        <Link
                            key={job.id}
                            to={`/job-cards/${job.id}`}
                            className="card-hover p-5"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                                        <Car className="w-7 h-7 text-primary-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <p className="font-semibold text-white text-lg">{job.jobNumber}</p>
                                            <span className={`badge ${getStatusColor(job.status)}`}>
                                                {getStatusLabel(job.status)}
                                            </span>
                                        </div>
                                        <p className="text-dark-300 mt-1">
                                            <span className="font-medium">{job.vehicle?.vehicleNo}</span>
                                            {job.vehicle?.make && ` • ${job.vehicle.make} ${job.vehicle.model || ''}`}
                                            {job.vehicle?.color && ` • ${job.vehicle.color}`}
                                        </p>
                                        <p className="text-dark-400 text-sm mt-1">
                                            Customer: {job.customer?.name} • {job.customer?.phone}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 ml-auto">
                                    {job.assignedTo && (
                                        <div className="text-sm text-dark-400">
                                            <span className="block text-xs text-dark-500">Assigned to</span>
                                            {job.assignedTo.name}
                                        </div>
                                    )}
                                    <div className="text-right">
                                        <p className="text-lg font-semibold text-white">{formatCurrency(job.actualTotal)}</p>
                                        <p className="text-xs text-dark-400">{formatDateTime(job.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
