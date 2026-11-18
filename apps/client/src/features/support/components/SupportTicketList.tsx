import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Folder,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Lock,
  Headphones,
  Archive,
} from 'lucide-react';
import { SupportTicket } from '../services/support.service';

interface SupportTicketListProps {
  tickets: SupportTicket[];
  isLoading: boolean;
  onSelectTicket: (ticketId: string) => void;
  onCreateNew: () => void;
}

type StatusFilterType = 'ALL' | 'RESOLVED' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
type SortOrderType = 'LATEST' | 'OLDEST';

export const SupportTicketList: React.FC<SupportTicketListProps> = ({
  tickets,
  isLoading,
  onSelectTicket,
  onCreateNew,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrderType>('LATEST');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Dynamic status counters from live tickets (NO dummy data)
  const counts = useMemo(() => {
    return {
      all: tickets.length,
      resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
      open: tickets.filter((t) => t.status === 'OPEN').length,
      inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING_ON_CUSTOMER').length,
      closed: tickets.filter((t) => t.status === 'CLOSED').length,
    };
  }, [tickets]);

  // Filter & Sort
  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    // Status filter
    if (statusFilter === 'RESOLVED') {
      result = result.filter((t) => t.status === 'RESOLVED');
    } else if (statusFilter === 'OPEN') {
      result = result.filter((t) => t.status === 'OPEN');
    } else if (statusFilter === 'IN_PROGRESS') {
      result = result.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING_ON_CUSTOMER');
    } else if (statusFilter === 'CLOSED') {
      result = result.filter((t) => t.status === 'CLOSED');
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      );
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'LATEST' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [tickets, statusFilter, searchQuery, sortOrder]);

  const formatTicketNumber = (id: string) => {
    const clean = id.replace(/-/g, '');
    return `#${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatLastUpdate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
            RESOLVED
          </span>
        );
      case 'OPEN':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
            OPEN
          </span>
        );
      case 'IN_PROGRESS':
      case 'WAITING_ON_CUSTOMER':
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
            IN PROGRESS
          </span>
        );
      case 'CLOSED':
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
            CLOSED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Row: Title & Total Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="relative">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Your Support Inquiries
          </h2>
          <div className="w-8 h-1 bg-emerald-500 rounded-full mt-1" />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Archive className="w-4 h-4 text-slate-400" />
          <span>{tickets.length} Total Tickets</span>
        </div>
      </div>

      {/* Filter Tabs & Search / Sort Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#002f34] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-emerald-700 border border-emerald-200/80 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Resolved ({counts.resolved})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('OPEN')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'OPEN'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-700 border border-amber-200/80 hover:bg-amber-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Open ({counts.open})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-blue-700 border border-blue-200/80 hover:bg-blue-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>In Progress ({counts.inProgress})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'CLOSED'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Closed ({counts.closed})</span>
          </button>
        </div>

        {/* Right Search & Sort */}
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002f34] focus:border-transparent w-48 sm:w-56 shadow-xs"
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Sort by: {sortOrder === 'LATEST' ? 'Latest First' : 'Oldest First'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-slate-100 bg-white shadow-lg py-1 z-20 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSortOrder('LATEST');
                    setIsSortDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 transition cursor-pointer ${
                    sortOrder === 'LATEST' ? 'font-bold text-[#002f34]' : 'text-slate-600'
                  }`}
                >
                  Latest First
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortOrder('OLDEST');
                    setIsSortDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 transition cursor-pointer ${
                    sortOrder === 'OLDEST' ? 'font-bold text-[#002f34]' : 'text-slate-600'
                  }`}
                >
                  Oldest First
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tickets Cards List */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
          <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading support inquiries...</span>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Headphones className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-900">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No matching tickets found'
              : 'No support tickets filed yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search terms or filter settings.'
              : 'Have an inquiry regarding verification, orders, or seller disputes? Submit your ticket and our team will assist you.'}
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="bg-[#002f34] hover:bg-[#003d44] text-white px-5 py-2 rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Create Your First Inquiry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => onSelectTicket(ticket.id)}
              className="bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              {/* Left Column: ID & Date */}
              <div className="shrink-0 w-28 space-y-0.5">
                <div className="font-mono text-xs font-bold text-slate-800">
                  {formatTicketNumber(ticket.id)}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {formatDate(ticket.createdAt)}
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 w-28">
                {renderStatusBadge(ticket.status)}
              </div>

              {/* Main Content Column */}
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#002f34] transition truncate">
                  {ticket.subject}
                </h4>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-slate-400" />
                    <span>Category: {ticket.category.replace(/_/g, ' ')}</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Last update: {formatLastUpdate(ticket.updatedAt || ticket.createdAt)}</span>
                  </span>
                </div>
              </div>

              {/* Right Action: View Thread Button */}
              <div className="shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300 px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>View Thread</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

