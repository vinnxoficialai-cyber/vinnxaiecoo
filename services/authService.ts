import { supabase } from './supabaseClient';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResult {
    user: User | null;
    session: Session | null;
    error: AuthError | null;
}

export const authService = {
    // Registrar novo usuário
    signUp: async (email: string, password: string): Promise<AuthResult> => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        return {
            user: data.user,
            session: data.session,
            error,
        };
    },

    // Login com email e senha
    signIn: async (email: string, password: string): Promise<AuthResult> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        return {
            user: data.user,
            session: data.session,
            error,
        };
    },

    // Logout
    signOut: async (): Promise<{ error: AuthError | null }> => {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    // Obter sessão atual
    getSession: async (): Promise<Session | null> => {
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    // Obter usuário atual
    getUser: async (): Promise<User | null> => {
        const { data } = await supabase.auth.getUser();
        return data.user;
    },

    // Listener de mudança de auth state
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
        return supabase.auth.onAuthStateChange(callback);
    },
};
