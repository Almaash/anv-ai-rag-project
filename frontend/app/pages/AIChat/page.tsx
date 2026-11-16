"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/layout/Header";

type Message = {
    role: "user" | "assistant";
    content: string;
};

export default function AIChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest message
    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, loading]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const updatedMessages: Message[] = [
            ...messages,
            { role: "user", content: input.trim() },
        ];

        setMessages(updatedMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("http://localhost:5000/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            if (!res.ok) throw new Error("Failed to get AI response");

            const data = await res.json();

            setMessages([
                ...updatedMessages,
                { role: "assistant", content: data.response },
            ]);
        } catch (error) {
            console.error(error);
            setMessages(updatedMessages);
        } finally {
            setLoading(false);
        }
    };

    return (

        <>
            <Header />
            <section className="bg-[#F8FAFC] py-10 px-4">
                <div className="max-w-3xl mx-auto">
                    {/* CARD */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col h-[80vh]"
                    >
                        {/* HEADER */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-gradient-to-r from-[#199A95]/5 to-transparent">
                            <div className="p-3 rounded-2xl bg-[#199A95]/10 text-[#199A95]">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    CRM AI Assistant
                                </h2>
                                <p className="text-xs text-slate-400 font-medium">
                                    Ask anything — I'm here to help
                                </p>
                            </div>
                            <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[#199A95]">
                                <span className="w-2 h-2 rounded-full bg-[#199A95] animate-pulse" />
                                Online
                            </span>
                        </div>

                        {/* MESSAGES */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-8 py-6 space-y-5"
                        >
                            {/* EMPTY STATE */}
                            {messages.length === 0 && !loading && (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <div className="p-4 rounded-full bg-[#199A95]/10 text-[#199A95] mb-4">
                                        <Bot className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-slate-700 font-bold mb-1">
                                        How can I help you today?
                                    </h3>
                                    <p className="text-sm text-slate-400 max-w-xs">
                                        Start a conversation with the Anavran AI assistant.
                                    </p>
                                </div>
                            )}

                            <AnimatePresence initial={false}>
                                {messages.map((msg, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""
                                            }`}
                                    >
                                        {/* AVATAR */}
                                        <div
                                            className={`shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center ${msg.role === "user"
                                                    ? "bg-[#199A95] text-white"
                                                    : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {msg.role === "user" ? (
                                                <User className="w-4 h-4" />
                                            ) : (
                                                <Bot className="w-4 h-4" />
                                            )}
                                        </div>

                                        {/* BUBBLE */}
                                        <div
                                            className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                                    ? "bg-[#199A95] text-white rounded-tr-sm"
                                                    : "bg-slate-50 text-slate-700 rounded-tl-sm"
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* TYPING INDICATOR */}
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3"
                                >
                                    <div className="shrink-0 w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="bg-slate-50 text-slate-500 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Thinking...</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* INPUT */}
                        <div className="p-6 border-t border-slate-100 bg-white">
                            <div className="flex gap-3">
                                <Input
                                    className="rounded-2xl h-12 bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-[#199A95]"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") sendMessage();
                                    }}
                                    placeholder="Ask something..."
                                    disabled={loading}
                                />
                                <Button
                                    onClick={sendMessage}
                                    disabled={loading || !input.trim()}
                                    className="h-12 px-6 rounded-2xl bg-[#199A95] hover:bg-[#147C78] text-white font-bold flex gap-2 shadow-lg shadow-[#199A95]/20 transition-all"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            Send <Send className="w-4 h-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    );
}