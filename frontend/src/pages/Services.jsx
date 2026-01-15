import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Wrench,
    Plus,
    Edit,
    Trash2,
    X,
    Loader2,
    Clock,
} from 'lucide-react';
import { servicesAPI, serviceCategoriesAPI } from '../lib/api';
import { formatCurrency } from '../lib/utils';

export default function Services() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');

    const { data: services, isLoading } = useQuery({
        queryKey: ['services', { categoryId: selectedCategory }],
        queryFn: () => servicesAPI.getAll({ categoryId: selectedCategory || undefined }).then((r) => r.data),
    });

    const { data: categories } = useQuery({
        queryKey: ['service-categories'],
        queryFn: () => serviceCategoriesAPI.getAll().then((r) => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: servicesAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['services']);
            toast.success('Service deleted');
        },
    });

    return (
        <div className="space-y-6">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Services</h1>
                    <p className="page-subtitle">Manage service catalog</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowCategoryModal(true)} className="btn-secondary">
                        <Plus className="w-5 h-5" />
                        Add Category
                    </button>
                    <button onClick={() => { setEditingService(null); setShowModal(true); }} className="btn-primary">
                        <Plus className="w-5 h-5" />
                        Add Service
                    </button>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${!selectedCategory
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                        }`}
                >
                    All
                </button>
                {categories?.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedCategory === cat.id
                            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                            }`}
                    >
                        {cat.name} ({cat._count?.services})
                    </button>
                ))}
            </div>

            {/* Services Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : services?.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-12">
                    <Wrench className="w-12 h-12 text-dark-500 mb-4" />
                    <p className="text-dark-400">No services found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services?.map((service) => (
                        <div key={service.id} className="card-hover p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="font-semibold text-white">{service.name}</p>
                                    <p className="text-sm text-dark-400 mt-1">{service.category?.name}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => { setEditingService(service); setShowModal(true); }}
                                        className="btn-ghost btn-icon"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Delete "${service.name}"?`)) {
                                                deleteMutation.mutate(service.id);
                                            }
                                        }}
                                        className="btn-ghost btn-icon text-red-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <span className="text-2xl font-bold text-primary-400">{formatCurrency(service.basePrice)}</span>
                                {service.duration && (
                                    <span className="flex items-center gap-1 text-sm text-dark-400">
                                        <Clock className="w-4 h-4" />
                                        {service.duration} min
                                    </span>
                                )}
                            </div>

                            {service.description && (
                                <p className="text-sm text-dark-400 mt-3">{service.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <ServiceModal
                    service={editingService}
                    categories={categories}
                    onClose={() => setShowModal(false)}
                />
            )}

            {showCategoryModal && (
                <CategoryModal onClose={() => setShowCategoryModal(false)} />
            )}
        </div>
    );
}

function ServiceModal({ service, categories, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: service?.name || '',
        categoryId: service?.categoryId || '',
        description: service?.description || '',
        basePrice: service?.basePrice ? service.basePrice.toFixed(2) : '',
        duration: service?.duration || '',
        isActive: service?.isActive !== false,
    });

    const mutation = useMutation({
        mutationFn: (data) => service ? servicesAPI.update(service.id, data) : servicesAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['services']);
            toast.success(service ? 'Service updated' : 'Service created');
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
                        {service ? 'Edit Service' : 'Add Service'}
                    </h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div>
                            <label className="label">Service Name *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Base Price *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="input"
                                    value={formData.basePrice}
                                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Duration (min)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Description</label>
                            <textarea
                                className="input"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="btn-primary">
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {service ? 'Update' : 'Add'} Service
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CategoryModal({ onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({ name: '', description: '' });

    const mutation = useMutation({
        mutationFn: (data) => serviceCategoriesAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['service-categories']);
            toast.success('Category created');
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
            <div className="modal w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-lg font-semibold text-white">Add Category</h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div>
                            <label className="label">Category Name *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Description</label>
                            <textarea
                                className="input"
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="btn-primary">
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Add Category
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
