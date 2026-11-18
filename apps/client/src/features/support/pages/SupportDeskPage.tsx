import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import {
  useUserTicketsQuery,
  useUserTicketDetailQuery,
  useCreateTicketMutation,
  useReplyTicketMutation,
} from '../hooks/useSupportTickets';
import { TicketPriority } from '../services/support.service';
import { SupportBanner } from '../components/SupportBanner';
import { SupportTicketList } from '../components/SupportTicketList';
import { SupportConversationView } from '../components/SupportConversationView';
import { SupportNewTicketForm } from '../components/SupportNewTicketForm';
import { SupportFaqSection } from '../components/SupportFaqSection';

export const SupportDeskPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketIdFromUrl = searchParams.get('ticketId');

  const [activeTab, setActiveTab] = useState<'NEW' | 'LIST' | 'FAQ'>('LIST');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketIdFromUrl);

  // Form State
  const [category, setCategory] = useState('ACCOUNT_ASSISTANCE');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  // Queries & Mutations
  const { data: ticketsData, isLoading: ticketsLoading } = useUserTicketsQuery();
  const {
    data: activeTicket,
    isLoading: ticketLoading,
    refetch: refetchTicket,
  } = useUserTicketDetailQuery(selectedTicketId);

  const createMutation = useCreateTicketMutation();
  const replyMutation = useReplyTicketMutation();

  const tickets = ticketsData?.tickets || [];

  // Deep-link synchronization from notification clicks or URL parameters
  useEffect(() => {
    if (ticketIdFromUrl) {
      setSelectedTicketId(ticketIdFromUrl);
      setActiveTab('LIST');
      void refetchTicket();
    }
  }, [ticketIdFromUrl, refetchTicket]);

  const handleSelectTicket = (id: string | null) => {
    setSelectedTicketId(id);
    if (id) {
      setSearchParams({ ticketId: id }, { replace: true });
      void refetchTicket();
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    createMutation.mutate(
      {
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
      },
      {
        onSuccess: (newTicket) => {
          setSubject('');
          setMessage('');
          setActiveTab('LIST');
          handleSelectTicket(newTicket.id);
        },
      }
    );
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyMessage.trim()) return;

    replyMutation.mutate(
      {
        id: selectedTicketId,
        message: replyMessage.trim(),
      },
      {
        onSuccess: () => {
          setReplyMessage('');
          void refetchTicket();
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F8F9] pb-20">
      {/* Top Banner Header with Vector Illustration & Tab Navigation */}
      <SupportBanner
        activeTab={activeTab}
        ticketsCount={tickets.length}
        onSelectTab={(tab) => {
          handleSelectTicket(null);
          setActiveTab(tab);
        }}
        onSubmitNew={() => {
          handleSelectTicket(null);
          setActiveTab('NEW');
        }}
      />

      {/* Main Content Body */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-8">
        {!user && (
          <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-center gap-3 shadow-xs">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>
              You are browsing as a guest. Please sign in to view your tickets, submit new inquiries, and receive live specialist replies.
            </span>
          </div>
        )}

        {/* View 1: Active Conversation Thread */}
        {selectedTicketId ? (
          <SupportConversationView
            ticket={activeTicket}
            isLoading={ticketLoading}
            onBack={() => handleSelectTicket(null)}
            onRefresh={() => void refetchTicket()}
            replyMessage={replyMessage}
            onChangeReplyMessage={setReplyMessage}
            onSubmitReply={handleSendReply}
            isReplying={replyMutation.isPending}
          />
        ) : activeTab === 'LIST' ? (
          /* View 2: Support Ticket List (Matches Mockup Pixel-Perfect) */
          <SupportTicketList
            tickets={tickets}
            isLoading={ticketsLoading}
            onSelectTicket={(id) => handleSelectTicket(id)}
            onCreateNew={() => setActiveTab('NEW')}
          />
        ) : activeTab === 'NEW' ? (
          /* View 3: Create New Ticket Form */
          <SupportNewTicketForm
            category={category}
            onChangeCategory={setCategory}
            priority={priority}
            onChangePriority={setPriority}
            subject={subject}
            onChangeSubject={setSubject}
            message={message}
            onChangeMessage={setMessage}
            onSubmit={handleCreateTicket}
            isSubmitting={createMutation.isPending}
          />
        ) : (
          /* View 4: Help Center & FAQ */
          <SupportFaqSection />
        )}
      </div>
    </div>
  );
};
