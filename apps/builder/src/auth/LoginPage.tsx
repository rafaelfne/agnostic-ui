import { type FormEvent, type ReactElement, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useI18n } from '@/i18n/i18n';

import { useAuth } from './AuthContext';

/** Redesigned login. The signIn → navigate('/') flow and the fields are UNCHANGED (brief §4). */
export function LoginPage(): ReactElement {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('login.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-700 via-violet-900 to-zinc-950 p-14 lg:flex">
        <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-[9px] border border-white/20 bg-white/15 font-mono text-[15px] font-bold text-white">
            A
          </div>
          <span className="text-base font-semibold text-white">Agnostic UI</span>
        </div>
        <div className="relative">
          <p className="mb-4 font-mono text-[13px] font-semibold uppercase tracking-wider text-violet-200">
            {t('app.builderConsole')}
          </p>
          <h1 className="mb-4 max-w-[14ch] text-4xl font-semibold leading-tight tracking-tight text-balance text-white">
            {t('login.headline')}
          </h1>
          <p className="max-w-[34ch] text-base leading-relaxed text-violet-100/90">
            {t('login.sub')}
          </p>
        </div>
        <div className="relative flex gap-5 text-[13px] text-violet-100/80">
          <span>{t('login.tagWhiteLabel')}</span>
          <span className="opacity-40">·</span>
          <span>{t('login.tagRls')}</span>
          <span className="opacity-40">·</span>
          <span>{t('login.tagFailClosed')}</span>
        </div>
      </div>

      {/* form */}
      <div className="relative flex items-center justify-center p-10">
        <div className="absolute right-7 top-7">
          <LanguageToggle />
        </div>
        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="mb-1.5 text-2xl font-semibold tracking-tight">{t('login.title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('login.accessPre')} <code className="font-mono text-primary">partnerco</code>{' '}
              {t('login.accessPost')}
            </p>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@partnerco.com"
                required
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('login.password')}</Label>
                <a className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  {t('login.forgot')}
                </a>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-10"
              />
            </div>
            {error !== null && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="mt-1 h-10">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            {t('login.foot1')}
            <br />
            {t('login.foot2')}
          </p>
        </div>
      </div>
    </div>
  );
}
