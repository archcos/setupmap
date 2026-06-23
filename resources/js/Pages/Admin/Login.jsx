// resources/js/Pages/Admin/Login.jsx
import { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import P3Logo from '@/../../resources/assets/P3_LOGO.png';

export default function AdminLogin({ errors }) {
  const { data, setData, post, processing } = useForm({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    post('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Head title="Admin Login - SETUP P3 Portal" />
      
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {/* P3 Logo inside Shield - Clickable to Home */}
          <Link 
            href="/" 
            className="inline-block relative group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg"
            aria-label="Go to home"
          >
            {/* Shield shape using SVG */}
            <div className="relative w-28 h-28 mx-auto">
              <svg 
                viewBox="0 0 100 100" 
                className="w-full h-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Shield background with gradient */}
                <defs>
                  <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.2" />
                  </linearGradient>
                  <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                
                {/* Shield shape */}
                <path 
                  d="M50 5 L95 20 L95 50 C95 75 77 92 50 98 C23 92 5 75 5 50 L5 20 L50 5Z" 
                  fill="url(#shieldGradient)"
                  stroke="url(#shieldBorder)"
                  strokeWidth="2.5"
                  className="transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                />
                
                {/* Inner glow effect */}
                <path 
                  d="M50 10 L90 23 L90 50 C90 72 74 88 50 93 C26 88 10 72 10 50 L10 23 L50 10Z" 
                  fill="none"
                  stroke="url(#shieldBorder)"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </svg>
              
              {/* P3 Logo centered in shield */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src={P3Logo} 
                  alt="P3 Logo" 
                  className="h-14 w-auto transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                />
              </div>
            </div>
            
            {/* Hover tooltip */}
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Go to Home
            </span>
          </Link>
          
          <h1 className="text-3xl font-bold text-white mt-8">Admin Portal</h1>
          <p className="text-gray-400 mt-2">Sign in to manage equipment</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {errors.email && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{errors.email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}