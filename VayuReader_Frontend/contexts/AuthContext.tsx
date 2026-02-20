import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';

import { AUTH_BASE_URL } from '@/constants/config';
import { AuthUser, clearToken as clearStoredToken, getToken, getUser, setExpiry as storeExpiry, setToken as storeToken, setUser as storeUser } from '@/lib/authStorage';
import { setUnauthorizedHandler } from '@/lib/apiClient';

type AuthContextShape = {
  token: string | null;
  user: AuthUser | null;
  initializing: boolean;
  signIn: (token: string, user?: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

const base64Decode = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = String(str).replace(/[=]+$/, '');
  if (str.length % 4 === 1) throw new Error('Invalid base64 string');
  for (
    let bc = 0, bs = 0, buffer, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
};

const getJwtExpiryMs = (token: string): number | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = base64Decode(payload);
    const json = JSON.parse(decoded);
    if (json?.exp) return Number(json.exp) * 1000;
    return null;
  } catch (error) {
    console.warn('Failed to parse JWT expiry:', error);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const expiryTimeout = useRef<NodeJS.Timeout | null>(null);

  const scheduleExpiry = useCallback((expiresAt: number | null, doSignOut: () => Promise<void>) => {
    if (expiryTimeout.current) {
      clearTimeout(expiryTimeout.current);
      expiryTimeout.current = null;
    }
    if (!expiresAt) return;
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) {
      doSignOut();
      return;
    }
    expiryTimeout.current = setTimeout(() => {
      doSignOut();
    }, msLeft) as unknown as NodeJS.Timeout;
  }, []);

  useEffect(() => {
    (async () => {
      const storedToken = await getToken();
      const storedUser = await getUser();
      const jwtExpiry = storedToken ? getJwtExpiryMs(storedToken) : null;
      const isExpired = !jwtExpiry || Date.now() > jwtExpiry;
      if (storedToken && !isExpired) {
        setTokenState(storedToken);
        setUserState(storedUser);
        scheduleExpiry(jwtExpiry, async () => {
          await clearStoredToken();
          setTokenState(null);
          setUserState(null);
        });
      } else {
        await clearStoredToken();
        setTokenState(null);
        setUserState(null);
      }
      setInitializing(false);
    })();
  }, [scheduleExpiry]);

  const signIn = useCallback(async (nextToken: string, nextUser?: AuthUser) => {
    setTokenState(nextToken);
    await storeToken(nextToken);
    const expiresAt = getJwtExpiryMs(nextToken);
    if (expiresAt) {
      await storeExpiry(expiresAt);
    }
    scheduleExpiry(expiresAt, async () => {
      await clearStoredToken();
      setTokenState(null);
      setUserState(null);
    });
    if (nextUser) {
      setUserState(nextUser);
      await storeUser(nextUser);
    }
  }, [scheduleExpiry]);

  const signOut = useCallback(async () => {
    const activeToken = token || (await getToken());

    if (activeToken) {
      try {
        await axios.post(
          `${AUTH_BASE_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
            timeout: 8000,
          }
        );
      } catch (error) {
        console.warn('Logout API call failed, continuing local signout:', error);
      }
    }

    if (expiryTimeout.current) {
      clearTimeout(expiryTimeout.current);
      expiryTimeout.current = null;
    }

    await clearStoredToken();
    setTokenState(null);
    setUserState(null);
  }, [token]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ token, user, initializing, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
