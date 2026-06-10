
import React, { useState, useEffect } from 'react';
import { Shield, GraduationCap, School, Trash2, Edit2, Plus, Search, X, Check } from 'lucide-react';

interface User {
    id: number;
    name: string;
    role: string;
    email: string;
    status: string;
}

const AdminUserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>(() => {
        const storedUsers = localStorage.getItem('motlatsi_admin_users');
        if (storedUsers) {
            return JSON.parse(storedUsers);
        }
        // Default seed
        const initial = [
            { id: 1, name: 'Mme Lerato', role: 'Teacher', email: 'lerato@school.ls', status: 'Active' },
            { id: 2, name: 'Ntate Thabo', role: 'Teacher', email: 'thabo@school.ls', status: 'Active' },
            { id: 3, name: 'Khotso', role: 'Student', email: 'khotso@student.ls', status: 'Active' }
        ];
        localStorage.setItem('motlatsi_admin_users', JSON.stringify(initial));
        return initial;
    });
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [editUser, setEditUser] = useState<User | null>(null);

    // Removed useEffect that was doing synchronous setState

    const handleDelete = (id: number) => {
        if(confirm('Are you sure?')) {
            const updated = users.filter(u => u.id !== id);
            setUsers(updated);
            localStorage.setItem('motlatsi_admin_users', JSON.stringify(updated));
        }
    };

    const handleSaveEdit = () => {
        if (editUser) {
            const updated = users.map(u => u.id === editUser.id ? editUser : u);
            setUsers(updated);
            localStorage.setItem('motlatsi_admin_users', JSON.stringify(updated));
            setEditUser(null);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = filterRole === 'All' || u.role === filterRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage access and roles</p>
                </div>
                <div className="flex gap-2">
                    <select 
                        className="bg-white border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teacherBlue"
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                    >
                        <option>All</option>
                        <option>Teacher</option>
                        <option>Student</option>
                        <option>Admin</option>
                    </select>
                    <button className="bg-teacherBlue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <Plus size={16} /> Add User
                    </button>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search users..." 
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teacherBlue"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300">
                            <tr>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">Role</th>
                                <th className="p-4 font-medium">Email</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                    <td className="p-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                            user.role === 'Admin' ? 'bg-purple-500' : user.role === 'Teacher' ? 'bg-teacherBlue' : 'bg-growthGreen'
                                        }`}>
                                            {user.role === 'Admin' ? <Shield size={14} /> : user.role === 'Teacher' ? <School size={14} /> : <GraduationCap size={14} />}
                                        </div>
                                        {user.name}
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300">{user.role}</td>
                                    <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{user.email}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button onClick={() => setEditUser(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(user.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Edit User</h3>
                            <button onClick={() => setEditUser(null)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Name</label>
                                <input className="w-full p-2 border rounded" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                <input className="w-full p-2 border rounded" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Role</label>
                                <select className="w-full p-2 border rounded" value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value})}>
                                    <option>Student</option>
                                    <option>Teacher</option>
                                    <option>Admin</option>
                                </select>
                            </div>
                            <button onClick={handleSaveEdit} className="w-full bg-teacherBlue text-white py-2 rounded-lg font-bold mt-2">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserManagement;
