'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { supportChat } from '@/ai/flows/support-chat-flow';
import { useUser } from '@/firebase';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { AnimatePresence, motion } from 'framer-motion';

type Message = {
  role: 'user' | 'model';
  content: string;
};

export function Chatbot() {
  const { userProfile } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const userFallback = userProfile?.firstName?.charAt(0) ?? 'U';

  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          role: 'model',
          content: 'Hello! I am the RSU EOMS Support Agent. How can I help you today?',
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-scroll to the bottom
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await supportChat({
        query: input,
        history: messages,
      });

      const modelMessage: Message = {
        role: 'model',
        content: response.response,
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        role: 'model',
        content: "I'm sorry, but I encountered an error. Please try again.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-50"
          >
            <Card className="w-96 h-[32rem] flex flex-col shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bot className="h-6 w-6" />
                    <div>
                        <CardTitle>Support Agent</CardTitle>
                        <CardDescription>Ask me anything about the portal.</CardDescription>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'model' && (
                          <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                            <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-xs rounded-lg p-3 text-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.content}
                        </div>
                        {message.role === 'user' && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{userFallback}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                             <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                             <div className="max-w-xs rounded-lg p-3 text-sm bg-muted flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin"/>
                                Thinking...
                             </div>
                        </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <div className="flex w-full items-center space-x-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                  />
                  <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 h-16 w-16 rounded-full shadow-lg"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </>
  );
}
