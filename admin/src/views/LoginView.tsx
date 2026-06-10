import { useState } from 'react';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: { id: number; name: string; email: string; role: string }) => void;
  apiUrl: string;
}

export default function LoginView({ onLoginSuccess, apiUrl }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaSentMsg, setMfaSentMsg] = useState<string | null>(null);

  // Phase 1: Submit credentials to check password and trigger MFA
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Invalid credentials or connection error.');
      }

      if (resData.requireMfa && resData.mfaToken) {
        setMfaToken(resData.mfaToken);
        setMfaSentMsg(resData.message || 'Verification code sent to your registered email.');
      } else {
        throw new Error('MFA token not returned by the server. Please contact support.');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: Submit OTP verification code to log in
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !mfaToken) {
      setError('Please enter your 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError(null);
    setMfaSentMsg(null);

    try {
      const response = await fetch(`${apiUrl}/auth/verify-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp, mfaToken })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Verification code invalid or expired.');
      }

      const { token, user } = resData;

      // Restrict access to administrative/counselor roles
      if (user.role === 'Client') {
        throw new Error('Access denied. Client accounts cannot access this administrative portal.');
      }

      onLoginSuccess(token, user);
    } catch (e: any) {
      setError(e.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Reset MFA state to try credentials again
  const handleBackToLogin = () => {
    setMfaToken(null);
    setOtp('');
    setError(null);
    setMfaSentMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-skyblue-50 via-white to-oceanblue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-skyblue-100 shadow-2xl shadow-skyblue-200/50">
        
        {/* Brand logo header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-oceanblue to-skyblue flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-oceanblue/20 mb-3">
            R
          </div>
          <h2 className="text-2xl font-black text-oceanblue text-center">RecApp Admin</h2>
          <p className="text-xs text-oceanblue-900/50 text-center mt-1">
            Rehabilitation & Counseling Client Portal
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-semibold mb-6 flex items-start gap-3">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* OTP Success alert message */}
        {mfaSentMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl p-4 text-xs font-semibold mb-6 flex items-start gap-3">
            <span className="text-base leading-none">📧</span>
            <div className="flex-1">{mfaSentMsg}</div>
          </div>
        )}

        {!mfaToken ? (
          /* Step 1: Username & Password */
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="counselor@recapp.com"
                className="w-full bg-skyblue-50/50 focus:bg-white border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 px-4 text-sm font-semibold text-oceanblue outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-skyblue-50/50 focus:bg-white border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 px-4 text-sm font-semibold text-oceanblue outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 bg-gradient-to-r from-oceanblue to-skyblue hover:from-oceanblue-900 hover:to-skyblue-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: One-Time Password Verification */
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider text-center">
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-skyblue-50/50 focus:bg-white border border-skyblue-100 focus:border-skyblue rounded-2xl py-4 px-4 text-2xl text-center font-black tracking-[0.75em] text-oceanblue outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-lg"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className={`w-full py-4 px-6 bg-gradient-to-r from-oceanblue to-skyblue hover:from-oceanblue-900 hover:to-skyblue-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                loading || otp.length !== 6 ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Confirm Verification</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToLogin}
              className="w-full text-center text-xs font-bold text-skyblue-700 hover:text-skyblue-600 transition-colors"
            >
              ← Back to credentials
            </button>
          </form>
        )}

        {/* Development mode credentials helper */}
        <div className="mt-8 pt-6 border-t border-skyblue-100/50 text-center">
          <span className="text-[10px] text-oceanblue-900/40 uppercase font-black tracking-wider block mb-2">
            Development Accounts
          </span>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-left text-oceanblue-900/60 leading-relaxed font-semibold">
            <div className="bg-skyblue-50/50 p-2 rounded-xl">
              <span className="font-bold text-oceanblue block">Admin</span>
              admin@recapp.com<br/>AdminPassword123
            </div>
            <div className="bg-skyblue-50/50 p-2 rounded-xl">
              <span className="font-bold text-oceanblue block">Counselor</span>
              counselor@recapp.com<br/>CounselorPassword123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
