import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Users,
    Plus,
    Search,
    Phone,
    Mail,
    Car,
    ClipboardList,
    Edit,
    Trash2,
    X,
    Loader2,
} from 'lucide-react';
import { customersAPI } from '../lib/api';

export default function Customers() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const { data: customers, isLoading } = useQuery({
        queryKey: ['customers', search],
        queryFn: () => customersAPI.getAll({ search }).then((r) => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: customersAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['customers']);
            toast.success('Customer deleted successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to delete customer');
        },
    });

    const handleDelete = (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Customers</h1>
                    <p className="page-subtitle">Manage customer information</p>
                </div>
                <button onClick={() => { setEditingCustomer(null); setShowModal(true); }} className="btn-primary">
                    <Plus className="w-5 h-5" />
                    Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="card p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, or email..."
                        className="input pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Customer Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : customers?.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-12 text-center">
                    <Users className="w-12 h-12 text-dark-500 mb-4" />
                    <p className="text-dark-400">No customers found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customers?.map((customer) => (
                        <div key={customer.id} className="card-hover p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-primary-400 font-semibold text-lg">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <Link to={`/customers/${customer.id}`} className="font-semibold text-white hover:text-primary-400">
                                            {customer.name}
                                        </Link>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
                                            <span className="flex items-center gap-1">
                                                <Car className="w-3 h-3" />
                                                {customer._count?.vehicles} vehicles
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ClipboardList className="w-3 h-3" />
                                                {customer._count?.jobCards} jobs
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => { setEditingCustomer(customer); setShowModal(true); }}
                                        className="btn-ghost btn-icon"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(customer.id, customer.name)}
                                        className="btn-ghost btn-icon text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {customer.phone && (
                                    <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-dark-300 hover:text-primary-400">
                                        <Phone className="w-4 h-4 text-dark-400" />
                                        {customer.phone}
                                    </a>
                                )}
                                {customer.email && (
                                    <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-dark-300 hover:text-primary-400">
                                        <Mail className="w-4 h-4 text-dark-400" />
                                        {customer.email}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <CustomerModal
                    customer={editingCustomer}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}

function CustomerModal({ customer, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        address: customer?.address || '',
        notes: customer?.notes || '',
    });

    const mutation = useMutation({
        mutationFn: (data) => customer ? customersAPI.update(customer.id, data) : customersAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['customers']);
            toast.success(customer ? 'Customer updated successfully' : 'Customer created successfully');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Operation failed');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-lg font-semibold text-white">
                        {customer ? 'Edit Customer' : 'Add New Customer'}
                    </h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div>
                            <label className="label">Name *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Phone</label>
                            <input
                                type="tel"
                                className="input"
                                placeholder="+971 50 xxx xxxx"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">Email</label>
                            <input
                                type="email"
                                className="input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">Address</label>
                            <textarea
                                className="input"
                                rows={2}
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">Notes</label>
                            <textarea
                                className="input"
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="btn-primary">
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                customer ? 'Update Customer' : 'Add Customer'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
