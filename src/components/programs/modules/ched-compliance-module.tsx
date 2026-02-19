'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Calendar, Link as LinkIcon, PlusCircle, Trash2, Gavel, Layers, Info } from 'lucide-react';
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

export function ChedComplianceModule({ canEdit, program }: ChedComplianceModuleProps) {
  const { control } = useFormContext();
  
  const boardApprovalMode = useWatch({ control, name: "ched.boardApprovalMode" }) || 'sole';

  const { fields: rqatFields, append: appendRqat, remove: removeRqat } = useFieldArray({
    control,
    name: "ched.rqatVisits"
  });

  const hasSpecializations = program?.hasSpecializations && (program?.specializations?.length || 0) > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="shadow-sm border-primary/10">
          <CardHeader className="bg-muted/10 border-b">
            <CardTitle className="flex items-center gap-2 text-sm uppercase font-black tracking-tight">
              <FileText className="h-4 w-4 text-primary" />
              Basic Institutional Authority
            </CardTitle>
            <CardDescription className="text-xs">Official authority to operate and CHED recognition status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={control}
              name="ched.copcStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider">Certificate of Program Compliance (COPC)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                    <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="With COPC">With COPC</SelectItem>
                      <SelectItem value="No COPC">No COPC</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="ched.copcLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-wider">GDrive Link: COPC Certificate (PDF)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                      <Input {...field} placeholder="https://drive.google.com/..." className="pl-9 h-9 text-xs" disabled={!canEdit} />
                    </div>
                  </FormControl>
                  <FormDescription className="text-[9px]">Official CHED certification for the program.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/10">
            <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="flex items-center gap-2 text-sm uppercase font-black tracking-tight">
                    <Gavel className="h-4 w-4 text-primary" />
                    Board Approval Certificate (BOR Resolution)
                </CardTitle>
                <CardDescription className="text-xs">Authority granted by the University Board of Regents.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <FormField
                    control={control}
                    name="ched.boardApprovalMode"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel className="text-[10px] font-black uppercase text-primary">Approval Configuration</FormLabel>
                            <FormControl>
                                <RadioGroup 
                                    onValueChange={field.onChange} 
                                    value={field.value || 'sole'} 
                                    className="flex flex-col space-y-1"
                                    disabled={!canEdit}
                                >
                                    <div className="flex items-center space-x-2 p-2 rounded border bg-muted/5">
                                        <RadioGroupItem value="sole" id="mode-sole" />
                                        <Label htmlFor="mode-sole" className="text-xs font-bold cursor-pointer">Sole Program Approval (One Resolution)</Label>
                                    </div>
                                    <div className={cn("flex items-center space-x-2 p-2 rounded border bg-muted/5", !hasSpecializations && "opacity-50 pointer-events-none")}>
                                        <RadioGroupItem value="per-major" id="mode-major" disabled={!hasSpecializations} />
                                        <Label htmlFor="mode-major" className="text-xs font-bold cursor-pointer">Separate Approvals per Specialization/Major</Label>
                                    </div>
                                </RadioGroup>
                            </FormControl>
                            {!hasSpecializations && (
                                <p className="text-[9px] text-amber-600 font-medium italic flex items-center gap-1">
                                    <Info className="h-2.5 w-2.5" /> Note: Per-major mode requires registered specializations in Program Settings.
                                </p>
                            )}
                        </FormItem>
                    )}
                />

                {boardApprovalMode === 'sole' ? (
                    <FormField
                        control={control}
                        name="ched.boardApprovalLink"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider">BOR Resolution GDrive Link</FormLabel>
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
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Majors with Separate Authority</p>
                        <div className="space-y-3">
                            {program.specializations?.map((spec, idx) => (
                                <div key={spec.id} className="p-3 rounded-lg border bg-muted/5 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Layers className="h-3 w-3 text-primary" />
                                        <span className="text-xs font-bold text-slate-700">{spec.name}</span>
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
                                                            placeholder="Major BOR Resolution Link..." 
                                                            className="pl-8 h-8 text-[10px] bg-white" 
                                                            disabled={!canEdit} 
                                                            onBlur={(e) => {
                                                                // Ensure we store the majorId alongside the link
                                                                control._fields[`ched.majorBoardApprovals.${idx}.majorId`] = spec.id;
                                                                inputField.onBlur();
                                                            }}
                                                        />
                                                    </div>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-primary/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-4 bg-primary/5 border-b">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-primary text-sm uppercase font-black tracking-tight">
                        <Calendar className="h-4 w-4" />
                        RQAT Monitoring History
                    </CardTitle>
                    <CardDescription className="text-xs">Records of Regional Quality Assessment Team visits.</CardDescription>
                </div>
                {canEdit && (
                    <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => appendRqat({ date: '', result: '', nonCompliances: '', comments: '', reportLink: '' })}
                        className="h-8 gap-1 text-[10px] font-bold uppercase"
                    >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add Visit Result
                    </Button>
                )}
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-6">
                    {rqatFields.map((field, index) => (
                        <div key={field.id} className="relative p-4 rounded-lg border bg-muted/10 space-y-4 shadow-sm group">
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
                                            <FormLabel className="text-[10px] font-bold uppercase">Visit Date</FormLabel>
                                            <FormControl><Input {...inputField} placeholder="e.g., Oct 2024" className="h-9 text-xs" disabled={!canEdit} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`ched.rqatVisits.${index}.result`}
                                    render={({ field: inputField }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold uppercase">Visit Result</FormLabel>
                                            <FormControl><Input {...inputField} placeholder="e.g., Highly Recommended" className="h-9 text-xs" disabled={!canEdit} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <FormField
                                control={control}
                                name={`ched.rqatVisits.${index}.reportLink`}
                                render={({ field: inputField }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase flex items-center gap-2">
                                            <LinkIcon className="h-3 w-3 text-primary" />
                                            RQAT Report Link (Google Drive)
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...inputField} value={inputField.value || ''} placeholder="https://drive.google.com/..." className="h-9 text-xs" disabled={!canEdit} />
                                        </FormControl>
                                        <FormDescription className="text-[9px]">GDrive link to the PDF monitoring report.</FormDescription>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name={`ched.rqatVisits.${index}.nonCompliances`}
                                render={({ field: inputField }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase">Identified Non-Compliances</FormLabel>
                                        <FormControl><Textarea {...inputField} rows={3} placeholder="List deficiencies noted..." className="text-xs" disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`ched.rqatVisits.${index}.comments`}
                                render={({ field: inputField }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase">General Comments / Feedback</FormLabel>
                                        <FormControl><Textarea {...inputField} rows={3} placeholder="Monitor's summary..." className="text-xs" disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    ))}
                    {rqatFields.length === 0 && (
                        <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground text-xs uppercase font-bold tracking-widest bg-muted/5">
                            No RQAT visit history recorded.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
