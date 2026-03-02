"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
    id: number;
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    checkAuth: () => Promise<boolean>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = async (): Promise<boolean> => {
        try {
            const token = localStorage.getItem("access_token");

            const headers: HeadersInit = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(`${BACKEND_URL}/auth/me`, {
                credentials: "include",
                headers,
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                return true;
            } else {
                setUser(null);
                // Clear invalid token
                localStorage.removeItem("access_token");
                return false;
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            setUser(null);
            return false;
        }
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const headers: HeadersInit = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            await fetch(`${BACKEND_URL}/auth/logout`, {
                method: "POST",
                credentials: "include",
                headers,
            });
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            localStorage.removeItem("access_token");
            setUser(null);
        }
    };

    useEffect(() => {
        checkAuth().finally(() => setIsLoading(false));
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                checkAuth,
                logout,
                setUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
