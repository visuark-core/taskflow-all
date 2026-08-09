import { useState, useEffect, useRef } from 'react';
import { X, Search, Send, ArrowLeft, MoreVertical, Phone, Video, Trash2, Edit2, Check, XCircle, ChevronDown } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import Avatar from '../ui/Avatar';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
    onUnreadChange: (count: number) => void;
}

interface Message {
    id: string | number;
    sender: { id: string | number, name: string, avatar?: string } | string | number;
    recipient: string | number;
    content: string;
    createdAt: string;
    read: boolean;
    isDeleted?: boolean;
    isEdited?: boolean;
}

interface ChatUser {
    id: string | number;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    department: string;
    company: string;
}

const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`;

export default function ChatWidget({ isOpen, onClose, onUnreadChange }: ChatWidgetProps) {
    const { user: currentUser } = useAuth();
    const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    // Edit/Delete State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    const activeUserRef = useRef<ChatUser | null>(null);
    const isOpenRef = useRef<boolean>(isOpen);
    const token = localStorage.getItem('token');

    // Sync refs
    useEffect(() => {
        activeUserRef.current = activeUser;
    }, [activeUser]);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

    useEffect(() => {
        onUnreadChange(totalUnread);
    }, [totalUnread]);

    // Connect to Socket.io
    useEffect(() => {
        if (!currentUser || !token) return;

        if (!socketRef.current) {
            socketRef.current = io(API_URL);

            socketRef.current.emit('join-user', currentUser.id);

            socketRef.current.on('new-message', (message: Message) => {
                const senderId = typeof message.sender === 'object' ? message.sender.id : message.sender;
                const currentActiveUser = activeUserRef.current;
                const currentIsOpen = isOpenRef.current;

                if (currentActiveUser && senderId === currentActiveUser.id) {
                    setMessages((prev) => [...prev, message]);
                    if (currentIsOpen) {
                        fetch(`${API_URL}/api/chat/read/${senderId}`, {
                            method: 'PUT',
                            headers: { Authorization: `Bearer ${token}` }
                        }).catch(err => console.error(err));
                    } else {
                        setUnreadCounts(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
                    }
                } else {
                    setUnreadCounts(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
                }
            });

            socketRef.current.on('message-updated', (updatedMessage: Message) => {
                setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
            });

            socketRef.current.on('message-deleted', (deletedMessage: Message) => {
                setMessages(prev => prev.map(m => m.id === deletedMessage.id ? deletedMessage : m));
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [currentUser, token]);

    const markAsRead = async (userId: string) => {
        try {
            setUnreadCounts(prev => {
                const newCounts = { ...prev };
                delete newCounts[userId];
                return newCounts;
            });

            await fetch(`${API_URL}/api/chat/read/${userId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    useEffect(() => {
        if (!token) return;
        const fetchData = async () => {
            try {
                const usersRes = await fetch(`${API_URL}/api/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const usersData = await usersRes.json();
                if (usersData.success) {
                    setUsers(usersData.users.filter((u: any) => u.id !== currentUser?.id));
                }

                const unreadRes = await fetch(`${API_URL}/api/chat/unread`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const unreadData = await unreadRes.json();
                if (unreadData.success) {
                    setUnreadCounts(unreadData.data);
                }
            } catch (err) {
                console.error('Failed to fetch data', err);
            }
        };
        fetchData();
    }, [token, currentUser]);

    useEffect(() => {
        if (!token) return;
        const interval = setInterval(async () => {
            try {
                const unreadRes = await fetch(`${API_URL}/api/chat/unread`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const unreadData = await unreadRes.json();
                if (unreadData.success) {
                    setUnreadCounts(unreadData.data);
                }
            } catch (e) { }
        }, 30000);
        return () => clearInterval(interval);
    }, [token]);

    useEffect(() => {
        if (activeUser && isOpen) {
            markAsRead(activeUser.id as string);
        }
    }, [activeUser, isOpen]);

    useEffect(() => {
        if (!activeUser || !token) return;
        const fetchMessages = async () => {
            try {
                const res = await fetch(`${API_URL}/api/chat/${activeUser.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setMessages(data.data);
                }
            } catch (err) {
                console.error('Failed to fetch messages', err);
            }
        };
        fetchMessages();
    }, [activeUser, token]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeUser, editingId]); // Scroll also when editing starts to keep focus? mostly useful for new messages

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !activeUser || !currentUser) return;

        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipientId: activeUser.id,
                    content: newMessage
                })
            });
            const data = await res.json();

            if (data.success) {
                setMessages([...messages, data.data]);
                setNewMessage('');
            }
        } catch (err) {
            console.error('Failed to send message', err);
        }
    };

    const startEditing = (msg: Message) => {
        setEditingId(msg.id as string);
        setEditContent(msg.content);
        setMenuOpenId(null);
    };

    const saveEdit = async () => {
        if (!editingId || !editContent.trim()) return;

        try {
            const res = await fetch(`${API_URL}/api/chat/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: editContent })
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => prev.map(m => m.id === editingId ? data.data : m));
                setEditingId(null);
                setEditContent('');
            }
        } catch (err) {
            console.error('Failed to update message', err);
        }
    };

    const deleteMessage = async (msgId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            const res = await fetch(`${API_URL}/api/chat/${msgId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                // Optimistic update handled by socket usually, but assume success
                setMenuOpenId(null);
            }
        } catch (err) {
            console.error('Failed to delete message', err);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={cn(
            "fixed bottom-4 right-4 z-50 flex h-[600px] w-[380px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 sm:w-[400px]",
            isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-10 pointer-events-none"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between bg-[#00a884] px-4 py-3 text-white dark:bg-[#00a884]">
                <div className="flex items-center gap-3">
                    {activeUser ? (
                        <>
                            <button onClick={() => setActiveUser(null)} className="mr-1 rounded-full p-1 hover:bg-white/10">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <Avatar name={activeUser.name} size="sm" className="bg-gray-200 text-gray-700" />
                            <div>
                                <p className="text-sm font-semibold">{activeUser.name}</p>
                                <p className="text-xs opacity-90">Online</p>
                            </div>
                        </>
                    ) : (
                        <h3 className="text-lg font-semibold">WhatsApp Chat</h3>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!activeUser && (
                        <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                    {activeUser && (
                        <>
                            <button className="rounded-full p-1 hover:bg-white/10"><Video className="h-5 w-5" /></button>
                            <button className="rounded-full p-1 hover:bg-white/10"><Phone className="h-5 w-5" /></button>
                            <button className="rounded-full p-1 hover:bg-white/10"><MoreVertical className="h-5 w-5" /></button>
                            <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10">
                                <X className="h-5 w-5" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]">
                <div className="absolute inset-0 pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-[0.06] dark:opacity-[0.06]"></div>

                {activeUser ? (
                    <div className="relative flex h-full flex-col">
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {messages.map((msg) => {
                                const isMine = (typeof msg.sender === 'object' ? msg.sender.id : msg.sender) === currentUser?.id;
                                return (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "mb-2 flex w-full group",
                                            isMine ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "relative max-w-[80%] rounded-lg px-3 py-1.5 shadow-sm text-sm group",
                                                isMine
                                                    ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none dark:bg-[#005c4b] dark:text-white"
                                                    : "bg-white text-gray-900 rounded-tl-none dark:bg-[#202c33] dark:text-white",
                                                msg.isDeleted && "italic text-gray-500 flex items-center gap-2"
                                            )}
                                        >
                                            {msg.isDeleted ? (
                                                <>
                                                    <XCircle className="w-4 h-4" />
                                                    <span>This message was deleted</span>
                                                </>
                                            ) : (
                                                <>
                                                    {editingId === msg.id ? (
                                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                                            <input
                                                                value={editContent}
                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                className="w-full p-1 rounded border dark:bg-gray-700 dark:border-gray-600"
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => setEditingId(null)} className="p-1 hover:bg-gray-200 rounded dark:hover:bg-gray-600"><X className="w-4 h-4" /></button>
                                                                <button onClick={saveEdit} className="p-1 hover:bg-gray-200 rounded dark:hover:bg-gray-600 text-green-600"><Check className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p>{msg.content}</p>
                                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                                {msg.isEdited && <span className="text-[10px] text-gray-500 italic">Edited</span>}
                                                                <span className={cn("text-[10px]", isMine ? "text-gray-500 dark:text-gray-300" : "text-gray-500 dark:text-gray-400")}>
                                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </>
                                            )}

                                            {/* Context Menu Trigger */}
                                            {!msg.isDeleted && isMine && !editingId && (
                                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setMenuOpenId(menuOpenId === msg.id ? null : msg.id as string)}
                                                        className="p-1 bg-white/50 rounded-full hover:bg-white dark:bg-black/20 dark:hover:bg-black/40"
                                                    >
                                                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                                    </button>
                                                    {menuOpenId === msg.id && (
                                                        <div className="absolute right-0 top-6 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border dark:border-gray-700">
                                                            <button onClick={() => startEditing(msg)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                                                                <Edit2 className="w-3 h-3" /> Edit
                                                            </button>
                                                            <button onClick={() => deleteMessage(msg.id as string)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 flex items-center gap-2">
                                                                <Trash2 className="w-3 h-3" /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="bg-[#f0f2f5] p-2 dark:bg-[#202c33]">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Type a message"
                                    className="flex-1 rounded-lg border-none bg-white px-4 py-2 text-sm focus:outline-none focus:ring-0 dark:bg-[#2a3942] dark:text-white"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white transition-colors hover:bg-[#008f6f]"
                                    disabled={!newMessage.trim()}
                                >
                                    <Send className="h-5 w-5 pl-1" />
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="relative flex h-full flex-col bg-white dark:bg-[#111b21]">
                        <div className="p-2 bg-white dark:bg-[#111b21]">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </div>
                                <input
                                    type="search"
                                    className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-[#202c33] dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                    placeholder="Search or start new chat"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {filteredUsers.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center text-gray-500">
                                    <p>No contacts found</p>
                                </div>
                            ) : (
                                filteredUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-[#202c33]"
                                        onClick={() => setActiveUser(user)}
                                    >
                                        <div className="relative">
                                            <Avatar name={user.name} />
                                            {unreadCounts[user.id] > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                                                    {unreadCounts[user.id]}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h4 className="text-sm font-medium text-gray-900 truncate dark:text-white">
                                                    {user.name}
                                                </h4>
                                                {unreadCounts[user.id] > 0 && (
                                                    <span className="text-xs font-bold text-green-500">New</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate dark:text-gray-400">
                                                {user.role} • {user.department}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
