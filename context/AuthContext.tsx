"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";

interface AuthContextType {
  isAuthenticated: boolean;
  juryName: string | null;
  login: (name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [juryName, setJuryName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check authentication status on mount
  useEffect(() => {
    const storedJuryName = localStorage.getItem("juryName");
    if (storedJuryName) {
      setIsAuthenticated(true);
      setJuryName(storedJuryName);
    }
    setIsLoading(false);
  }, []);

  // Redirect logic
  useEffect(() => {
    if (!isLoading) {
      const publicPaths = ["/auth", "/"];
      const isPublicPath = publicPaths.includes(pathname);

      if (!isAuthenticated && !isPublicPath) {
        toast.error("Please log in to access this page");
        router.push("/auth");
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = (name: string) => {
    localStorage.setItem("juryName", name);
    setJuryName(name);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("juryName");
    setJuryName(null);
    setIsAuthenticated(false);
    router.push("/auth");
  };

  // Show nothing while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, juryName, login, logout }}>
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
