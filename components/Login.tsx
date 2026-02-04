import React, { useState } from 'react';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from './ui/Icons';
import { authService } from '../services/authService';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        // Registro
        const result = await authService.signUp(email, password);

        if (result.error) {
          setError(result.error.message);
        } else {
          setSuccessMessage('Conta criada! Verifique seu email para confirmar.');
          setIsSignUp(false);
        }
      } else {
        // Login
        const result = await authService.signIn(email, password);

        if (result.error) {
          setError(result.error.message);
        } else if (result.session) {
          onLogin();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center relative overflow-hidden font-sans">

      {/* 1. ANIMATED BACKGROUND EFFECTS */}
      <div className="absolute inset-0 z-0">
        {/* Deep blue gradient bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-900/20 to-transparent opacity-60"></div>

        {/* Animated Orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/30 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[100px]"></div>

        {/* Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        ></div>

        {/* Floating Particles */}
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-20 duration-1000"></div>
        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-40 duration-[3000ms]"></div>
      </div>

      {/* 2. LOGIN CARD */}
      <div className="relative z-10 w-full max-w-md p-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden">

          {/* Glow Effect on Card Top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

          <div className="p-8">
            {/* BRANDING */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                Vinnx<span className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">AI</span>
              </h1>
              <p className="text-sm text-zinc-400 font-medium">Solutions</p>

              <div className="mt-6">
                <h2 className="text-xl font-bold text-white">
                  {isSignUp ? 'Criar conta' : 'Acesse o painel'}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {isSignUp
                    ? 'Preencha seus dados para começar.'
                    : 'Automação inteligente para negócios que querem escalar.'}
                </p>
              </div>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm text-center">
                {successMessage}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 ml-1">E-mail</label>
                <div className="relative group">
                  <MailIcon className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    className="w-full bg-black/40 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 ml-1 flex justify-between">
                  <span>Senha</span>
                </label>
                <div className="relative group">
                  <LockIcon className="absolute left-3 top-3 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-zinc-700 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {isSignUp && (
                  <p className="text-[10px] text-zinc-500 ml-1">Mínimo 6 caracteres</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  isSignUp ? "Criar conta" : "Entrar no painel"
                )}
              </button>
            </form>
          </div>

          {/* Footer of Card */}
          <div className="bg-black/20 p-4 text-center border-t border-zinc-800/50">
            <p className="text-xs text-zinc-500">
              {isSignUp ? (
                <>Já tem conta? <button onClick={() => setIsSignUp(false)} className="text-blue-500 font-bold hover:underline">Fazer login</button></>
              ) : (
                <>Ainda não tem conta? <button onClick={() => setIsSignUp(true)} className="text-blue-500 font-bold hover:underline">Criar conta</button></>
              )}
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-zinc-600 mt-6">
          &copy; 2024 Vinnx AI Solutions. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};