import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { CheckCircle2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-none shadow-2xl p-12" style={{ maxWidth: '420px', borderRadius: '28px' }}>
        <AlertDialogHeader className="space-y-6">
          {/* Icon with glow effect */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer glow */}
              <div 
                className="absolute inset-0 rounded-full scale-150 blur-3xl"
                style={{ background: 'linear-gradient(to bottom right, rgba(253, 230, 138, 0.4), rgba(252, 211, 77, 0.2))' }}
              ></div>
              {/* Middle glow */}
              <div 
                className="absolute inset-0 rounded-full scale-125 blur-2xl"
                style={{ background: 'linear-gradient(to bottom right, rgba(252, 211, 77, 0.3), rgba(251, 191, 36, 0.2))' }}
              ></div>
              {/* Icon */}
              <div className="relative bg-white rounded-full p-3">
                <CheckCircle2
                  className="w-20 h-20 text-white"
                  style={{
                    filter: "drop-shadow(0 0 20px rgba(251, 191, 36, 0.3))",
                  }}
                  strokeWidth={3}
                  fill="white"
                  stroke="#d4a574"
                />
              </div>
            </div>
          </div>

          <div className="text-center space-y-3 pt-4">
            <AlertDialogTitle className="text-[#8b7355] tracking-tight">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="px-4 leading-relaxed" style={{ color: '#78716c' }}>
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-row gap-4 pt-8">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 h-12 transition-all"
            style={{
              borderRadius: '20px',
              borderWidth: '2px',
              borderColor: '#d6d3d1',
              color: '#78716c',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fafaf9';
              e.currentTarget.style.borderColor = '#a8a29e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#d6d3d1';
            }}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 h-12 text-white shadow-md hover:shadow-lg transition-all"
            style={{
              borderRadius: '20px',
              background: 'linear-gradient(to right, #c4a574, #b8935c)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #b8935c, #a67f4a)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #c4a574, #b8935c)';
            }}
          >
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
