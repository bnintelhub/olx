import React, { useState } from 'react';
import {
  X,
  Send,
  Lock,
  User,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  useSupportTicketDetailQuery,
} from '../hook/useSupportQuery';
import {
  useUpdateSupportTicketMutation,
  useReplySupportTicketMutation,
} from '../hook/useSupportMutation';
import { TicketPriority, TicketStatus } from '../service/support.service';

interface SupportTicketDetailModalProps {
  ticketId: string | null;
  onClose: () => void;
}

export const SupportTicketDetailModal: React.FC<SupportTicketDetailModalProps> = ({
  ticketId,
  onClose,
}) => {
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');

  const { data: ticket, isLoading } = useSupportTicketDetailQuery(ticketId);
  const updateMutation = useUpdateSupportTicketMutation();
  const replyMutation = useReplySupportTicketMutation();

  if (!ticketId) return null;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    replyMutation.mutate(
      {
        id: ticketId,
        payload: {
          message: replyText.trim(),
          isInternal,
          status: selectedStatus ? selectedStatus : undefined,
        },
      },
      {
        onSuccess: () => {
          setReplyText('');
          setIsInternal(false);
          setSelectedStatus('');
        },
      }
    );
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    updateMutation.mutate({
      id: ticketId,
      payload: { status: newStatus },
    });
  };

  const handlePriorityChange = (newPriority: TicketPriority) => {
    updateMutation.mutate({
      id: ticketId,
      payload: { priority: newPriority },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-background border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
              #{ticketId.slice(0, 8)}
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground truncate max-w-lg">
                {ticket?.subject || 'Loading ticket...'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Category: <span className="font-medium text-foreground">{ticket?.category?.replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !ticket ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Loading inquiry thread...</span>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Conversation Timeline */}
            <div className="flex-1 flex flex-col border-r overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {ticket.entries?.map((entry) => {
                  const isStaff = entry.author?.role !== 'USER';
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-xl p-4 text-xs ${
                        entry.isInternal
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : isStaff
                          ? 'bg-primary/5 border border-primary/20 ml-6'
                          : 'bg-muted/40 border mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-[10px]">
                            {isStaff ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-semibold text-foreground">
                            {entry.author?.profile?.name || (isStaff ? 'Support Specialist' : 'Customer')}
                          </span>
                          {entry.isInternal && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-700 border-amber-500/40 gap-1">
                              <Lock className="h-2.5 w-2.5" /> Internal Note
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed pl-8">
                        {entry.body}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="border-t p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className={isInternal ? 'text-amber-700 font-bold flex items-center gap-1' : 'text-muted-foreground'}>
                      <Lock className="h-3 w-3" /> Post as internal team note (hidden from customer)
                    </span>
                  </label>

                  {!isInternal && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Next Status:</span>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                        className="h-7 text-xs rounded-md border bg-background px-2"
                      >
                        <option value="">Default (Waiting on Customer)</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolve Ticket</option>
                        <option value="CLOSED">Close Ticket</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder={
                      isInternal
                        ? 'Type an internal note for staff colleagues...'
                        : 'Type your official response to the customer...'
                    }
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full rounded-xl border bg-background p-3 text-xs focus:ring-2 focus:ring-primary outline-none resize-none"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={replyMutation.isPending || !replyText.trim()}
                    className="absolute right-2.5 bottom-3.5 h-7 px-3 text-xs gap-1.5"
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Send
                  </Button>
                </div>
              </form>
            </div>

            {/* Sidebar Details Panel */}
            <div className="w-full md:w-72 p-5 bg-muted/10 space-y-5 text-xs overflow-y-auto">
              <div>
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] mb-3">
                  Ticket Management
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-muted-foreground text-[11px] block mb-1">Status</label>
                    <select
                      value={ticket.status}
                      disabled={updateMutation.isPending}
                      onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                      className="w-full h-8 rounded-lg border bg-background px-2.5 font-medium text-xs"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground text-[11px] block mb-1">Priority</label>
                    <select
                      value={ticket.priority}
                      disabled={updateMutation.isPending}
                      onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                      className="w-full h-8 rounded-lg border bg-background px-2.5 font-medium text-xs"
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] mb-2">
                  Customer Details
                </h4>
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">{ticket.requester?.profile?.name || 'Customer'}</p>
                  <p>{ticket.requester?.phoneNumber ? `+91 ${ticket.requester.phoneNumber}` : ticket.requester?.email || 'N/A'}</p>
                </div>
              </div>

              <div className="pt-3 border-t space-y-2 text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
                {ticket.slaTargetAt && (
                  <div className="flex justify-between">
                    <span>SLA Target:</span>
                    <span className="font-medium text-foreground">{new Date(ticket.slaTargetAt).toLocaleDateString()}</span>
                  </div>
                )}
                {ticket.resolvedAt && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Resolved:</span>
                    <span>{new Date(ticket.resolvedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
