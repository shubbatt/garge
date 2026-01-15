export const formatCurrency = (amount, currency = 'MVR') => {
    // MVR is not natively supported by Intl, so we format manually
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount || 0);
    return `MVR ${formatted}`;
};

export const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
};

export const formatDate = (date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(date));
};

export const formatDateTime = (date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
};

export const formatTime = (date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
};

export const getStatusColor = (status) => {
    const colors = {
        pending: 'status-pending',
        in_progress: 'status-in_progress',
        quality_check: 'status-quality_check',
        ready: 'status-ready',
        invoiced: 'status-invoiced',
        paid: 'status-paid',
        completed: 'badge-success',
        refunded: 'badge-danger',
        cancelled: 'badge-danger',
        partial: 'badge-warning',
    };
    return colors[status] || 'badge-secondary';
};

export const getStatusLabel = (status) => {
    const labels = {
        pending: 'Pending',
        in_progress: 'In Progress',
        quality_check: 'Quality Check',
        ready: 'Ready',
        invoiced: 'Invoiced',
        paid: 'Paid',
        completed: 'Completed',
        refunded: 'Refunded',
        cancelled: 'Cancelled',
        partial: 'Partial Payment',
    };
    return labels[status] || status;
};

export const classNames = (...classes) => {
    return classes.filter(Boolean).join(' ');
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
