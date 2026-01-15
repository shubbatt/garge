import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Settings as SettingsIcon,
    Building2,
    DollarSign,
    Save,
    Loader2,
    Receipt,
} from 'lucide-react';
import { settingsAPI } from '../lib/api';

export default function Settings() {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState(null);

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsAPI.getAll().then((r) => r.data),
        onSuccess: (data) => {
            if (!formData) {
                setFormData(data);
            }
        },
    });

    // Initialize formData when settings load
    if (settings && !formData) {
        setFormData(settings);
    }

    const mutation = useMutation({
        mutationFn: (data) => settingsAPI.bulkUpdate(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['settings']);
            toast.success('Settings saved successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to save settings');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage system configuration</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Information */}
                <div className="card">
                    <div className="p-4 border-b border-dark-700/50 flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-primary-400" />
                        <h3 className="font-semibold text-white">Company Information</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="label">Company Name</label>
                            <input
                                type="text"
                                className="input"
                                value={formData?.company_name || ''}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">Address</label>
                            <textarea
                                className="input"
                                rows={2}
                                value={formData?.company_address || ''}
                                onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Phone</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={formData?.company_phone || ''}
                                    onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    className="input"
                                    value={formData?.company_email || ''}
                                    onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Settings */}
                <div className="card">
                    <div className="p-4 border-b border-dark-700/50 flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-semibold text-white">Financial Settings</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Default Tax Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    className="input"
                                    value={formData?.tax_rate || ''}
                                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Currency</label>
                                <select
                                    className="select"
                                    value={formData?.currency || 'MVR'}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                >
                                    <option value="MVR">MVR - Maldivian Rufiyaa</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="AED">AED - UAE Dirham</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">GBP - British Pound</option>
                                    <option value="SAR">SAR - Saudi Riyal</option>
                                    <option value="QAR">QAR - Qatari Riyal</option>
                                    <option value="KWD">KWD - Kuwaiti Dinar</option>
                                    <option value="BHD">BHD - Bahraini Dinar</option>
                                    <option value="OMR">OMR - Omani Rial</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="label">Currency Symbol</label>
                            <input
                                type="text"
                                className="input w-32"
                                value={formData?.currency_symbol || ''}
                                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* MIRA GST Settings */}
                <div className="card">
                    <div className="p-4 border-b border-dark-700/50 flex items-center gap-3">
                        <Receipt className="w-5 h-5 text-amber-400" />
                        <div>
                            <h3 className="font-semibold text-white">MIRA GST Registration</h3>
                            <p className="text-xs text-dark-400">For GST return filing (Form 205)</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="label">Business Name (as per GST Certificate)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Your registered business name"
                                value={formData?.business_name || ''}
                                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">GST TIN</label>
                                <input
                                    type="text"
                                    className="input font-mono"
                                    placeholder="e.g., 1234567GST101"
                                    value={formData?.gst_tin || ''}
                                    onChange={(e) => setFormData({ ...formData, gst_tin: e.target.value })}
                                />
                                <p className="text-xs text-dark-400 mt-1">Taxpayer Identification Number</p>
                            </div>
                            <div>
                                <label className="label">Taxable Activity Number</label>
                                <input
                                    type="text"
                                    className="input font-mono"
                                    placeholder="e.g., TAM-00001"
                                    value={formData?.taxable_activity_number || ''}
                                    onChange={(e) => setFormData({ ...formData, taxable_activity_number: e.target.value })}
                                />
                                <p className="text-xs text-dark-400 mt-1">As per GST Registration Certificate</p>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-sm text-amber-400">
                                💡 These details will appear on your GST reports for easy filing with MIRA.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="btn-primary"
                    >
                        {mutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
