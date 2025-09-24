
import { Role, TicketStatus, User, Ticket, ErrorType, AutomatedMessage, AuditLog, SystemNotification, AdminNotification } from './types';

export let mockUsers: User[] = [
  { id: 'user-1', name: 'Alice (PRE)', email: 'pre@example.com', role: Role.PRE },
  { id: 'user-2', name: 'Bob (Admin)', email: 'admin@example.com', role: Role.ADMIN },
  { id: 'user-3', name: 'Charlie (PRE)', email: 'charlie@example.com', role: Role.PRE },
  { id: 'user-4', name: 'David (DataCR)', email: 'datacr@example.com', role: Role.DATACR },
];

export let mockErrorTypes: ErrorType[] = [
  { id: 'et-1', name: 'Data Mismatch', description: 'Discrepancy in user data records.' },
  { id: 'et-2', name: 'System Error', description: 'A critical system failure occurred.' },
  { id: 'et-3', name: 'Login Issue', description: 'User is unable to log into their account.' },
  { id: 'et-4', name: 'Fuzzy Logic Error', description: 'Error related to fuzzy logic matching.' },
];

export let mockMessages: AutomatedMessage[] = [
  { id: 'msg-1', errorTypeId: 'et-1', message: 'A data mismatch has been detected. We are investigating.' },
  { id: 'msg-2', errorTypeId: 'et-2', message: 'System error confirmed. Technical team has been notified.' },
  { id: 'msg-3', errorTypeId: 'et-4', message: 'This issue has been auto-resolved. If the problem persists, please resubmit the ticket for escalation.' },
];

export let mockTickets: Ticket[] = [
  {
    id: 'ticket-1',
    uid: 'UID12345',
    preId: 'user-1',
    errorTypeId: 'et-1',
    description: 'User data shows incorrect address.',
    comment: 'Checked against primary database.',
    status: TicketStatus.IN_PROGRESS,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ticket-2',
    uid: 'UID67890',
    preId: 'user-1',
    errorTypeId: 'et-2',
    description: 'Server returned a 500 error on payment page.',
    status: TicketStatus.ESCALATED,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ticket-3',
    uid: 'UID54321',
    preId: 'user-3',
    errorTypeId: 'et-3',
    description: 'User password reset link is not working.',
    status: TicketStatus.COMPLETED,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ticket-4',
    uid: 'UID98765',
    preId: 'user-3',
    errorTypeId: 'et-1',
    description: 'User has duplicate accounts that need merging.',
    comment: 'Accounts merged. Ticket closed.',
    status: TicketStatus.CLOSED,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export let mockLogs: AuditLog[] = [
    { id: 'log-1', ticketId: 'ticket-1', userId: 'user-1', action: 'CREATE', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), details: 'Ticket created for UID12345' },
    { id: 'log-2', ticketId: 'ticket-1', userId: 'user-2', action: 'UPDATE_STATUS', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), details: 'Status changed to In Progress' },
    { id: 'log-3', ticketId: 'ticket-2', userId: 'user-1', action: 'CREATE', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), details: 'Ticket created for UID67890' },
    { id: 'log-4', ticketId: 'ticket-2', userId: 'user-2', action: 'UPDATE_STATUS', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), details: 'Status changed to Escalated' },
    { id: 'log-5', ticketId: 'ticket-3', userId: 'user-3', action: 'CREATE', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), details: 'Ticket created for UID54321' },
    { id: 'log-6', ticketId: 'ticket-3', userId: 'user-3', action: 'UPDATE_STATUS', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), details: 'Status changed to Completed' },
    { id: 'log-7', ticketId: 'ticket-4', userId: 'user-3', action: 'CREATE', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), details: 'Ticket created for UID98765' },
    { id: 'log-8', ticketId: 'ticket-4', userId: 'user-2', action: 'UPDATE_STATUS', timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), details: 'Status changed to Closed' },
];

export let mockNotifications: SystemNotification[] = [];
export let mockAdminNotifications: AdminNotification[] = [];
