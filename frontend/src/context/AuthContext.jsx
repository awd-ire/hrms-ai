import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { tokenService } from "@/api/axios";

export const AuthContext = createContext(null);

/**
 * AuthContext is the ONLY global auth state holder (STRICT RULE)
 * Responsibilities:
 * - login/logout
 * - fetch current user (/me)
 * - refresh token
 * - store user + token in memory
 */
export const AuthProvider = ({ children }) => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Inactivity / session timeout (in ms)
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  const idleTimerRef = React.useRef(null);
  const hiddenAtRef = React.useRef(null);
  const isPublicRoute = useMemo(
    () => ["/login", "/register", "/careers"].includes(location.pathname),
    [location.pathname]
  );

  /**
   * Load current user
   */
  const loadMe = useCallback(async () => {
    const token = tokenService.getToken();

    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return null;
    }

    try {
      const res = await api.get("/auth/me");

      if (res?.data) {
        setUser(res.data);
        setIsAuthenticated(true);
        resetIdleTimer();
        return res.data;
      }
      return null;
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Login
   */
  const login = useCallback(async (payload) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/login", payload);

      const token = res?.data?.access_token;

      if (!token) {
        throw new Error("Invalid token response");
      }

      tokenService.setToken(token);

      const me = await loadMe();

      return { success: true, user: me };
    } catch (err) {
      setError(err?.message || "Login failed");
      setIsAuthenticated(false);
      setUser(null);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [loadMe]);

  /**
   * Idle timer helpers
   */
  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      // auto logout after timeout
      logout();
    }, SESSION_TIMEOUT);
  }, [clearIdleTimer]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "hidden") {
      hiddenAtRef.current = Date.now();
    } else {
      // visible again
      if (hiddenAtRef.current) {
        const elapsed = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (elapsed > SESSION_TIMEOUT) {
          logout();
          return;
        }
      }
      resetIdleTimer();
    }
  }, [resetIdleTimer]);

  const activityHandler = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  // Listen to global auth:logout events (e.g., 401 handler)
  useEffect(() => {
    const onAuthLogout = () => {
      tokenService.clearToken();
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener("auth:logout", onAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", onAuthLogout);
    };
  }, []);

  // Install activity listeners once
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

    events.forEach((e) => window.addEventListener(e, activityHandler));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // start timer when the component mounts
    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, activityHandler));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearIdleTimer();
    };
  }, [activityHandler, handleVisibilityChange, resetIdleTimer, clearIdleTimer]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (_) {
      // ignore backend logout failure
    } finally {
      tokenService.clearToken();
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Refresh token (silent auth renewal)
   */
  const refresh = useCallback(async () => {
    try {
      const res = await api.post("/auth/refresh");
      const token = res?.data?.access_token;

      if (token) {
        tokenService.setToken(token);
        await loadMe();
      }
    } catch (_) {
      await logout();
    }
  }, [loadMe, logout]);

  /**
   * Auto restore session on app load
   */
  useEffect(() => {
    if (!isPublicRoute && tokenService.getToken()) {
      loadMe();
    } else {
      setLoading(false);
    }
  }, [isPublicRoute, loadMe]);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated,
      login,
      logout,
      refresh,
      loadMe
    }),
    [user, loading, error, isAuthenticated, login, logout, refresh, loadMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
