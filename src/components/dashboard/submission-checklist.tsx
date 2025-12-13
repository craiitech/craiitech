
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SubmissionChecklistProps {
  reportType: string;
  cycle: 'first' | 'final';
  year: number;
  onChecklistChange: (isComplete: boolean) => void;
}

export function SubmissionChecklist({
  reportType,
  cycle,
  year,
  onChecklistChange,
}: SubmissionChecklistProps) {

  const checklistItems = [
    { id: 'correctDoc', label: `Is this the correct "${reportType}" for the ${cycle} cycle for year ${year}?` },
    { id: 'year', label: 'Is the Year in the document correct?' },
    { id: 'cycle', label: 'Is the Submission Cycle in the document correct?' },
    { id: 'date', label: 'Is the Date in the "Updated as of" section correct?' },
    { id: 'contents', label: 'Are the Contents in the document correct and complete?' },
    { id: 'signed', label: 'Is the document properly signed?' },
  ];
  
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(
    checklistItems.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
  );

  useEffect(() => {
    const allChecked = Object.values(checkedState).every(Boolean);
    onChecklistChange(allChecked);
  }, [checkedState, onChecklistChange]);

  const handleCheckboxChange = (id: string) => {
    setCheckedState(prevState => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Check</CardTitle>
        <CardDescription>
          Please confirm the following details before submitting. You must check all boxes to enable the submit button.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklistItems.map(item => (
          <div key={item.id} className="flex items-start space-x-3 rounded-md border p-4">
            <Checkbox
              id={item.id}
              checked={checkedState[item.id]}
              onCheckedChange={() => handleCheckboxChange(item.id)}
            />
            <Label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {item.label}
            </Label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
