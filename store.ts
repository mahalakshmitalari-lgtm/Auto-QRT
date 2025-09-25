
import { create } from 'zustand';
import { User, Role, Ticket, ErrorType, AutomatedMessage, AuditLog, TicketStatus, SystemNotification, AdminNotification } from './types';
import { mockUsers, mockTickets, mockErrorTypes, mockMessages, mockLogs, mockNotifications, mockAdminNotifications } from './mockData';

// Helper to simulate API delay
const apiDelay = <T,>(data: T): Promise<T> => new Promise(res => setTimeout(() => res(data), 300));

// --- Session Store ---
interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  team: string | null;
  login: (email: string) => boolean;
  logout: () => void;
  setTeam: (team: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  isAuthenticated: false,
  team: null,
  login: (email) => {
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser) {
      set({ user: foundUser, isAuthenticated: true, team: null });
      return true;
    }
    return false;
  },
  logout: () => {
    set({ user: null, isAuthenticated: false, team: null });
  },
  setTeam: (team) => {
    set({ team });
  }
}));

// --- Ticket Store ---
interface TicketState {
  tickets: Ticket[];
  notifications: SystemNotification[];
  adminNotifications: AdminNotification[];
  fetchTickets: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchAdminNotifications: () => Promise<void>;
  addTicket: (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'preId' | 'status'>) => Promise<void>;
  updateTicket: (ticketData: Partial<Ticket> & { id: string }) => Promise<void>;
  markAdminNotificationAsRead: (notificationId: string) => Promise<void>;
  markSystemNotificationAsRead: (notificationId: string) => Promise<void>;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  notifications: [],
  adminNotifications: [],
  fetchTickets: async () => {
    const data = await apiDelay(mockTickets);
    set({ tickets: data });
  },
  fetchNotifications: async () => {
    const data = await apiDelay(mockNotifications);
    set({ notifications: [...data] });
  },
  fetchAdminNotifications: async () => {
    const data = await apiDelay(mockAdminNotifications);
    set({ adminNotifications: data });
  },
  addTicket: async (ticketData) => {
    const preId = useSessionStore.getState().user?.id;
    if (!preId) return;

    let status = TicketStatus.IN_PROGRESS;
    const automatedMessageToSend = mockMessages.find(m => m.errorTypeId === ticketData.errorTypeId);

    if (automatedMessageToSend) {
        // This error type has an automated resolution. Check if it's a re-submission.
        const existingTicket = get().tickets.find(
            t => t.uid === ticketData.uid && t.errorTypeId === ticketData.errorTypeId
        );
        
        if (existingTicket) {
            // It's a re-submission, so escalate.
            status = TicketStatus.ESCALATED;
        } else {
            // First time, auto-close and notify PRE.
            status = TicketStatus.CLOSED;
        }
    }

    const newTicket: Ticket = {
      ...ticketData,
      id: `ticket-${Date.now()}`,
      preId,
      status: status,
      // Fix: Corrected typo 'aite' to 'Date'.
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockTickets.unshift(newTicket);

    const newAdminNotification: AdminNotification = {
        id: `admin-notif-${Date.now()}`,
        ticketId: newTicket.id,
        message: `New ticket from UID ${newTicket.uid} was created.`,
        timestamp: new Date().toISOString(),
        isRead: false,
    };
    
    if (status === TicketStatus.ESCALATED) {
         newAdminNotification.message = `Ticket for UID ${newTicket.uid} was re-submitted and has been escalated.`;
    }

    mockAdminNotifications.unshift(newAdminNotification);

    if (status === TicketStatus.CLOSED && automatedMessageToSend) {
        const newNotification: SystemNotification = {
            id: `notif-${Date.now()}`,
            ticketId: newTicket.id,
            preId,
            uid: newTicket.uid,
            message: `Ticket for UID ${newTicket.uid}: ${automatedMessageToSend.message}`,
            timestamp: new Date().toISOString(),
            isRead: false,
        };
        mockNotifications.unshift(newNotification);
    }

    set({ tickets: [...mockTickets], notifications: [...mockNotifications], adminNotifications: [...mockAdminNotifications] });

    await apiDelay(newTicket);
    useAdminStore.getState().addLog({
        ticketId: newTicket.id,
        userId: preId,
        action: 'CREATE',
        details: `Ticket created for UID ${newTicket.uid} with status ${status}.`
    });
  },
  updateTicket: async (ticketData) => {
    const adminId = useSessionStore.getState().user?.id;
    if (!adminId) return;

    const updatedTicketData = {
        ...ticketData,
        updatedAt: new Date().toISOString(),
    };
    
    let originalStatus: TicketStatus | undefined;
    const ticketIndex = mockTickets.findIndex(t => t.id === ticketData.id);

    if (ticketIndex > -1) {
        originalStatus = mockTickets[ticketIndex].status;
        const originalTicket = mockTickets[ticketIndex];
        mockTickets[ticketIndex] = { ...mockTickets[ticketIndex], ...updatedTicketData };
        const updatedTicket = mockTickets[ticketIndex];
        
        if (ticketData.status === TicketStatus.ESCALATED && originalStatus !== TicketStatus.ESCALATED) {
            const newAdminNotification: AdminNotification = {
                id: `admin-notif-${Date.now()}`,
                ticketId: ticketData.id,
                message: `Ticket for UID ${originalTicket.uid} has been escalated.`,
                timestamp: new Date().toISOString(),
                isRead: false,
            };
            mockAdminNotifications.unshift(newAdminNotification);
        }

        if (updatedTicket.status === TicketStatus.AWAITING_NBFC && originalStatus !== TicketStatus.AWAITING_NBFC) {
            const newNotification: SystemNotification = {
                id: `notif-${Date.now()}`,
                ticketId: updatedTicket.id,
                preId: updatedTicket.preId,
                uid: updatedTicket.uid,
                message: `Your ticket for UID ${updatedTicket.uid} has been forwarded to the NBFC support team. DataCR Comment: "${updatedTicket.comment || 'No comment provided.'}"`,
                timestamp: new Date().toISOString(),
                isRead: false,
            };
            mockNotifications.unshift(newNotification);
        }

        if (
            (updatedTicket.status === TicketStatus.COMPLETED || updatedTicket.status === TicketStatus.CLOSED) &&
            originalStatus !== updatedTicket.status
        ) {
            const newNotification: SystemNotification = {
                id: `notif-${Date.now()}`,
                ticketId: updatedTicket.id,
                preId: updatedTicket.preId,
                uid: updatedTicket.uid,
                message: `Your ticket for UID ${updatedTicket.uid} has been resolved. DataCR Comment: "${updatedTicket.comment || 'No comment provided.'}"`,
                timestamp: new Date().toISOString(),
                isRead: false,
            };
            mockNotifications.unshift(newNotification);
        }
    }

    set({ tickets: [...mockTickets], notifications: [...mockNotifications], adminNotifications: [...mockAdminNotifications] });

    await apiDelay(updatedTicketData);
    
    let details = `Ticket details updated for ${ticketData.id}.`;
    if (ticketData.status && ticketData.status !== originalStatus) {
        details = `Status changed to ${ticketData.status} for ticket ${ticketData.id}.`;
    }
    
    useAdminStore.getState().addLog({
        ticketId: ticketData.id,
        userId: adminId,
        action: 'UPDATE',
        details,
    });
  },
   markAdminNotificationAsRead: async (notificationId) => {
    const notifIndex = mockAdminNotifications.findIndex(n => n.id === notificationId);
    if (notifIndex > -1) {
        mockAdminNotifications[notifIndex].isRead = true;
    }
    set({ adminNotifications: [...mockAdminNotifications] });
    await apiDelay(notificationId);
  },
  markSystemNotificationAsRead: async (notificationId) => {
    const notifIndex = mockNotifications.findIndex(n => n.id === notificationId);
    if (notifIndex > -1) {
        mockNotifications[notifIndex].isRead = true;
    }
    set({ notifications: [...mockNotifications] });
    await apiDelay(notificationId);
  },
}));

// --- Admin Store ---
interface AdminState {
  users: User[];
  errorTypes: ErrorType[];
  messages: AutomatedMessage[];
  logs: AuditLog[];
  fetchAdminData: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addLog: (logData: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<void>;
  addErrorType: (errorType: Omit<ErrorType, 'id'>) => Promise<void>;
  updateErrorType: (errorType: ErrorType) => Promise<void>;
  deleteErrorType: (errorTypeId: string) => Promise<void>;
  addMessage: (message: Omit<AutomatedMessage, 'id'>) => Promise<void>;
  updateMessage: (message: AutomatedMessage) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  users: [],
  errorTypes: [],
  messages: [],
  logs: [],
  fetchAdminData: async () => {
    const [users, errorTypes, messages, logs] = await Promise.all([
      apiDelay(mockUsers),
      apiDelay(mockErrorTypes),
      apiDelay(mockMessages),
      apiDelay(mockLogs)
    ]);
    set({ users: users.filter(u => u.role !== Role.ADMIN), errorTypes, messages, logs });
  },
  addUser: async (userData) => {
    const newUser = { ...userData, id: `user-${Date.now()}` } as User;
    mockUsers.push(newUser);
    set(state => ({ users: [...state.users, newUser] }));
    await apiDelay(newUser);
  },
  updateUser: async (updatedUser) => {
    const userIndex = mockUsers.findIndex(u => u.id === updatedUser.id);
    if(userIndex > -1) mockUsers[userIndex] = updatedUser;
    set(state => ({ users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u) }));
    await apiDelay(updatedUser);
  },
  deleteUser: async (userId) => {
    // FIX: Cannot assign to 'mockUsers' because it is an import.
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        mockUsers.splice(userIndex, 1);
    }
    set(state => ({ users: state.users.filter(u => u.id !== userId) }));
    await apiDelay(userId);
  },
  addLog: async (logData) => {
    const newLog: AuditLog = {
      ...logData,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    mockLogs.unshift(newLog);
    set({ logs: [...mockLogs] });
    await apiDelay(newLog);
  },
  addErrorType: async (errorTypeData) => {
    const newErrorType = { ...errorTypeData, id: `et-${Date.now()}` };
    mockErrorTypes.push(newErrorType);
    set(state => ({ errorTypes: [...state.errorTypes, newErrorType] }));
    await apiDelay(newErrorType);
  },
  updateErrorType: async (updatedErrorType) => {
    const etIndex = mockErrorTypes.findIndex(et => et.id === updatedErrorType.id);
    if(etIndex > -1) mockErrorTypes[etIndex] = updatedErrorType;
    set(state => ({ errorTypes: state.errorTypes.map(et => et.id === updatedErrorType.id ? updatedErrorType : et) }));
    await apiDelay(updatedErrorType);
  },
  deleteErrorType: async (errorTypeId) => {
    // FIX: Cannot assign to 'mockErrorTypes' because it is an import.
    const etIndex = mockErrorTypes.findIndex(et => et.id === errorTypeId);
    if (etIndex > -1) {
        mockErrorTypes.splice(etIndex, 1);
    }
    set(state => ({ errorTypes: state.errorTypes.filter(et => et.id !== errorTypeId) }));
    await apiDelay(errorTypeId);
  },
  addMessage: async (messageData) => {
    const newMessage = { ...messageData, id: `msg-${Date.now()}` };
    mockMessages.push(newMessage);
    set(state => ({ messages: [...state.messages, newMessage] }));
    await apiDelay(newMessage);
  },
  updateMessage: async (updatedMessage) => {
    const msgIndex = mockMessages.findIndex(m => m.id === updatedMessage.id);
    if(msgIndex > -1) mockMessages[msgIndex] = updatedMessage;
    set(state => ({ messages: state.messages.map(m => m.id === updatedMessage.id ? updatedMessage : m) }));
    await apiDelay(updatedMessage);
  },
  deleteMessage: async (messageId) => {
    // FIX: Cannot assign to 'mockMessages' because it is an import.
    const msgIndex = mockMessages.findIndex(m => m.id === messageId);
    if (msgIndex > -1) {
        mockMessages.splice(msgIndex, 1);
    }
    set(state => ({ messages: state.messages.filter(m => m.id !== messageId) }));
    await apiDelay(messageId);
  }
}));