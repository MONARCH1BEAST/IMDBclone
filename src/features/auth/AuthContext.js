import { createContext, useContext } from 'react';

const MOCK_USER = { id: 'user-001', name: 'Test User', avatar: null };

export const AuthContext = createContext({ user: MOCK_USER });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  return <AuthContext.Provider value={{ user: MOCK_USER }}>{children}</AuthContext.Provider>;
}

