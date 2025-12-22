"use client";

import clsx from "clsx";

interface UserAvatarProps {
    name: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function UserAvatar({ name, size = "md", className }: UserAvatarProps) {
    const initials = getInitials(name);

    const sizeClasses = {
        sm: "h-7 w-7 text-xs",
        md: "h-8 w-8 text-sm",
        lg: "h-10 w-10 text-base",
    };

    return (
        <div
            className={clsx(
                "flex items-center justify-center rounded-full font-semibold",
                "bg-purple-600 text-white",
                sizeClasses[size],
                className
            )}
        >
            {initials}
        </div>
    );
}
