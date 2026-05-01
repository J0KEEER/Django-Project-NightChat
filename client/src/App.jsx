import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { useThemeStore } from './store/theme';
import { ChatLayout } from './components/chat/ChatLayout';
import { GoogleLogin } from '@react-oauth/google';
import { Moon, Sun } from 'lucide-react';

function App() {
  const { isAuthenticated, login, register, googleLogin, initialize, error } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isAuthenticated) {
    return <ChatLayout />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      await login(email, password);
    } else {
      const ok = await register(email, password, email.split('@')[0]);
      if (ok) {
        setIsLogin(true);
      }
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-6 relative">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-2xl glass hover:scale-110 active:scale-95 transition-all z-10"
        aria-label="Toggle theme"
      >
        {isDark
          ? <Sun size={20} className="text-amber-400" />
          : <Moon size={20} className="text-gray-600" />
        }
      </button>

      <div className="glass max-w-sm w-full p-10 rounded-[3rem] shadow-2xl shadow-black/5 dark:shadow-black/30 flex flex-col gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-black dark:bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/20 dark:shadow-white/10">
            <div className="grid grid-cols-2 gap-1">
              {[1,2,3,4].map(i => <div key={i} className="w-2 h-2 bg-white dark:bg-black rounded-full" />)}
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">NightChat</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{isLogin ? 'Sign in to continue' : 'Create your account'}</p>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs text-center p-3 rounded-2xl font-medium">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-4">
            <input
              className="w-full bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 focus:bg-white dark:focus:bg-white/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="w-full bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 focus:bg-white dark:focus:bg-white/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" className="bg-black dark:bg-white text-white dark:text-black rounded-2xl p-4 font-bold text-sm shadow-xl shadow-black/20 dark:shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2">
            {isLogin ? 'Login' : 'Register'}
          </button>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100 dark:border-white/10"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/40 dark:bg-transparent px-2 text-gray-400 dark:text-gray-500 backdrop-blur-sm">Or continue with</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={credentialResponse => {
                const client = window.google.accounts.oauth2.initTokenClient({
                  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                  scope: 'https://www.googleapis.com/auth/contacts.readonly',
                  callback: (tokenResponse) => {
                    googleLogin(credentialResponse.credential, tokenResponse.access_token);
                  },
                });
                client.requestAccessToken();
              }}
              onError={() => {
                console.log('Login Failed');
              }}
              theme={isDark ? "filled_black" : "outline"}
              shape="pill"
              size="large"
              width={300}
            />
          </div>
        </form>
        
        <button 
          className="text-gray-400 dark:text-gray-500 text-xs font-semibold hover:text-gray-900 dark:hover:text-white transition-colors tracking-wide uppercase"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "New here? Create account" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

export default App;
