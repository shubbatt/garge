import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ShoppingCart,
    Search,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    Receipt,
    X,
    Loader2,
    Barcode,
    History,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryAPI, posAPI, settingsAPI } from '../lib/api';
import { usePOSStore, useAuthStore } from '../lib/store';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';

export default function POS() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const { cart, addToCart, updateQuantity, updateDiscount, removeFromCart, clearCart, getSubtotal } = usePOSStore();
    const [search, setSearch] = useState('');
    const [barcode, setBarcode] = useState('');
    const [showCheckout, setShowCheckout] = useState(false);
    const [lastSale, setLastSale] = useState(null);

    const { data: items } = useQuery({
        queryKey: ['inventory-pos', search],
        queryFn: () => inventoryAPI.getAll({ search, active: true }).then((r) => r.data),
        enabled: search.length >= 2,
    });

    const { data: todaySummary } = useQuery({
        queryKey: ['pos-today'],
        queryFn: () => posAPI.getTodaySummary().then((r) => r.data),
    });

    // Fetch settings to get tax rate
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsAPI.getAll().then((r) => r.data),
    });

    const barcodeMutation = useMutation({
        mutationFn: (code) => inventoryAPI.getByBarcode(code),
        onSuccess: (response) => {
            addToCart(response.data);
            setBarcode('');
            toast.success(`Added ${response.data.name}`);
        },
        onError: () => {
            toast.error('Item not found');
            setBarcode('');
        },
    });

    const handleBarcodeSubmit = (e) => {
        e.preventDefault();
        if (barcode.trim()) {
            barcodeMutation.mutate(barcode.trim());
        }
    };

    const subtotal = getSubtotal();
    // Get tax rate from settings, default to 5 if not set
    const taxRate = parseFloat(settings?.tax_rate) || 5;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    return (
        <div className="h-[calc(100vh-7rem)] flex gap-6">
            {/* Left Panel - Products */}
            <div className="flex-1 flex flex-col min-w-0 no-print">
                {/* Today's Summary */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-white">{formatCurrency(todaySummary?.totalSales || 0)}</p>
                        <p className="text-xs text-dark-400">Today's Sales</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-white">{todaySummary?.totalTransactions || 0}</p>
                        <p className="text-xs text-dark-400">Transactions</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(todaySummary?.cashSales || 0)}</p>
                        <p className="text-xs text-dark-400">Cash</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-primary-400">{formatCurrency(todaySummary?.cardSales || 0)}</p>
                        <p className="text-xs text-dark-400">Card</p>
                    </div>
                </div>

                {/* Search & Barcode */}
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="input pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                        <input
                            type="text"
                            placeholder="Scan barcode..."
                            className="input pl-10"
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                        />
                    </form>
                    <Link to="/pos/history" className="btn-secondary whitespace-nowrap">
                        <History className="w-5 h-5" />
                        Sales History
                    </Link>
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-y-auto">
                    {items?.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (item.currentStock > 0) {
                                            addToCart(item);
                                            toast.success(`Added ${item.name}`);
                                        } else {
                                            toast.error('Out of stock');
                                        }
                                    }}
                                    disabled={item.currentStock === 0}
                                    className={`card-hover p-4 text-left ${item.currentStock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <p className="font-medium text-white truncate">{item.name}</p>
                                    <p className="text-xs text-dark-400 mt-1">{item.sku}</p>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-lg font-bold text-primary-400">{formatCurrency(item.sellingPrice)}</span>
                                        <span className={`text-xs ${item.currentStock <= item.reorderLevel ? 'text-red-400' : 'text-dark-400'}`}>
                                            {item.currentStock} left
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : search.length >= 2 ? (
                        <div className="flex items-center justify-center h-full text-dark-400">
                            No products found
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-dark-400">
                            Search for products or scan a barcode
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Cart */}
            <div className="w-96 flex flex-col card no-print">
                <div className="p-4 border-b border-dark-700/50">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Cart ({cart.length})
                        </h2>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-300">
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <p className="text-dark-400 text-center py-8">Cart is empty</p>
                    ) : (
                        cart.map((item, index) => (
                            <div key={index} className="bg-dark-800/50 rounded-xl p-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">{item.name}</p>
                                        <p className="text-sm text-dark-400">{formatCurrency(item.unitPrice)} each</p>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(index)}
                                        className="text-red-400 hover:text-red-300 p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateQuantity(index, item.quantity - 1)}
                                            className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="w-10 text-center text-white font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(index, item.quantity + 1)}
                                            disabled={item.quantity >= item.maxStock}
                                            className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <span className="font-semibold text-white">
                                        {formatCurrency(item.quantity * item.unitPrice - item.discount)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Total */}
                <div className="p-4 border-t border-dark-700/50 space-y-2">
                    <div className="flex justify-between text-sm text-dark-300">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-dark-300">
                        <span>Tax ({taxRate}%)</span>
                        <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-dark-700/50">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                    </div>
                </div>

                {/* Checkout Button */}
                <div className="p-4 border-t border-dark-700/50">
                    <button
                        onClick={() => setShowCheckout(true)}
                        disabled={cart.length === 0}
                        className="btn-primary w-full py-4 text-lg"
                    >
                        <Receipt className="w-5 h-5" />
                        Checkout
                    </button>
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <CheckoutModal
                    cart={cart}
                    subtotal={subtotal}
                    taxRate={taxRate}
                    taxAmount={taxAmount}
                    total={total}
                    onClose={() => setShowCheckout(false)}
                    onComplete={(saleData) => {
                        clearCart();
                        setShowCheckout(false);
                        setLastSale(saleData);
                        queryClient.invalidateQueries(['pos-today']);
                        // Trigger print after state update
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    }}
                />
            )}

            {/* Receipt - Hidden Screen, Visible Print */}
            {lastSale && (
                <div id="pos-receipt" className="print-only">
                    <div className="receipt-container">
                        <div className="receipt-header">
                            <h1>Ramboo Engineering</h1>
                            <p>Workshop Management</p>
                            <div className="receipt-divider" />
                        </div>

                        <div className="receipt-info">
                            <p><span>Receipt #:</span> {lastSale.saleNumber}</p>
                            <p><span>Date:</span> {formatDateTime(lastSale.createdAt)}</p>
                            <p><span>Cashier:</span> {lastSale.user?.name}</p>
                        </div>

                        <div className="receipt-divider" />

                        <table className="receipt-table">
                            <thead>
                                <tr>
                                    <th className="text-left">Item</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastSale.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="text-left">
                                            {item.inventoryItem?.name}
                                            <br />
                                            <small>{formatCurrency(item.unitPrice)} each</small>
                                        </td>
                                        <td className="text-center">{item.quantity}</td>
                                        <td className="text-right">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="receipt-divider" />

                        <div className="receipt-totals">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{formatCurrency(lastSale.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax ({lastSale.taxRate}%)</span>
                                <span>{formatCurrency(lastSale.taxAmount)}</span>
                            </div>
                            {lastSale.discount > 0 && (
                                <div className="flex justify-between">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(lastSale.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-black">
                                <span>Total</span>
                                <span>{formatCurrency(lastSale.total)}</span>
                            </div>
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-footer">
                            <p className="font-bold">Payment Method: {lastSale.paymentMethod?.toUpperCase()}</p>
                            <p>Amount Paid: {formatCurrency(lastSale.paidAmount)}</p>
                            {lastSale.paymentMethod === 'cash' && (
                                <p>Change: {formatCurrency(lastSale.change)}</p>
                            )}
                            <div className="receipt-divider my-4" />
                            <p>Thank you for your business!</p>
                            <p>Please keep this receipt for your records.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CheckoutModal({ cart, subtotal, taxRate, taxAmount, total, onClose, onComplete }) {
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paidAmount, setPaidAmount] = useState(total.toFixed(2));
    const [discount, setDiscount] = useState(0);

    const finalTotal = total - discount;
    const change = parseFloat(paidAmount || 0) - finalTotal;

    const mutation = useMutation({
        mutationFn: (data) => posAPI.create(data),
        onSuccess: (data) => {
            toast.success('Sale completed!');
            onComplete(data.data);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Sale failed');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate({
            items: cart.map((item) => ({
                inventoryItemId: item.inventoryItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
            })),
            paymentMethod,
            paidAmount: parseFloat(paidAmount),
            discount,
            taxRate,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="text-lg font-semibold text-white">Complete Sale</h3>
                    <button onClick={onClose} className="btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body space-y-4">
                        {/* Summary */}
                        <div className="p-4 bg-dark-800/50 rounded-xl space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">Subtotal</span>
                                <span className="text-white">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">Tax ({taxRate}%)</span>
                                <span className="text-white">{formatCurrency(taxAmount)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-dark-400">Discount</span>
                                    <span className="text-red-400">-{formatCurrency(discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-dark-700/50">
                                <span className="text-white">Total</span>
                                <span className="text-primary-400">{formatCurrency(finalTotal)}</span>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="label">Payment Method</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'cash'
                                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                        : 'border-dark-600 text-dark-300 hover:border-dark-500'
                                        }`}
                                >
                                    <Banknote className="w-5 h-5" />
                                    Cash
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('card')}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card'
                                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                        : 'border-dark-600 text-dark-300 hover:border-dark-500'
                                        }`}
                                >
                                    <CreditCard className="w-5 h-5" />
                                    Card
                                </button>
                            </div>
                        </div>

                        {/* Discount */}
                        <div>
                            <label className="label">Discount</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="input"
                                value={discount}
                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                            />
                        </div>

                        {/* Amount Paid */}
                        <div>
                            <label className="label">Amount Paid</label>
                            <input
                                type="number"
                                step="0.01"
                                min={finalTotal}
                                className="input text-xl"
                                value={paidAmount}
                                onChange={(e) => setPaidAmount(e.target.value)}
                                required
                            />
                        </div>

                        {/* Quick Cash Buttons */}
                        {paymentMethod === 'cash' && (
                            <div className="grid grid-cols-4 gap-2">
                                {[50, 100, 200, 500].map((amount) => (
                                    <button
                                        key={amount}
                                        type="button"
                                        onClick={() => setPaidAmount(amount.toString())}
                                        className="btn-secondary py-2 text-sm"
                                    >
                                        {amount}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Change */}
                        {paymentMethod === 'cash' && change > 0 && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                <div className="flex justify-between">
                                    <span className="text-emerald-400">Change</span>
                                    <span className="text-2xl font-bold text-emerald-400">{formatCurrency(change)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending || parseFloat(paidAmount || 0) < finalTotal}
                            className="btn-success"
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Receipt className="w-4 h-4" />
                                    Complete Sale
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
