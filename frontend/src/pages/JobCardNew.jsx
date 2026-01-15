import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    Search,
    Car,
    Plus,
    Loader2,
    X,
} from 'lucide-react';
import { jobCardsAPI, customersAPI, vehiclesAPI, usersAPI } from '../lib/api';

export default function JobCardNew() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(searchParams.get('customerId') ? 2 : 1);
    const [vehicleSearch, setVehicleSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showNewVehicle, setShowNewVehicle] = useState(false);
    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [formData, setFormData] = useState({
        odometer: '',
        notes: '',
        assignedToId: '',
    });
    const [newVehicle, setNewVehicle] = useState({
        vehicleNo: '',
        make: '',
        model: '',
        color: '',
        year: '',
    });
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: '',
    });

    // Fetch customer if ID provided
    const preselectedCustomerId = searchParams.get('customerId');
    useQuery({
        queryKey: ['customer', preselectedCustomerId],
        queryFn: () => customersAPI.getById(preselectedCustomerId).then((r) => r.data),
        enabled: !!preselectedCustomerId,
        onSuccess: (data) => {
            setSelectedCustomer(data);
        },
    });

    // Search vehicles
    const { data: vehicles } = useQuery({
        queryKey: ['vehicles-search', vehicleSearch],
        queryFn: () => vehiclesAPI.search(vehicleSearch).then((r) => r.data),
        enabled: vehicleSearch.length >= 2,
    });

    // Search customers
    const { data: customers } = useQuery({
        queryKey: ['customers-search', customerSearch],
        queryFn: () => customersAPI.getAll({ search: customerSearch }).then((r) => r.data),
        enabled: customerSearch.length >= 2,
    });

    // Fetch users for technician assignment
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => usersAPI.getAll().then((r) => r.data),
    });

    // Create customer mutation
    const createCustomerMutation = useMutation({
        mutationFn: customersAPI.create,
        onSuccess: (response) => {
            setSelectedCustomer(response.data);
            setShowNewCustomer(false);
            toast.success('Customer created successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to create customer');
        },
    });

    // Create vehicle mutation
    const createVehicleMutation = useMutation({
        mutationFn: vehiclesAPI.create,
        onSuccess: (response) => {
            setSelectedVehicle(response.data);
            setShowNewVehicle(false);
            setStep(3);
            toast.success('Vehicle created successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to create vehicle');
        },
    });

    // Create job card mutation
    const createJobMutation = useMutation({
        mutationFn: jobCardsAPI.create,
        onSuccess: (response) => {
            toast.success('Job card created successfully');
            navigate(`/job-cards/${response.data.id}`);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to create job card');
        },
    });

    const handleSelectVehicle = (vehicle) => {
        setSelectedVehicle(vehicle);
        setSelectedCustomer(vehicle.customer);
        setStep(3);
    };

    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setStep(2);
    };

    const handleCreateCustomer = (e) => {
        e.preventDefault();
        createCustomerMutation.mutate(newCustomer);
    };

    const handleCreateVehicle = (e) => {
        e.preventDefault();
        createVehicleMutation.mutate({ ...newVehicle, customerId: selectedCustomer.id });
    };

    const handleCreateJob = () => {
        createJobMutation.mutate({
            customerId: selectedCustomer.id,
            vehicleId: selectedVehicle.id,
            odometer: formData.odometer ? parseInt(formData.odometer) : null,
            notes: formData.notes,
            assignedToId: formData.assignedToId || null,
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="btn-ghost btn-icon">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="page-title">New Job Card</h1>
                    <p className="page-subtitle">Vehicle Intake</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400'
                            }`}>
                            {s}
                        </div>
                        {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-primary-500' : 'bg-dark-700'}`} />}
                    </div>
                ))}
            </div>

            {/* Step 1: Find or Create Customer */}
            {step === 1 && (
                <div className="card p-6 space-y-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-white">Step 1: Customer</h2>

                    {!showNewCustomer ? (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                                <input
                                    type="text"
                                    placeholder="Search customer by name or phone..."
                                    className="input pl-10"
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {customers?.length > 0 && (
                                <div className="space-y-2">
                                    {customers.map((customer) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => handleSelectCustomer(customer)}
                                            className="w-full flex items-center gap-4 p-4 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-medium">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-white">{customer.name}</p>
                                                <p className="text-sm text-dark-400">{customer.phone}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setShowNewCustomer(true)}
                                className="btn-secondary w-full"
                            >
                                <Plus className="w-5 h-5" />
                                Create New Customer
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleCreateCustomer} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-white">New Customer</h3>
                                <button type="button" onClick={() => setShowNewCustomer(false)} className="btn-ghost btn-icon">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div>
                                <label className="label">Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={newCustomer.name}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Phone</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={newCustomer.phone}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    className="input"
                                    value={newCustomer.email}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                />
                            </div>
                            <button type="submit" disabled={createCustomerMutation.isPending} className="btn-primary w-full">
                                {createCustomerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Create Customer
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Step 2: Find or Create Vehicle */}
            {step === 2 && selectedCustomer && (
                <div className="card p-6 space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Step 2: Vehicle</h2>
                        <button onClick={() => setStep(1)} className="text-sm text-primary-400 hover:text-primary-300">
                            Change Customer
                        </button>
                    </div>

                    <div className="p-4 bg-dark-800/50 rounded-xl">
                        <p className="text-sm text-dark-400">Customer</p>
                        <p className="font-medium text-white">{selectedCustomer.name}</p>
                        <p className="text-sm text-dark-400">{selectedCustomer.phone}</p>
                    </div>

                    {!showNewVehicle ? (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                                <input
                                    type="text"
                                    placeholder="Search vehicle by number..."
                                    className="input pl-10"
                                    value={vehicleSearch}
                                    onChange={(e) => setVehicleSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {vehicles?.length > 0 && (
                                <div className="space-y-2">
                                    {vehicles.map((vehicle) => (
                                        <button
                                            key={vehicle.id}
                                            onClick={() => handleSelectVehicle(vehicle)}
                                            className="w-full flex items-center gap-4 p-4 bg-dark-800/50 rounded-xl hover:bg-dark-800 transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                                                <Car className="w-5 h-5 text-primary-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-white">{vehicle.vehicleNo}</p>
                                                <p className="text-sm text-dark-400">
                                                    {[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(' • ')}
                                                </p>
                                                <p className="text-xs text-dark-500">Owner: {vehicle.customer?.name}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setShowNewVehicle(true)}
                                className="btn-secondary w-full"
                            >
                                <Plus className="w-5 h-5" />
                                Add New Vehicle
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleCreateVehicle} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-white">New Vehicle</h3>
                                <button type="button" onClick={() => setShowNewVehicle(false)} className="btn-ghost btn-icon">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div>
                                <label className="label">Vehicle Number *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., A12345"
                                    value={newVehicle.vehicleNo}
                                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicleNo: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Make</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g., Toyota"
                                        value={newVehicle.make}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Model</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g., Camry"
                                        value={newVehicle.model}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Color</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g., White"
                                        value={newVehicle.color}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Year</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="e.g., 2020"
                                        value={newVehicle.year}
                                        onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={createVehicleMutation.isPending} className="btn-primary w-full">
                                {createVehicleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Add Vehicle
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Step 3: Job Details */}
            {step === 3 && selectedCustomer && selectedVehicle && (
                <div className="card p-6 space-y-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-white">Step 3: Job Details</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-dark-800/50 rounded-xl">
                            <p className="text-sm text-dark-400">Customer</p>
                            <p className="font-medium text-white">{selectedCustomer.name}</p>
                            <p className="text-sm text-dark-400">{selectedCustomer.phone}</p>
                        </div>
                        <div className="p-4 bg-dark-800/50 rounded-xl">
                            <p className="text-sm text-dark-400">Vehicle</p>
                            <p className="font-medium text-white">{selectedVehicle.vehicleNo}</p>
                            <p className="text-sm text-dark-400">
                                {[selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(' ')}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="label">Odometer Reading (km)</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="e.g., 75000"
                            value={formData.odometer}
                            onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">Notes / Complaints</label>
                        <textarea
                            className="input"
                            rows={3}
                            placeholder="Customer complaints, special instructions, etc."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">Assign Technician</label>
                        <select
                            className="select"
                            value={formData.assignedToId}
                            onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                        >
                            <option value="">Select Technician (Optional)</option>
                            {users?.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(2)} className="btn-secondary flex-1">
                            Back
                        </button>
                        <button
                            onClick={handleCreateJob}
                            disabled={createJobMutation.isPending}
                            className="btn-primary flex-1"
                        >
                            {createJobMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Job Card'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
