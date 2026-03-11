import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  type?: "success" | "error" | "loading";
}

export function NotificationDialog({
  open,
  onOpenChange,
  title,
  description,
  type = "success",
}: NotificationDialogProps) {
  const isSuccess = type === "success";
  const isError = type === "error";
  const isLoading = type === "loading";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent 
        className="bg-white border-none shadow-2xl p-12" 
        style={{ maxWidth: '420px', borderRadius: '28px' }}
      >
        <AlertDialogHeader className="space-y-6">
          {/* Icon with glow effect */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer glow */}
              <motion.div 
                className="absolute inset-0 rounded-full scale-150 blur-3xl"
                style={{ 
                  background: isLoading
                    ? 'linear-gradient(to bottom right, rgba(196, 165, 116, 0.4), rgba(184, 147, 92, 0.2))'
                    : isSuccess 
                    ? 'linear-gradient(to bottom right, rgba(253, 230, 138, 0.4), rgba(252, 211, 77, 0.2))'
                    : 'linear-gradient(to bottom right, rgba(252, 165, 165, 0.4), rgba(239, 68, 68, 0.2))'
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              ></motion.div>
              {/* Middle glow */}
              <motion.div 
                className="absolute inset-0 rounded-full scale-125 blur-2xl"
                style={{ 
                  background: isLoading
                    ? 'linear-gradient(to bottom right, rgba(184, 147, 92, 0.3), rgba(166, 127, 74, 0.2))'
                    : isSuccess
                    ? 'linear-gradient(to bottom right, rgba(252, 211, 77, 0.3), rgba(251, 191, 36, 0.2))'
                    : 'linear-gradient(to bottom right, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.2))'
                }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              ></motion.div>
              {/* Icon */}
              <motion.div 
                className="relative bg-white rounded-full p-3"
                initial={{ scale: 0 }}
                animate={{ scale: isLoading ? 1 : [0, 1.1, 0.9, 1] }}
                transition={{ duration: isLoading ? 0.3 : 0.6 }}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2
                      className="w-20 h-20 text-white"
                      style={{
                        filter: "drop-shadow(0 0 20px rgba(196, 165, 116, 0.3))",
                      }}
                      strokeWidth={3}
                      stroke="#c4a574"
                    />
                  </motion.div>
                ) : isSuccess ? (
                  <CheckCircle2
                    className="w-20 h-20 text-white"
                    style={{
                      filter: "drop-shadow(0 0 20px rgba(251, 191, 36, 0.3))",
                    }}
                    strokeWidth={3}
                    fill="white"
                    stroke="#d4a574"
                  />
                ) : (
                  <XCircle
                    className="w-20 h-20 text-white"
                    style={{
                      filter: "drop-shadow(0 0 20px rgba(239, 68, 68, 0.3))",
                    }}
                    strokeWidth={3}
                    fill="white"
                    stroke="#ef4444"
                  />
                )}
              </motion.div>
            </div>
          </div>

          <motion.div 
            className="text-center space-y-3 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <AlertDialogTitle 
              className="tracking-tight"
              style={{ color: isLoading ? '#8b7355' : isSuccess ? '#8b7355' : '#dc2626' }}
            >
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="px-4 leading-relaxed" style={{ color: '#78716c' }}>
              {description}
            </AlertDialogDescription>
          </motion.div>
        </AlertDialogHeader>

        {!isLoading && (
          <AlertDialogFooter className="pt-8">
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-12 text-white shadow-md hover:shadow-lg transition-all"
              style={{
                borderRadius: '20px',
                background: isSuccess
                  ? 'linear-gradient(to right, #c4a574, #b8935c)'
                  : 'linear-gradient(to right, #ef4444, #dc2626)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isSuccess
                  ? 'linear-gradient(to right, #b8935c, #a67f4a)'
                  : 'linear-gradient(to right, #dc2626, #b91c1c)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isSuccess
                  ? 'linear-gradient(to right, #c4a574, #b8935c)'
                  : 'linear-gradient(to right, #ef4444, #dc2626)';
              }}
            >
                เข้าใจแล้ว
              </Button>
            </motion.div>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
