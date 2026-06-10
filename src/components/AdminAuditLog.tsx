
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ShieldAlert, Clock, User, Database, ArrowRight, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LogEntry {
    id: number;
    table_name: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    actor_name: string;
    record_summary: string; // Simplified string from JSON
    timestamp: string;
    diff?: { old: any, new: any };
}

const AdminAuditLog: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('ALL');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(100);

            if (data && !error) {
                setLogs(data.map((log: any) => ({
                    id: log.id,
                    table_name: log.table_name,
                    action: log.action,
                    actor_name: log.changed_by_name || 'System', // Assuming join or denormalized name
                    record_summary: `${log.table_name} #${log.record_id}`,
                    timestamp: log.timestamp,
                    diff: { old: log.old_data, new: log.new_data }
                })));
            } else {
                // Mock Data for Demo if table doesn't exist yet
                generateMockLogs();
            }
        } catch (e) {
            generateMockLogs();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const generateMockLogs = () => {
        // Fallback data to demonstrate UI capabilities before DB migration
        const mockData: LogEntry[] = [
            { id: 104, table_name: 'profiles', action: 'UPDATE', actor_name: 'Principal L.', record_summary: 'Grade 10 Student: Thabo M.', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), diff: { old: { grade: 'F' }, new: { grade: 'C' } } },
            { id: 103, table_name: 'users', action: 'DELETE', actor_name: 'Admin System', record_summary: 'User ID: 8821', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
            { id: 102, table_name: 'assignments', action: 'INSERT', actor_name: 'Mrs. K.', record_summary: 'Homework: Math Alg.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
            { id: 101, table_name: 'profiles', action: 'UPDATE', actor_name: 'Principal L.', record_summary: 'Teacher: Mr. S.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), diff: { old: { role: 'Teacher' }, new: { role: 'Admin' } } },
        ];
        setLogs(mockData);
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.actor_name.toLowerCase().includes(search.toLowerCase()) || 
                              log.record_summary.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filterAction === 'ALL' || log.action === filterAction;
        return matchesSearch && matchesFilter;
    });

    const exportLogs = () => {
        const headers = ["ID", "Timestamp", "Actor", "Action", "Table", "Details"];
        const rows = filteredLogs.map(l => [l.id, l.timestamp, l.actor_name, l.action, l.table_name, l.record_summary]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "audit_logs.csv");
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-24 px-4 pt-4">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ShieldAlert className="text-teacherBlue" /> Audit & Compliance Logs
                    </h2>
                    <p className="text-sm text-gray-500">Immutable record of all critical data changes.</p>
                </div>
                <button 
                    onClick={exportLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
                >
                    <Download size={16} /> Export CSV
                </button>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by actor or record..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-teacherBlue outline-none text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['ALL', 'UPDATE', 'INSERT', 'DELETE'].map(action => (
                            <button
                                key={action}
                                onClick={() => setFilterAction(action)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${filterAction === action ? 'bg-teacherBlue text-white border-teacherBlue' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Log Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Actor</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Target</th>
                                <th className="p-4">Change Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="p-4 text-gray-500 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 font-medium text-gray-900">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                {log.actor_name.charAt(0)}
                                            </div>
                                            {log.actor_name}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                            log.action === 'DELETE' ? 'bg-red-50 text-red-600 border-red-100' :
                                            log.action === 'UPDATE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-green-50 text-green-600 border-green-100'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Database size={14} className="text-gray-400" />
                                            {log.record_summary}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {log.diff && log.diff.old && log.diff.new ? (
                                            <div className="flex items-center gap-2 text-xs">
                                                <code className="bg-red-50 text-red-600 px-1 py-0.5 rounded border border-red-100">{JSON.stringify(log.diff.old).substring(0, 20)}...</code>
                                                <ArrowRight size={12} className="text-gray-400" />
                                                <code className="bg-green-50 text-green-600 px-1 py-0.5 rounded border border-green-100">{JSON.stringify(log.diff.new).substring(0, 20)}...</code>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">System Record</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            No audit logs found matching criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAuditLog;
