import React, { useState, useEffect, useCallback } from 'react';
import { Shield, UserX, UserCheck, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axios';

const AdminUsers = () => {
    const [users, setUsers]     = useState([]);
    const [total, setTotal]     = useState(0);
    const [page, setPage]       = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const PAGE_SIZE = 20;

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/admin/users?page=${page}&size=${PAGE_SIZE}`);
            setUsers(res.data.items);
            setTotal(res.data.total);
        } catch (err) {
            console.error('Kullanıcılar yüklenemedi:', err.message);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const toggleActive = async (user) => {
        setActionLoading(user.id);
        try {
            await axiosInstance.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
            await fetchUsers();
        } catch (err) {
            console.error('Güncelleme hatası:', err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const changeRole = async (user, role) => {
        setActionLoading(user.id);
        try {
            await axiosInstance.patch(`/admin/users/${user.id}`, { role });
            await fetchUsers();
        } catch (err) {
            console.error('Rol değiştirme hatası:', err.message);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex items-center gap-3 mb-8">
                <Shield className="w-7 h-7 text-app-burgundy" />
                <h1 className="text-2xl font-extrabold text-app-charcoal">Kullanıcı Yönetimi</h1>
                <span className="ml-auto text-sm text-app-charcoal opacity-50">{total} kullanıcı</span>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-app-charcoal opacity-40" />
                </div>
            ) : (
                <div className="bg-app-surface rounded-2xl border border-app-gray overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-app-bg border-b border-app-gray">
                            <tr>
                                {['Kullanıcı', 'Email', 'Rol', 'Durum', 'Kayıt', 'İşlem'].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 font-bold text-app-charcoal opacity-60 uppercase tracking-wider text-xs">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-gray">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-app-bg transition-colors">
                                    <td className="px-4 py-3 font-semibold text-app-charcoal">{u.username}</td>
                                    <td className="px-4 py-3 text-app-charcoal opacity-60 text-xs">{u.email}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={u.role}
                                            disabled={actionLoading === u.id}
                                            onChange={(e) => changeRole(u, e.target.value)}
                                            className="text-xs font-bold px-2 py-1 rounded-lg border border-app-gray bg-app-bg text-app-charcoal cursor-pointer"
                                        >
                                            <option value="user">Kullanıcı</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                                            u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                        }`}>
                                            {u.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-app-charcoal opacity-50 text-xs">
                                        {new Date(u.created_at).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => toggleActive(u)}
                                            disabled={actionLoading === u.id}
                                            className={`p-1.5 rounded-lg transition-colors ${
                                                u.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-600'
                                            }`}
                                            title={u.is_active ? 'Devre dışı bırak' : 'Aktif et'}
                                        >
                                            {actionLoading === u.id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />
                                            }
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between items-center px-4 py-3 border-t border-app-gray">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="flex items-center gap-1 text-sm text-app-charcoal opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
                        >
                            <ChevronLeft className="w-4 h-4" /> Önceki
                        </button>
                        <span className="text-xs text-app-charcoal opacity-40">
                            Sayfa {page} / {Math.ceil(total / PAGE_SIZE) || 1}
                        </span>
                        <button
                            disabled={page * PAGE_SIZE >= total}
                            onClick={() => setPage((p) => p + 1)}
                            className="flex items-center gap-1 text-sm text-app-charcoal opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
                        >
                            Sonraki <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
