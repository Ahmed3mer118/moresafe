import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD, type Role } from '../types';
import { Button } from '../components/ui/Button';
import { FormField, inputClass } from '../components/ui/FormField';
import { setLanguage } from '../i18n';
import { useFormDraft, clearFormDraft } from '../hooks/useFormDraft';
import logo from '../assets/images/Transparent-for-Dark-background-139x139.png';

const LOGIN_INIT = { email: '', password: '' };
const LOGIN_DRAFT_OMIT: (keyof typeof LOGIN_INIT)[] = ['password'];

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, user, loading } = useAuth();
  const { form, setForm } = useFormDraft('auth.login', LOGIN_INIT, { omit: LOGIN_DRAFT_OMIT });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) return null;
  if (user) {
    return <Navigate to={ROLE_DASHBOARD[user.role as Role] ?? '/login'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const path = await login(form.email, form.password);
      clearFormDraft('auth.login');
      window.location.href = path;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  const lang = i18n.language as 'ar' | 'en';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-indigo-50/50 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000" />
      </div>

      <button
        type="button"
        onClick={() => setLanguage(lang === 'ar' ? 'en' : 'ar')}
        className="absolute top-6 end-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm shadow-sm border border-gray-200/60 text-gray-700 hover:bg-white transition-all duration-300 text-sm font-medium z-10"
      >
        <span className="text-base">{lang === 'ar' ? '🇸🇦' : '🇬🇧'}</span>
        {t('common.language')}
      </button>

      <div
        className="w-full max-w-md relative z-10 transition-all duration-700 ease-out"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}
      >
        <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-gray-100/80 overflow-hidden">

          <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
            <div className="inline-flex items-center justify-center w-[150px] max-h-[100px] bg-brand-500 rounded-2xl mb-4">
              <img src={logo} alt="Moresafe" className="w-full h-full object-cover" />
            </div>
            {/* <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">
              {t('app.name')}
            </h1> */}

          </div>

          {/* نموذج الدخول */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="space-y-4">
              <FormField label={t('auth.email')}>
                <div className="relative">
                  <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    className={`${inputClass} ps-10 border-gray-200 focus:border-indigo-400 focus:ring focus:ring-indigo-200/50 transition-all duration-200`}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="example@company.com"
                  />
                </div>
              </FormField>

              <FormField label={t('auth.password')}>
                <div className="relative">
                  <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`${inputClass} ps-10 pe-12 border-gray-200 focus:border-indigo-400 focus:ring focus:ring-indigo-200/50 transition-all duration-200`}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </FormField>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg border border-red-200/60 text-sm font-medium">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3 text-base font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-200/50 transition-all duration-300 rounded-lg"
              disabled={submitting}
              loading={submitting}
            >
              {submitting ? t('common.loading') : t('auth.login')}
            </Button>

            {/* قسم الحسابات التجريبية بشكل جديد */}
            <div className="bg-gray-50/80 rounded-lg p-4 border border-gray-200/60">
              <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                حسابات تجريبية
              </p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-500 font-mono">
                <span>admin@erp.com</span>
                <span>manger@erp.com</span>
                <span>projectmanger@erp.com</span>
                <span>projectaccounter@erp.com</span>
              </div>
            </div>

            <p className="text-center text-[10px] text-gray-400 pt-2">
              {new Date().getFullYear()} © {t('app.name')} 
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}