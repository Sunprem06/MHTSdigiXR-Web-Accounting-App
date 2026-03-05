import { useState, useRef, useEffect } from "react";
import { MessageSquare, MessageCircle, X, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";

// WhatsApp Number
const WHATSAPP_NUMBER = "917358105995";

// System prompt for Kayal - the AI assistant
const SYSTEM_CONTEXT = `You are Kayal, the friendly and knowledgeable AI assistant for MHTSdigiX (Maanagarram Hi Tech Solutions), a premier digital agency in Chennai, India.

You are an expert in:
- SERVICE SUPPORT: Helping customers understand our services, features, and capabilities
- SALES SUPPORT: Guiding potential customers through our offerings, pricing, and packages
- MARKETING SUPPORT: Explaining our digital marketing strategies, SEO, social media, and advertising services
- TECHNICAL SUPPORT: Answering technical questions about web development, mobile apps, hosting, and more
- CUSTOMER SUCCESS: Ensuring customers get the right solution for their business needs

Our Services:
- Web Development (React, WordPress, E-commerce, Custom CMS) - Starting ₹15,000
- Mobile App Development (iOS, Android, Flutter, React Native) - Starting ₹50,000
- Digital Marketing (SEO, Social Media, PPC, Content Marketing) - Starting ₹10,000/month
- UI/UX Design (User Research, Wireframing, Prototyping) - Starting ₹25,000
- Branding & Graphics (Logo, Brand Identity, Marketing Materials) - Starting ₹8,000
- Domain & Hosting (SSL, 24/7 Support, 99.9% Uptime) - Starting ₹5,000/year
- Video & Animation (Explainer Videos, Motion Graphics) - Starting ₹15,000

Pricing Packages:
- Starter Package: ₹15,000 (Basic website, 5 pages, mobile responsive)
- Growth Package: ₹35,000 (Custom website, 10 pages, SEO, blog)
- Enterprise Package: Custom pricing (Full digital transformation)

Contact Information:
- WhatsApp: +91 7358105995
- Email: sales@maanagaram.com
- Phone: +91 4447740195
- Address: 4056, 5th Main Road, Ayyapakam, Chennai, Tamil Nadu - 600077
- Website: www.maanagaram.com

Your personality:
- Warm, friendly, and professional
- Speak in a helpful, conversational tone
- Use simple language that non-technical customers can understand
- Be enthusiastic about helping businesses grow digitally
- Always introduce yourself as "Kayal" when greeting
- Provide specific pricing when asked
- Encourage customers to book a free consultation or contact us on WhatsApp for personalized quotes

Always guide customers towards the right service for their needs and encourage them to get in touch for a free consultation.`;

export function FloatingActions() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Hi there! I\'m Kayal, your digital solutions expert at MHTSdigiX. How can I help you today? Whether you need help with web development, mobile apps, digital marketing, or any technical questions - I\'m here to assist!' }
  ]);
  const [input, setInput] = useState("");
  const [streamingResponse, setStreamingResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingResponse]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        const convRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Website Chat' })
        });
        const conv = await convRes.json();
        convId = conv.id;
        setConversationId(convId);
        
        // Send system context as first message
        await fetch(`/api/conversations/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: SYSTEM_CONTEXT, role: 'system' })
        });
      }

      // Send message and stream response
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.startsWith('data: '));
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullResponse += data.content;
                setStreamingResponse(fullResponse);
              }
              if (data.done) {
                setStreamingResponse("");
                return { content: fullResponse };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      return { content: fullResponse || "I'm here to help! What would you like to know about our services?" };
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an issue. Please try again or contact us on WhatsApp for immediate assistance!" }]);
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
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-80 md:w-96 overflow-hidden border border-slate-200 dark:border-slate-700 mb-2"
          >
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-semibold">Kayal - Your Digital Expert</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="h-80 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl text-sm max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-sky-500 text-white self-end rounded-tr-sm'
                      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 self-start rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {streamingResponse && (
                <div className="p-3 rounded-2xl text-sm max-w-[85%] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 self-start rounded-tl-sm shadow-sm">
                  {streamingResponse}
                  <span className="inline-block w-2 h-4 bg-sky-500 animate-pulse ml-1" />
                </div>
              )}
              {sendMessage.isPending && !streamingResponse && (
                <div className="self-start bg-white dark:bg-slate-700 p-3 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-600 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <Sparkles className="w-3 h-3 text-sky-500 animate-pulse" />
                    <span className="text-xs text-slate-400 dark:text-slate-300">AI is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={sendMessage.isPending || !input.trim()}
                data-testid="button-send-chat"
                className="p-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700">
              Need human help? <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" className="text-sky-600 dark:text-sky-400 font-medium hover:underline">Chat on WhatsApp</a>
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
          data-testid="button-chat-toggle"
          className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-sky-100 dark:border-slate-700 text-sky-600 dark:text-sky-400 flex items-center justify-center hover:shadow-xl transition-all"
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
          data-testid="link-whatsapp-float"
          className="w-14 h-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center text-white hover:shadow-green-500/30 hover:shadow-xl transition-all"
        >
          <MessageCircle className="w-7 h-7 fill-current" />
        </motion.a>
      </div>
    </div>
  );
}
