import { FileText } from 'lucide-react';

export function Logo({ className, ...props }: { className?: string }) {
  return (
    <FileText
      className={className}
      {...props}
    />
  );
}
