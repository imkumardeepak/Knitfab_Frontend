import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  destructive?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  title = "Are you absolutely sure?",
  description,
  itemName,
  onConfirm,
  isLoading = false,
  destructive = true,
}) => {
  const defaultDescription = itemName
    ? `This action cannot be undone. This will permanently delete "${itemName}" and remove all associated data.`
    : "This action cannot be undone. This will permanently delete the item and remove all associated data.";

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {destructive && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            )}
            <div>
              <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-left mt-2">
                {description || defaultDescription}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              destructive
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-600"
                : ""
            }
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Specialized version for tasks
interface TaskDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const TaskDeleteConfirmDialog: React.FC<
  TaskDeleteConfirmDialogProps
> = ({ open, onOpenChange, taskTitle, onConfirm, isLoading = false }) => {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Task"
      description={
        taskTitle
          ? `Are you sure you want to delete the task "${taskTitle}"? This action cannot be undone and will remove all task data including comments, attachments, and time tracking.`
          : "Are you sure you want to delete this task? This action cannot be undone and will remove all task data including comments, attachments, and time tracking."
      }
      onConfirm={onConfirm}
      isLoading={isLoading}
      destructive={true}
    />
  );
};
