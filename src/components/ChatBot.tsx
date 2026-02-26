import { useState, useRef, useEffect } from 'react';

interface Message {
    id: number;
    role: 'bot' | 'user';
    text: string;
}

const WELCOME = "👋 Hi there! I'm **OlaBot**, your Ola Cars assistant. How can I help you today?";

const QUICK_REPLIES = [
    'Book a ride',
    'Fleet pricing',
    'Driver support',
    'Contact us',
];

const BOT_REPLY =
    "🚀 Thanks for reaching out! Our **AI assistant** is coming soon. For now, please contact our support team at **+91 98765 43210** or **support@olacars.com**. We're happy to help! 😊";

let msgId = 0;
const newMsg = (role: 'bot' | 'user', text: string): Message => ({
    id: ++msgId,
    role,
    text,
});

/* Simple markdown bold renderer */
const renderText = (text: string) => {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
};

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([newMsg('bot', WELCOME)]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [unread, setUnread] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
            setUnread(0);
        }
    }, [isOpen]);

    const sendMessage = (text: string) => {
        if (!text.trim()) return;

        setMessages((prev) => [...prev, newMsg('user', text)]);
        setInputText('');
        setIsTyping(true);

        // Simulate bot "typing" delay then reply
        setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [...prev, newMsg('bot', BOT_REPLY)]);
            if (!isOpen) setUnread((n) => n + 1);
        }, 1400);
    };

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') sendMessage(inputText);
    };

    return (
        <>
            {/* ── Chat Window ──────────────────────────────────── */}
            {isOpen && (
                <div className="chat-window" style={{ background: '#111111' }}>

                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-5 py-4"
                        style={{
                            background: 'linear-gradient(135deg, #1C1C1C 0%, #0d0d0d 100%)',
                            borderBottom: '1px solid #2A2A2A',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                🤖
                            </div>
                            <div>
                                <h4 className="text-white font-semibold text-sm leading-tight">OlaBot</h4>
                                <span className="text-xs flex items-center gap-1" style={{ color: '#C8E600' }}>
                                    <span
                                        className="w-1.5 h-1.5 rounded-full inline-block"
                                        style={{ background: '#C8E600' }}
                                    />
                                    Online · AI coming soon
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 border-none cursor-pointer text-lg"
                            style={{ background: 'transparent' }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        className="flex flex-col gap-3 px-4 py-4 overflow-y-auto"
                        style={{ maxHeight: '320px', minHeight: '200px' }}
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'bot' && (
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 self-end"
                                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                                    >
                                        🤖
                                    </div>
                                )}
                                <div className={msg.role === 'bot' ? 'chat-message-bot' : 'chat-message-user'}>
                                    {renderText(msg.text)}
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="flex justify-start items-end gap-2">
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                                    style={{ background: '#C8E600', color: '#0A0A0A' }}
                                >
                                    🤖
                                </div>
                                <div className="chat-message-bot flex items-center gap-1 py-3 px-4">
                                    <span className="typing-dot" />
                                    <span className="typing-dot" />
                                    <span className="typing-dot" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick replies */}
                    <div
                        className="flex flex-wrap gap-2 px-4 pb-3"
                        style={{ borderTop: '1px solid #2A2A2A', paddingTop: '10px' }}
                    >
                        {QUICK_REPLIES.map((qr) => (
                            <button
                                key={qr}
                                onClick={() => sendMessage(qr)}
                                className="text-xs px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 border font-medium"
                                style={{
                                    background: 'transparent',
                                    borderColor: '#C8E600',
                                    color: '#C8E600',
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = '#C8E600';
                                    (e.currentTarget as HTMLButtonElement).style.color = '#0A0A0A';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLButtonElement).style.color = '#C8E600';
                                }}
                            >
                                {qr}
                            </button>
                        ))}
                    </div>

                    {/* Input */}
                    <div
                        className="flex items-center gap-2 px-4 py-3"
                        style={{
                            borderTop: '1px solid #2A2A2A',
                            background: '#1C1C1C',
                        }}
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Ask me anything..."
                            className="flex-1 text-sm rounded-full px-4 py-2.5 outline-none border transition-all duration-200"
                            style={{
                                background: '#111111',
                                borderColor: '#2A2A2A',
                                color: '#fff',
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#C8E600'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                        />
                        <button
                            onClick={() => sendMessage(inputText)}
                            disabled={!inputText.trim() || isTyping}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-base border-none cursor-pointer flex-shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                            onMouseEnter={(e) => {
                                if (!inputText.trim()) return;
                                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                            }}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}

            {/* ── FAB Button ───────────────────────────────────── */}
            <button
                id="chat-fab"
                className="chat-fab"
                onClick={() => { setIsOpen((o) => !o); setUnread(0); }}
                aria-label="Open driver support chat"
                title="Chat with OlaBot"
            >
                {isOpen ? '✕' : '💬'}

                {/* Unread badge */}
                {!isOpen && unread > 0 && (
                    <span
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                        style={{ background: '#E74C3C' }}
                    >
                        {unread}
                    </span>
                )}
            </button>
        </>
    );
};

export default ChatBot;
