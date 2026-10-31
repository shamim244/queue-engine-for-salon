"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  api,
  AuthUser,
  Salon,
  Stylist,
  Organization,
  AuthSessionResponse,
  setAuthToken,
} from "./api";

interface AuthContextType {
  user: AuthUser | null;
  salon: Salon | null;
  staff: Stylist | null;
  organization: Organization | null;
  branches: Salon[];
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<AuthSessionResponse>;
  pinLogin: (salonId: string, staffId: string, pin: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSelectedSalon: (salon: Salon) => void;
  demoLogin: (role: "SUPER_ADMIN" | "SALON_OWNER" | "STAFF" | "CUSTOMER") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [staff, setStaff] = useState<Stylist | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Salon[]>([]);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.auth.getMe();
      if (data && data.user) {
        setUser(data.user);
        if (data.organization) setOrganization(data.organization);
        if (data.salon) setSalon(data.salon);
        if (data.staff) setStaff(data.staff);
        if (data.branches) setBranches(data.branches);
      }
    } catch {
      // If session expired or invalid
      setUser(null);
      setSalon(null);
      setStaff(null);
      setAuthToken(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("engine_token");
      if (storedToken) {
        setTokenState(storedToken);
        refreshUser();
      } else {
        setIsLoading(false);
      }
    }
  }, [refreshUser]);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const resp = await api.auth.login(identifier, password);
      if (resp.token) {
        setAuthToken(resp.token);
        setTokenState(resp.token);
      }
      setUser(resp.user);
      if (resp.organization) setOrganization(resp.organization);
      if (resp.salon) setSalon(resp.salon);
      if (resp.staff) setStaff(resp.staff);
      if (resp.branches) setBranches(resp.branches);
      return resp;
    } finally {
      setIsLoading(false);
    }
  };

  const pinLogin = async (salonId: string, staffId: string, pin: string) => {
    setIsLoading(true);
    try {
      const resp = await api.auth.pinSwitch(salonId, staffId, pin);
      if (resp.token) {
        setAuthToken(resp.token);
        setTokenState(resp.token);
      }
      setUser(resp.user);
      if (resp.staff) setStaff(resp.staff);
      return resp;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
    setSalon(null);
    setStaff(null);
    setOrganization(null);
    setBranches([]);
  };

  const setSelectedSalon = (s: Salon) => {
    setSalon(s);
  };

  const demoLogin = async (role: "SUPER_ADMIN" | "SALON_OWNER" | "STAFF" | "CUSTOMER") => {
    if (role === "SUPER_ADMIN") {
      await login("admin", "admin123");
    } else if (role === "SALON_OWNER") {
      await login("ramesh", "salon123");
    } else if (role === "STAFF") {
      await login("vijay", "barber123");
    } else if (role === "CUSTOMER") {
      // Setup demo customer session
      const demoCust: AuthUser = {
        id: "cust-demo-01",
        username: "vikram_sharma",
        role: "CUSTOMER",
        phone: "+91 98765 43210",
        email: "vikram@example.com",
        status: "ACTIVE",
      };
      setUser(demoCust);
      localStorage.setItem("engine_demo_customer", JSON.stringify(demoCust));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        salon,
        staff,
        organization,
        branches,
        token,
        isLoading,
        login,
        pinLogin,
        logout,
        refreshUser,
        setSelectedSalon,
        demoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
