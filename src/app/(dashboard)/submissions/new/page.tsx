
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SubmissionForm } from '@/components/dashboard/submission-form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const submissionTypes = [
    'Operational Plans',
    'Objectives Monitoring',
    'Risk and Opportunity Registry Form',
    'Risk and Opportunity Action Plan',
    'Updated Needs and Expectation of Interested Parties',
    'SWOT Analysis',
]

export default function NewSubmissionPage() {
  return (
    <div className="space-y-4">
       <div>
        <h2 className="text-2xl font-bold tracking-tight">New Submission</h2>
        <p className="text-muted-foreground">
            Select a report type below to create a new submission.
        </p>
      </div>
      <Accordion type="single" collapsible className="w-full space-y-4">
        {submissionTypes.map(reportType => (
            <Card key={reportType}>
                <AccordionItem value={reportType} className="border-b-0">
                    <AccordionTrigger className="p-6 hover:no-underline">
                        <div className="text-left">
                            <h3 className="text-lg font-semibold">{reportType}</h3>
                            <p className="text-sm text-muted-foreground">Click to submit this report.</p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 pt-0">
                         <SubmissionForm reportType={reportType} />
                    </AccordionContent>
                </AccordionItem>
            </Card>
        ))}
      </Accordion>
    </div>
  );
}

    