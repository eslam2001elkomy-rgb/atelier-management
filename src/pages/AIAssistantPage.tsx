import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

export default function AIAssistantPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'شبيك لبيك، مساعد أتيليه إسلام الكومي بين إيديك! قولي "عرض صورة اوردر [الكود]" أو اطلب مني إضافة وحذف الأوردرات.' }
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const currentMsg = message.trim();
    setMessage('');
    setMessages(prev => [...prev, { id: Math.random().toString(), role: 'user', content: currentMsg }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_ai_response', { p_message: currentMsg });
      if (error) throw error;

      if (data && data.startsWith('SHOW_IMAGE:')) {
        const url = data.replace('SHOW_IMAGE:', '');
        setMessages(prev => [...prev, { 
          id: Math.random().toString(), 
          role: 'assistant', 
          content: 'أهو يا فنان، دي الصورة اللي لقيتها للأوردر ده:',
          imageUrl: url 
        }]);
      } else {
        setMessages(prev => [...prev, { id: Math.random().toString(), role: 'assistant', content: data }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Math.random().toString(), role: 'assistant', content: 'مش قادر أنفذ الأمر حالياً، ارفع التعديل تاني.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-xl mx-auto p-4" dir="rtl">
      <div className="flex-1 overflow-y-auto bg-slate-900 rounded-xl p-4 mb-4 space-y-4 border border-slate-800">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`p-3 rounded-xl text-sm max-w-[85%] ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-amber-400'}`}>
              <p>{m.content}</p>
              {m.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-slate-700">
                  <img src={m.imageUrl} alt="Order" className="w-full h-auto max-h-60 object-cover" />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={onSend} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="قولي: عرض صورة اوردر 1234567..."
          className="flex-1 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none"
        />
        <button type="submit" className="bg-amber-600 px-5 rounded-lg text-white font-bold text-sm">إرسال</button>
      </form>
    </div>
  );
}
