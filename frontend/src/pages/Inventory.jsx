import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Package,
    Plus,
    Search,
    Filter,
    AlertTriangle,
    Edit,
    Trash2,
    X,
    Loader2,
} from 'lucide-react';
import { inventoryAPI, categoriesAPI } from '../lib/api';
import { formatCurrency, formatNumber } from '../lib/utils';

export default function Inventory() {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const categoryId = searchParams.get('categoryId') || '';
    const lowStock = searchParams.get('lowStock') || '';

    const { data: items, isLoading } = useQuery({
        queryKey: ['inventory', { search, categoryId, lowStock }],
        queryFn: () => inventoryAPI.getAll({ search, categoryId, lowStock }).then((r) => r.data),
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => categoriesAPI.getAll().then((r) => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: inventoryAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['inventory']);
            toast.success('Item deleted successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to delete item');
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
                    <h1 className="page-title">Inventory</h1>
                    <p className="page-subtitle">Manage your stock and products</p>
                </div>
                <button onClick={() => { setEditingItem(null); setShowModal(true); }} className="btn-primary">
                    <Plus className="w-5 h-5" />
                    Add Item
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                        <input
                            type="text"
                            placeholder="Search by name, SKU, or barcode..."
                            className="input pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="select w-full md:w-48"
                        value={categoryId}
                        onChange={(e) => {
                            setSearchParams((prev) => {
                                if (e.target.value) prev.set('categoryId', e.target.value);
                                else prev.delete('categoryId');
                                return prev;
                            });
                        }}
                    >
                        <option value="">All Categories</option>
                        {categories?.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                            checked={lowStock === 'true'}
                            onChange={(e) => {
                                setSearchParams((prev) => {
                                    if (e.target.checked) prev.set('lowStock', 'true');
                                    else prev.delete('lowStock');
                                    return prev;
                                });
                            }}
                        />
                        Low stock only
                    </label>
                </div>
            </div>

            {/* Table */}
            <div className="card">
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                ) : items?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="w-12 h-12 text-dark-500 mb-4" />
                        <p className="text-dark-400">No items found</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th className="text-right">Cost</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-center">Stock</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items?.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <Link to={`/inventory/${item.id}`} className="text-white hover:text-primary-400">
                                                {item.name}
                                            </Link>
                                        </td>
                                        <td className="text-dark-400 font-mono text-xs">{item.sku}</td>
                                        <td>
                                            <span className="badge-secondary">{item.category?.name}</span>
                                        </td>
                                        <td className="text-right font-mono">{formatCurrency(item.costPrice)}</td>
                                        <td className="text-right font-mono">{formatCurrency(item.sellingPrice)}</td>
                                        <td className="text-center">
                                            <span className={`inline-flex items-center gap-1 ${item.currentStock <= item.reorderLevel ? 'text-red-400' : 'text-dark-200'
                                                }`}>
                                                {item.currentStock <= item.reorderLevel && (
                                                    <AlertTriangle className="w-4 h-4" />
                                                )}
                                                {formatNumber(item.currentStock)} {item.unit}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setEditingItem(item); setShowModal(true); }}
                                                    className="btn-ghost btn-icon"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.name)}
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
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <InventoryModal
                    item={editingItem}
                    categories={categories}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}

function InventoryModal({ item, categories, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: item?.name || '',
        sku: item?.sku || '',
        description: item?.description || '',
        categoryId: item?.categoryId || '',
        costPrice: item?.costPrice ? item.costPrice.toFixed(2) : '',
        sellingPrice: item?.sellingPrice ? item.sellingPrice.toFixed(2) : '',
        currentStock: item?.currentStock || 0,
        reorderLevel: item?.reorderLevel || 10,
        unit: item?.unit || 'pcs',
        barcode: item?.barcode || '',
    });

    const mutation = useMutation({
        mutationFn: (data) => item ? inventoryAPI.update(item.id, data) : inventoryAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['inventory']);
            toast.success(item ? 'Item updated successfully' : 'Item created successfully');
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
            <div className="modal w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-lg font-semibold text-white">
                        {item ? 'Edit Item' : 'Add New Item'}
                    </h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="label">Item Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">SKU *</label>
                                <input
                                    type="text"
                                    className="input font-mono"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Barcode</label>
                                <input
                                    type="text"
                                    className="input font-mono"
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="label">Category *</label>
                                <select
                                    className="select"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    required
                                >
                                    <option value="">Select category</option>
                                    {categories?.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Cost Price *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="input"
                                    value={formData.costPrice}
                                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Selling Price *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="input"
                                    value={formData.sellingPrice}
                                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                                    required
                                />
                            </div>

                            {!item && (
                                <div>
                                    <label className="label">Initial Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input"
                                        value={formData.currentStock}
                                        onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="label">Reorder Level</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input"
                                    value={formData.reorderLevel}
                                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="label">Unit</label>
                                <select
                                    className="select"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="pcs">Pieces</option>
                                    <option value="set">Set</option>
                                    <option value="pack">Pack</option>
                                    <option value="liters">Liters</option>
                                    <option value="kg">Kilograms</option>
                                    <option value="meters">Meters</option>
                                    <option value="sheet">Sheet</option>
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="label">Description</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
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
                                item ? 'Update Item' : 'Add Item'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
