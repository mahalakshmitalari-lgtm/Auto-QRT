
import React, { useEffect, useState, useMemo } from 'react';
import { useTicketStore, useAdminStore, useSessionStore } from '../store';
import { Ticket, TicketStatus, User, Role, ErrorType, AutomatedMessage, AuditLog } from '../types';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Modal, Textarea, StatusBadge } from '../components/ui';
import { ICONS } from '../constants';

// Sub-component for main ticket dashboard
const AdminTicketDashboard: React.FC = () => {
    const { tickets, fetchTickets, updateTicket } = useTicketStore();
    const { users, errorTypes, fetchAdminData } = useAdminStore();
    const { user } = useSessionStore();
    const [activeTab, setActiveTab] = useState<TicketStatus | 'All'>('All');
    const [filter, setFilter] = useState('');
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [copiedUid, setCopiedUid] = useState<string | null>(null);
    const [adminComment, setAdminComment] = useState('');

    useEffect(() => {
        fetchTickets();
        fetchAdminData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenTicketModal = (ticket: Ticket) => {
        setSelectedTicket({ ...ticket });
        setAdminComment('');
        setIsTicketModalOpen(true);
    };

    const handleCopyUid = (uid: string) => {
        navigator.clipboard.writeText(uid);
        setCopiedUid(uid);
        setTimeout(() => setCopiedUid(null), 2000);
    };

    const handleSolveTicket = async (ticketId: string) => {
        await updateTicket({
            id: ticketId,
            status: TicketStatus.COMPLETED,
        });
    };

    const handleUpdateTicket = async () => {
        if (!selectedTicket) return;
        
        const trimmedNewComment = adminComment.trim();
        let finalComment = selectedTicket.comment || '';

        if (trimmedNewComment) {
            if (finalComment) {
                finalComment += `\n---\n${trimmedNewComment}`;
            } else {
                finalComment = trimmedNewComment;
            }
        }

        await updateTicket({
            id: selectedTicket.id,
            status: selectedTicket.status,
            comment: finalComment,
        });
        setIsTicketModalOpen(false);
        setSelectedTicket(null);
    };

    const filteredTickets = useMemo(() => {
        let filtered = tickets;
        if (activeTab !== 'All') {
            filtered = filtered.filter(t => t.status === activeTab);
        }
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            filtered = filtered.filter(t => 
                t.uid.toLowerCase().includes(lowerFilter) || 
                (users.find(u => u.id === t.preId)?.name.toLowerCase().includes(lowerFilter)) ||
                (errorTypes.find(et => et.id === t.errorTypeId)?.name.toLowerCase().includes(lowerFilter))
            );
        }
        return filtered;
    }, [tickets, activeTab, filter, users, errorTypes]);

    const getMeta = (ticket: Ticket) => ({
        preName: users.find(u => u.id === ticket.preId)?.name || 'Unknown PRE',
        errorName: errorTypes.find(et => et.id === ticket.errorTypeId)?.name || 'Unknown Error'
    });

    const tabs: (TicketStatus | 'All')[] = ['All', TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED, TicketStatus.AWAITING_NBFC, TicketStatus.COMPLETED, TicketStatus.CLOSED];

    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle>Ticket Overview</CardTitle>
                <CardDescription>Monitor and manage all submitted tickets.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                        {tabs.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>{tab}</button>
                        ))}
                    </div>
                     <div className="relative w-64">
                        <Input placeholder="Search by UID, PRE, Error..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-10" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{ICONS.search}</span>
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>UID</TableHead>
                            <TableHead>PRE Name</TableHead>
                            <TableHead>Error Type</TableHead>
                            <TableHead>DataCR Comments</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTickets.map(ticket => {
                            const { preName, errorName } = getMeta(ticket);
                            return (
                                <TableRow key={ticket.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{ticket.uid}</span>
                                            <button
                                                onClick={() => handleCopyUid(ticket.uid)}
                                                className="text-slate-400 hover:text-sky-600 p-1 rounded-md transition-colors"
                                                aria-label={`Copy UID ${ticket.uid}`}
                                            >
                                                {copiedUid === ticket.uid ? <span className="text-green-500">{ICONS.check}</span> : ICONS.copy}
                                            </button>
                                        </div>
                                    </TableCell>
                                    <TableCell>{preName}</TableCell>
                                    <TableCell>{errorName}</TableCell>
                                    <TableCell className="text-sm text-slate-600 max-w-xs truncate" title={ticket.comment}>{ticket.comment || '–'}</TableCell>
                                    <TableCell><StatusBadge status={ticket.status} /></TableCell>
                                    <TableCell>{new Date(ticket.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Button variant="secondary" size="sm" className="px-2 py-1 h-auto" onClick={() => handleOpenTicketModal(ticket)}>
                                                <span className="text-slate-600">{ICONS.edit}</span>
                                            </Button>
                                            {(user?.role === Role.ADMIN || user?.role === Role.DATACR) && (ticket.status === TicketStatus.ESCALATED || ticket.status === TicketStatus.AWAITING_NBFC) && (
                                                <Button size="sm" onClick={() => handleSolveTicket(ticket.id)}>
                                                    Solved
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Modal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)}>
            {selectedTicket && (
                <>
                    <h3 className="text-lg font-medium mb-4">Update Ticket: {selectedTicket.uid}</h3>
                    <div className="space-y-4">
                        <div>
                            <Label>Description</Label>
                            <p className="text-sm text-slate-600 p-2 bg-slate-50 rounded-md mt-1">{selectedTicket.description}</p>
                        </div>
                        {selectedTicket.comment && (
                            <div>
                                <Label>Current DataCR Comments</Label>
                                <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded-md mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">{selectedTicket.comment}</div>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="ticket-status">Status</Label>
                            <Select id="ticket-status" value={selectedTicket.status} onChange={e => setSelectedTicket({...selectedTicket, status: e.target.value as TicketStatus})}>
                                {Object.values(TicketStatus).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="ticket-comment">Admin Comment / Solution</Label>
                            <Textarea id="ticket-comment" value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Add a new comment or solution details..."/>
                        </div>
                        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setIsTicketModalOpen(false)}>Cancel</Button><Button onClick={handleUpdateTicket}>Update Ticket</Button></div>
                    </div>
                </>
            )}
        </Modal>
        </>
    );
};

const StatCard: React.FC<{ title: string, value: string | number, description: string }> = ({ title, value, description }) => (
    <Card>
        <CardHeader>
            <CardDescription>{title}</CardDescription>
            <CardTitle>{value}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-xs text-slate-500">{description}</p>
        </CardContent>
    </Card>
);

const ErrorAnalytics: React.FC = () => {
    const { tickets, fetchTickets } = useTicketStore();
    const { errorTypes, fetchAdminData } = useAdminStore();

    useEffect(() => {
        fetchTickets();
        fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const analyticsData = useMemo(() => {
        if (tickets.length === 0 || errorTypes.length === 0) return null;

        const counts = errorTypes.map(et => ({
            id: et.id,
            name: et.name,
            count: tickets.filter(t => t.errorTypeId === et.id).length,
        }));

        const totalTickets = tickets.length;
        const mostFrequent = counts.reduce((max, current) => current.count > max.count ? current : max, counts[0]);
        const inProgress = tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length;

        return { counts, totalTickets, mostFrequent, inProgress };
    }, [tickets, errorTypes]);

    if (!analyticsData) {
        return <p>Loading analytics data...</p>;
    }

    const maxCount = Math.max(...analyticsData.counts.map(c => c.count), 1);
    const barColors = ['bg-sky-500', 'bg-teal-500', 'bg-amber-500', 'bg-indigo-500', 'bg-rose-500'];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Tickets" value={analyticsData.totalTickets} description="All tickets submitted to the system." />
                <StatCard title="Tickets In Progress" value={analyticsData.inProgress} description="Tickets actively being worked on." />
                <StatCard title="Most Frequent Error" value={analyticsData.mostFrequent.name} description={`${analyticsData.mostFrequent.count} occurrences.`} />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Error Type Distribution</CardTitle>
                    <CardDescription>Number of tickets submitted for each error type.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analyticsData.counts.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-4 items-center gap-4">
                                <div className="text-sm font-medium text-slate-700 truncate col-span-1">{item.name}</div>
                                <div className="col-span-3 flex items-center">
                                    <div className="w-full bg-slate-100 rounded-full h-6 mr-4">
                                        <div
                                            className={`${barColors[index % barColors.length]} h-6 rounded-full flex items-center justify-end px-2 text-white text-xs font-bold`}
                                            style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: '25px' }}
                                        >
                                            {item.count}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


// Sub-component for PRE management
const PreManagement: React.FC = () => {
    const { users, addUser, updateUser, deleteUser, fetchAdminData } = useAdminStore();
    const { user: currentUser } = useSessionStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userFormData, setUserFormData] = useState<Omit<User, 'id'> & { id?: string }>({ name: '', email: '', role: Role.PRE });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    
    useEffect(() => {
        fetchAdminData();
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddModalOpen = () => {
        setUserFormData({ name: '', email: '', role: Role.PRE });
        setIsModalOpen(true);
    };

    const handleEditModalOpen = (user: User) => {
        setUserFormData(user);
        setIsModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!userFormData.name || !userFormData.email) {
            alert('Name and email are required.');
            return;
        }
        if (userFormData.id) {
            await updateUser(userFormData as User);
        } else {
            await addUser(userFormData as Omit<User, 'id'>);
        }
        setIsModalOpen(false);
    };
    
    const handleDeleteRequest = (user: User) => {
        setUserToDelete(user);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (userToDelete) {
            await deleteUser(userToDelete.id);
            setIsConfirmModalOpen(false);
            setUserToDelete(null);
        }
    };

    return (
        <>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>PRE Management</CardTitle>
                        <CardDescription>Add, edit, or remove PRE users.</CardDescription>
                    </div>
                    {currentUser?.role === Role.ADMIN && <Button onClick={handleAddModalOpen}><span className="mr-2">{ICONS.plus}</span>Add PRE</Button>}
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell className="space-x-2">
                                    {currentUser?.role === Role.ADMIN && (
                                    <>
                                        <Button onClick={() => handleEditModalOpen(user)} variant="secondary" size="sm" className="px-2 py-1 h-auto"><span className="text-slate-600">{ICONS.edit}</span></Button>
                                        <Button onClick={() => handleDeleteRequest(user)} variant="danger" size="sm" className="px-2 py-1 h-auto"><span className="text-white">{ICONS.delete}</span></Button>
                                    </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <h3 className="text-lg font-medium mb-4">{userFormData.id ? 'Edit User' : 'Add New User'}</h3>
            <div className="space-y-4">
                <div><Label htmlFor="user-name">Name</Label><Input id="user-name" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
                <div><Label htmlFor="user-email">Email</Label><Input id="user-email" type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} /></div>
                <div>
                    <Label htmlFor="user-role">Role</Label>
                    <Select id="user-role" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as Role})}>
                        <option value={Role.PRE}>PRE</option>
                        <option value={Role.DATACR}>DataCR</option>
                    </Select>
                </div>
                <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSaveUser}>Save User</Button></div>
            </div>
        </Modal>
        <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)}>
            <h3 className="text-lg font-medium mb-2">Confirm Deletion</h3>
            <p className="text-slate-600 mb-6">Are you sure you want to delete the user "{userToDelete?.name}"? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleConfirmDelete}>Delete</Button>
            </div>
        </Modal>
        </>
    );
};

// Sub-component for Error Types management
const ErrorTypesManagement: React.FC = () => {
    const { errorTypes, fetchAdminData, addErrorType, updateErrorType, deleteErrorType } = useAdminStore();
    const { user: currentUser } = useSessionStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentErrorType, setCurrentErrorType] = useState<Omit<ErrorType, 'id'> & { id?: string }>({ name: '', description: '' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [errorTypeToDelete, setErrorTypeToDelete] = useState<ErrorType | null>(null);

    useEffect(() => { fetchAdminData() }, []);

    const handleOpenModal = (errorType?: ErrorType) => {
        setCurrentErrorType(errorType || { name: '', description: '' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (currentErrorType.id) {
            await updateErrorType(currentErrorType as ErrorType);
        } else {
            await addErrorType(currentErrorType);
        }
        setIsModalOpen(false);
    };

    const handleDeleteRequest = (errorType: ErrorType) => {
        setErrorTypeToDelete(errorType);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (errorTypeToDelete) {
            await deleteErrorType(errorTypeToDelete.id);
            setIsConfirmModalOpen(false);
            setErrorTypeToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div><CardTitle>Error Types</CardTitle><CardDescription>Manage the dropdown values for error types.</CardDescription></div>
                    {currentUser?.role === Role.ADMIN && <Button onClick={() => handleOpenModal()}><span className="mr-2">{ICONS.plus}</span>Add Error Type</Button>}
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {errorTypes.map(et => (
                            <TableRow key={et.id}>
                                <TableCell>{et.name}</TableCell><TableCell>{et.description}</TableCell>
                                <TableCell className="space-x-2">
                                    {currentUser?.role === Role.ADMIN && (
                                    <>
                                        <Button onClick={() => handleOpenModal(et)} variant="secondary" size="sm" className="px-2 py-1 h-auto"><span className="text-slate-600">{ICONS.edit}</span></Button>
                                        <Button onClick={() => handleDeleteRequest(et)} variant="danger" size="sm" className="px-2 py-1 h-auto"><span className="text-white">{ICONS.delete}</span></Button>
                                    </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h3 className="text-lg font-medium mb-4">{currentErrorType.id ? 'Edit' : 'Add'} Error Type</h3>
                <div className="space-y-4">
                    <div><Label htmlFor="et-name">Name</Label><Input id="et-name" value={currentErrorType.name} onChange={e => setCurrentErrorType({...currentErrorType, name: e.target.value})} /></div>
                    <div><Label htmlFor="et-desc">Description</Label><Textarea id="et-desc" value={currentErrorType.description} onChange={e => setCurrentErrorType({...currentErrorType, description: e.target.value})} /></div>
                    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
                </div>
            </Modal>
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)}>
                <h3 className="text-lg font-medium mb-2">Confirm Deletion</h3>
                <p className="text-slate-600 mb-6">Are you sure you want to delete the error type "{errorTypeToDelete?.name}"? This action cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleConfirmDelete}>Delete</Button>
                </div>
            </Modal>
        </Card>
    );
};

// Sub-component for Messages management
const MessagesManagement: React.FC = () => {
    const { messages, errorTypes, fetchAdminData, addMessage, updateMessage, deleteMessage } = useAdminStore();
    const { user: currentUser } = useSessionStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMessage, setCurrentMessage] = useState<Omit<AutomatedMessage, 'id'> & { id?: string }>({ errorTypeId: '', message: '' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<AutomatedMessage | null>(null);

    useEffect(() => { fetchAdminData() }, []);
    
    const handleOpenModal = (message?: AutomatedMessage) => {
        setCurrentMessage(message || { errorTypeId: errorTypes[0]?.id || '', message: '' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentMessage.errorTypeId) return;
        if (currentMessage.id) {
            await updateMessage(currentMessage as AutomatedMessage);
        } else {
            await addMessage(currentMessage);
        }
        setIsModalOpen(false);
    };
    
    const handleDeleteRequest = (message: AutomatedMessage) => {
        setMessageToDelete(message);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (messageToDelete) {
            await deleteMessage(messageToDelete.id);
            setIsConfirmModalOpen(false);
            setMessageToDelete(null);
        }
    };

    const getErrorTypeName = (id: string) => errorTypes.find(et => et.id === id)?.name || 'N/A';
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div><CardTitle>Automated Messages</CardTitle><CardDescription>Manage automated messages sent for specific error types.</CardDescription></div>
                    {currentUser?.role === Role.ADMIN && <Button onClick={() => handleOpenModal()}><span className="mr-2">{ICONS.plus}</span>Add Message</Button>}
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader><TableRow><TableHead>Associated Error</TableHead><TableHead>Message</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {messages.map(msg => (
                            <TableRow key={msg.id}>
                                <TableCell>{getErrorTypeName(msg.errorTypeId)}</TableCell><TableCell>{msg.message}</TableCell>
                                <TableCell className="space-x-2">
                                    {currentUser?.role === Role.ADMIN && (
                                    <>
                                        <Button onClick={() => handleOpenModal(msg)} variant="secondary" size="sm" className="px-2 py-1 h-auto"><span className="text-slate-600">{ICONS.edit}</span></Button>
                                        <Button onClick={() => handleDeleteRequest(msg)} variant="danger" size="sm" className="px-2 py-1 h-auto"><span className="text-white">{ICONS.delete}</span></Button>
                                    </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <h3 className="text-lg font-medium mb-4">{currentMessage.id ? 'Edit' : 'Add'} Message</h3>
                <div className="space-y-4">
                    <div><Label htmlFor="msg-et">Error Type</Label><Select id="msg-et" value={currentMessage.errorTypeId} onChange={e => setCurrentMessage({...currentMessage, errorTypeId: e.target.value})}>{errorTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}</Select></div>
                    <div><Label htmlFor="msg-text">Message</Label><Textarea id="msg-text" value={currentMessage.message} onChange={e => setCurrentMessage({...currentMessage, message: e.target.value})} /></div>
                    <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save</Button></div>
                </div>
            </Modal>
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)}>
                <h3 className="text-lg font-medium mb-2">Confirm Deletion</h3>
                <p className="text-slate-600 mb-4">Are you sure you want to delete this message? This action cannot be undone.</p>
                <blockquote className="border-l-4 border-slate-200 pl-4 text-slate-600 italic">
                    {messageToDelete?.message}
                </blockquote>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleConfirmDelete}>Delete</Button>
                </div>
            </Modal>
        </Card>
    );
};


// Sub-component for Audit Logs
const AuditLogs: React.FC = () => {
    const { logs, users, fetchAdminData } = useAdminStore();
    useEffect(() => { fetchAdminData() }, []);
    const getUserName = (id: string) => users.find(u => u.id === id)?.name || useSessionStore.getState().user?.id === id ? useSessionStore.getState().user?.name : 'Unknown';
    
    return (
        <Card>
            <CardHeader><CardTitle>Audit Logs</CardTitle><CardDescription>Read-only history of all ticket updates and system actions.</CardDescription></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{getUserName(log.userId)}</TableCell>
                                <TableCell><Badge>{log.action}</Badge></TableCell>
                                <TableCell>{log.details}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export const AdminDashboard: React.FC<{ activePage: string }> = ({ activePage }) => {
    switch(activePage) {
        case 'dashboard':
            return <AdminTicketDashboard />;
        case 'error-analytics':
            return <ErrorAnalytics />;
        case 'pre-management':
            return <PreManagement />;
        case 'error-types':
            return <ErrorTypesManagement />;
        case 'messages':
            return <MessagesManagement />;
        case 'logs':
            return <AuditLogs />;
        default:
            return <AdminTicketDashboard />;
    }
};
