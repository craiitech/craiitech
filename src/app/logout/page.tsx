
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Loader2, Star, Send, LogOut, MessageSquareText, MonitorCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { clearSessionLogs } = useSessionActivity();
  const { user, userProfile, firestore, isUserLoading, isAdmin, userRole } = useUser();

  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);

  const canPerformSoftwareAudit = isAdmin || userRole === 'Auditor';

  const handleFinalLogout = async (skipFeedback = false) => {
    if (!auth || !user) return;
    setIsProcessingLogout(true);

    try {
      if (!skipFeedback && rating > 0 && firestore) {
        await addDoc(collection(firestore, 'appFeedbacks'), {
          userId: user.uid,
          userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Anonymous',
          rating,
          comments,
          suggestions,
          timestamp: serverTimestamp(),
        });
      }

      await signOut(auth);
      clearSessionLogs();
      
      toast({
        title: "Successfully Logged Out",
        description: "You have been securely signed out of the portal.",
      });
      
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Error",
        description: "There was an issue signing you out. Please try again.",
        variant: 'destructive',
      });
      setIsProcessingLogout(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isProcessingLogout) {
    router.push('/');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-300">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mb-4">
            <LogOut className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight">Logging Out</CardTitle>
          <CardDescription className="text-base">
            Before you leave, help us improve the RSU EOMS Portal.
          </CardDescription>
        </CardHeader>
        
        {isProcessingLogout ? (
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Securing your session and signing out...</p>
          </CardContent>
        ) : (
          <>
            <CardContent className="space-y-8 pt-6">
              <div className="space-y-4 text-center">
                <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Rate your overall experience</Label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform active:scale-90 p-1"
                    >
                      <Star
                        className={cn(
                          "h-10 w-10 transition-colors",
                          (hoveredRating || rating) >= star
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted border-muted fill-transparent"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-primary">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Great"}
                  {rating === 5 && "Excellent"}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="comments" className="flex items-center gap-2 font-bold">
                    <MessageSquareText className="h-4 w-4 text-primary" />
                    Comments
                  </Label>
                  <Textarea
                    id="comments"
                    placeholder="Tell us what you liked or disliked..."
                    className="min-h-[100px] bg-muted/20"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="suggestions" className="flex items-center gap-2 font-bold">
                    <Star className="h-4 w-4 text-primary" />
                    Suggestions for Improvement
                  </Label>
                  <Textarea
                    id="suggestions"
                    placeholder="Any new features or changes you'd like to see?"
                    className="min-h-[100px] bg-muted/20"
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-3 pb-8">
              <Button 
                className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" 
                onClick={() => handleFinalLogout(false)}
                disabled={rating === 0}
              >
                <Send className="mr-2 h-5 w-5" />
                Submit Feedback & Logout
              </Button>
              
              {canPerformSoftwareAudit && (
                <Button 
                  variant="outline"
                  className="w-full h-12 border-primary text-primary font-bold hover:bg-primary/5" 
                  onClick={() => router.push('/software-quality')}
                >
                  <MonitorCheck className="mr-2 h-5 w-5" />
                  Perform Formal Software Audit (ISO 25010)
                </Button>
              )}

              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground hover:text-foreground" 
                onClick={() => handleFinalLogout(true)}
              >
                Skip and Logout
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
