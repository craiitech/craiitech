'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import { useUser } from '@/firebase';
import { useVoice } from '@/components/voice/voice-provider';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { AnimatePresence, motion } from 'framer-motion';
import { faqs } from '@/lib/support-data';
import { getHelpForPath } from '@/lib/contextual-help-data';
import Link from 'next/link';

type Message = {
  role: 'user' | 'model';
  content: string | React.ReactNode;
};

// Flatten the FAQs for easier searching
const allFaqs = faqs.flatMap(section => section.questions);

// General fallback recommendations
const defaultSuggestedQuestions = [
    "How do I log a new risk?",
    "How do I handle a rejected submission?",
    "Where can I find the report templates?",
    "What accessibility features are available for PWD users?"
];

// Tokenized query match algorithm ranking FAQs by match weight
const findAnswer = (query: string): { answer: string | React.ReactNode, question: string } | null => {
  const cleanQuery = query.toLowerCase().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  if (!cleanQuery) return null;
  
  const queryTokens = cleanQuery.split(/\s+/).filter(t => t.length > 2);
  if (queryTokens.length === 0) return null;
  
  let bestMatch: typeof allFaqs[number] | null = null;
  let bestScore = 0;
  
  for (const faq of allFaqs) {
    const qText = faq.question.toLowerCase();
    const aText = (faq.answer || "").toLowerCase() + 
      (faq.answerBlocks?.map(b => b.content).join(" ").toLowerCase() || "");
    
    let score = 0;
    
    // Direct phrase matches (high weight)
    if (qText.includes(cleanQuery)) {
      score += 15;
    } else if (aText.includes(cleanQuery)) {
      score += 5;
    }
    
    // Keyword match weights
    for (const token of queryTokens) {
      if (qText.includes(token)) {
        score += 4;
      }
      if (aText.includes(token)) {
        score += 1;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }
  
  // Minimum match score threshold
  if (bestMatch && bestScore >= 4) {
    const ans = bestMatch.answerBlocks ? (
      <div className="space-y-2">
        <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wide">Detailed Guide:</p>
        <ul className="list-disc space-y-1.5 pl-4 text-slate-600 dark:text-slate-400">
            {bestMatch.answerBlocks.map((block, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: block.content }} />
            ))}
        </ul>
      </div>
    ) : (
      <p className="leading-relaxed text-slate-600 dark:text-slate-400 font-medium">{bestMatch.answer}</p>
    );
    
    return { answer: ans, question: bestMatch.question };
  }
  
  return null;
};

export function Chatbot() {
  const { userProfile } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { speak } = useVoice();
  const userFallback = userProfile?.firstName?.charAt(0) ?? 'U';
  const lastMessageIsFromBot = messages.length > 0 && messages[messages.length - 1].role === 'model';

  // Get operational help context for the active page
  const pageHelp = getHelpForPath(pathname, activeTab);

  // Dynamic suggestions based on active pathname
  const getDynamicSuggestions = () => {
    if (pathname.includes('risk-register')) {
      return [
        "How do I log a new risk?",
        "What happens if my risk rating is 'Low'?",
        "How do I close a risk I have logged?"
      ];
    }
    if (pathname.includes('submissions')) {
      return [
        "What is the 'Draft' submission mode?",
        "What are the core EOMS documents required?",
        "How do I handle a rejected submission?"
      ];
    }
    if (pathname.includes('audit')) {
      return [
        "What is the required paper size for printing Audit Evidence Logs?",
        "Can I re-open a closed decision or CAR?",
        "What are Consolidated Notices?"
      ];
    }
    if (pathname.includes('profile')) {
      return [
        "What accessibility features are available for PWD users?",
        "How do I access and enable these accessibility features?",
        "Can I delete my account?"
      ];
    }
    if (pathname.includes('settings')) {
      return [
        "How do I perform a system backup?",
        "How do I manage the Institutional Roadmap?",
        "How do I use Let's Encrypt SSL for the portal domain?"
      ];
    }
    return defaultSuggestedQuestions;
  };

  const suggestedQuestions = getDynamicSuggestions();

  // Reset/Initiate chatbot conversation upon opening
  useEffect(() => {
    if (isOpen) {
      const pageTitle = pageHelp?.title ? `"${pageHelp.title}"` : 'this area';
      
      const welcomeContent = (
        <div className="space-y-3">
          <p className="font-semibold">Good day, {userProfile?.unitName || 'esteemed colleague'}, I am your EOMS Support Agent — your RSU quality management companion.</p>
          {pageHelp && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mt-2 space-y-2 animate-in fade-in zoom-in duration-300">
              <p className="text-[10px] text-primary font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Context Action Detected
              </p>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 italic">"I see you are currently viewing the **{pageHelp.title}** module. Would you like a step-by-step summary explanation of this page?"</p>
              <Button 
                onClick={handleExplainPage} 
                size="sm" 
                variant="outline" 
                className="h-8 w-full text-[9px] font-black uppercase tracking-wider border-primary/20 text-primary bg-white dark:bg-slate-800 hover:bg-primary/5"
              >
                Explain This Page
              </Button>
            </div>
          )}
        </div>
      );

      setMessages([
        {
          role: 'model',
          content: welcomeContent,
        },
      ]);

      const unitName = userProfile?.unitName || 'esteemed colleague';
      speak(`Good day, ${unitName}, I am your EOMS Support Agent, your RSU quality management companion.`);
    }
  }, [isOpen, pathname, activeTab, speak, userProfile?.unitName]);

  useEffect(() => {
    // Auto-scroll to the bottom of the dialogue on new messages
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  const handleExplainPage = () => {
    if (!pageHelp) return;

    // Send user intent to explain page
    const userMessage: Message = { role: 'user', content: `Can you explain the current page: ${pageHelp.title}?` };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    setTimeout(() => {
      const explanationMsg = (
        <div className="space-y-3">
          <p className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 border-b pb-1">Procedure: {pageHelp.title}</p>
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 italic">"{pageHelp.description}"</p>
          
          <div className="space-y-3 mt-2">
            {pageHelp.steps.map((step, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <span className="h-4 w-4 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black">{i + 1}</span>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">{step.title}</p>
                  <p className="text-[10px] text-muted-foreground italic">"{step.desc}"</p>
                </div>
              </div>
            ))}
          </div>

          {pageHelp.alert && (
            <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-[9px] font-medium italic mt-3">
              <span className="font-black uppercase not-italic block mb-0.5">⚠️ Alert Notice:</span>
              "{pageHelp.alert}"
            </div>
          )}
        </div>
      );

      setMessages(prev => [
        ...prev, 
        { role: 'model', content: explanationMsg }
      ]);
      setIsLoading(false);
    }, 800);
  };

  const handleSend = async (query: string = input) => {
    if (!query.trim()) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Simulate thinking with tokenized search lookup
    setTimeout(() => {
        const found = findAnswer(query);
        let responseContent: React.ReactNode;

        if (found) {
            responseContent = (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Found QA Standard Answer
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Q: "{found.question}"</p>
                <div className="text-xs">{found.answer}</div>
              </div>
            );
        } else {
            responseContent = (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                  <AlertCircle className="h-3.5 w-3.5" /> No Direct FAQ Match
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  I couldn't find a direct match in the database, but you can find exhaustive procedures in the{' '}
                  <Link href="/help/manual" className="underline font-bold text-primary hover:text-primary/80" target="_blank">
                    Institutional User Manual
                  </Link>.
                </p>
              </div>
            );
        }

        setMessages(prev => [...prev, { role: 'model', content: responseContent }]);
        setIsLoading(false);
    }, 1000);
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
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-4 z-50 focus-visible:outline-none"
          >
            <Card className="w-[380px] sm:w-[440px] h-[75dvh] max-h-[600px] flex flex-col shadow-2xl border-primary/20 bg-white/80 backdrop-blur-md overflow-hidden shadow-[0_0_50px_-12px_rgba(15,23,42,0.15)] select-none">
              <CardHeader className="flex flex-row items-center justify-between bg-primary/5 border-b py-3.5 px-5 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">QA Support Assistant</CardTitle>
                        <CardDescription className="text-[9px] font-black uppercase text-muted-foreground tracking-wider mt-0.5">RSU EOMS Digital Companion</CardDescription>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4 text-slate-500" />
                </Button>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-white/40">
                <ScrollArea className="flex-1 px-5 py-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex items-start gap-2.5 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'model' && (
                          <Avatar className="h-7 w-7 bg-primary text-primary-foreground border shadow-sm mt-0.5">
                            <AvatarFallback><Bot className="h-4 w-4"/></AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs shadow-sm break-words leading-relaxed ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground font-semibold rounded-tr-none'
                              : 'bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-300 rounded-tl-none font-medium'
                          }`}
                        >
                            {message.content}
                        </div>
                        {message.role === 'user' && (
                          <Avatar className="h-7 w-7 border shadow-sm mt-0.5">
                            <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">{userFallback}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-2.5">
                             <Avatar className="h-7 w-7 bg-primary text-primary-foreground border shadow-sm mt-0.5">
                                <AvatarFallback><Bot className="h-4 w-4"/></AvatarFallback>
                            </Avatar>
                             <div className="max-w-[80%] rounded-2xl rounded-tl-none px-4 py-3 text-xs bg-white border flex items-center gap-2 text-slate-500 italic shadow-sm">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary"/>
                                Support Agent is typing...
                             </div>
                        </div>
                    )}
                    {lastMessageIsFromBot && !isLoading && (
                        <div className="flex flex-col items-start gap-1.5 pt-3 pl-9">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                              <HelpCircle className="h-3 w-3 text-primary" /> Suggested Questions:
                            </p>
                            <div className="flex flex-col gap-1 w-full">
                              {suggestedQuestions.map((q, i) => (
                                  <Button 
                                    key={i} 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-auto max-w-full text-left justify-start h-auto py-1.5 px-3 bg-white dark:bg-slate-900 text-[10px] leading-tight font-bold italic border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all rounded-xl" 
                                    onClick={() => handleSend(q)}
                                  >
                                      "{q}"
                                  </Button>
                              ))}
                            </div>
                        </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="bg-slate-50/80 dark:bg-slate-800/80 border-t py-3 px-5 shrink-0">
                <div className="flex w-full items-center space-x-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask a question about the system..."
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="h-10 text-xs bg-white border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                  />
                  <Button 
                    onClick={() => handleSend()} 
                    disabled={isLoading || !input.trim()}
                    className="h-10 w-10 shrink-0 rounded-xl bg-primary text-white shadow-md shadow-primary/20 hover:scale-[1.03] transition-transform"
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3">
        {!isOpen && (
          <span className="pointer-events-auto select-none animate-in fade-in slide-in-from-right-4 duration-500 rounded-full bg-primary/10 backdrop-blur-md border border-primary/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary shadow-lg">
            Need Help?
          </span>
        )}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-2xl bg-primary text-white hover:scale-105 transition-all duration-300 shadow-primary/30 flex items-center justify-center border border-white/20"
          size="icon"
          title="Get Help Chatbot"
          id="tour-chatbot"
        >
          {isOpen ? <X className="h-5 w-5 animate-in spin-in duration-300" /> : <MessageSquare className="h-5 w-5 animate-in zoom-in duration-300" />}
        </Button>
      </div>
    </>
  );
}

// Inline svg icons for UI cleanliness
function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
