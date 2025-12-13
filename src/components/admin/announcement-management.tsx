
'use client';

import { useState, useMemo } from 'react';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Campus, CampusSetting } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, MoreHorizontal, Globe, Building } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { EditAnnouncementDialog } from './edit-announcement-dialog';

export function AnnouncementManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [deletingAnnouncement, setDeletingAnnouncement] = useState<CampusSetting | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<CampusSetting | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const announcementsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'campusSettings') : null),
    [firestore]
  );
  const { data: announcements, isLoading: isLoadingAnnouncements } =
    useCollection<CampusSetting>(announcementsQuery);

  const campusesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'campuses') : null),
    [firestore]
  );
  const { data: campuses, isLoading: isLoadingCampuses } =
    useCollection<Campus>(campusesQuery);

  const campusMap = useMemo(() => {
    if (!campuses) return new Map();
    return new Map(campuses.map((c) => [c.id, c.name]));
  }, [campuses]);
  
  const getTargetName = (announcement: CampusSetting) => {
    if (announcement.id === 'global') {
        return (
            <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Global (All Campuses)</span>
            </div>
        );
    }
    return (
       <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>{campusMap.get(announcement.id) || 'Unknown Campus'}</span>
        </div>
    );
  }

  const handleDelete = async () => {
    if (!firestore || !deletingAnnouncement) return;
    setIsSubmitting(true);
    const docRef = doc(firestore, 'campusSettings', deletingAnnouncement.id);
    try {
      await deleteDoc(docRef);
      toast({
        title: 'Announcement Deleted',
        description: 'The announcement has been successfully removed.',
      });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      );
    } finally {
      setIsSubmitting(false);
      setDeletingAnnouncement(null);
    }
  };
  
  const isLoading = isLoadingAnnouncements || isLoadingCampuses;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manage Announcements</CardTitle>
          <CardDescription>
            View, edit, or delete active global and campus-specific
            announcements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Announcement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements?.filter(a => a.announcement).map((ann) => (
                  <TableRow key={ann.id}>
                    <TableCell className="font-medium">
                      {getTargetName(ann)}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{ann.announcement}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditingAnnouncement(ann)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingAnnouncement(ann)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {!isLoading && announcements?.filter(a => a.announcement).length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
                No active announcements found.
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deletingAnnouncement}
        onOpenChange={() => setDeletingAnnouncement(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              announcement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingAnnouncement && (
         <EditAnnouncementDialog
            announcement={editingAnnouncement}
            isOpen={!!editingAnnouncement}
            onOpenChange={() => setEditingAnnouncement(null)}
         />
      )}

    </>
  );
}
