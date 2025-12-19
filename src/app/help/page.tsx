
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { BookUser } from 'lucide-react';
import Link from 'next/link';
import { faqs } from '@/lib/support-data';


export default function HelpPage() {
  return (
    <div className="space-y-6 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Support Center</h2>
            <p className="text-muted-foreground">
              Find answers to common questions about using the RSU EOMS Portal.
            </p>
          </div>
           <Button asChild variant="outline">
              <Link href="/help/manual">
                <BookUser className="mr-2 h-4 w-4" />
                View Full User Manual
              </Link>
            </Button>
      </div>

      <Accordion type="multiple" className="w-full">
        {faqs.map((section) => (
          <div key={section.role}>
            <h3 className="mt-6 mb-2 text-xl font-semibold tracking-tight">
              {section.role}
            </h3>
            {section.questions.map((faq, index) => (
              <AccordionItem key={`${section.role}-${index}`} value={`${section.role}-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none text-muted-foreground space-y-2">
                    {faq.answer && <p>{faq.answer}</p>}
                    {faq.answerBlocks && (
                      <ul className="list-disc pl-5 space-y-1">
                        {faq.answerBlocks.map((block, i) => (
                          <li key={i} dangerouslySetInnerHTML={{ __html: block.content }} />
                        ))}
                      </ul>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </div>
        ))}
      </Accordion>
    </div>
  );
}
