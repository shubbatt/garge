import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Droplets,
    Plus,
    Search,
    Calendar,
    Loader2,
    X,
    Trash2,
} from 'lucide-react';
import { dailyUsageAPI, inventoryAPI } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/utils';

const reasons = [
    { value: 'shop_floor', label: 'Shop Floor' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' },
];

export default function DailyUsage() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');

    const { data: usages, isLoading } = useQuery({
        queryKey: ['daily-usage', { reason: selectedReason }],
        queryFn: () => dailyUsageAPI.getAll({ reason: selectedReason || undefined }).then((r) => r.data),
    });

    const { data: todaySummary } = useQuery({
        queryKey: ['daily-usage-today'],
        queryFn: () => dailyUsageAPI.getTodaySummary().then((r) => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: dailyUsageAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['daily-usage']);
            queryClient.invalidateQueries(['daily-usage-today']);
            toast.success('Usage record deleted');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to delete');
        },
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Daily Usage</h1>
                    <p className="page-subtitle">Track shop consumables and operational expenses</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <Plus className="w-5 h-5" />
                    Log Usage
                </button>
            </div>

            {/* Today's Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-card-label">Today's Items</p>
                            <p className="stat-card-value">{todaySummary?.totalItems || 0}</p>
                        </div>
                        <Droplets className="w-8 h-8 text-primary-400" />
                    </div>
                </div>
                <div className="stat-card">
                    <p className="stat-card-label">Today's Cost</p>
                    <p className="stat-card-value text-red-400">{formatCurrency(todaySummary?.totalCost || 0)}</p>
                </div>
                {Object.entries(todaySummary?.byReason || {}).slice(0, 2).map(([reason, qty]) => (
                    <div key={reason} className="stat-card">
                        <p className="stat-card-label capitalize">{reason.replace('_', ' ')}</p>
                        <p className="stat-card-value">{qty}</p>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="card p-4">
                <div className="flex gap-4">
                    <select
                        className="select w-48"
                        value={selectedReason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                    >
                        <option value="">All Reasons</option>
                        {reasons.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Usage List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : usages?.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-12 text-center">
                    <Droplets className="w-12 h-12 text-dark-500 mb-4" />
                    <p className="text-dark-400">No usage records found</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Quantity</th>
                                    <th>Reason</th>
                                    <th>Cost</th>
                                    <th>By</th>
                                    <th>Date</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usages?.map((usage) => (
                                    <tr key={usage.id}>
                                        <td>
                                            <p className="text-white font-medium">{usage.inventoryItem?.name}</p>
                                            <p className="text-xs text-dark-400">{usage.inventoryItem?.sku}</p>
                                        </td>
                                        <td className="font-mono">{usage.quantity} {usage.inventoryItem?.unit}</td>
                                        <td>
                                            <span className="badge-secondary capitalize">{usage.reason.replace('_', ' ')}</span>
                                        </td>
                                        <td className="font-mono text-red-400">
                                            {formatCurrency(usage.quantity * usage.inventoryItem?.costPrice)}
                                        </td>
                                        <td className="text-dark-300">{usage.user?.name}</td>
                                        <td className="text-dark-400">{formatDateTime(usage.createdAt)}</td>
                                        <td className="text-right">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Delete this usage record? Stock will be returned.')) {
                                                        deleteMutation.mutate(usage.id);
                                                    }
                                                }}
                                                className="btn-ghost btn-icon text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && <UsageModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

function UsageModal({ onClose }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [formData, setFormData] = useState({
        quantity: 1,
        reason: 'shop_floor',
        notes: '',
    });

    const { data: items } = useQuery({
        queryKey: ['inventory-usage', search],
        queryFn: () => inventoryAPI.getAll({ search }).then((r) => r.data),
        enabled: search.length >= 2,
    });

    const mutation = useMutation({
        mutationFn: (data) => dailyUsageAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['daily-usage']);
            queryClient.invalidateQueries(['daily-usage-today']);
            queryClient.invalidateQueries(['inventory']);
            toast.success('Usage logged');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to log usage');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate({
            inventoryItemId: selectedItem.id,
            ...formData,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-lg font-semibold text-white">Log Shop Usage</h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        {!selectedItem ? (
                            <>
                                <input
                                    type="text"
                                    placeholder="Search item..."
                                    className="input"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                />

                                {items?.length > 0 && (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {items.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setSelectedItem(item)}
                                                className="w-full flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors text-left"
                                            >
                                                <div>
                                                    <p className="text-white">{item.name}</p>
                                                    <p className="text-sm text-dark-400">Stock: {item.currentStock} {item.unit}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="p-4 bg-dark-800/50 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-white">{selectedItem.name}</p>
                                            <p className="text-sm text-dark-400">Stock: {selectedItem.currentStock} {selectedItem.unit}</p>
                                        </div>
                                        <button type="button" onClick={() => setSelectedItem(null)} className="text-sm text-primary-400">
                                            Change
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Quantity *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedItem.currentStock}
                                        className="input"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="label">Reason</label>
                                    <select
                                        className="select"
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    >
                                        {reasons.map((r) => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
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
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={!selectedItem || mutation.isPending} className="btn-primary">
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Log Usage
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
