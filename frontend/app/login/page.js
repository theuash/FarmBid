'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Mail, Lock, User, Phone, MapPin, Leaf,
  Eye, EyeOff, ArrowRight, Loader2, Shield, Fingerprint,
  ChevronRight, CheckCircle2, Globe, Smartphone, ShoppingCart, Link2
} from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'

export default function LoginPage() {
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userType, setUserType] = useState('retailer') // 'retailer' or 'farmer'

  // Form states
  const [loginForm, setLoginForm] = useState({ phone: '' })
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    userType: 'buyer'
  })

  // OTP states
  const [useOTP, setUseOTP] = useState(true)
  const [otpStep, setOtpStep] = useState(0) // 0: initial, 1: otp sent
  const [otpCode, setOtpCode] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [otpExpiry, setOtpExpiry] = useState(null)

  // Agent login state
  const [showAgentLogin, setShowAgentLogin] = useState(false)
  const [agentForm, setAgentForm] = useState({ username: '', password: '' })

  // Password visibility
  const [showPassword, setShowPassword] = useState(false)

  // SSI state
  const [ssiStep, setSsiStep] = useState(0)

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      const data = await response.json()
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token)
        localStorage.setItem('farmbid_user', JSON.stringify(data.user))
        toast.success(`Welcome back, ${data.user.name}!`)
        router.push('/')
      } else {
        toast.error(data.error || 'Login failed')
      }
    } catch (err) {
      toast.error('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    try {
      setIsLoading(true)
      const payload = {
        name: signupForm.name,
        email: signupForm.email,
        password: signupForm.password,
        phone: signupForm.phone,
        location: signupForm.location,
        userType: userType === 'retailer' ? 'buyer' : 'farmer'
      }
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token)
        localStorage.setItem('farmbid_user', JSON.stringify(data.user))
        toast.success('Account created! Welcome to FarmBid.')
        router.push('/')
      } else {
        toast.error(data.error || 'Registration failed')
      }
    } catch (err) {
      toast.error('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendOTP = async (phone, purpose) => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid phone number')
      return
    }
    try {
      setIsLoading(true)
      const normalizedPhone = phone.replace(/\D/g, '')
      const body = {
        phone: normalizedPhone,
        purpose,
        userType: userType === 'retailer' ? 'buyer' : 'farmer',
      }
      if (isSignUp && purpose === 'signup') {
        body.name = signupForm.name
        body.email = signupForm.email
        body.location = signupForm.location
      }
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await response.json()
      if (data.success) {
        setOtpPhone(normalizedPhone)
        setOtpStep(1)
        setOtpExpiry(Date.now() + (data.expiryMinutes || 10) * 60 * 1000)
        toast.success(`OTP sent to ${phone} via WhatsApp`)
      } else {
        toast.error(data.error || 'Failed to send OTP')
      }
    } catch (err) {
      toast.error('Connection error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (phone, otp, purpose) => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP')
      return
    }
    try {
      setIsLoading(true)
      const payload = {
        phone,
        otp,
        purpose,
        userType: userType === 'retailer' ? 'buyer' : 'farmer',
      }
      if (isSignUp) {
        payload.name = signupForm.name
        payload.email = signupForm.email
        payload.location = signupForm.location
        payload.extraData = { name: signupForm.name, email: signupForm.email, location: signupForm.location }
      }
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token)
        localStorage.setItem('farmbid_user', JSON.stringify(data.user))
        toast.success(isSignUp ? 'Account created!' : `Welcome back!`)
        router.push('/')
      } else {
        toast.error(data.error || 'Invalid OTP')
      }
    } catch (err) {
      toast.error('Connection error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!otpPhone) return
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone })
      })
      const data = await response.json()
      if (data.success) {
        setOtpExpiry(Date.now() + (data.expiryMinutes || 10) * 60 * 1000)
        toast.success('OTP resent')
      } else {
        toast.error(data.error || 'Failed to resend OTP')
      }
    } catch (err) {
      toast.error('Connection error')
    } finally {
      setIsLoading(false)
    }
  }

  // Google OAuth via real hook
  const realGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true)
        const response = await fetch(`${API_URL}/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: tokenResponse.access_token,
            role: userType === 'retailer' ? 'buyer' : 'farmer'
          })
        })
        const data = await response.json()
        if (data.success) {
          localStorage.setItem('farmbid_token', data.token)
          localStorage.setItem('farmbid_user', JSON.stringify(data.user))
          toast.success(`Welcome, ${data.user.name}!`)
          router.push('/')
        } else {
          toast.error(data.error || 'Google login failed')
        }
      } catch (err) {
        toast.error('Google login error')
      } finally {
        setIsLoading(false)
      }
    },
    onError: () => toast.error('Google login failed'),
    flow: 'implicit'
  })

  // Agent login with hardcoded credentials
  const handleAgentLogin = async (e) => {
    e.preventDefault()
    if (agentForm.username !== 'ujwal' || agentForm.password !== 'virtual@123') {
      toast.error('Invalid agent credentials')
      return
    }
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'agent' })
      })
      const data = await response.json()
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token)
        localStorage.setItem('farmbid_user', JSON.stringify(data.user))
        toast.success('Agent login successful')
        router.push('/')
      } else {
        toast.error(data.error || 'Agent login failed')
      }
    } catch (err) {
      toast.error('Connection error')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex" style={{ background: '#e0e5ec' }}>
      {/* Left Panel – Art Side */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="hidden md:flex md:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a3a2a 0%, #228B22 50%, #2d5a1b 100%)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative z-10 text-center px-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="w-24 h-24 mx-auto mb-8 rounded-3xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}
          >
            <Leaf className="w-16 h-16 text-white" />
          </motion.div>
          <h1 className="text-4xl font-black text-white mb-4">FarmBid</h1>
          <p className="text-green-200 text-lg mb-8 leading-relaxed">
            Direct from Source.<br />
            Retailers compete upward.<br />
            <span className="text-green-300 font-bold">Blockchain guarantees it all.</span>
          </p>
          <div className="space-y-3 text-left">
            {[
              { icon: <Smartphone className="h-5 w-5" />, text: 'WhatsApp-enabled interface' },
              { icon: <Link2 className="h-5 w-5" />, text: 'Blockchain-verified auctions' },
              { icon: <Lock className="h-5 w-5" />, text: 'OTP-secured accounts' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3"
              >
                <span className="text-white/80">{item.icon}</span>
                <span className="text-white/90 text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Toggle Auth Mode */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setOtpStep(0); setOtpCode('') }}
            className="text-green-200 hover:text-white font-medium transition-colors text-sm"
          >
            {isSignUp ? '← Back to Sign In' : 'Need to join as a Retailer? Create account →'}
          </button>
        </div>
      </motion.div>

      {/* Right Panel – Form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-14 overflow-y-auto"
      >
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="mb-8">
            <div className="md:hidden flex items-center gap-2 mb-6 text-[#228B22]">
              <Leaf className="h-8 w-8" />
              <span className="text-2xl font-black">FarmBid</span>
            </div>
            <h2 className="text-3xl font-black text-gray-800 mb-1">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-500">
              {isSignUp ? 'Join the leading agricultural marketplace' : 'Sign in to your Retailer account'}
            </p>
          </div>

          {/* Role selection removed - defaulting to Retailer for main flow */}

          <AnimatePresence mode="wait">
            {showAgentLogin ? (
              /* ── Agent Login (subtle, plain) ── */
              <motion.div
                key="agent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <button onClick={() => setShowAgentLogin(false)} className="text-xs text-blue-500 hover:underline">
                    ← Back to Retailer login
                  </button>
                  <span className="text-gray-400 text-xs">Agent Console Access</span>
                </div>
                <form onSubmit={handleAgentLogin} className="space-y-4">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Username"
                      value={agentForm.username}
                      onChange={(e) => setAgentForm({ ...agentForm, username: e.target.value })}
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-full text-gray-700 placeholder-gray-400 outline-none border border-gray-300 bg-white"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={agentForm.password}
                      onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                      required
                      className="w-full pl-12 pr-12 py-3 rounded-full text-gray-700 placeholder-gray-400 outline-none border border-gray-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-full font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                    style={{ background: '#228B22' }}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Agent Sign In <ArrowRight className="h-5 w-5" /></>}
                  </button>
                </form>
              </motion.div>
            ) : (
              /* ── Main Sign In / Sign Up ── */
              <motion.div
                key={isSignUp ? 'signup' : 'login'}
                initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Google Login – Wide */}
                <button
                  onClick={() => realGoogleLogin()}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-full font-semibold text-gray-700 mb-5 transition-all duration-300 hover:shadow-md"
                  style={{
                    background: '#e0e5ec',
                    boxShadow: '5px 5px 10px #bec3c9, -5px -5px 10px #ffffff'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #bec3c9, inset -3px -3px 6px #ffffff'}
                  onMouseUp={(e) => e.currentTarget.style.boxShadow = '5px 5px 10px #bec3c9, -5px -5px 10px #ffffff'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '5px 5px 10px #bec3c9, -5px -5px 10px #ffffff'}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z" />
                    <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2970244 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z" />
                    <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z" />
                    <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7720917 1.23746264,17.3349879 L5.27698177,14.2678769 Z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1 h-px bg-gray-300" />
                  <span className="text-gray-400 text-sm">or use phone OTP</span>
                  <div className="flex-1 h-px bg-gray-300" />
                </div>

                {/* OTP Form */}
                <form className="space-y-4">
                  {isSignUp && (
                    <>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <User className="h-5 w-5" />
                        </div>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={signupForm.name}
                          onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                          required
                          className="w-full pl-12 pr-4 py-3 rounded-full text-gray-700 placeholder-gray-400 outline-none border border-gray-300 bg-white"
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <Mail className="h-5 w-5" />
                        </div>
                        <input
                          type="email"
                          placeholder="Email (optional)"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 rounded-full text-gray-700 placeholder-gray-400 outline-none border border-gray-300 bg-white"
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <input
                          type="text"
                          placeholder="Location (City / District)"
                          value={signupForm.location}
                          onChange={(e) => setSignupForm({ ...signupForm, location: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 rounded-full text-gray-700 placeholder-gray-400 outline-none border border-gray-300 bg-white"
                        />
                      </div>
                    </>
                  )}

                  {/* Phone Input */}
                  {otpStep === 0 && (
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Phone className="h-5 w-5" />
                      </div>
                      <input
                        type="tel"
                        placeholder="Phone Number (WhatsApp)"
                        value={isSignUp ? signupForm.phone : loginForm.phone}
                        onChange={(e) => isSignUp
                          ? setSignupForm({ ...signupForm, phone: e.target.value })
                          : setLoginForm({ ...loginForm, phone: e.target.value })
                        }
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-full text-gray-700 placeholder-gray-400 outline-none border border-gray-300 bg-white"
                      />
                    </div>
                  )}

                  {/* OTP Input */}
                  {otpStep === 1 && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <Smartphone className="h-12 w-12 text-[#228B22] mx-auto mb-2" />
                        <p className="text-sm text-gray-600">OTP sent via WhatsApp to +{otpPhone}</p>
                      </div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <Shield className="h-5 w-5" />
                        </div>
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength="6"
                          className="w-full pl-12 pr-4 py-3 rounded-full text-gray-700 placeholder-gray-400 outline-none border border-gray-300 bg-white text-center tracking-widest font-mono text-lg"
                        />
                      </div>
                      {otpExpiry && (
                        <p className="text-xs text-gray-400 text-center">
                          Expires in {Math.max(0, Math.floor((otpExpiry - Date.now()) / 1000))}s
                        </p>
                      )}
                    </div>
                  )}

                  {/* Send OTP Button */}
                  {otpStep === 0 && (
                    <button
                      type="button"
                      onClick={() => handleSendOTP(isSignUp ? signupForm.phone : loginForm.phone, isSignUp ? 'signup' : 'login')}
                      disabled={isLoading}
                      className="w-full py-3 rounded-full font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                      style={{ background: '#228B22' }}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>Send OTP <ArrowRight className="h-5 w-5" /></>
                      )}
                    </button>
                  )}

                  {/* Verify OTP Buttons */}
                  {otpStep === 1 && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => handleVerifyOTP(otpPhone, otpCode, isSignUp ? 'signup' : 'login')}
                        disabled={isLoading || otpCode.length !== 6}
                        className="w-full py-3 rounded-full font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                        style={{ background: '#228B22' }}
                      >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Verify OTP <ArrowRight className="h-5 w-5" /></>}
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={isLoading}
                        className="w-full py-2 rounded-full font-medium text-[#228B22] border border-[#228B22] hover:bg-[#228B22]/5 transition-all"
                      >
                        Resend OTP
                      </button>
                    </div>
                  )}
                </form>



                {/* Mobile toggle */}
                <div className="md:hidden mt-5 text-center">
                  <button
                    onClick={() => { setIsSignUp(!isSignUp); setOtpStep(0); setOtpCode('') }}
                    className="text-[#264941] font-medium text-sm"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Agent Access – Subtle link at bottom ── */}
          {!showAgentLogin && (
            <div className="mt-8 text-center">
              <button
                onClick={() => { setShowAgentLogin(true); setIsSignUp(false); }}
                className="text-xs text-gray-400 hover:text-blue-500 transition-colors underline decoration-dotted"
              >
                Log in as Agent
              </button>
            </div>
          )}

          {/* SSI Footer */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-xs text-gray-500 border border-gray-200">
              <Fingerprint className="h-3.5 w-3.5 text-[#228B22]" />
              <span>Self-Sovereign Identity · Polygon Blockchain</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
