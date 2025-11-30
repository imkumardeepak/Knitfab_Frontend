import React from 'react';
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
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'destructive' | 'warning' | 'default';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title = 'Confirm Action',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'destructive',
  icon,
  isLoading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case 'destructive':
        return <Trash2 className="h-6 w-6 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-blue-500" />;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case 'destructive':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={getConfirmButtonVariant()}
              onClick={handleConfirm}
              disabled={isLoading}
              className={variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Specialized Delete Confirmation Dialog
interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  itemName: string;
  itemType: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  additionalInfo?: string;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title,
  itemName,
  itemType,
  onConfirm,
  onCancel,
  isLoading = false,
  additionalInfo,
}: DeleteConfirmationDialogProps) {
  const defaultTitle = `Delete ${itemType}`;
  const description = `Are you sure you want to delete ${itemType.toLowerCase()} "${itemName}"? This action cannot be undone.${
    additionalInfo ? ` ${additionalInfo}` : ''
  }`;

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title || defaultTitle}
      description={description}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      variant="destructive"
      isLoading={isLoading}
    />
  );
}

// Bulk Delete Confirmation Dialog
interface BulkDeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  itemType: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function BulkDeleteConfirmationDialog({
  open,
  onOpenChange,
  count,
  itemType,
  onConfirm,
  onCancel,
  isLoading = false,
}: BulkDeleteConfirmationDialogProps) {
  const title = `Delete ${count} ${itemType}${count > 1 ? 's' : ''}`;
  const description = `Are you sure you want to delete ${count} ${itemType.toLowerCase()}${
    count > 1 ? 's' : ''
  }? This action cannot be undone and will permanently remove all selected items.`;

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={`Delete ${count} ${itemType}${count > 1 ? 's' : ''}`}
      cancelText="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      variant="destructive"
      isLoading={isLoading}
    />
  );
}
