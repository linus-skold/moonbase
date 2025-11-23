import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';


interface WarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  buttonText?: string;
}

export const WarningDialog = ({ isOpen, onClose, children, buttonText }: WarningDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Warning</DialogTitle>
          <DialogDescription>
            {children}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{buttonText || "I Understand"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}