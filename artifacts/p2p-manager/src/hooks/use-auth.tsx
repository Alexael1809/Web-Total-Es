import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("p2p_token"));
  const [, setLocation] = useLocation();

  // Override global fetch to inject token
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const currentToken = localStorage.getItem("p2p_token");
      if (currentToken) {
        init = init || {};
        init.headers = {
          ...init.headers,
          Authorization: `Bearer ${currentToken}`,
        };
      }
      const response = await originalFetch(input, init);
      if (response.status === 401 && window.location.pathname !== "/login") {
        localStorage.removeItem("p2p_token");
        setToken(null);
        setLocation("/login");
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [setLocation]);

  const { data: user, isLoading: isUserLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("p2p_token", newToken);
    setToken(newToken);
    setLocation("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("p2p_token");
    setToken(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user || null, token, isLoading: isUserLoading && !!token, login, logout }}>
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
