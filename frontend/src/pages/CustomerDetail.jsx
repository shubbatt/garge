import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    Phone,
    Mail,
    MapPin,
    Car,
    ClipboardList,
    Loader2,
} from 'lucide-react';
import { customersAPI } from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils';

export default function CustomerDetail() {
    const { id } = useParams();

    const { data: customer, isLoading } = useQuery({
        queryKey: ['customer', id],
        queryFn: () => customersAPI.getById(id).then((r) => r.data),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="text-center py-12">
                <p className="text-dark-400">Customer not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/customers" className="btn-ghost btn-icon">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="page-title">{customer.name}</h1>
                    <p className="page-subtitle">Customer Details</p>
                </div>
                <Link to={`/job-cards/new?customerId=${customer.id}`} className="btn-primary">
                    <ClipboardList className="w-5 h-5" />
                    New Job Card
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Info */}
                <div className="card p-6 space-y-4">
                    <h3 className="font-semibold text-white">Contact Information</h3>

                    <div className="space-y-3">
                        {customer.phone && (
                            <a href={`tel:${customer.phone}`} className="flex items-center gap-3 text-dark-200 hover:text-primary-400">
                                <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-primary-400" />
                                </div>
                                {customer.phone}
                            </a>
                        )}

                        {customer.email && (
                            <a href={`mailto:${customer.email}`} className="flex items-center gap-3 text-dark-200 hover:text-primary-400">
                                <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-primary-400" />
                                </div>
                                {customer.email}
                            </a>
                        )}

                        {customer.address && (
                            <div className="flex items-start gap-3 text-dark-200">
                                <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-5 h-5 text-primary-400" />
                                </div>
                                {customer.address}
                            </div>
                        )}
                    </div>

                    {customer.notes && (
                        <div className="pt-4 border-t border-dark-700/50">
                            <p className="text-xs text-dark-400 mb-2">Notes</p>
                            <p className="text-dark-200 text-sm">{customer.notes}</p>
                        </div>
                    )}
                </div>

                {/* Vehicles */}
                <div className="card">
                    <div className="p-4 border-b border-dark-700/50">
                        <h3 className="font-semibold text-white">Vehicles ({customer.vehicles?.length})</h3>
                    </div>

                    {customer.vehicles?.length === 0 ? (
                        <p className="p-4 text-dark-400 text-center">No vehicles registered</p>
                    ) : (
                        <div className="divide-y divide-dark-700/50">
                            {customer.vehicles?.map((vehicle) => (
                                <Link
                                    key={vehicle.id}
                                    to={`/vehicles/${vehicle.id}`}
                                    className="flex items-center gap-4 p-4 hover:bg-dark-800/50 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center">
                                        <Car className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white">{vehicle.vehicleNo}</p>
                                        <p className="text-xs text-dark-400">
                                            {[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(' • ')}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Jobs */}
                <div className="card">
                    <div className="p-4 border-b border-dark-700/50">
                        <h3 className="font-semibold text-white">Recent Jobs</h3>
                    </div>

                    {customer.jobCards?.length === 0 ? (
                        <p className="p-4 text-dark-400 text-center">No job history</p>
                    ) : (
                        <div className="divide-y divide-dark-700/50">
                            {customer.jobCards?.map((job) => (
                                <Link
                                    key={job.id}
                                    to={`/job-cards/${job.id}`}
                                    className="flex items-center gap-4 p-4 hover:bg-dark-800/50 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center">
                                        <ClipboardList className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-white">{job.jobNumber}</p>
                                            <span className={`badge ${getStatusColor(job.status)}`}>
                                                {getStatusLabel(job.status)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-dark-400">{job.vehicle?.vehicleNo} • {formatDate(job.createdAt)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-white">{formatCurrency(job.actualTotal)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
