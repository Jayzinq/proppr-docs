"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MoreVertical, Paperclip } from "lucide-react";
import Image from "next/image";

export type Message = {
    id: string;
    sender: "user" | "bot";
    text: React.ReactNode;
    timestamp: string;
};

export type CommandResponse = {
    command: string;
    name: string;
    response: React.ReactNode;
};

export interface PhoneSimulatorHandle {
    triggerCommand: (cmd: CommandResponse | string) => void;
}

interface PhoneSimulatorProps {
    commands: CommandResponse[];
    defaultMessage?: string;
    botName?: string;
    botLogo?: string;
    hideButtons?: boolean;
    initialCommand?: string;
}

export const PhoneSimulator = forwardRef<PhoneSimulatorHandle, PhoneSimulatorProps>(({
    commands,
    defaultMessage = "Welcome to Proppr. Select a command to see how I respond.",
    botName = "Proppr Bot",
    botLogo = "/proppr-logo-white.png",
    hideButtons = false,
    initialCommand
}, ref) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Initialize with either initialCommand or defaultMessage
    useEffect(() => {
        if (initialized) return;
        setInitialized(true);

        if (initialCommand) {
            const cmd = commands.find(c => c.command === initialCommand);
            if (cmd) {
                const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setMessages([
                    { id: "init-user", sender: "user", text: cmd.command, timestamp: time },
                    { id: "init-bot", sender: "bot", text: cmd.response, timestamp: time }
                ]);
                return;
            }
        }
        setMessages([{ id: "1", sender: "bot", text: defaultMessage, timestamp: "Now" }]);
    }, [initialized, initialCommand, commands, defaultMessage]);

    const handleCommandClick = (cmd: CommandResponse | string) => {
        if (isTyping) return;

        let commandObj = typeof cmd === 'string'
            ? commands.find(c => c.command === cmd || c.command.trim() === cmd.trim())
            : cmd;

        if (!commandObj && typeof cmd === 'string') {
            commandObj = {
                command: cmd,
                name: "Command",
                response: (
                    <div className="text-[13px] font-mono leading-relaxed tracking-tight">
                        <span className="text-zinc-400 italic">User sent: {cmd}</span><br /><br />
                        ⚙️ <span className="text-white font-bold">Proppr Bot</span><br />
                        <span className="text-zinc-300">This command was executed successfully. Please refer to the documentation for details on its specific behavior.</span><br /><br />
                        <span className="text-[10px] text-zinc-500 bg-black/30 px-2 py-1 rounded border border-white/5">(Doc Simulator Placeholder)</span>
                    </div>
                )
            };
        }

        if (!commandObj) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const baseTime = Date.now().toString();
        const randId = () => baseTime + Math.random().toString(36).substring(2, 9);

        setMessages(prev => [...prev, {
            id: randId(),
            sender: "user",
            text: commandObj.command,
            timestamp: time
        }]);

        setIsTyping(true);

        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: randId(),
                sender: "bot",
                text: commandObj.response,
                timestamp: time
            }]);
        }, 1000);
    };

    useImperativeHandle(ref, () => ({
        triggerCommand: handleCommandClick
    }));

    return (
        <div className="w-full max-w-[420px] mx-auto md:mx-0 flex flex-col gap-6">
            <div className="relative w-full aspect-[9/19] rounded-[40px] border-4 border-zinc-800 bg-[#10172a] shadow-2xl overflow-hidden ring-1 ring-white/10">

                {/* Dynamic Island Notch */}
                <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50 pt-2">
                    <div className="w-24 h-6 bg-black rounded-full shadow-inner" />
                </div>

                {/* Telegram Header */}
                <div className="bg-[#1e293b]/80 backdrop-blur-md pt-10 pb-3 px-4 flex items-center justify-between border-b border-white/5 z-40 relative">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 overflow-hidden">
                            <Image src={botLogo} alt="Bot Logo" fill className="object-cover" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium text-sm leading-tight">{botName}</h3>
                            <p className="text-blue-400 text-xs">bot</p>
                        </div>
                    </div>
                    <MoreVertical className="w-5 h-5 text-zinc-400" />
                </div>

                {/* Chat Area */}
                <div className="absolute inset-0 top-[88px] bottom-[60px] overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide bg-[#10172a]" style={{ backgroundImage: "radial-gradient(circle at center, #1e293b 0%, #10172a 100%)" }}>
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`max-w-[92%] rounded-2xl p-3 ${msg.sender === "user"
                                    ? "bg-blue-600 text-white rounded-br-sm"
                                    : "bg-[#1e293b] text-zinc-200 rounded-bl-sm border border-white/5"
                                    } shadow-lg relative`}
                                >
                                    <div className="pr-8 pb-1">
                                        {msg.text}
                                    </div>
                                    <span className="text-[10px] text-zinc-400 absolute bottom-1.5 right-2 font-mono">
                                        {msg.timestamp}
                                    </span>
                                </div>
                            </motion.div>
                        ))}

                        {isTyping && (
                            <motion.div
                                key="typing-indicator"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex justify-start"
                            >
                                <div className="bg-[#1e293b] border border-white/5 rounded-2xl rounded-bl-sm p-4 shadow-lg flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </AnimatePresence>
                </div>

                {/* Telegram Input Area */}
                <div className="absolute bottom-0 inset-x-0 h-[60px] bg-[#1e293b]/90 backdrop-blur-md flex items-center px-4 gap-3 border-t border-white/5">
                    <Paperclip className="w-6 h-6 text-zinc-400" />
                    <div className="flex-1 h-9 bg-black/30 rounded-full border border-white/5 px-4 flex items-center">
                        <span className="text-zinc-500 text-sm font-medium">Message...</span>
                    </div>
                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
                        <Send className="w-4 h-4 text-white -ml-0.5" />
                    </div>
                </div>

            </div>

            {/* Interactive Command Buttons */}
            {!hideButtons && (
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest pl-2">Tap a command to simulate</p>
                    <div className="flex flex-wrap gap-2">
                        {commands.map((cmd) => (
                            <button
                                key={cmd.command}
                                onClick={() => handleCommandClick(cmd)}
                                disabled={isTyping}
                                className="px-3 py-2 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-xl text-xs font-medium text-white transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                <code className="text-blue-300 bg-blue-500/10 px-1 py-0.5 rounded">{cmd.command}</code>
                                <span className="text-zinc-400">{cmd.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

PhoneSimulator.displayName = "PhoneSimulator";
