'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Calendar, Link as LinkIcon, PlusCircle, Trash2, Gavel, Layers, Info, CheckCircle2, Eye, FileX, Hash, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { AcademicProgram } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChedComplianceModuleProps {
  canEdit: boolean;
  program: AcademicProgram;
}

/**
 * Component to render a Google Drive preview frame.
 */
function GDrivePreview({ url, title }: { url?: string; title: string }) {
  if (!url || !url.startsWith('https://drive.google.com/')) return null;
  
  const embedUrl = url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-2 px-1">
        <Eye className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Document Preview: {title}</span>
      </div>
      <div className="aspect-[16/10] w-full rounded-lg border bg-muted overflow-hidden shadow-inner relative group">
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-none"
          allow="autoplay"
          title={`${title} Preview`}
        />
      </div>
    </div>
  );
}

export function ChedComplianceModule({ canEdit, program }: ChedComplianceModuleProps) {
  const { control } = useFormContext();
  
  const boardApprovalMode = useWatch({ control, name: "ched.boardApprovalMode" }) || 'sole';
  const copcLinkVal = useWatch({ control, name: "ched.copcLink" });
  const boardApprovalLinkVal = useWatch({ control, name: "ched.boardApprovalLink" });
  const closureLinkVal = useWatch({ control, name: "ched.closureResolutionLink" });
  const majorApprovals = useWatch({ control, name: "ched.majorBoardApprovals" }) || [];
  const rqatVisits = useWatch({ control, name: "ched.rqatVisits" }) || [];

  const { fields: rqatFields, append: appendRqat, remove: removeRqat } = useFieldArray({
    control,
    name: "ched.rqatVisits"
  });

  const hasSpecializations = program?.hasSpecializations && (program?.specializations?.length || 0) > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="shadow-sm border-primary/10">
          <CardHeader className="bg-muted/10 border-b py-4">
            <CardTitle className="flex items-center gap-2 text-sm uppercase font-black tracking-tight text-slate-900">
              <FileText className="h-4 w-4 text-primary" />
              Institutional Authority & COPC
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CHED Recognition and Operating Standards for AY {program.isActive ? 'Active' : 'Closed'}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={control}
              name="ched.copcStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">COPC Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                    <FormControl><SelectTrigger className="h-11 font-bold bg-primary/5 border-primary/20"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="With COPC" className="font-bold text-emerald-600">Verified: With COPC</SelectItem>
                      <SelectItem value="No COPC" className="font-bold text-rose-600">No active COPC</SelectItem>
                      <SelectItem value="In Progress" className="font-bold text-amber-600">In Progress / Applying</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={control}
                name="ched.copcAwardDate"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date of Award</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                        <Input {...field} type="date" className="pl-9 h-9 text-xs" disabled={!canEdit} />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <FormField
                control={control}
                name="ched.copcLink"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        Certificate Link (PDF)
                        {copcLinkVal && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    </FormLabel>
                    <FormControl>
                        <div className="relative">
                        <LinkIcon className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                        <Input {...field} placeholder="https://drive.google.com/..." className="pl-9 h-9 text-xs" disabled={!canEdit} />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <GDrivePreview url={copcLinkVal} title="CHED COPC Certificate" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/10">
            <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="flex items-center gap-2 text-sm uppercase font-black tracking-tight text-slate-900">
                    <Gavel className="h-4 w-4 text-primary" />
                    University Board Approval (BOR)
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Authority granted via official RSU Board Resolutions.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <FormField
                    control={control}
                    name="ched.boardApprovalMode"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Board Approval Context</FormLabel>
                            <FormControl>
                                <RadioGroup 
                                    onValueChange={field.onChange} 
                                    value={field.value || 'sole'} 
                                    className="flex flex-col space-y-1"
                                    disabled={!canEdit}
                                >
                                    <div className="flex items-center space-x-2 p-3 rounded-xl border bg-muted/5 group cursor-pointer hover:border-primary/20">
                                        <RadioGroupItem value="sole" id="mode-sole" />
                                        <Label htmlFor="mode-sole" className="text-xs font-bold cursor-pointer">Institutional Program Approval (One Resolution)</Label>
                                    </div>
                                    <div className={cn("flex items-center space-x-2 p-3 rounded-xl border bg-muted/5 group cursor-pointer hover:border-primary/20", !hasSpecializations && "opacity-50 pointer-events-none")}>
                                        <RadioGroupItem value="per-major" id="mode-major" disabled={!hasSpecializations} />
                                        <Label htmlFor="mode-major" className="text-xs font-bold cursor-pointer">Specialization-Level Approvals (Separate Resolutions)</Label>
                                    </div>
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )}
                />

                {boardApprovalMode === 'sole' ? (
                    <div className="space-y-4">
                        <FormField
                            control={control}
                            name="ched.boardApprovalLink"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                        BOR Resolution Link (GDrive)
                                        {boardApprovalLinkVal && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input {...field} value={field.value || ''} placeholder="https://drive.google.com/..." className="pl-9 h-9 text-xs" disabled={!canEdit} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <GDrivePreview url={boardApprovalLinkVal} title="Program BOR Resolution" />
                    </div>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Specialization Resolutions Registry</p>
                        </div>
                        <div className="space-y-3">
                            {program.specializations?.map((spec, idx) => (
                                <div key={spec.id} className="p-4 rounded-xl border bg-muted/5 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">{spec.name}</span>
                                        {majorApprovals[idx]?.link && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-4 text-[8px] font-black">LINKED</Badge>}
                                    </div>
                                    <FormField
                                        control={control}
                                        name={`ched.majorBoardApprovals.${idx}.link`}
                                        render={({ field: inputField }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <div className="relative">
                                                        <LinkIcon className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                                                        <Input 
                                                            {...inputField} 
                                                            value={inputField.value || ''} 
                                                            placeholder="Paste Resolution Link..." 
                                                            className="pl-8 h-8 text-[10px] bg-white border-primary/10" 
                                                            disabled={!canEdit} 
                                                        />
                                                    </div>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <GDrivePreview url={majorApprovals[idx]?.link} title={`BOR: ${spec.name}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!program.isActive && (
                    <div className="pt-6 border-t mt-6 space-y-4 border-destructive/20 bg-destructive/5 p-5 rounded-2xl animate-in zoom-in duration-500">
                        <div className="flex items-center gap-2 text-destructive">
                            <FileX className="h-5 w-5 text-destructive" />
                            <h4 className="text-xs font-black uppercase tracking-tight">Phase-Out / Closure Authority</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name="ched.closureReferendumNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                                            <Hash className="h-3 w-3" />
                                            Referendum No.
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ''} placeholder="e.g. 2024-042" className="h-9 text-xs bg-white font-mono font-bold" disabled={!canEdit} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="ched.closureApprovalDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Approval Date</FormLabel>
                                        <FormControl><Input {...field} value={field.value || ''} type="date" className="h-9 text-xs bg-white" disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={control}
                            name="ched.closureResolutionLink"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                                        Evidence: Closure Resolution (PDF)
                                        {closureLinkVal && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                            <Input {...field} value={field.value || ''} placeholder="https://drive.google.com/..." className="pl-9 h-11 text-xs bg-white border-destructive/20" disabled={!canEdit} />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <GDrivePreview url={closureLinkVal} title="Closure Resolution Evidence" />
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-primary/20 shadow-lg overflow-hidden flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between py-4 bg-primary/5 border-b">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-primary text-sm uppercase font-black tracking-tight">
                        <Calendar className="h-4 w-4" />
                        RQAT Monitoring & Site Visits
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Regional Quality Assessment Team (RQAT) Audit Trail.</CardDescription>
                </div>
                {canEdit && (
                    <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => appendRqat({ date: '', result: '', nonCompliances: '', comments: '', reportLink: '' })}
                        className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/10"
                    >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add Record
                    </Button>
                )}
            </CardHeader>
            <CardContent className="pt-6 flex-1 overflow-hidden">
                <div className="space-y-6">
                    {rqatFields.map((field, index) => (
                        <div key={field.id} className="relative p-5 rounded-2xl border bg-muted/10 space-y-4 shadow-sm group hover:border-primary/30 transition-all">
                            {canEdit && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" 
                                    onClick={() => removeRqat(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name={`ched.rqatVisits.${index}.date`}
                                    render={({ field: inputField }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Visit Timeline</FormLabel>
                                            <FormControl><Input {...inputField} placeholder="e.g., October 2024" className="h-9 text-xs bg-white font-bold" disabled={!canEdit} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`ched.rqatVisits.${index}.result`}
                                    render={({ field: inputField }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Verification Outcome</FormLabel>
                                            <FormControl><Input {...inputField} placeholder="e.g., Compliant / Passed" className="h-9 text-xs bg-white font-bold" disabled={!canEdit} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <FormField
                                control={control}
                                name={`ched.rqatVisits.${index}.reportLink`}
                                render={({ field: inputField }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                            <LinkIcon className="h-3 w-3" />
                                            Monitoring Report Link (GDrive)
                                            {inputField.value && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...inputField} value={inputField.value || ''} placeholder="https://drive.google.com/..." className="h-9 text-xs bg-white" disabled={!canEdit} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <GDrivePreview 
                                url={rqatVisits[index]?.reportLink} 
                                title={`RQAT: ${rqatVisits[index]?.date || 'Visit Report'}`} 
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                                <FormField
                                    control={control}
                                    name={`ched.rqatVisits.${index}.nonCompliances`}
                                    render={({ field: inputField }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-destructive">Gaps/Non-Compliances</FormLabel>
                                            <FormControl><Textarea {...inputField} rows={3} placeholder="List identified deficiencies..." className="text-xs bg-white" disabled={!canEdit} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`ched.rqatVisits.${index}.comments`}
                                    render={({ field: inputField }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-600">Auditor Feedback</FormLabel>
                                            <FormControl><Textarea {...inputField} rows={3} placeholder="Monitor's summary notes..." className="text-xs bg-white" disabled={!canEdit} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    ))}
                    {rqatFields.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-20 bg-muted/5 rounded-2xl border-2 border-dashed">
                            <Activity className="h-12 w-12" />
                            <p className="text-xs font-black uppercase tracking-[0.2em]">No Site Monitoring Records Found</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="bg-primary/5 border-t py-3 px-6">
                <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                        <strong>Standard Note:</strong> RQAT visit records are institutional evidence of compliance with CHED Quality Assurance frameworks. Ensure all PDF reports are accessible for Presidential review.
                    </p>
                </div>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
