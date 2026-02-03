import { useState } from "react";
import { MessageSquare, MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

// WhatsApp Number
const WHATSAPP_NUMBER = "917358105995";

export function FloatingActions() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', content: string }[]>([
    { role: 'bot', content: 'Hi there! 👋 How can I help you today? Need website, app, or marketing services?' }
  ]);
  const [input, setInput] = useState("");

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      // In a real implementation, this would connect to the OpenAI endpoint
      // For now, we simulate a response since we don't have the full backend wired yet
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { content: "Thank you for your message! Our team is currently offline in this demo, but please connect with us on WhatsApp for immediate assistance." };
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'bot', content: data.content }]);
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    sendMessage.mutate(input);
    setInput("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 items-end">
      {/* AI Chat Widget */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-80 md:w-96 overflow-hidden border border-slate-200 mb-2"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-sky-500 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-semibold">MHTS Assistant</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="h-80 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl text-sm max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-sky-500 text-white self-end rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-700 self-start rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="self-start bg-white p-3 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={sendMessage.isPending || !input.trim()}
                className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-slate-50 p-2 text-center text-xs text-slate-400 border-t border-slate-100">
              Need human help? <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" className="text-emerald-600 font-medium hover:underline">Chat on WhatsApp</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 items-center">
        {/* Chat Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-white shadow-lg border border-emerald-100 text-emerald-600 flex items-center justify-center hover:shadow-xl transition-all"
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </motion.button>

        {/* WhatsApp Button */}
        <motion.a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center text-white hover:shadow-green-500/30 hover:shadow-xl transition-all"
        >
          <MessageCircle className="w-7 h-7 fill-current" />
        </motion.a>
      </div>
    </div>
  );
}
