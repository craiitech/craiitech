
'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Calendar, Link as LinkIcon, PlusCircle, Trash2, CheckCircle2, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChedComplianceModule({ canEdit }: { boolean }) {
  const { control } = useFormContext();
  
  const { fields: rqatFields, append: appendRqat, remove: removeRqat } = useFieldArray({
    control,
    name: "ched.rqatVisits"
  });

  const { fields: notedLinksFields, append: appendLink, remove: removeLink } = useFieldArray({
    control,
    name: "ched.contentNotedLinks"
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Basic Institutional Compliance
          </CardTitle>
          <CardDescription>Official authority to operate and CHED recognition status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="ched.copcStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certificate of Program Compliance (COPC)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                <FormLabel>GDrive Link: COPC Certificate (PDF)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input {...field} placeholder="https://drive.google.com/..." className="pl-9" disabled={!canEdit} />
                  </div>
                </FormControl>
                <FormDescription className="text-[10px]">Official CHED certification for the program.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="ched.boardApprovalLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                    <Gavel className="h-3.5 w-3.5 text-primary" />
                    Board Approval Certificate (BOR Resolution)
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input {...field} value={field.value || ''} placeholder="https://drive.google.com/..." className="pl-9" disabled={!canEdit} />
                  </div>
                </FormControl>
                <FormDescription className="text-[10px]">Link to the BOR Resolution approving the program creation or revision.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
            <div className="space-y-0.5">
              <FormLabel>Content Noted by CHED</FormLabel>
              <FormDescription className="text-[10px]">Whether the program contents have been officially acknowledged.</FormDescription>
            </div>
            <FormField
              control={control}
              name="ched.contentNoted"
              render={({ field }) => (
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} /></FormControl>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proofs of Contents Noted (PDF Links)</FormLabel>
                {canEdit && (
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white"
                        onClick={() => appendLink({ url: '', dateNoted: '' })}
                    >
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="space-y-4">
                {notedLinksFields.map((field, index) => (
                    <div key={field.id} className="relative p-4 rounded-lg border bg-muted/5 group space-y-3 transition-all hover:border-primary/20">
                        {canEdit && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeLink(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name={`ched.contentNotedLinks.${index}.url`}
                                render={({ field: inputField }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Google Drive Link</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input {...inputField} value={inputField.value || ''} placeholder="https://drive.google.com/..." className="pl-9 h-9 text-xs" disabled={!canEdit} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`ched.contentNotedLinks.${index}.dateNoted`}
                                render={({ field: inputField }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date Noted by CHED</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input {...inputField} value={inputField.value || ''} placeholder="e.g., Oct 24, 2024" className="pl-9 h-9 text-xs font-bold" disabled={!canEdit} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                ))}
                {notedLinksFields.length === 0 && (
                    <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-xs italic bg-muted/5">
                        No notation records added. Use the "+" button above.
                    </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between py-4 bg-primary/5 border-b">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Calendar className="h-5 w-5" />
                        RQAT Monitoring History
                    </CardTitle>
                    <CardDescription>Records of Regional Quality Assessment Team visits.</CardDescription>
                </div>
                {canEdit && (
                    <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => appendRqat({ date: '', result: '', nonCompliances: '', comments: '', reportLink: '' })}
                        className="h-8 gap-1"
                    >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add Visit Result
                    </Button>
                )}
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-6">
                    {rqatFields.map((field, index) => (
                        <div key={field.id} className="relative p-4 rounded-lg border bg-muted/10 space-y-4">
                            {canEdit && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 text-destructive h-7 w-7" 
                                    onClick={() => removeRqat(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name={`ched.rqatVisits.${index}.date`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Visit Date</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., Oct 2024" disabled={!canEdit} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`ched.rqatVisits.${index}.result`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Visit Result</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., Highly Recommended" disabled={!canEdit} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <FormField
                                control={control}
                                name={`ched.rqatVisits.${index}.reportLink`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <LinkIcon className="h-3 w-3 text-primary" />
                                            RQAT Report Link (Google Drive)
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ''} placeholder="https://drive.google.com/..." disabled={!canEdit} />
                                        </FormControl>
                                        <FormDescription className="text-[10px]">GDrive link to the PDF monitoring report.</FormDescription>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name={`ched.rqatVisits.${index}.nonCompliances`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Identified Non-Compliances</FormLabel>
                                        <FormControl><Textarea {...field} rows={3} placeholder="List deficiencies noted..." disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`ched.rqatVisits.${index}.comments`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>General Comments / Feedback</FormLabel>
                                        <FormControl><Textarea {...field} rows={3} placeholder="Monitor's summary..." disabled={!canEdit} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    ))}
                    {rqatFields.length === 0 && (
                        <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground text-sm">
                            No RQAT visit history recorded for this year.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
