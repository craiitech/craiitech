
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Calendar, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ChedComplianceModule({ canEdit }: { canEdit: boolean }) {
  const { control } = useFormContext();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Basic CHED Compliance
          </CardTitle>
          <CardDescription>Status of COPC and Contents Noted by CHED.</CardDescription>
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
                <FormDescription className="text-[10px]">Ensure sharing is 'Anyone with the link can view'.</FormDescription>
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

          <FormField
            control={control}
            name="ched.contentNotedLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GDrive Link: Contents Noted Proof (PDF)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input {...field} placeholder="https://drive.google.com/..." className="pl-9" disabled={!canEdit} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            RQAT Monitoring
          </CardTitle>
          <CardDescription>Regional Quality Assessment Team (RQAT) visit details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="ched.rqatVisit.result"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RQAT Visit Result</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., Highly Recommended" disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="ched.rqatVisit.nonCompliances"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identified Non-Compliances</FormLabel>
                <FormControl><Textarea {...field} rows={4} placeholder="List deficiencies noted during the visit..." disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="ched.rqatVisit.comments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>General Comments / Feedback</FormLabel>
                <FormControl><Textarea {...field} rows={4} placeholder="Summary of RQAT feedback..." disabled={!canEdit} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold">Audit Tip</AlertTitle>
            <AlertDescription className="text-[10px]">
              RQAT findings should be addressed within 30 days of the visit to ensure continuous compliance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
