'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
    ShieldCheck, 
    BookOpen, 
    ClipboardCheck, 
    FileText, 
    TrendingUp, 
    Search, 
    Database, 
    History, 
    Target, 
    ShieldAlert, 
    CheckCircle2, 
    Info, 
    Monitor, 
    Trash2, 
    Printer, 
    LayoutList, 
    Compass, 
    UserCheck, 
    Gavel, 
    Building2,
    Users,
    Activity,
    Settings,
    Layers,
    Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const manualSections = [
  {
    role: 'Global System Navigation (All Users)',
    icon: <Compass className="h-5 w-5 text-primary" />,
    sections: [
      {
        title: 'Understanding the System Sidebar',
        content: `
          <p>The sidebar on the left is your primary gateway to the EOMS modules. Depending on your role, some menus may be hidden or read-only:</p>
          <ul class="list-disc space-y-2 pl-6">
            <li><strong>Home (Dashboard):</strong> Your daily cockpit. Shows maturity scores, pending tasks, and official announcements.</li>
            <li><strong>Activity Log:</strong> Personal workspace for logging daily tasks and WFH sheets.</li>
            <li><strong>EOMS Submission Hub:</strong> The core repository for the 6 mandatory EOMS documents (SWOT, OpPlan, ROR, etc.).</li>
            <li><strong>Risk & Opportunity Registry:</strong> The digital database where individual risks must be analyzed before document submission.</li>
            <li><strong>IQA / Unit Monitoring:</strong> Tools for internal audits and on-site facility inspections.</li>
            <li><strong>Academic Programs:</strong> Detailed monitoring for CHED COPC, AACCUP levels, and student data.</li>
            <li><strong>Settings:</strong> Admin-only module for managing users, campuses, and global system parameters.</li>
          </ul>
        `,
      },
      {
        title: 'Document Control & Revision Standards',
        content: `
          <p>The portal enforces strict ISO Document Control standards for all evidence logs:</p>
          <ul class="list-disc space-y-2 pl-6">
            <li><strong>Automated Control Numbers:</strong> Every submission is assigned a unique string (e.g., RSU-UNIT-REV-DOC-DATE) used for institutional tracking.</li>
            <li><strong>Revision Logic:</strong> All documents start at <strong>Rev 00</strong>. Resubmissions or corrections automatically increment this to Rev 01, 02, etc.</li>
            <li><strong>Draft vs. Final:</strong> 
              <br/>- <strong>Draft:</strong> For preliminary content review. No signatures needed.
              <br/>- <strong>Final:</strong> Officially signed, scanned PDF for institutional filing.
            </li>
          </ul>
        `,
      }
    ],
  },
  {
    role: 'Unit Coordinator & Unit ODIMO Guide',
    icon: <UserCheck className="h-5 w-5 text-blue-600" />,
    sections: [
        {
            title: 'How to Submit EOMS Documents',
            content: `
                <p>Follow this standard workflow to maintain unit compliance:</p>
                <ol class="list-decimal space-y-2 pl-6">
                    <li><strong>Preparation:</strong> Download the latest template from the "Download Templates" button in the Submission Hub.</li>
                    <li><strong>Draft Submission:</strong> Upload a working Google Doc first to receive feedback from the Quality Assurance Office.</li>
                    <li><strong>Refinement:</strong> Address auditor comments directly in your document.</li>
                    <li><strong>Final Filing:</strong> Once the content is cleared, print, sign, scan to PDF, and submit as "Final" to achieve "Approved" status.</li>
                </ol>
                <p class="mt-4 font-bold text-slate-800">The 6 Core Documents:</p>
                <p class="text-xs">1. SWOT | 2. Needs & Expectations | 3. Operational Plan | 4. Quality Objectives | 5. Risk Registry | 6. Risk Action Plan (if Medium/High risk).</p>
            `
        },
        {
            title: 'Managing the Digital Risk Register',
            content: `
                <p>Individual risks must be encoded digitally <strong>BEFORE</strong> you can submit your formal ROR document:</p>
                <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Identification:</strong> Define the process objective and the specific risk/opportunity.</li>
                    <li><strong>Assessment:</strong> Use the ROR Blue Column criteria for Likelihood and Consequence.</li>
                    <li><strong>AI Assist:</strong> Use the "AI Suggest" button to generate ISO-aligned treatment strategies.</li>
                    <li><strong>Final Cycle:</strong> You must update the "Post-Treatment Analysis" (Green Column) for all entries before your Final Cycle submission will be accepted.</li>
                </ul>
            `
        },
        {
            title: 'Program Compliance Tracking',
            content: `
                <p>For academic units, ensure your assigned program offerings are updated annually:</p>
                <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Authority:</strong> Keep your CHED COPC certificates and BOR resolutions updated.</li>
                    <li><strong>Accreditation:</strong> Track AACCUP levels and respond to accreditor recommendations.</li>
                    <li><strong>Outcomes:</strong> Log graduation counts, Board Exam results, and tracer study data in the Batch Data Hub.</li>
                </ul>
            `
        }
    ]
  },
  {
      role: 'Campus Director & Supervisor Guide',
      icon: <Building2 className="h-5 w-5 text-amber-600" />,
      sections: [
          {
              title: 'Approving Submissions',
              content: `
                <p>As a supervisor, you are the final gatekeeper for site quality:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Review Queue:</strong> Access "Submission Approval" to see pending documents from your campus.</li>
                    <li><strong>Checklist:</strong> You must verify all points in the Approver's Compliance Checklist before clicking Approve.</li>
                    <li><strong>Feedback:</strong> If a document is rejected, provide specific corrective instructions in the comments.</li>
                </ul>
              `
          },
          {
              title: 'Site Performance & Notices',
              content: `
                <p>Utilize the Site Matrix to drive campus-wide improvement:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Monitoring:</strong> View the aggregate maturity index of all units in your site.</li>
                    <li><strong>Notices:</strong> Generate printable <strong>Notices of Non-Compliance</strong> for units with missing requirements to ensure 100% documentation parity.</li>
                    <li><strong>Actionable Decisions:</strong> Track the implementation of tasks assigned to your site from institutional Management Reviews.</li>
                </ul>
              `
          }
      ]
  },
  {
      role: 'System Administrator & Auditor Guide',
      icon: <Gavel className="h-5 w-5 text-indigo-600" />,
      sections: [
          {
              title: 'IQA Strategic Planning',
              content: `
                <p>Full lifecycle management of institutional audits:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>Planning:</strong> Create annual Audit Plans and define the Lead Auditor.</li>
                    <li><strong>Itinerary:</strong> Provision individual unit sessions and map specific ISO clauses to be verified.</li>
                    <li><strong>Evidence Logs:</strong> Consolidate findings into the final printable <strong>Evidence Log Sheets</strong>.</li>
                </ul>
              `
          },
          {
              title: 'System Configuration & User Control',
              content: `
                <p>High-level administrative functions in the Settings module:</p>
                 <ul class="list-disc space-y-2 pl-6">
                    <li><strong>User Verification:</strong> Authenticate new personnel registrations and assign correct roles.</li>
                    <li><strong>Institutional Data:</strong> Manage the directory of Campuses, Units, and Roles.</li>
                    <li><strong>Backups:</strong> Download the total system archive (XLSX) and permanent Audit Trail logs.</li>
                </ul>
              `
          }
      ]
  }
];

export default function UserManualPage() {
  return (
    <Card className="shadow-lg border-primary/10 bg-background">
      <CardHeader className="bg-primary/5 border-b py-8 px-10">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                    <BookOpen className="h-10 w-10" />
                </div>
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 leading-none">Institutional User Manual</h2>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-2 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        RSU EOMS Digital Portal Standard Operating Procedures
                    </p>
                </div>
            </div>
            <Badge variant="outline" className="h-6 px-4 font-black text-[10px] tracking-widest border-primary/30 text-primary uppercase">Version 2.5.0</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-10 px-10">
        {/* Quick Nav Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
                { icon: <LayoutList />, title: 'Functionality', desc: 'Menu Overview' },
                { icon: <Smartphone />, title: 'Accessibility', desc: 'PWD/App Usage' },
                { icon: <Printer />, title: 'Archival', desc: 'Folio Standards' },
                { icon: <ShieldAlert />, title: 'Privacy', desc: 'RA 10173 Compliance' }
            ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl border bg-muted/20 flex flex-col items-center gap-2 text-center group hover:bg-primary/5 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-white border flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">{item.icon}</div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-slate-800">{item.title}</p>
                        <p className="text-[9px] text-muted-foreground font-bold">{item.desc}</p>
                    </div>
                </div>
            ))}
        </div>

        <Alert className="mb-12 bg-primary/5 border-primary/20 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <AlertTitle className="font-black text-primary uppercase text-xs tracking-widest">Audit Transparency Protocol</AlertTitle>
          <AlertDescription className="text-sm font-medium leading-relaxed mt-1">
            Every institutional action—including logins, document views, status changes, and data exports—is recorded in the <strong>Permanent System Audit Log</strong>. This log is immutable and serves as primary evidence for external ISO quality certification.
          </AlertDescription>
        </Alert>

        <Accordion type="multiple" className="w-full space-y-6">
          {manualSections.map((roleSection, idx) => (
            <div key={roleSection.role} className="space-y-4">
              <div className="flex items-center gap-3 mb-2 mt-8 bg-slate-50 p-4 rounded-xl border-l-4 border-primary shadow-sm">
                  <div className="h-8 w-8 rounded-lg bg-white border flex items-center justify-center shadow-inner">
                    {roleSection.icon}
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-slate-800">
                    {roleSection.role}
                  </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 pl-4">
                {roleSection.sections.map((section, index) => (
                    <AccordionItem 
                        key={`${roleSection.role}-${index}`} 
                        value={`${roleSection.role}-${index}`} 
                        className="border rounded-2xl px-6 hover:bg-muted/5 transition-all bg-white shadow-sm"
                    >
                        <AccordionTrigger className="text-xs font-black uppercase hover:no-underline py-5 text-slate-700 tracking-tight group">
                            <span className="group-hover:text-primary transition-colors">{section.title}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6">
                            <div 
                                className="prose prose-sm max-w-none text-muted-foreground space-y-4 pt-2 leading-relaxed font-medium" 
                                dangerouslySetInnerHTML={{ __html: section.content }} 
                            />
                        </AccordionContent>
                    </AccordionItem>
                ))}
              </div>
            </div>
          ))}
        </Accordion>
      </CardContent>

      <CardFooter className="bg-muted/30 border-t py-8 px-10 mt-12">
        <div className="flex flex-col md:flex-row items-start gap-6 w-full">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Info className="h-6 w-6" />
            </div>
            <div className="space-y-2 flex-1">
                <p className="text-xs font-black uppercase text-slate-800 tracking-[0.1em]">Technical & Operational Support</p>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    For technical errors, password resets, or role adjustments, please contact the <strong>Center for Research in Artificial Intelligence and Information Technologies (CRAIITech)</strong>. You may also utilize the internal AI Chatbot on your dashboard for contextual navigation help.
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-[10px] font-black uppercase text-slate-400">Project Integrity</p>
                <p className="text-[9px] font-bold text-slate-400 italic">© 2025 RSU-CRAIITech Collaboration</p>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
