import React from "react";

interface LoadingSpinnerProps {
    message?: string;
    className?: string;
}

export function LoadingSpinner({
    message = "กำลังโหลดข้อมูล...",
    className = "h-64"
}: LoadingSpinnerProps) {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c5a059] mx-auto mb-4"></div>
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}
