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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = async (): Promise<boolean> => {
        try {
            console.log("Checking authentication...");
            const response = await fetch("http://localhost:8000/auth/me", {
                credentials: "include",
            });

            console.log("Auth check response status:", response.status);

            if (response.ok) {
                const userData = await response.json();
                console.log("Auth check successful, user:", userData);
                setUser(userData);
                return true;
            } else {
                console.log("Auth check failed, status not ok");
                setUser(null);
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
            await fetch("http://localhost:8000/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
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
