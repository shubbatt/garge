import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Wrench, Mail, Lock, Loader2 } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function Login() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const loginMutation = useMutation({
        mutationFn: () => authAPI.login(formData.email, formData.password),
        onSuccess: (response) => {
            setAuth(response.data.user, response.data.token);
            toast.success(`Welcome back, ${response.data.user.name}!`);
            navigate('/');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Login failed');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        loginMutation.mutate();
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-glow-lg mb-4">
                        <Wrench className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Ramboo Engineering</h1>
                    <p className="text-dark-400 mt-2">Workshop Management System</p>
                </div>

                {/* Login Form */}
                <div className="card p-8">
                    <h2 className="text-xl font-semibold text-white mb-6 text-center">Sign in to your account</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="label">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                                <input
                                    type="email"
                                    className="input pl-12"
                                    placeholder="admin@ramboo.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                                <input
                                    type="password"
                                    className="input pl-12"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="btn-primary w-full py-3"
                        >
                            {loginMutation.isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 p-4 bg-dark-800/50 rounded-xl">
                        <p className="text-xs text-dark-400 text-center mb-2">Demo Credentials</p>
                        <p className="text-sm text-dark-300 text-center">
                            <span className="text-primary-400">admin@ramboo.com</span> / admin123
                        </p>
                    </div>
                </div>

                <p className="text-center text-dark-500 text-sm mt-6">
                    © {new Date().getFullYear()} Ramboo Engineering. All rights reserved.
                </p>
            </div>
        </div>
    );
}
