import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    Car,
    Users,
    User,
    Phone,
    Gauge,
    Calendar,
    Plus,
    Trash2,
    Wrench,
    Package,
    Paintbrush,
    FileText,
    Loader2,
    X,
    ChevronDown,
    ChevronRight,
    Printer,
    DollarSign,
    Search,
    Youtube,
    ExternalLink,
    Globe,
    Activity,
} from 'lucide-react';
import { jobCardsAPI, servicesAPI, inventoryAPI, invoicesAPI, usersAPI, settingsAPI } from '../lib/api';
import { formatCurrency, formatDateTime, formatDate, getStatusColor, getStatusLabel } from '../lib/utils';

const statusFlow = ['pending', 'in_progress', 'quality_check', 'ready', 'invoiced', 'paid'];

export default function JobCardDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showAddService, setShowAddService] = useState(false);
    const [showAddPart, setShowAddPart] = useState(false);
    const [showAddManual, setShowAddManual] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        services: true,
        parts: true,
        manual: true,
    });

    const { data: job, isLoading } = useQuery({
        queryKey: ['job-card', id],
        queryFn: () => jobCardsAPI.getById(id).then((r) => r.data),
    });

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => usersAPI.getAll().then((r) => r.data),
    });

    // Fetch settings to get tax rate
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsAPI.getAll().then((r) => r.data),
    });

    const assignTechnicianMutation = useMutation({
        mutationFn: (assignedToId) => jobCardsAPI.update(id, { assignedToId }),
        onSuccess: () => {
            queryClient.invalidateQueries(['job-card', id]);
            toast.success('Technician assigned');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to assign technician');
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: (status) => jobCardsAPI.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries(['job-card', id]);
            toast.success('Status updated');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to update status');
        },
    });

    // Get tax rate from settings, default to 5 if not set
    const taxRate = parseFloat(settings?.tax_rate) || 5;

    const createInvoiceMutation = useMutation({
        mutationFn: () => invoicesAPI.create({ jobCardId: id, taxRate }),
        onSuccess: (response) => {
            queryClient.invalidateQueries(['job-card', id]);
            toast.success('Invoice created');
            navigate(`/invoices/${response.data.id}`);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to create invoice');
        },
    });

    const removeServiceMutation = useMutation({
        mutationFn: (serviceId) => jobCardsAPI.removeService(id, serviceId),
        onSuccess: () => {
            queryClient.invalidateQueries(['job-card', id]);
            toast.success('Service removed');
        },
    });

    const removePartMutation = useMutation({
        mutationFn: (partId) => jobCardsAPI.removePart(id, partId),
        onSuccess: () => {
            queryClient.invalidateQueries(['job-card', id]);
            toast.success('Part removed and returned to stock');
        },
    });

    const removeManualMutation = useMutation({
        mutationFn: (entryId) => jobCardsAPI.removeManualEntry(id, entryId),
        onSuccess: () => {
            queryClient.invalidateQueries(['job-card', id]);
            toast.success('Entry removed');
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="text-center py-12">
                <p className="text-dark-400">Job card not found</p>
            </div>
        );
    }

    const currentStatusIndex = statusFlow.indexOf(job.status);
    const canAdvanceStatus = currentStatusIndex < statusFlow.indexOf('ready');
    const canCreateInvoice = job.status === 'ready' && !job.invoice;

    const servicesTotal = job.jobServices?.reduce((sum, s) => sum + s.total, 0) || 0;
    const partsTotal = job.jobParts?.reduce((sum, p) => sum + p.total, 0) || 0;
    const manualTotal = job.jobManualEntries?.reduce((sum, m) => sum + (m.actualCost || m.estimatedCost), 0) || 0;
    const grandTotal = servicesTotal + partsTotal + manualTotal;

    const toggleSection = (section) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="space-y-6">
            {/* Header - Hidden when printing */}
            <div className="flex items-center gap-4 no-print">
                <Link to="/job-cards" className="btn-ghost btn-icon">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="page-title">{job.jobNumber}</h1>
                        <span className={`badge ${getStatusColor(job.status)}`}>
                            {getStatusLabel(job.status)}
                        </span>
                    </div>
                    <p className="page-subtitle">{job.vehicle?.vehicleNo} - {job.customer?.name}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => window.print()} className="btn-secondary">
                        <Printer className="w-5 h-5" />
                        Print Receipt
                    </button>
                    {canAdvanceStatus && (
                        <button
                            onClick={() => updateStatusMutation.mutate(statusFlow[currentStatusIndex + 1])}
                            disabled={updateStatusMutation.isPending}
                            className="btn-secondary"
                        >
                            Move to {getStatusLabel(statusFlow[currentStatusIndex + 1])}
                        </button>
                    )}
                    {canCreateInvoice && (
                        <button
                            onClick={() => createInvoiceMutation.mutate()}
                            disabled={createInvoiceMutation.isPending}
                            className="btn-primary"
                        >
                            <FileText className="w-5 h-5" />
                            Create Invoice
                        </button>
                    )}
                    {job.invoice && (
                        <Link to={`/invoices/${job.invoice.id}`} className="btn-primary">
                            <FileText className="w-5 h-5" />
                            View Invoice
                        </Link>
                    )}
                </div>
            </div>

            {/* Printable Receipt - Only visible when printing */}
            <div id="job-receipt" className="print-only">
                <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
                    {/* Receipt Header */}
                    <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '15px' }}>
                        <h1 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>Ramboo Engineering</h1>
                        <p style={{ fontSize: '14px', margin: '0', color: '#666' }}>Workshop Management</p>
                    </div>

                    {/* Job Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div>
                            <p style={{ margin: '0', fontWeight: 'bold', fontSize: '18px' }}>{job.jobNumber}</p>
                            <p style={{ margin: '5px 0', color: '#666' }}>Date: {formatDate(job.createdAt)}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '0', fontWeight: 'bold' }}>{getStatusLabel(job.status)}</p>
                        </div>
                    </div>

                    {/* Customer & Vehicle */}
                    <div style={{ display: 'flex', gap: '40px', marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
                        <div>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#666' }}>Customer</p>
                            <p style={{ margin: '0', fontWeight: 'bold' }}>{job.customer?.name}</p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{job.customer?.phone}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#666' }}>Vehicle</p>
                            <p style={{ margin: '0', fontWeight: 'bold' }}>{job.vehicle?.vehicleNo}</p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{[job.vehicle?.make, job.vehicle?.model].filter(Boolean).join(' ')}</p>
                            {job.odometer && <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>Odometer: {job.odometer.toLocaleString()} km</p>}
                        </div>
                    </div>

                    {/* Services */}
                    {job.jobServices?.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#666' }}>Services</p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #333' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 0' }}>Description</th>
                                        <th style={{ textAlign: 'center', padding: '8px 0' }}>Qty</th>
                                        <th style={{ textAlign: 'right', padding: '8px 0' }}>Price</th>
                                        <th style={{ textAlign: 'right', padding: '8px 0' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {job.jobServices.map((js) => (
                                        <tr key={js.id} style={{ borderBottom: '1px solid #ddd' }}>
                                            <td style={{ padding: '8px 0' }}>{js.service?.name}</td>
                                            <td style={{ textAlign: 'center', padding: '8px 0' }}>{js.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 0' }}>{formatCurrency(js.unitPrice)}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 'bold' }}>{formatCurrency(js.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Parts */}
                    {job.jobParts?.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#666' }}>Parts</p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #333' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 0' }}>Item</th>
                                        <th style={{ textAlign: 'center', padding: '8px 0' }}>Qty</th>
                                        <th style={{ textAlign: 'right', padding: '8px 0' }}>Price</th>
                                        <th style={{ textAlign: 'right', padding: '8px 0' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {job.jobParts.map((jp) => (
                                        <tr key={jp.id} style={{ borderBottom: '1px solid #ddd' }}>
                                            <td style={{ padding: '8px 0' }}>{jp.inventoryItem?.name}</td>
                                            <td style={{ textAlign: 'center', padding: '8px 0' }}>{jp.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 0' }}>{formatCurrency(jp.unitPrice)}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 'bold' }}>{formatCurrency(jp.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Manual Entries */}
                    {job.jobManualEntries?.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#666' }}>Labor & Other</p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #333' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 0' }}>Description</th>
                                        <th style={{ textAlign: 'left', padding: '8px 0' }}>Category</th>
                                        <th style={{ textAlign: 'right', padding: '8px 0' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {job.jobManualEntries.map((me) => (
                                        <tr key={me.id} style={{ borderBottom: '1px solid #ddd' }}>
                                            <td style={{ padding: '8px 0' }}>{me.description}</td>
                                            <td style={{ padding: '8px 0', textTransform: 'capitalize' }}>{me.category}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 'bold' }}>{formatCurrency(me.actualCost || me.estimatedCost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Totals */}
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px solid #000' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: '200px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span>Services:</span>
                                    <span>{formatCurrency(servicesTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span>Parts:</span>
                                    <span>{formatCurrency(partsTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Labor/Other:</span>
                                    <span>{formatCurrency(manualTotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', paddingTop: '10px', borderTop: '2px solid #000' }}>
                                    <span>TOTAL:</span>
                                    <span>{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: '30px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
                        <p style={{ margin: '0' }}>Thank you for choosing Ramboo Engineering!</p>
                        <p style={{ margin: '5px 0 0 0' }}>This is an estimate. Final amounts may vary.</p>
                    </div>
                </div>
            </div>

            {/* Vehicle & Customer Info - Screen Only */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                            <Car className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{job.vehicle?.vehicleNo}</p>
                            <p className="text-sm text-dark-400">
                                {[job.vehicle?.make, job.vehicle?.model, job.vehicle?.color].filter(Boolean).join(' • ')}
                            </p>
                        </div>
                    </div>
                    {job.odometer && (
                        <div className="flex items-center gap-2 text-sm text-dark-300">
                            <Gauge className="w-4 h-4 text-dark-400" />
                            {job.odometer.toLocaleString()} km
                        </div>
                    )}
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-accent-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{job.customer?.name}</p>
                            <a href={`tel:${job.customer?.phone}`} className="text-sm text-primary-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {job.customer?.phone}
                            </a>
                        </div>
                    </div>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-dark-400">Created</p>
                            <p className="font-semibold text-white">{formatDateTime(job.createdAt)}</p>
                        </div>
                    </div>
                    {job.completedAt && (
                        <p className="text-sm text-dark-400">
                            Completed: {formatDateTime(job.completedAt)}
                        </p>
                    )}
                </div>
                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-dark-400 font-medium">Technician</p>
                            <select
                                className="bg-transparent text-white font-semibold outline-none w-full mt-0.5 cursor-pointer block"
                                value={job.assignedToId || ''}
                                onChange={(e) => assignTechnicianMutation.mutate(e.target.value || null)}
                                disabled={assignTechnicianMutation.isPending || job.status === 'paid'}
                            >
                                <option value="" className="bg-dark-800 text-dark-300">Unassigned</option>
                                {users?.map((user) => (
                                    <option key={user.id} value={user.id} className="bg-dark-800 text-white">
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Diagnostic Assistant & Notes Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 no-print">
                {/* Diagnostic Assistant */}
                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Diagnostic Assistant</h3>
                            <p className="text-xs text-dark-400">Search OBD-II / DTC Codes</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                            <input
                                type="text"
                                placeholder="Enter code (e.g. P0420)..."
                                className="input pl-10 text-sm"
                                id="dtc-search"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const code = e.target.value;
                                        if (code) window.open(`https://www.google.com/search?q=${code}+${job.vehicle?.make}+meaning+solution`, '_blank');
                                    }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const code = document.getElementById('dtc-search').value;
                                    if (code) window.open(`https://www.google.com/search?q=${code}+${job.vehicle?.make}+repair+fix`, '_blank');
                                    else toast.error('Enter a code first');
                                }}
                                className="flex flex-col items-center justify-center p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors gap-2"
                            >
                                <Globe className="w-5 h-5 text-blue-400" />
                                <span className="text-[10px] uppercase font-bold text-dark-300">Google</span>
                            </a>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const code = document.getElementById('dtc-search').value;
                                    if (code) window.open(`https://www.youtube.com/results?search_query=${code}+${job.vehicle?.make}+${job.vehicle?.model}+repair`, '_blank');
                                    else toast.error('Enter a code first');
                                }}
                                className="flex flex-col items-center justify-center p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors gap-2"
                            >
                                <Youtube className="w-5 h-5 text-red-500" />
                                <span className="text-[10px] uppercase font-bold text-dark-300">YouTube</span>
                            </a>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const code = document.getElementById('dtc-search').value;
                                    if (code) window.open(`https://www.obd-codes.com/${code}`, '_blank');
                                    else toast.error('Enter a code first');
                                }}
                                className="flex flex-col items-center justify-center p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors gap-2"
                            >
                                <ExternalLink className="w-5 h-5 text-emerald-400" />
                                <span className="text-[10px] uppercase font-bold text-dark-300">OBD-Codes</span>
                            </a>
                        </div>

                        <button
                            className="btn-secondary w-full text-xs"
                            onClick={() => {
                                const code = document.getElementById('dtc-search').value;
                                if (!code) return toast.error('Enter a code first');

                                const newNote = `\n[DIAGNOSTIC]: Scanned DTC Code ${code.toUpperCase()}. Reference: ${job.vehicle?.make} service manual.`;
                                const updatedNotes = (job.notes || '') + newNote;

                                jobCardsAPI.update(id, { notes: updatedNotes }).then(() => {
                                    queryClient.invalidateQueries(['job-card', id]);
                                    toast.success('Added to job notes');
                                });
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Add Result to Job Notes
                        </button>
                    </div>
                </div>

                {/* Notes */}
                <div className="card p-5">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-dark-400" />
                        Notes / Complaints
                    </h3>
                    <p className="text-dark-300 whitespace-pre-wrap text-sm leading-relaxed">
                        {job.notes || 'No notes added for this job card.'}
                    </p>
                </div>
            </div>

            {/* Services Section */}
            <div className="card no-print">
                <button
                    onClick={() => toggleSection('services')}
                    className="w-full flex items-center justify-between p-4 border-b border-dark-700/50"
                >
                    <div className="flex items-center gap-3">
                        <Wrench className="w-5 h-5 text-primary-400" />
                        <h3 className="font-semibold text-white">Services ({job.jobServices?.length || 0})</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-white">{formatCurrency(servicesTotal)}</span>
                        {expandedSections.services ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                </button>

                {expandedSections.services && (
                    <div className="p-4">
                        {job.jobServices?.length === 0 ? (
                            <p className="text-dark-400 text-center py-4">No services added</p>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {job.jobServices?.map((js) => (
                                    <div key={js.id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                                        <div>
                                            <p className="text-white">{js.service?.name}</p>
                                            <p className="text-sm text-dark-400">
                                                {js.quantity} × {formatCurrency(js.unitPrice)}
                                                {js.discount > 0 && ` - ${formatCurrency(js.discount)} discount`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium text-white">{formatCurrency(js.total)}</span>
                                            {job.status !== 'paid' && (
                                                <button
                                                    onClick={() => removeServiceMutation.mutate(js.id)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {job.status !== 'paid' && job.status !== 'invoiced' && (
                            <button onClick={() => setShowAddService(true)} className="btn-secondary w-full">
                                <Plus className="w-4 h-4" />
                                Add Service
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Parts Section */}
            <div className="card no-print">
                <button
                    onClick={() => toggleSection('parts')}
                    className="w-full flex items-center justify-between p-4 border-b border-dark-700/50"
                >
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-semibold text-white">Parts ({job.jobParts?.length || 0})</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-white">{formatCurrency(partsTotal)}</span>
                        {expandedSections.parts ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                </button>

                {expandedSections.parts && (
                    <div className="p-4">
                        {job.jobParts?.length === 0 ? (
                            <p className="text-dark-400 text-center py-4">No parts added</p>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {job.jobParts?.map((jp) => (
                                    <div key={jp.id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                                        <div>
                                            <p className="text-white">{jp.inventoryItem?.name}</p>
                                            <p className="text-sm text-dark-400">
                                                {jp.quantity} × {formatCurrency(jp.unitPrice)}
                                                {jp.discount > 0 && ` - ${formatCurrency(jp.discount)} discount`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium text-white">{formatCurrency(jp.total)}</span>
                                            {job.status !== 'paid' && (
                                                <button
                                                    onClick={() => removePartMutation.mutate(jp.id)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {job.status !== 'paid' && job.status !== 'invoiced' && (
                            <button onClick={() => setShowAddPart(true)} className="btn-secondary w-full">
                                <Plus className="w-4 h-4" />
                                Add Part
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Manual Entries (Tinkering & Painting) */}
            <div className="card no-print">
                <button
                    onClick={() => toggleSection('manual')}
                    className="w-full flex items-center justify-between p-4 border-b border-dark-700/50"
                >
                    <div className="flex items-center gap-3">
                        <Paintbrush className="w-5 h-5 text-amber-400" />
                        <h3 className="font-semibold text-white">Tinkering & Painting ({job.jobManualEntries?.length || 0})</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-white">{formatCurrency(manualTotal)}</span>
                        {expandedSections.manual ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                </button>

                {expandedSections.manual && (
                    <div className="p-4">
                        {job.jobManualEntries?.length === 0 ? (
                            <p className="text-dark-400 text-center py-4">No manual entries</p>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {job.jobManualEntries?.map((me) => (
                                    <div key={me.id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                                        <div>
                                            <p className="text-white">{me.description}</p>
                                            <p className="text-sm text-dark-400 capitalize">{me.category}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium text-white">
                                                {formatCurrency(me.actualCost || me.estimatedCost)}
                                            </span>
                                            {job.status !== 'paid' && (
                                                <button
                                                    onClick={() => removeManualMutation.mutate(me.id)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {job.status !== 'paid' && job.status !== 'invoiced' && (
                            <button onClick={() => setShowAddManual(true)} className="btn-secondary w-full">
                                <Plus className="w-4 h-4" />
                                Add Manual Entry
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Total */}
            <div className="card p-6 no-print">
                <div className="flex items-center justify-between text-lg">
                    <span className="text-dark-300">Grand Total</span>
                    <span className="text-2xl font-bold text-white">{formatCurrency(grandTotal)}</span>
                </div>
            </div>

            {/* Modals */}
            {showAddService && (
                <AddServiceModal jobId={id} onClose={() => setShowAddService(false)} />
            )}
            {showAddPart && (
                <AddPartModal jobId={id} onClose={() => setShowAddPart(false)} />
            )}
            {showAddManual && (
                <AddManualModal jobId={id} onClose={() => setShowAddManual(false)} />
            )}
        </div>
    );
}

function AddServiceModal({ jobId, onClose }) {
    const queryClient = useQueryClient();
    const [selectedService, setSelectedService] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState('');
    const [discount, setDiscount] = useState(0);

    const { data: services } = useQuery({
        queryKey: ['services', { active: true }],
        queryFn: () => servicesAPI.getAll({ active: true }).then((r) => r.data),
    });

    const mutation = useMutation({
        mutationFn: (data) => jobCardsAPI.addService(jobId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['job-card', jobId]);
            toast.success('Service added');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to add service');
        },
    });

    const handleSelectService = (service) => {
        setSelectedService(service);
        setUnitPrice(service.basePrice.toFixed(2));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate({
            serviceId: selectedService.id,
            quantity,
            unitPrice: parseFloat(unitPrice),
            discount: parseFloat(discount) || 0,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-lg font-semibold text-white">Add Service</h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        {!selectedService ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {services?.map((service) => (
                                    <button
                                        key={service.id}
                                        type="button"
                                        onClick={() => handleSelectService(service)}
                                        className="w-full flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors text-left"
                                    >
                                        <div>
                                            <p className="text-white">{service.name}</p>
                                            <p className="text-sm text-dark-400">{service.category?.name}</p>
                                        </div>
                                        <span className="font-medium text-primary-400">{formatCurrency(service.basePrice)}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="p-4 bg-dark-800/50 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-white">{selectedService.name}</p>
                                        <button type="button" onClick={() => setSelectedService(null)} className="text-sm text-primary-400">
                                            Change
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="input"
                                            value={quantity}
                                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Unit Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="input"
                                            value={unitPrice}
                                            onChange={(e) => setUnitPrice(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Discount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="input"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                    />
                                </div>

                                <div className="p-4 bg-dark-800/50 rounded-xl flex justify-between">
                                    <span className="text-dark-400">Total</span>
                                    <span className="font-semibold text-white">
                                        {formatCurrency((quantity * parseFloat(unitPrice || 0)) - parseFloat(discount || 0))}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={!selectedService || mutation.isPending} className="btn-primary">
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Add Service
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddPartModal({ jobId, onClose }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedPart, setSelectedPart] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState('');
    const [discount, setDiscount] = useState(0);

    const { data: parts } = useQuery({
        queryKey: ['inventory', { search }],
        queryFn: () => inventoryAPI.getAll({ search, active: true }).then((r) => r.data),
        enabled: search.length >= 2,
    });

    const mutation = useMutation({
        mutationFn: (data) => jobCardsAPI.addPart(jobId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['job-card', jobId]);
            toast.success('Part added');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to add part');
        },
    });

    const handleSelectPart = (part) => {
        setSelectedPart(part);
        setUnitPrice(part.sellingPrice.toFixed(2));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate({
            inventoryItemId: selectedPart.id,
            quantity,
            unitPrice: parseFloat(unitPrice),
            discount: parseFloat(discount) || 0,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-lg font-semibold text-white">Add Part</h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        {!selectedPart ? (
                            <>
                                <input
                                    type="text"
                                    placeholder="Search parts by name or SKU..."
                                    className="input"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                />

                                {parts?.length > 0 && (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {parts.map((part) => (
                                            <button
                                                key={part.id}
                                                type="button"
                                                onClick={() => handleSelectPart(part)}
                                                className="w-full flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors text-left"
                                            >
                                                <div>
                                                    <p className="text-white">{part.name}</p>
                                                    <p className="text-sm text-dark-400">{part.sku} • Stock: {part.currentStock}</p>
                                                </div>
                                                <span className="font-medium text-primary-400">{formatCurrency(part.sellingPrice)}</span>
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
                                            <p className="font-medium text-white">{selectedPart.name}</p>
                                            <p className="text-sm text-dark-400">Available: {selectedPart.currentStock} {selectedPart.unit}</p>
                                        </div>
                                        <button type="button" onClick={() => setSelectedPart(null)} className="text-sm text-primary-400">
                                            Change
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedPart.currentStock}
                                            className="input"
                                            value={quantity}
                                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Unit Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="input"
                                            value={unitPrice}
                                            onChange={(e) => setUnitPrice(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Discount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="input"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                    />
                                </div>

                                <div className="p-4 bg-dark-800/50 rounded-xl flex justify-between">
                                    <span className="text-dark-400">Total</span>
                                    <span className="font-semibold text-white">
                                        {formatCurrency((quantity * parseFloat(unitPrice || 0)) - parseFloat(discount || 0))}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={!selectedPart || mutation.isPending} className="btn-primary">
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Add Part
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddManualModal({ jobId, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        description: '',
        category: 'tinkering',
        estimatedCost: '',
        notes: '',
    });

    const mutation = useMutation({
        mutationFn: (data) => jobCardsAPI.addManualEntry(jobId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['job-card', jobId]);
            toast.success('Entry added');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to add entry');
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
                    <h3 className="text-lg font-semibold text-white">Add Manual Entry</h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div>
                            <label className="label">Category</label>
                            <select
                                className="select"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="tinkering">Tinkering</option>
                                <option value="painting">Painting</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Description *</label>
                            <textarea
                                className="input"
                                rows={3}
                                placeholder="Describe the work..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Estimated Cost *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="input"
                                value={formData.estimatedCost}
                                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                                required
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
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Add Entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
