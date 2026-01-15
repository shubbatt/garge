import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useUIStore } from '../lib/store';
import {
    LayoutDashboard,
    Package,
    Users,
    Car,
    Wrench,
    ClipboardList,
    ShoppingCart,
    Droplets,
    FileText,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    History,
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Job Cards', href: '/job-cards', icon: ClipboardList },
    { name: 'Point of Sale', href: '/pos', icon: ShoppingCart },
    { name: 'Sales History', href: '/pos/history', icon: History },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Vehicles', href: '/vehicles', icon: Car },
    { name: 'Services', href: '/services', icon: Wrench },
    { name: 'Daily Usage', href: '/daily-usage', icon: Droplets },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout({ children }) {
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapse } = useUIStore();

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full bg-dark-900/95 backdrop-blur-xl border-r border-dark-700/50 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-dark-700/50">
                    {!sidebarCollapsed && (
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                <Wrench className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Ramboo</h1>
                                <p className="text-xs text-dark-400">Engineering</p>
                            </div>
                        </Link>
                    )}
                    {sidebarCollapsed && (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto">
                            <Wrench className="w-6 h-6 text-white" />
                        </div>
                    )}
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden p-2 rounded-lg hover:bg-dark-800 text-dark-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto h-[calc(100%-8rem)]">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href ||
                            (item.href !== '/' && location.pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500'
                                    : 'text-dark-300 hover:bg-dark-800/50 hover:text-white'
                                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                                title={sidebarCollapsed ? item.name : ''}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : ''}`} />
                                {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-dark-700/50">
                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white font-medium">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-dark-400 capitalize">{user?.role}</p>
                            </div>
                        )}
                        {!sidebarCollapsed && (
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-red-400 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Collapse toggle */}
                <button
                    onClick={toggleSidebarCollapse}
                    className="hidden lg:flex absolute top-20 -right-3 w-6 h-6 rounded-full bg-dark-800 border border-dark-600 items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                >
                    {sidebarCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>
            </aside>

            {/* Main content */}
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                {/* Top header */}
                <header className="sticky top-0 z-30 h-16 bg-dark-950/80 backdrop-blur-xl border-b border-dark-700/50">
                    <div className="flex items-center justify-between h-full px-4 lg:px-6">
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden p-2 rounded-lg hover:bg-dark-800 text-dark-300"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="flex-1" />

                        <div className="flex items-center gap-4">
                            <p className="text-sm text-dark-400">
                                {new Date().toLocaleDateString('en-GB', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
                    <div className="animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
