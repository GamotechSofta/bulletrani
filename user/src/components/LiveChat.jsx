import React, { useState, useEffect, useRef } from 'react';

export default function LiveChat({ socket, username, avatar }) {
  const [messages, setMessages] = useState([
    { id: 1, username: 'AviatorBot', avatar: '🤖', message: 'Welcome to Aviator Real Crash Betting! High RTP 97%', timestamp: '12:00' },
    { id: 2, username: 'SkyKing', avatar: '✈️', message: 'Ready for 10x+ run today! 🚀', timestamp: '12:01' }
  ]);
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const chatEndRef = useRef(null);

  const quickReactions = ['🚀 10x!', '🔥 GG', '💸 Cashed out!', '🎯 Let it ride!', '🤑 Next round!'];

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev.slice(-50), msg]);
    };

    socket.on('chat:broadcast', handleMessage);

    return () => {
      socket.off('chat:broadcast', handleMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = (content) => {
    const msgToSend = typeof content === 'string' ? content : text;
    if (!msgToSend.trim() || !socket) return;

    socket.emit('chat:message', {
      username: username || 'Pilot',
      avatar: avatar || '🧑‍✈️',
      message: msgToSend.trim()
    });

    setText('');
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 bg-gradient-to-r from-red-600 to-rose-600 text-white p-3 rounded-full shadow-[0_0_20px_rgba(229,34,60,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 select-none"
      >
        <span className="text-lg">💬</span>
        <span className="text-xs font-bold hidden sm:inline">Live Chat</span>
      </button>

      {/* Slide-out Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-18 right-4 z-40 w-80 sm:w-88 h-96 bg-[#121620] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in select-none">
          <div className="bg-[#0b0e14] p-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Multiplayer Chat</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-sm p-1">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-2">
                <span className="text-sm shrink-0">{m.avatar || '🧑‍✈️'}</span>
                <div className="bg-white/[0.04] p-2 rounded-xl border border-white/5 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-gray-300 text-[11px]">{m.username}</span>
                    <span className="text-[9px] text-gray-500">{m.timestamp}</span>
                  </div>
                  <p className="text-gray-200 text-xs break-words">{m.message}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Reaction Chips */}
          <div className="px-2 py-1 bg-[#0b0e14] border-t border-white/5 flex items-center gap-1 overflow-x-auto scrollbar-none">
            {quickReactions.map((r, i) => (
              <button
                key={i}
                onClick={() => sendMessage(r)}
                className="shrink-0 px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded-md text-[10px] text-gray-300 font-medium border border-white/5"
              >
                {r}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="p-2 border-t border-white/10 bg-[#0b0e14] flex gap-2"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
