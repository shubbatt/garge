import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    FileText,
    Car,
    User,
    Phone,
    Printer,
    DollarSign,
    Loader2,
    X,
    CreditCard,
    Banknote,
    Check,
} from 'lucide-react';
import { invoicesAPI } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getStatusLabel } from '../lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function InvoiceDetail() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const [showPayment, setShowPayment] = useState(false);

    const { data: invoice, isLoading } = useQuery({
        queryKey: ['invoice', id],
        queryFn: () => invoicesAPI.getById(id).then((r) => r.data),
    });

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handleDownloadPDF = async () => {
        const element = document.getElementById('invoice-print');
        if (!element) return;

        setIsGeneratingPDF(true);
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('invoice-print');
                    if (clonedElement) {
                        clonedElement.style.setProperty('background-color', '#ffffff', 'important');
                        clonedElement.style.setProperty('color', '#000000', 'important');
                        clonedElement.style.setProperty('box-shadow', 'none', 'important');
                        clonedElement.style.setProperty('border', 'none', 'important');

                        // Force all children text to black and backgrounds transparent
                        const allElements = clonedElement.querySelectorAll('*');
                        allElements.forEach(el => {
                            el.style.setProperty('color', '#000000', 'important');
                            if (!el.classList.contains('bg-f3f4f6')) { // Keep some contrast if needed, but mostly transparent
                                el.style.setProperty('background-color', 'transparent', 'important');
                            }
                            el.style.setProperty('border-color', '#dddddd', 'important');
                        });

                        // Specifically target table headers for some gray background as before
                        const tableHeaders = clonedElement.querySelectorAll('thead tr');
                        tableHeaders.forEach(el => {
                            el.style.setProperty('background-color', '#f3f4f6', 'important');
                        });
                    }
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 20; // 10mm margins
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 10; // Top margin

            pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= (pageHeight - 20);

            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= (pageHeight - 20);
            }

            pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
            toast.success('PDF generated successfully');
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="text-center py-12">
                <p className="text-dark-400">Invoice not found</p>
            </div>
        );
    }

    const job = invoice.jobCard;
    const balance = Math.round((invoice.total - invoice.paidAmount) * 100) / 100;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header - Hidden in Print */}
            <div className="flex items-center gap-4 no-print">
                <Link to="/invoices" className="btn-ghost btn-icon">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="page-title">{invoice.invoiceNumber}</h1>
                        <span className={`badge ${getStatusColor(invoice.status)}`}>
                            {getStatusLabel(invoice.status)}
                        </span>
                    </div>
                    <p className="page-subtitle">Job: {job?.jobNumber}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className="btn-secondary"
                    >
                        {isGeneratingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                        PDF
                    </button>
                    <button onClick={() => window.print()} className="btn-secondary">
                        <Printer className="w-5 h-5" />
                        Print
                    </button>
                    {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                        <button onClick={() => setShowPayment(true)} className="btn-success">
                            <DollarSign className="w-5 h-5" />
                            Add Payment
                        </button>
                    )}
                </div>
            </div>

            {/* Invoice Card - This is what gets printed */}
            <div id="invoice-print" className="card p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-dark-700/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Ramboo Engineering</h2>
                        <p className="text-dark-400 mt-1">Workshop Management</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-dark-400">Invoice Number</p>
                        <p className="text-xl font-bold text-white">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-dark-400 mt-2">Date: {formatDate(invoice.createdAt)}</p>
                    </div>
                </div>

                {/* Customer & Vehicle */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-sm font-semibold text-dark-400 uppercase mb-3">Bill To</h3>
                        <p className="text-lg font-semibold text-white">{job?.customer?.name}</p>
                        {job?.customer?.phone && (
                            <p className="text-dark-300 flex items-center gap-2 mt-1">
                                <Phone className="w-4 h-4" />
                                {job.customer.phone}
                            </p>
                        )}
                        {job?.customer?.address && (
                            <p className="text-dark-400 mt-2">{job.customer.address}</p>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-dark-400 uppercase mb-3">Vehicle</h3>
                        <p className="text-lg font-semibold text-white">{job?.vehicle?.vehicleNo}</p>
                        <p className="text-dark-300">
                            {[job?.vehicle?.make, job?.vehicle?.model, job?.vehicle?.color].filter(Boolean).join(' • ')}
                        </p>
                        {job?.odometer && (
                            <p className="text-dark-400 mt-1">Odometer: {job.odometer.toLocaleString()} km</p>
                        )}
                    </div>
                </div>

                {/* Services */}
                {job?.jobServices?.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-dark-400 uppercase mb-3">Services</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th className="text-center">Qty</th>
                                        <th className="text-right">Price</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {job.jobServices.map((js) => (
                                        <tr key={js.id}>
                                            <td className="text-white">{js.service?.name}</td>
                                            <td className="text-center">{js.quantity}</td>
                                            <td className="text-right font-mono">{formatCurrency(js.unitPrice)}</td>
                                            <td className="text-right font-mono text-white">{formatCurrency(js.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Parts */}
                {job?.jobParts?.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-dark-400 uppercase mb-3">Parts</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th className="text-center">Qty</th>
                                        <th className="text-right">Price</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {job.jobParts.map((jp) => (
                                        <tr key={jp.id}>
                                            <td className="text-white">{jp.inventoryItem?.name}</td>
                                            <td className="text-center">{jp.quantity}</td>
                                            <td className="text-right font-mono">{formatCurrency(jp.unitPrice)}</td>
                                            <td className="text-right font-mono text-white">{formatCurrency(jp.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Manual Entries */}
                {job?.jobManualEntries?.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-dark-400 uppercase mb-3">Labor & Other</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Category</th>
                                        <th className="text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {job.jobManualEntries.map((me) => (
                                        <tr key={me.id}>
                                            <td className="text-white">{me.description}</td>
                                            <td className="capitalize text-dark-400">{me.category}</td>
                                            <td className="text-right font-mono text-white">
                                                {formatCurrency(me.actualCost || me.estimatedCost)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Totals */}
                <div className="border-t border-dark-700/50 pt-6">
                    <div className="flex justify-end">
                        <div className="w-72 space-y-2">
                            <div className="flex justify-between text-dark-300">
                                <span>Subtotal</span>
                                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            {invoice.taxAmount > 0 && (
                                <div className="flex justify-between text-dark-300">
                                    <span>Tax ({invoice.taxRate}%)</span>
                                    <span className="font-mono">{formatCurrency(invoice.taxAmount)}</span>
                                </div>
                            )}
                            {invoice.discount > 0 && (
                                <div className="flex justify-between text-red-400">
                                    <span>Discount</span>
                                    <span className="font-mono">-{formatCurrency(invoice.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-dark-700/50">
                                <span>Total</span>
                                <span className="font-mono">{formatCurrency(invoice.total)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400">
                                <span>Paid</span>
                                <span className="font-mono">{formatCurrency(invoice.paidAmount)}</span>
                            </div>
                            {balance > 0 && (
                                <div className="flex justify-between text-amber-400 font-semibold">
                                    <span>Balance Due</span>
                                    <span className="font-mono">{formatCurrency(balance)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payments */}
                {invoice.payments?.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-dark-700/50">
                        <h3 className="text-sm font-semibold text-dark-400 uppercase mb-3">Payment History</h3>
                        <div className="space-y-2">
                            {invoice.payments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-white capitalize">{payment.method}</p>
                                            <p className="text-xs text-dark-400">{formatDateTime(payment.createdAt)}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono text-emerald-400">{formatCurrency(payment.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPayment && (
                <PaymentModal
                    invoiceId={id}
                    balance={balance}
                    onClose={() => setShowPayment(false)}
                />
            )}
        </div>
    );
}

function PaymentModal({ invoiceId, balance, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        amount: balance.toFixed(2),
        method: 'cash',
        reference: '',
        notes: '',
    });

    const mutation = useMutation({
        mutationFn: (data) => invoicesAPI.addPayment(invoiceId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['invoice', invoiceId]);
            toast.success('Payment recorded');
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to record payment');
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
                    <h3 className="text-lg font-semibold text-white">Record Payment</h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        <div className="p-4 bg-dark-800/50 rounded-xl">
                            <div className="flex justify-between">
                                <span className="text-dark-400">Balance Due</span>
                                <span className="text-lg font-bold text-amber-400">{formatCurrency(balance)}</span>
                            </div>
                        </div>

                        <div>
                            <label className="label">Payment Method</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'cash', label: 'Cash', icon: Banknote },
                                    { value: 'card', label: 'Card', icon: CreditCard },
                                ].map((method) => (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, method: method.value })}
                                        className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.method === method.value
                                            ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                            : 'border-dark-600 text-dark-300 hover:border-dark-500'
                                            }`}
                                    >
                                        <method.icon className="w-5 h-5" />
                                        {method.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="label">Amount *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={balance}
                                className="input text-xl"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Reference</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Transaction ID, cheque number, etc."
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
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
                        <button type="submit" disabled={mutation.isPending} className="btn-success">
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
