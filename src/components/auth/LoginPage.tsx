import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Hexagon, ArrowRight, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isRegister) {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        setError(error);
      } else {
        setSuccess('Registrierung erfolgreich. Bitte bestätige deine E-Mail.');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary bg-dot-pattern flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="relative">
            <Hexagon className="w-10 h-10 text-accent" strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xs font-bold text-accent">A</span>
            </div>
          </div>
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight">AAS Tools</h1>
            <p className="text-2xs text-txt-muted font-mono uppercase tracking-widest">
              Asset Administration Shell
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-bg-surface border border-border rounded p-6">
          <h2 className="font-mono text-lg font-semibold mb-1">
            {isRegister ? 'Konto erstellen' : 'Anmelden'}
          </h2>
          <p className="text-sm text-txt-secondary mb-6">
            {isRegister
              ? 'Erstelle ein Konto um die AAS Tools zu nutzen.'
              : 'Melde dich an um fortzufahren.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                  placeholder="Dein Name"
                  required={isRegister}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                placeholder="name@beispiel.de"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary uppercase tracking-wider mb-1.5">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-bg-input border border-border rounded-sm px-3 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-sm px-3 py-2 text-sm text-emerald-400">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-bg-primary font-medium text-sm py-2.5 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isRegister ? 'Registrieren' : 'Anmelden'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-border text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-txt-secondary hover:text-accent transition-colors"
            >
              {isRegister
                ? 'Bereits ein Konto? Anmelden'
                : 'Noch kein Konto? Registrieren'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-2xs text-txt-muted mt-6 font-mono">
          v0.1.0 — Neoception
        </p>
      </div>
    </div>
  );
}
