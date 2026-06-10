import React from 'react';
import { AppView } from '../types';
import { CalendarDays, FileText, Plus, ChevronRight, ArrowLeft } from 'lucide-react';

interface BulkPlannerDashboardProps {
  onNavigate: (view: AppView) => void;
}

export default function BulkPlannerDashboard({ onNavigate }: BulkPlannerDashboardProps) {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900 overflow-y-auto">
      {/* Header */}
      <header className="shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Bulk Planner</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Manage your long-term curriculum</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full space-y-6">
        
        {/* Action Cards */}
        <div className="grid gap-4 md:grid-cols-2">
            {/* Create New Unit */}
            <button 
                onClick={() => onNavigate('bulk-unit-creator')}
                className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all group text-left"
            >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">New Bulk Unit</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Plan a complete unit of work with automated lesson plans and resources.
                </p>
            </button>

            {/* View Schedule */}
            <button 
                onClick={() => onNavigate('scheduler')}
                className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900 transition-all group text-left"
            >
                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                    <CalendarDays size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">View Schedule</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    See your integrated class schedule and make quick adjustments.
                </p>
            </button>

            {/* Reports */}
            <button 
                onClick={() => onNavigate('bulk-reporter')}
                className="flex flex-col items-start p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-900 transition-all group text-left md:col-span-2"
            >
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 mb-4 group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Progress Reports</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Generate detailed reports on curriculum coverage and student progress.
                </p>
            </button>
        </div>

        {/* Recent Units (Placeholder for now) */}
        <section>
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Plans</h3>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-700">
                <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm italic">
                    No recent plans found. Start by creating a new unit!
                </div>
            </div>
        </section>

      </main>
    </div>
  );
}
