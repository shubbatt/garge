import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search,
    Loader2,
    Receipt,
    Calendar,
    ArrowLeft,
    User,
    CreditCard,
    Banknote,
    Tag,
    Clock,
    Printer,
    RefreshCcw,
    X,
    ShoppingCart,
    FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { posAPI, invoicesAPI } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getStatusLabel } from '../lib/utils';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function SalesHistory() {
    const [activeTab, setActiveTab] = useState('pos');
    const [search, setSearch] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);

    const { data: posSales, isLoading: loadingPOS } = useQuery({
        queryKey: ['pos-sales', { search }],
        queryFn: () => posAPI.getAll({ search }).then(r => r.data),
        enabled: activeTab === 'pos'
    });

    const { data: invoices, isLoading: loadingInvoices } = useQuery({
        queryKey: ['invoices', { search }],
        queryFn: () => invoicesAPI.getAll({ search }).then(r => r.data),
        enabled: activeTab === 'invoices'
    });

    const isLoading = activeTab === 'pos' ? loadingPOS : loadingInvoices;

    return (
        <div className="space-y-6">
            <div className="page-header no-print">
                <div>
                    <h1 className="page-title">Sales History</h1>
                    <p className="page-subtitle">View and manage all your sales and service invoices</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 no-print">
                <button
                    onClick={() => { setActiveTab('pos'); setSearch(''); }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'pos'
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                        }`}
                >
                    <ShoppingCart className="w-4 h-4 inline mr-2" />
                    Store Sales (POS)
                </button>
                <button
                    onClick={() => { setActiveTab('invoices'); setSearch(''); }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'invoices'
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                        }`}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Service Invoices
                </button>
            </div>

            {/* Search */}
            <div className="card p-4 no-print">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                        type="text"
                        placeholder={activeTab === 'pos' ? "Search by sale # or customer..." : "Search by invoice #, job, or customer..."}
                        className="input pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32 no-print">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            ) : activeTab === 'pos' ? (
                /* POS Table Logic */
                posSales?.length === 0 ? (
                    <div className="card flex flex-col items-center justify-center py-12 text-center no-print">
                        <Receipt className="w-12 h-12 text-dark-500 mb-4" />
                        <p className="text-dark-400">No POS sales found</p>
                    </div>
                ) : (
                    <div className="card no-print">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Sale #</th>
                                        <th>Customer</th>
                                        <th>Date & Time</th>
                                        <th className="text-right">Items</th>
                                        <th className="text-right">Total</th>
                                        <th>Method</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {posSales?.map((sale) => (
                                        <tr key={sale.id}>
                                            <td className="font-mono text-primary-400">{sale.saleNumber}</td>
                                            <td className="text-white">{sale.customer?.name || 'Walk-in'}</td>
                                            <td className="text-dark-300">{formatDateTime(sale.createdAt)}</td>
                                            <td className="text-right text-dark-400">{sale._count?.items || 0} items</td>
                                            <td className="text-right font-bold text-white">{formatCurrency(sale.total)}</td>
                                            <td>
                                                <div className="flex items-center gap-2 text-dark-300">
                                                    {sale.paymentMethod === 'cash' ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                                                    <span className="capitalize">{sale.paymentMethod}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getStatusColor(sale.status)}`}>
                                                    {getStatusLabel(sale.status)}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => setSelectedSale(sale)}
                                                    className="btn-ghost btn-sm text-primary-400"
                                                >
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                /* Invoices Table Logic */
                invoices?.length === 0 ? (
                    <div className="card flex flex-col items-center justify-center py-12 text-center no-print">
                        <FileText className="w-12 h-12 text-dark-500 mb-4" />
                        <p className="text-dark-400">No invoices found</p>
                    </div>
                ) : (
                    <div className="card no-print">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Job #</th>
                                        <th>Customer</th>
                                        <th>Vehicle</th>
                                        <th className="text-right">Total</th>
                                        <th className="text-right">Paid</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices?.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td>
                                                <Link to={`/invoices/${invoice.id}`} className="text-primary-400 hover:text-primary-300 font-medium">
                                                    {invoice.invoiceNumber}
                                                </Link>
                                            </td>
                                            <td>
                                                <Link to={`/job-cards/${invoice.jobCard?.id}`} className="text-dark-200 hover:text-white">
                                                    {invoice.jobCard?.jobNumber}
                                                </Link>
                                            </td>
                                            <td className="text-dark-200">{invoice.jobCard?.customer?.name}</td>
                                            <td className="text-dark-400">{invoice.jobCard?.vehicle?.vehicleNo}</td>
                                            <td className="text-right font-mono text-white">{formatCurrency(invoice.total)}</td>
                                            <td className="text-right font-mono text-emerald-400">{formatCurrency(invoice.paidAmount)}</td>
                                            <td>
                                                <span className={`badge ${getStatusColor(invoice.status)}`}>
                                                    {getStatusLabel(invoice.status)}
                                                </span>
                                            </td>
                                            <td className="text-dark-400">{formatDate(invoice.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* Detail Modal */}
            {selectedSale && (
                <SaleDetailModal
                    saleId={selectedSale.id}
                    onClose={() => setSelectedSale(null)}
                />
            )}
        </div>
    );
}

function SaleDetailModal({ saleId, onClose }) {
    const queryClient = useQueryClient();
    const { data: sale, isLoading } = useQuery({
        queryKey: ['pos-sale', saleId],
        queryFn: () => posAPI.getById(saleId).then(r => r.data)
    });

    const refundMutation = useMutation({
        mutationFn: () => posAPI.refund(saleId),
        onSuccess: () => {
            toast.success('Sale refunded successfully');
            queryClient.invalidateQueries(['pos-sales']);
            queryClient.invalidateQueries(['pos-sale', saleId]);
            onClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || 'Refund failed');
        }
    });

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handleDownloadPDF = async () => {
        const element = document.getElementById('pos-receipt');
        if (!element) return;

        setIsGeneratingPDF(true);
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('pos-receipt');
                    if (clonedElement) {
                        clonedElement.style.setProperty('opacity', '1', 'important');
                        clonedElement.style.setProperty('visibility', 'visible', 'important');
                        clonedElement.style.setProperty('height', 'auto', 'important');
                        clonedElement.style.setProperty('overflow', 'visible', 'important');
                        clonedElement.style.setProperty('background-color', '#ffffff', 'important');
                        clonedElement.style.setProperty('color', '#000000', 'important');
                        clonedElement.style.setProperty('position', 'relative', 'important');
                        clonedElement.style.setProperty('left', '0', 'important');
                        clonedElement.style.setProperty('top', '0', 'important');

                        // Force all children text to black and backgrounds transparent
                        const allElements = clonedElement.querySelectorAll('*');
                        allElements.forEach(el => {
                            el.style.setProperty('color', '#000000', 'important');
                            el.style.setProperty('background-color', 'transparent', 'important');
                            el.style.setProperty('border-color', '#000000', 'important');
                        });
                    }
                }
            });

            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                throw new Error('Canvas capture failed - empty dimensions');
            }

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            console.log('Generated PDF Image Data Length:', imgData.length);

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const imgWidth = 80;

            // Safer dimension calculation
            const imgHeight = Math.floor((canvas.height * imgWidth) / canvas.width);
            const xPos = (pageWidth - imgWidth) / 2;

            if (isNaN(imgHeight) || imgHeight <= 0) {
                throw new Error('Invalid receipt height calculated');
            }

            pdf.addImage(imgData, 'JPEG', xPos, 10, imgWidth, imgHeight);
            pdf.save(`Receipt_${sale.saleNumber}.pdf`);
            toast.success('Receipt PDF generated');
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (isLoading) return null;

    return (
        <div className="modal-overlay no-print" onClick={onClose}>
            <div className="modal w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Sale {sale?.saleNumber}</h3>
                        <p className="text-sm text-dark-400">{formatDateTime(sale?.createdAt)}</p>
                    </div>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="modal-body space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-dark-800/50 rounded-xl">
                            <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Customer</p>
                            <div className="flex items-center gap-2 text-white">
                                <User className="w-4 h-4 text-primary-400" />
                                <span className="font-medium">{sale?.customer?.name || 'Walk-in'}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-dark-800/50 rounded-xl">
                            <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Payment</p>
                            <div className="flex items-center gap-2 text-white">
                                {sale?.paymentMethod === 'cash' ? <Banknote className="w-4 h-4 text-emerald-400" /> : <CreditCard className="w-4 h-4 text-primary-400" />}
                                <span className="font-medium capitalize">{sale?.paymentMethod}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-dark-800/50 rounded-xl">
                            <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Status</p>
                            <span className={`badge ${getStatusColor(sale?.status)}`}>
                                {getStatusLabel(sale?.status)}
                            </span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="table-container border border-dark-700/50 overflow-hidden">
                        <table className="table">
                            <thead className="bg-dark-800/50">
                                <tr>
                                    <th>Item</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale?.items?.map((item) => (
                                    <tr key={item.id}>
                                        <td className="text-white">
                                            {item.inventoryItem?.name}
                                            <br />
                                            <span className="text-xs text-dark-400 font-mono">{item.inventoryItem?.sku}</span>
                                        </td>
                                        <td className="text-center text-dark-300">{item.quantity}</td>
                                        <td className="text-right text-dark-400">{formatCurrency(item.unitPrice)}</td>
                                        <td className="text-right font-medium text-white">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">Subtotal</span>
                                <span className="text-white">{formatCurrency(sale?.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">Tax ({sale?.taxRate}%)</span>
                                <span className="text-white">{formatCurrency(sale?.taxAmount)}</span>
                            </div>
                            {sale?.discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-dark-400">Discount</span>
                                    <span className="text-red-400">-{formatCurrency(sale?.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-dark-700/50">
                                <span>Total</span>
                                <span className="text-primary-400">{formatCurrency(sale?.total)}</span>
                            </div>
                            <div className="pt-2 text-xs text-dark-400 space-y-1">
                                <div className="flex justify-between">
                                    <span>Paid:</span>
                                    <span>{formatCurrency(sale?.paidAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Change:</span>
                                    <span>{formatCurrency(sale?.change)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer flex justify-between">
                    <div className="flex gap-3">
                        {sale?.status === 'completed' && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to refund this sale? Items will be returned to stock.')) {
                                        refundMutation.mutate();
                                    }
                                }}
                                disabled={refundMutation.isPending}
                                className="btn-secondary text-red-400 border-red-400/20 hover:bg-red-400/10"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Refund Sale
                            </button>
                        )}
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
                        <button onClick={() => { window.print(); }} className="btn-secondary">
                            <Printer className="w-5 h-5" />
                            Print Receipt
                        </button>
                        <button onClick={onClose} className="btn-primary">
                            Done
                        </button>
                    </div>
                </div>

                {/* Hidden Receipt for Printing */}
                <div id="pos-receipt" className="print-only">
                    <div className="receipt-container" style={{ padding: '20px', fontFamily: 'monospace' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <h1 style={{ fontSize: '20px', margin: '0' }}>Ramboo Engineering</h1>
                            <p style={{ margin: '5px 0' }}>Workshop Management</p>
                            <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                        </div>

                        <div style={{ fontSize: '12px', marginBottom: '15px' }}>
                            <p style={{ margin: '2px 0' }}>Receipt #: {sale?.saleNumber}</p>
                            <p style={{ margin: '2px 0' }}>Date: {formatDateTime(sale?.createdAt)}</p>
                            <p style={{ margin: '2px 0' }}>Cashier: {sale?.user?.name}</p>
                        </div>

                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #000' }}>
                                    <th style={{ textAlign: 'left', padding: '5px 0' }}>Item</th>
                                    <th style={{ textAlign: 'center', padding: '5px 0' }}>Qty</th>
                                    <th style={{ textAlign: 'right', padding: '5px 0' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale?.items?.map((item) => (
                                    <tr key={item.id}>
                                        <td style={{ padding: '5px 0' }}>{item.inventoryItem?.name}</td>
                                        <td style={{ textAlign: 'center', padding: '5px 0' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right', padding: '5px 0' }}>{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ borderTop: '1px dashed #000', marginTop: '15px', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span>Subtotal:</span>
                                <span>{formatCurrency(sale?.subtotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span>Tax ({sale?.taxRate}%):</span>
                                <span>{formatCurrency(sale?.taxAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', marginTop: '5px' }}>
                                <span>TOTAL:</span>
                                <span>{formatCurrency(sale?.total)}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px' }}>
                            <p>Thank you for your business!</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
