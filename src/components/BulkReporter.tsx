import React from 'react';
import { AppView } from '../types';
import { ArrowLeft, Calendar, FileText, Download, Filter } from 'lucide-react';

interface BulkReporterProps {
  onNavigate: (view: AppView) => void;
}

export default function BulkReporter({ onNavigate }: BulkReporterProps) {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900 overflow-y-auto">
      {/* Header */}
      <header className="shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('bulk-planner-dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Reports</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Track progress and coverage</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        
        {/* Filter Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                    <Filter size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Generate Report</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select parameters for your report.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                    <div className="relative">
                        <input 
                            type="date"
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                    <div className="relative">
                        <input 
                            type="date"
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2">
                <FileText size={20} />
                Generate Report
            </button>
        </div>

        {/* Placeholder Results */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-700">
            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 min-h-[200px]">
                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                    <FileText size={32} className="opacity-20" />
                </div>
                <p className="text-sm italic">No reports generated yet.</p>
            </div>
        </div>

      </main>
    </div>
  );
}
