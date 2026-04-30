import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { ChatLayout } from './components/chat/ChatLayout';
import { GoogleLogin } from '@react-oauth/google';

function App() {
  const { isAuthenticated, login, register, googleLogin, initialize, error } = useAuthStore();
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
      <div className="glass max-w-sm w-full p-10 rounded-[3rem] shadow-2xl shadow-black/5 flex flex-col gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/20">
            <div className="grid grid-cols-2 gap-1">
              {[1,2,3,4].map(i => <div key={i} className="w-2 h-2 bg-white rounded-full" />)}
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">NightChat</h1>
          <p className="text-gray-500 text-sm font-medium">{isLogin ? 'Sign in to continue' : 'Create your account'}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-4">
            <input
              className="w-full bg-white/50 border border-black/5 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all placeholder:text-gray-400"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="w-full bg-white/50 border border-black/5 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all placeholder:text-gray-400"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" className="bg-black text-white rounded-2xl p-4 font-bold text-sm shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2">
            {isLogin ? 'Login' : 'Register'}
          </button>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={credentialResponse => {
                googleLogin(credentialResponse.credential);
              }}
              onError={() => {
                console.log('Login Failed');
              }}
              useOneTap
              theme="outline"
              shape="pill"
              size="large"
              width="100%"
            />
          </div>
        </form>
        
        <button 
          className="text-gray-400 text-xs font-semibold hover:text-gray-900 transition-colors tracking-wide uppercase"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "New here? Create account" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

export default App;
