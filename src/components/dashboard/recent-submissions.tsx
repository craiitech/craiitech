import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { submissions, users } from '@/lib/data';

export function RecentSubmissions() {
  return (
    <div className="space-y-8">
      {submissions.slice(0, 5).map(submission => {
          const user = users.find(u => u.id === submission.submitter.id);
          return (
            <div key={submission.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt="Avatar" />
                <AvatarFallback>{submission.submitter.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{submission.title}</p>
                <p className="text-sm text-muted-foreground">
                    by {submission.submitter.name}
                </p>
                </div>
                <div className="ml-auto font-medium">{submission.status}</div>
            </div>
          )
      })}
    </div>
  );
}
