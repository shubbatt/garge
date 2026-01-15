import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Car,
    Plus,
    Search,
    Edit,
    Trash2,
    X,
    Loader2,
} from 'lucide-react';
import { vehiclesAPI, customersAPI } from '../lib/api';

export default function Vehicles() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);

    const { data: vehicles, isLoading } = useQuery({
        queryKey: ['vehicles', search],
        queryFn: () => vehiclesAPI.getAll({ search }).then((r) => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: vehiclesAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['vehicles']);
            toast.success('Vehicle deleted successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to delete vehicle');
        },
    });

    return (
        <div className="space-y-6">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Vehicles</h1>
                    <p className="page-subtitle">Manage registered vehicles</p>
                </div>
                <button onClick={() => { setEditingVehicle(null); setShowModal(true); }} className="btn-primary">
                    <Plus className="w-5 h-5" />
                    Add Vehicle
                </button>
            </div>

            <div className="card p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                        type="text"
                        placeholder="Search by vehicle number, make, or model..."
                        className="input pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : vehicles?.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-12">
                    <Car className="w-12 h-12 text-dark-500 mb-4" />
                    <p className="text-dark-400">No vehicles found</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Vehicle No</th>
                                    <th>Make/Model</th>
                                    <th>Color</th>
                                    <th>Year</th>
                                    <th>Owner</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles?.map((vehicle) => (
                                    <tr key={vehicle.id}>
                                        <td className="font-medium text-white">{vehicle.vehicleNo}</td>
                                        <td className="text-dark-200">{vehicle.make} {vehicle.model}</td>
                                        <td className="text-dark-300">{vehicle.color || '-'}</td>
                                        <td className="text-dark-300">{vehicle.year || '-'}</td>
                                        <td>
                                            <Link to={`/customers/${vehicle.customer?.id}`} className="text-primary-400 hover:text-primary-300">
                                                {vehicle.customer?.name}
                                            </Link>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setEditingVehicle(vehicle); setShowModal(true); }}
                                                    className="btn-ghost btn-icon"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Delete vehicle ${vehicle.vehicleNo}?`)) {
                                                            deleteMutation.mutate(vehicle.id);
                                                        }
                                                    }}
                                                    className="btn-ghost btn-icon text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <VehicleModal
                    vehicle={editingVehicle}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}

function VehicleModal({ vehicle, onClose }) {
    const queryClient = useQueryClient();
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(vehicle?.customer || null);
    const [formData, setFormData] = useState({
        vehicleNo: vehicle?.vehicleNo || '',
        make: vehicle?.make || '',
        model: vehicle?.model || '',
        color: vehicle?.color || '',
        year: vehicle?.year || '',
        vin: vehicle?.vin || '',
        notes: vehicle?.notes || '',
    });

    const { data: customers } = useQuery({
        queryKey: ['customers-search', customerSearch],
        queryFn: () => customersAPI.getAll({ search: customerSearch }).then((r) => r.data),
        enabled: customerSearch.length >= 2,
    });

    const mutation = useMutation({
        mutationFn: (data) => vehicle ? vehiclesAPI.update(vehicle.id, data) : vehiclesAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['vehicles']);
            toast.success(vehicle ? 'Vehicle updated' : 'Vehicle created');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Operation failed');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            customerId: selectedCustomer?.id,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-lg font-semibold text-white">
                        {vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                    </h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        {!vehicle && (
                            <div>
                                <label className="label">Owner *</label>
                                {selectedCustomer ? (
                                    <div className="p-3 bg-dark-800/50 rounded-xl flex items-center justify-between">
                                        <span className="text-white">{selectedCustomer.name}</span>
                                        <button type="button" onClick={() => setSelectedCustomer(null)} className="text-sm text-primary-400">
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Search customer..."
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                        />
                                        {customers?.length > 0 && (
                                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                                {customers.map((customer) => (
                                                    <button
                                                        key={customer.id}
                                                        type="button"
                                                        onClick={() => setSelectedCustomer(customer)}
                                                        className="w-full text-left p-2 bg-dark-800/50 rounded-lg hover:bg-dark-800 text-white"
                                                    >
                                                        {customer.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="label">Vehicle Number *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.vehicleNo}
                                onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Make</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Toyota"
                                    value={formData.make}
                                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Model</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Camry"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Color</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Year</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending || (!vehicle && !selectedCustomer)}
                            className="btn-primary"
                        >
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {vehicle ? 'Update' : 'Add'} Vehicle
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
