import React, { useEffect, useState } from "react";
import Popup from "../../components/Popup.jsx";
import api from "../../api/axios";
import {
    Mail,
    Clock,
    Search,
    Filter,
    CheckCircle2,
    Circle,
    Reply,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Send,
    Loader2
} from "lucide-react";

const AdminContactMessages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const [popupContent, setPopupContent] = useState({ isOpen: false, message: "", type: "success" });

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/contact");
            setMessages(data.contacts || []);
        } catch (err) {
            setError("Failed to load contact messages.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleReply = async () => {
        if (!replyText.trim()) return;
        try {
            setSendingReply(true);
            await api.put(`/contact/${selectedMessage.id}`, { reply: replyText });
            setReplyText("");
            setSelectedMessage(null);
            fetchMessages();
            setPopupContent({ isOpen: true, message: "Reply sent successfully to user's email.", type: "success" });
        } catch (err) {
            console.error(err);
            setPopupContent({ isOpen: true, message: "Failed to send reply.", type: "error" });
        } finally {
            setSendingReply(false);
        }
    };

    const filteredMessages = messages.filter(msg => {
        const matchesSearch =
            msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusBadge = (status) => {
        if (status === 'replied') {
            return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100 uppercase">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Replied
            </span>;
        }
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-100 uppercase">
            <Circle className="h-2.5 w-2.5" />
            Pending
        </span>;
    };

    return (
        <>
            <div className="flex flex-col h-[calc(100vh-180px)] -mt-4">
                {/* Header Filter Area - No card, no border/padding as requested */}
                <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email or message..."
                            className="w-full bg-transparent py-2 pl-7 pr-4 text-sm outline-none transition placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select
                            className="bg-transparent py-2 pl-1 pr-6 text-sm font-medium text-slate-700 outline-none transition cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Messages</option>
                            <option value="pending">Pending</option>
                            <option value="replied">Replied</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Master List Section */}
                    <div className={`${selectedMessage ? 'hidden lg:flex w-[380px]' : 'w-full flex'} flex-col border-r border-slate-100`}>
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-1 py-4 space-y-1">
                            {loading ? (
                                Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="animate-pulse px-4 py-5 space-y-3">
                                        <div className="h-4 w-1/3 bg-slate-100 rounded" />
                                        <div className="h-3 w-3/4 bg-slate-50 rounded" />
                                    </div>
                                ))
                            ) : filteredMessages.length === 0 ? (
                                <div className="py-20 text-center">
                                    <Mail className="mx-auto h-8 w-8 text-slate-100" />
                                    <p className="mt-2 text-xs font-medium text-slate-400">No matching messages.</p>
                                </div>
                            ) : (
                                filteredMessages.map((msg) => (
                                    <button
                                        key={msg.id}
                                        onClick={() => setSelectedMessage(msg)}
                                        className={`w-full text-left px-4 py-4 transition-all relative ${selectedMessage?.id === msg.id
                                                ? 'bg-slate-50'
                                                : 'hover:bg-slate-50/50'
                                            }`}
                                    >
                                        {selectedMessage?.id === msg.id && (
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-600" />
                                        )}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className={`truncate text-sm ${selectedMessage?.id === msg.id ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                    {msg.name}
                                                </p>
                                                <p className="truncate text-[11px] text-slate-400 mt-0.5">{msg.email}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-tighter ${msg.status === 'replied' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {msg.status}
                                            </span>
                                        </div>
                                        <p className="mt-2 line-clamp-1 text-xs text-slate-500">{msg.content}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Detail Area Section */}
                    <div className={`${selectedMessage ? 'flex' : 'hidden'} flex-1 flex-col bg-slate-50/10`}>
                        {selectedMessage && (
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setSelectedMessage(null)}
                                            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 leading-tight">{selectedMessage.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-medium text-emerald-700">{selectedMessage.email}</span>
                                                <span className="text-[10px] text-slate-300">•</span>
                                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                                                    {new Date(selectedMessage.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${selectedMessage.status === 'replied' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{selectedMessage.status}</span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-px bg-slate-100 flex-1" />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Message Inquiry</span>
                                            <div className="h-px bg-slate-100 flex-1" />
                                        </div>
                                        <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                            {selectedMessage.content}
                                        </div>
                                    </div>

                                    {selectedMessage.reply && (
                                        <div className="space-y-4 pt-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-px bg-emerald-100 flex-1" />
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Official Response</span>
                                                <div className="h-px bg-emerald-100 flex-1" />
                                            </div>
                                            <div className="bg-emerald-50/30 rounded-2xl p-6 border border-emerald-50 border-dashed">
                                                <p className="text-emerald-900 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {selectedMessage.reply}
                                                </p>
                                                <p className="mt-4 text-[10px] font-bold text-emerald-400 uppercase tracking-tight">
                                                    Sent at {new Date(selectedMessage.replied_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedMessage.status === 'pending' && (
                                        <div className="pt-8 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-px bg-slate-100 flex-1" />
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">New Reply</span>
                                                <div className="h-px bg-slate-100 flex-1" />
                                            </div>
                                            <div className="bg-white border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-emerald-100 transition-all shadow-sm">
                                                <textarea
                                                    className="w-full min-h-[140px] bg-transparent p-4 text-sm outline-none resize-none placeholder:text-slate-300"
                                                    placeholder="Type your official response to the customer..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                />
                                                <div className="flex justify-between items-center p-2 border-t border-slate-50 mt-2">
                                                    <p className="text-[10px] text-slate-400 italic pl-2">
                                                        Sent via email to {selectedMessage.email}
                                                    </p>
                                                    <button
                                                        onClick={handleReply}
                                                        disabled={!replyText.trim() || sendingReply}
                                                        className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400"
                                                    >
                                                        {sendingReply ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Send className="h-3.5 w-3.5" />
                                                        )}
                                                        Deliver Response
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <Popup 
                isOpen={popupContent.isOpen} 
                message={popupContent.message} 
                type={popupContent.type} 
                onClose={() => setPopupContent({ ...popupContent, isOpen: false })} 
            />
        </>
    );
};


export default AdminContactMessages;
