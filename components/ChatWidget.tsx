import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, MessageRole } from '../types';
import { initializeChat, sendMessageToGemini } from '../geminiService';
import ProductCard from './ProductCard';

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[\s\S]*?\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.length >= 4 && part.endsWith('**')) {
      return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const ChatWidget: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: MessageRole.MODEL,
      text: 'สวัสดีครับ 🙏 อยากให้ Amazie แนะนำอะไรสอบถามผมได้เลยนะครับ !',
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = process.env.API_KEY || '';
    if(key) {
        initializeChat(key);
    } else {
        console.error("API_KEY is missing from environment variables.");
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    if (!process.env.API_KEY) {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: MessageRole.SYSTEM,
            text: "Error: API_KEY is missing. Please configure your environment."
        }]);
        return;
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: inputValue,
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(newMessage.text, newMessage.image);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        text: response.text,
        products: response.products
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: MessageRole.SYSTEM,
        text: "Sorry, something went wrong. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full bottom-6 right-6 z-50 flex flex-col items-end select-none">
          {/* Header */}
          <div className="w-full bg-gradient-to-r from-blue-100 to-[#2e6cf7] p-4 flex fixed items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
               <img src="https://www.amaze.shop/wp-content/uploads/2024/10/Amaze-App-Icon-IOS-1024x1024.png" />
              </div>
              <div>
                <h3 className="text-blue-950 font-bold text-lg">Amazie</h3>
                <p className="text-blue-900 text-xs">ผู้ช่วย AI อัจฉริยะ</p>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 overflow-y-auto bg-gray-50 space-y-4 scrollbar-hide pt-[90px] px-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.role === MessageRole.USER ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                    msg.role === MessageRole.USER 
                      ? 'bg-[#2e6cf7] text-white rounded-br-none' 
                      : msg.role === MessageRole.SYSTEM
                        ? 'bg-red-100 text-red-600'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}
                >
                  {msg.image && (
                    <img 
                      src={msg.image} 
                      alt="User upload" 
                      className="max-w-full h-32 object-cover rounded-lg mb-2 border border-white/20" 
                    />
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans overflow-hidden text-ellipsis">
                    {renderFormattedText(msg.text)}
                  </p>
                </div>
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-2 w-[85%] space-y-2 animate-pulse-fade-in">
                    <p className="text-xs text-gray-500 ml-1 mb-1">Recommended Products:</p>
                    {msg.products.map(product => (
                      <ProductCard key={product.sku} product={product} />
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-gray-400 mt-1 mx-1">
                  {msg.role === MessageRole.USER ? 'You' : 'Amazie'}
                </span>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                <div className="h-8 bg-gray-200 rounded-2xl w-24"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="w-full fixed bottom-0 p-3 bg-white border-t border-gray-100">
            {selectedImage && (
              <div className="relative inline-block mb-2">
                <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-gray-200" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex items-end space-x-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 rounded-full hover:bg-blue-50"
                title="Upload Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </button>
              
              <div className="flex-1 bg-gray-50 rounded-2xl flex items-center px-3 border border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedImage ? "พิมพ์ในนี้ได้เลยครับ..." : "ถาม Amazie ได้เลย..."}
                  className="w-full bg-transparent py-3 focus:outline-none text-sm"
                />
              </div>

              <button 
                onClick={handleSendMessage}
                disabled={isLoading || (!inputValue && !selectedImage)}
                className={`p-3 rounded-full transition-all shadow-md ${
                  isLoading || (!inputValue && !selectedImage)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#2e6cf7] text-white hover:bg-[#2e6cf7] hover:shadow-lg hover:scale-105 active:scale-95'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
    </div>
  );
};

export default ChatWidget;