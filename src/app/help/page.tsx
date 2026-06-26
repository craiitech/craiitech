'use client';

import { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookUser, Search, X, HelpCircle, Bot, Accessibility, ShieldAlert, Sparkles, HelpCircle as HelpIcon } from 'lucide-react';
import Link from 'next/link';
import { faqs } from '@/lib/support-data';

// Helper to highlight searched terms inside react elements safely
const highlightText = (text: string, search: string) => {
  if (!search.trim()) return text;
  const cleanSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${cleanSearch})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-100 text-slate-900 dark:text-slate-100 rounded font-black px-0.5 select-none">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');

  // Flatten the FAQ database into single question objects for easy filtering
  const allQuestions = useMemo(() => {
    const list: any[] = [];
    faqs.forEach(section => {
      section.questions.forEach(q => {
        list.push({
          category: section.role,
          question: q.question,
          answer: q.answer,
          answerBlocks: q.answerBlocks
        });
      });
    });
    return list;
  }, []);

  // Filter chips list
  const filterRoles = [
    { label: 'All FAQs', id: 'All' },
    { label: 'General', id: 'General' },
    { label: 'Unit Coordinators', id: 'Unit Coordinators & ODIMOs' },
    { label: 'Campus Directors', id: 'Campus Directors & Supervisors' },
    { label: 'System Admins', id: 'Administrators' },
    { label: 'PWD Support', id: 'Accessibility & Inclusivity (PWD Support)' },
    { label: 'PWA & Printing', id: 'App Installation & Printing' }
  ];

  // Apply search query and role chips filter
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(faq => {
      // Role filter check
      if (selectedRoleFilter !== 'All' && faq.category !== selectedRoleFilter) {
        return false;
      }
      // Search text check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuestion = faq.question.toLowerCase().includes(query);
        const matchesAnswer = faq.answer ? faq.answer.toLowerCase().includes(query) : false;
        const matchesBlocks = faq.answerBlocks ? faq.answerBlocks.some((b: any) => b.content.toLowerCase().includes(query)) : false;
        
        return matchesQuestion || matchesAnswer || matchesBlocks;
      }
      return true;
    });
  }, [allQuestions, searchQuery, selectedRoleFilter]);

  const openChatbot = () => {
    // Trigger floating chatbot popup trigger
    const chatBtn = document.getElementById('tour-chatbot');
    if (chatBtn) {
      chatBtn.click();
    }
  };

  return (
    <Card className="shadow-lg border-primary/10 bg-background overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardHeader className="bg-primary/5 border-b py-8 px-6 sm:px-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <HelpCircle className="h-5 w-5 animate-pulse-slow" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Assistance</span>
                </div>
                <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">EOMS Support Desk</h2>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Access digital manuals, step checklists, and policy directives for Romblon State University.
                </p>
            </div>
            <Button asChild variant="outline" className="border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
              <Link href="/help/manual">
                <BookUser className="mr-2 h-4 w-4" />
                View Full SOP Manual
              </Link>
            </Button>
        </div>
      </CardHeader>
      
      <CardContent className="py-6 px-6 sm:px-10 space-y-8">
        
        {/* Dynamic Search Bar Console */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type keywords (e.g. risk, privacy, paper size, Certbot)..."
            className="pl-10 pr-10 py-6 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
          />
          {searchQuery && (
            <Button 
              onClick={() => setSearchQuery('')}
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-2 h-8 w-8 rounded-full hover:bg-slate-200"
            >
              <X className="h-4 w-4 text-slate-500" />
            </Button>
          )}
        </div>

        {/* Filter Chips Bar */}
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" /> Filter by Module or Role
          </p>
          <div className="flex flex-wrap gap-2">
            {filterRoles.map((role) => (
              <Button
                key={role.id}
                onClick={() => setSelectedRoleFilter(role.id)}
                variant={selectedRoleFilter === role.id ? 'default' : 'outline'}
                size="sm"
                className={`h-7 px-3.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:scale-[1.02] ${
                  selectedRoleFilter === role.id 
                    ? 'shadow-md shadow-primary/20' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-primary/5'
                }`}
              >
                {role.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Search Results Display Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Resolved Support Topics ({filteredQuestions.length})
            </h3>
            {searchQuery && (
              <Badge variant="secondary" className="text-[9px] font-black uppercase">
                Filtered Results
              </Badge>
            )}
          </div>

          {filteredQuestions.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-3">
              {filteredQuestions.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border rounded-xl px-5 py-0.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors bg-white shadow-sm"
                >
                  <AccordionTrigger className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 hover:no-underline py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-left">
                      <span className="text-slate-700 dark:text-slate-300">{highlightText(faq.question, searchQuery)}</span>
                      <Badge variant="outline" className="w-fit border-none bg-primary/5 text-primary text-[8px] font-black uppercase tracking-widest leading-none py-1">
                        {faq.category}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">
                    <div className="prose prose-sm max-w-none text-muted-foreground text-xs leading-relaxed font-semibold italic space-y-3">
                      {faq.answer && <p className="text-slate-600 dark:text-slate-400">"{highlightText(faq.answer, searchQuery)}"</p>}
                      {faq.answerBlocks && (
                        <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                          {faq.answerBlocks.map((block: any, i: number) => (
                            <li 
                              key={i} 
                              dangerouslySetInnerHTML={{ 
                                __html: searchQuery.trim() 
                                  ? block.content.replace(
                                      new RegExp(`(${searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'), 
                                      '<mark class="bg-yellow-100 text-slate-900 dark:text-slate-100 rounded font-black px-0.5 select-none">$1</mark>'
                                    ) 
                                  : block.content 
                              }} 
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-4 max-w-md mx-auto">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <X className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">No matching search results</p>
                <p className="text-[10px] text-muted-foreground italic font-medium">"We couldn't find any FAQs or instructions matching '{searchQuery}'."</p>
              </div>
              <Button 
                onClick={openChatbot} 
                className="w-full h-10 font-black uppercase tracking-wider text-[10px] gap-2 shadow-lg shadow-primary/10"
              >
                <Bot className="h-4 w-4" />
                Ask EOMS Chatbot Instead
              </Button>
            </div>
          )}
        </div>

      </CardContent>

      <CardFooter className="bg-muted/10 border-t py-6 px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <HelpIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">Direct Consultation</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Contact QAO romblon state university</p>
          </div>
        </div>
        <p className="text-[9px] font-bold text-slate-400 italic">© 2025 Romblon State University EOMS Portal</p>
      </CardFooter>
    </Card>
  );
}
