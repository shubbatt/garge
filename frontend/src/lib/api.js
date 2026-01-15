import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// Auth APIs
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    me: () => api.get('/auth/me'),
    changePassword: (currentPassword, newPassword) =>
        api.put('/auth/change-password', { currentPassword, newPassword }),
};

// Dashboard API
export const dashboardAPI = {
    get: () => api.get('/dashboard'),
};

// Inventory APIs
export const inventoryAPI = {
    getAll: (params) => api.get('/inventory', { params }),
    getById: (id) => api.get(`/inventory/${id}`),
    getByBarcode: (barcode) => api.get(`/inventory/barcode/${barcode}`),
    getLowStock: () => api.get('/inventory/low-stock'),
    create: (data) => api.post('/inventory', data),
    update: (id, data) => api.put(`/inventory/${id}`, data),
    addStock: (id, data) => api.post(`/inventory/${id}/add-stock`, data),
    adjustStock: (id, data) => api.post(`/inventory/${id}/adjust-stock`, data),
    delete: (id) => api.delete(`/inventory/${id}`),
};

// Categories API
export const categoriesAPI = {
    getAll: () => api.get('/categories'),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

// Customers API
export const customersAPI = {
    getAll: (params) => api.get('/customers', { params }),
    getById: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
};

// Vehicles API
export const vehiclesAPI = {
    getAll: (params) => api.get('/vehicles', { params }),
    search: (vehicleNo) => api.get(`/vehicles/search/${vehicleNo}`),
    getById: (id) => api.get(`/vehicles/${id}`),
    create: (data) => api.post('/vehicles', data),
    update: (id, data) => api.put(`/vehicles/${id}`, data),
    delete: (id) => api.delete(`/vehicles/${id}`),
};

// Services API
export const servicesAPI = {
    getAll: (params) => api.get('/services', { params }),
    getById: (id) => api.get(`/services/${id}`),
    create: (data) => api.post('/services', data),
    update: (id, data) => api.put(`/services/${id}`, data),
    delete: (id) => api.delete(`/services/${id}`),
};

// Service Categories API
export const serviceCategoriesAPI = {
    getAll: () => api.get('/service-categories'),
    create: (data) => api.post('/service-categories', data),
    update: (id, data) => api.put(`/service-categories/${id}`, data),
    delete: (id) => api.delete(`/service-categories/${id}`),
};

// Job Cards API
export const jobCardsAPI = {
    getAll: (params) => api.get('/job-cards', { params }),
    getStats: () => api.get('/job-cards/stats'),
    getById: (id) => api.get(`/job-cards/${id}`),
    create: (data) => api.post('/job-cards', data),
    update: (id, data) => api.put(`/job-cards/${id}`, data),
    updateStatus: (id, status) => api.patch(`/job-cards/${id}/status`, { status }),
    addService: (id, data) => api.post(`/job-cards/${id}/services`, data),
    removeService: (id, serviceId) => api.delete(`/job-cards/${id}/services/${serviceId}`),
    addPart: (id, data) => api.post(`/job-cards/${id}/parts`, data),
    removePart: (id, partId) => api.delete(`/job-cards/${id}/parts/${partId}`),
    addManualEntry: (id, data) => api.post(`/job-cards/${id}/manual-entries`, data),
    updateManualEntry: (id, entryId, data) => api.put(`/job-cards/${id}/manual-entries/${entryId}`, data),
    removeManualEntry: (id, entryId) => api.delete(`/job-cards/${id}/manual-entries/${entryId}`),
    delete: (id) => api.delete(`/job-cards/${id}`),
};

// POS API
export const posAPI = {
    getAll: (params) => api.get('/pos', { params }),
    getTodaySummary: () => api.get('/pos/today-summary'),
    getById: (id) => api.get(`/pos/${id}`),
    create: (data) => api.post('/pos', data),
    refund: (id) => api.post(`/pos/${id}/refund`),
};

// Invoices API
export const invoicesAPI = {
    getAll: (params) => api.get('/invoices', { params }),
    getById: (id) => api.get(`/invoices/${id}`),
    create: (data) => api.post('/invoices', data),
    addPayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
    cancel: (id) => api.post(`/invoices/${id}/cancel`),
};

// Daily Usage API
export const dailyUsageAPI = {
    getAll: (params) => api.get('/daily-usage', { params }),
    getTodaySummary: () => api.get('/daily-usage/today-summary'),
    create: (data) => api.post('/daily-usage', data),
    delete: (id) => api.delete(`/daily-usage/${id}`),
};

// Reports API
export const reportsAPI = {
    getSales: (params) => api.get('/reports/sales', { params }),
    getInventory: () => api.get('/reports/inventory'),
    getJobProfitability: (params) => api.get('/reports/job-profitability', { params }),
    getDailyUsage: (params) => api.get('/reports/daily-usage', { params }),
    getGST: (params) => api.get('/reports/gst', { params }),
};

// Settings API
export const settingsAPI = {
    getAll: () => api.get('/settings'),
    update: (key, value) => api.put(`/settings/${key}`, { value }),
    bulkUpdate: (settings) => api.post('/settings/bulk', { settings }),
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/auth/register', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
};
