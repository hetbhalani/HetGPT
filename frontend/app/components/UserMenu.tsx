"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import { UserAvatar } from "./UserAvatar";

interface User {
    id: number;
    name: string;
    email: string;
}

interface UserMenuProps {
    user: User | null;
    logout: () => Promise<void>;
}

export function UserMenu({ user, logout }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (!user) return null;

    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
            >
                <UserAvatar name={user.name} size="md" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-52 py-2 bg-slate-900/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl z-50 animate-scaleIn origin-top-right">
                    <div className="px-4 py-2 border-b border-white/5">
                        <p className="text-sm font-medium truncate text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="cursor-pointer w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
