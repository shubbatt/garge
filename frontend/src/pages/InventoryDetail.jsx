import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    Package,
    Plus,
    Minus,
    TrendingUp,
    TrendingDown,
    Edit,
    AlertTriangle,
    Loader2,
    X,
} from 'lucide-react';
import { inventoryAPI } from '../lib/api';
import { formatCurrency, formatNumber, formatDateTime } from '../lib/utils';

export default function InventoryDetail() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const [showStockModal, setShowStockModal] = useState(null); // 'add' | 'adjust'

    const { data: item, isLoading } = useQuery({
        queryKey: ['inventory', id],
        queryFn: () => inventoryAPI.getById(id).then((r) => r.data),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!item) {
        return (
            <div className="text-center py-12">
                <p className="text-dark-400">Item not found</p>
            </div>
        );
    }

    const isLowStock = item.currentStock <= item.reorderLevel;
    const stockValue = item.currentStock * item.costPrice;
    const retailValue = item.currentStock * item.sellingPrice;
    const potentialProfit = retailValue - stockValue;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/inventory" className="btn-ghost btn-icon">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="page-title">{item.name}</h1>
                    <p className="page-subtitle">SKU: {item.sku}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowStockModal('add')} className="btn-success">
                        <Plus className="w-5 h-5" />
                        Add Stock
                    </button>
                    <button onClick={() => setShowStockModal('adjust')} className="btn-secondary">
                        <Edit className="w-5 h-5" />
                        Adjust Stock
                    </button>
                </div>
            </div>

            {/* Low Stock Alert */}
            {isLowStock && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-400">
                        Stock is below reorder level ({item.reorderLevel} {item.unit}). Consider restocking.
                    </p>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-card-label">Current Stock</p>
                            <p className={`stat-card-value ${isLowStock ? 'text-red-400' : ''}`}>
                                {formatNumber(item.currentStock)} {item.unit}
                            </p>
                        </div>
                        <Package className={`w-8 h-8 ${isLowStock ? 'text-red-400' : 'text-primary-400'}`} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-card-label">Stock Value (Cost)</p>
                            <p className="stat-card-value">{formatCurrency(stockValue)}</p>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-card-label">Retail Value</p>
                            <p className="stat-card-value">{formatCurrency(retailValue)}</p>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stat-card-label">Potential Profit</p>
                            <p className="stat-card-value text-emerald-400">{formatCurrency(potentialProfit)}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-emerald-400" />
                    </div>
                </div>
            </div>

            {/* Item Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="card p-6 space-y-4">
                        <h3 className="font-semibold text-white">Item Details</h3>

                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-dark-400">Category</p>
                                <p className="text-dark-200">{item.category?.name}</p>
                            </div>

                            <div>
                                <p className="text-xs text-dark-400">Cost Price</p>
                                <p className="text-dark-200 font-mono">{formatCurrency(item.costPrice)}</p>
                            </div>

                            <div>
                                <p className="text-xs text-dark-400">Selling Price</p>
                                <p className="text-dark-200 font-mono">{formatCurrency(item.sellingPrice)}</p>
                            </div>

                            <div>
                                <p className="text-xs text-dark-400">Profit Margin</p>
                                <p className="text-emerald-400">
                                    {((item.sellingPrice - item.costPrice) / item.costPrice * 100).toFixed(1)}%
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-dark-400">Reorder Level</p>
                                <p className="text-dark-200">{formatNumber(item.reorderLevel)} {item.unit}</p>
                            </div>

                            {item.barcode && (
                                <div>
                                    <p className="text-xs text-dark-400">Barcode</p>
                                    <p className="text-dark-200 font-mono">{item.barcode}</p>
                                </div>
                            )}

                            {item.description && (
                                <div>
                                    <p className="text-xs text-dark-400">Description</p>
                                    <p className="text-dark-200">{item.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stock Movement History */}
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="p-4 border-b border-dark-700/50">
                            <h3 className="font-semibold text-white">Stock Movement History</h3>
                        </div>

                        {item.stockMovements?.length === 0 ? (
                            <p className="p-4 text-dark-400 text-center">No movement history</p>
                        ) : (
                            <div className="divide-y divide-dark-700/50">
                                {item.stockMovements?.map((movement) => (
                                    <div key={movement.id} className="flex items-center gap-4 p-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${movement.quantity > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                            }`}>
                                            {movement.quantity > 0 ? (
                                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                            ) : (
                                                <TrendingDown className="w-5 h-5 text-red-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white capitalize">{movement.type.replace('_', ' ')}</p>
                                            <p className="text-xs text-dark-400">{movement.reference || '-'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-medium ${movement.quantity > 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {movement.quantity > 0 ? '+' : ''}{formatNumber(movement.quantity)} {item.unit}
                                            </p>
                                            <p className="text-xs text-dark-400">{formatDateTime(movement.createdAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stock Modal */}
            {showStockModal && (
                <StockModal
                    item={item}
                    type={showStockModal}
                    onClose={() => setShowStockModal(null)}
                />
            )}
        </div>
    );
}

function StockModal({ item, type, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        quantity: '',
        costPrice: item.costPrice.toFixed(2),
        reference: '',
        notes: '',
    });

    const mutation = useMutation({
        mutationFn: (data) =>
            type === 'add'
                ? inventoryAPI.addStock(item.id, data)
                : inventoryAPI.adjustStock(item.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['inventory', item.id]);
            toast.success(type === 'add' ? 'Stock added successfully' : 'Stock adjusted successfully');
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
                        {type === 'add' ? 'Add Stock' : 'Adjust Stock'}
                    </h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div className="p-4 bg-dark-800/50 rounded-xl">
                            <p className="text-sm text-dark-400">Item</p>
                            <p className="text-white font-medium">{item.name}</p>
                            <p className="text-sm text-dark-400 mt-2">
                                Current Stock: <span className="text-white">{formatNumber(item.currentStock)} {item.unit}</span>
                            </p>
                        </div>

                        <div>
                            <label className="label">
                                {type === 'add' ? 'Quantity to Add' : 'New Stock Level'} *
                            </label>
                            <input
                                type="number"
                                min={type === 'add' ? 1 : 0}
                                className="input"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                required
                            />
                        </div>

                        {type === 'add' && (
                            <>
                                <div>
                                    <label className="label">Cost Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="input"
                                        value={formData.costPrice}
                                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="label">Reference (PO Number)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g., PO-2024-001"
                                        value={formData.reference}
                                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

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
                                type === 'add' ? 'Add Stock' : 'Adjust Stock'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
