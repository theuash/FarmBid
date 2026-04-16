'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  Mail, Lock, User, Phone, MapPin, Leaf,
  Eye, EyeOff, ArrowRight, Loader2, Shield, Fingerprint,
  ChevronRight, CheckCircle2, Globe, Smartphone, ShoppingCart
} from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props.js'
import { LinkedIn } from 'react-linkedin-login-oauth2'

export default function LoginPage() {
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
<<<<<<< HEAD
  const [showPassword, setShowPassword] = useState(false)
  const userType = 'buyer'
  const [useOTP] = useState(true)
=======
  const [userType, setUserType] = useState('retailer') // 'retailer' or 'farmer'
>>>>>>> 59bea7c68a2acc78c12faa5c1524d3b87f6fb904
  
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
  const [otpStep, setOtpStep] = useState(0) // 0: initial, 1: otp sent, 2: verifying
  const [otpCode, setOtpCode] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [otpExpiry, setOtpExpiry] = useState(null)
  const [otpAttempts, setOtpAttempts] = useState(0)

  // SSI verification state
  const [ssiStep, setSsiStep] = useState(0) // 0: form, 1: verifying, 2: credential issued
  const [verifiableCredential, setVerifiableCredential] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()

<<<<<<< HEAD
    if (!loginForm.phone || loginForm.phone.replace(/\D/g, '').length < 10) {
      toast.error('Invalid phone number', { description: 'Please enter a valid 10-digit phone number' })
      return
=======
    try {
      // First, fetch phone number linked to this email
      const response = await fetch(`${API_URL}/auth/get-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email })
      })

      const data = await response.json()

      if (data.success && data.phone) {
        // Phone found, send OTP to that phone
        const otpSent = await handleSendOTP(data.phone, 'login')
        if (otpSent) {
          setLoginForm({...loginForm, phone: data.phone})
        }
      } else {
        toast.error('Email not found', { description: 'Please check your email or create an account' })
      }
    } catch (error) {
      toast.error('Connection error', { description: 'Please try again' })
    } finally {
      setIsLoading(false)
>>>>>>> 59bea7c68a2acc78c12faa5c1524d3b87f6fb904
    }

    // Send OTP to phone number for login
    const otpSent = await handleSendOTP(loginForm.phone, 'login')
  }

  const handleSignup = async (e) => {
    e.preventDefault()

    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    // Send OTP to phone number provided during signup
    const otpSent = await handleSendOTP(signupForm.phone, 'signup')
  }

  const realGoogleLogin = useGoogleLogin({
    scope: 'openid email profile',
    onSuccess: async (tokenResponse) => {
      setIsLoading(true)
      toast.info('Authenticating with backend server...')
      
      try {
        const googleToken = tokenResponse.access_token || tokenResponse.credential || tokenResponse.id_token || tokenResponse.code

        if (!googleToken) {
          toast.error('Google login failed', { description: 'No token received from Google' })
          setIsLoading(false)
          return
        }

        const response = await fetch(`${API_URL}/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: googleToken, role: userType === 'retailer' ? 'buyer' : 'farmer' })
        })
        
        const data = await response.json()
        
        if (data.success) {
          localStorage.setItem('farmbid_token', data.token)
          localStorage.setItem('farmbid_user', JSON.stringify(data.user))
          
          toast.success('Google Authentication Successful!', {
            description: `Welcome, ${data.user.name}!`
          })
          
          setTimeout(() => router.push('/'), 1000)
        } else {
          toast.error('Google login failed', { description: data.error })
        }
      } catch (error) {
        toast.error('Google connection error', { description: 'Please try again' })
      } finally {
        setIsLoading(false)
      }
    },
    onError: () => toast.error('Google Login Popup Closed or Failed')
  });

  const handleFacebookLogin = async (response) => {
    if (process.env.NEXT_PUBLIC_FACEBOOK_APP_ID === "123456789" || !response.accessToken) {
       // Support for local testing without real keys
       if (!response.accessToken) {
         toast.info("Dev Mode: Mocking Facebook login...");
         return simulateFacebookSuccess();
       }
    }
    
    setIsLoading(true)
    toast.info('Authenticating with Facebook...')
    
    try {
      const res = await fetch(`${API_URL}/auth/facebook-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.accessToken, role: userType })
      })
      
      const data = await res.json()
      
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token)
        localStorage.setItem('farmbid_user', JSON.stringify(data.user))
        
        toast.success('Facebook Authentication Successful!', {
          description: `Welcome, ${data.user.name}!`
        })
        
        setTimeout(() => router.push('/'), 1000)
      } else {
        toast.error('Facebook login failed', { description: data.error })
      }
    } catch (error) {
      toast.error('Facebook connection error', { description: 'Please try again' })
    } finally {
      setIsLoading(false)
    }
  }

  const simulateFacebookSuccess = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: userType })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token);
        localStorage.setItem('farmbid_user', JSON.stringify({
          ...data.user,
          name: 'Demo Facebook User',
          email: 'fb-demo@example.com'
        }));
        toast.success('System: Mock Facebook Login Successful');
        setTimeout(() => router.push('/'), 1000);
      } else {
        toast.error('Simulation Failed', { description: data.error });
      }
    } catch (error) {
      toast.error('Simulation Connection Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedInLogin = async (response) => {
    if (process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID === "123456789") {
        toast.info("Dev Mode: Mocking LinkedIn login...");
        return simulateLinkedInSuccess();
    }
    
    if (!response.code) {
      toast.error('LinkedIn Login Failed');
      return;
    }
    
    setIsLoading(true)
    toast.info('Authenticating with LinkedIn...')
    
    try {
      const res = await fetch(`${API_URL}/auth/linkedin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.code, role: userType })
      })
      
      const data = await res.json()
      
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token)
        localStorage.setItem('farmbid_user', JSON.stringify(data.user))
        
        toast.success('LinkedIn Authentication Successful!', {
          description: `Welcome, ${data.user.name}!`
        })
        
        setTimeout(() => router.push('/'), 1000)
      } else {
        toast.error('LinkedIn login failed', { description: data.error })
      }
    } catch (error) {
      toast.error('LinkedIn connection error', { description: 'Please try again' })
    } finally {
      setIsLoading(false)
    }
  }

  const simulateLinkedInSuccess = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: userType })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token);
        localStorage.setItem('farmbid_user', JSON.stringify({
          ...data.user,
          name: 'Demo LinkedIn User',
          email: 'li-demo@example.com'
        }));
        toast.success('System: Mock LinkedIn Login Successful');
        setTimeout(() => router.push('/'), 1000);
      } else {
        toast.error('Simulation Failed', { description: data.error });
      }
    } catch (error) {
      toast.error('Simulation Connection Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider, realLoginFn) => {
    if (provider === 'Google') {
      return realGoogleLogin();
    }
    
    // Developer Shortcut: Bypass real APIs if keys aren't set
    const isFacebookDev = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID === "123456789" || !process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const isLinkedInDev = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID === "123456789" || !process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;

    if (provider === 'Facebook' && isFacebookDev) {
      toast.info("Dev Mode: Simulating Facebook login...");
      return await simulateFacebookSuccess();
    }
    
    if (provider === 'LinkedIn' && isLinkedInDev) {
      toast.info("Dev Mode: Simulating LinkedIn login...");
      return await simulateLinkedInSuccess();
    }

    if (provider === 'Demo Credentials') {
      return handleLogin(null, true);
    }

    // If we have a real login function (from SDK wrappers) and we're NOT in dev mode, use it
    if (realLoginFn) {
      return realLoginFn();
    }
    
    setIsLoading(true)
    toast.info(`Connecting to ${provider}...`)
    
    try {
      // Simulate OAuth redirect and verification delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // For demo purposes, log them in through the existing auth system
      const response = await fetch(`${API_URL}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: userType === 'farmer' ? 'farmer' : 'buyer' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token)
        
        // Customize user profile for the specific social provider
        const socialUser = { 
          ...data.user, 
          name: `${userType === 'farmer' ? 'Farmer' : 'Buyer'} via ${provider}`,
          email: `${provider.toLowerCase()}@example.com`
        }
        localStorage.setItem('farmbid_user', JSON.stringify(socialUser))
        
        toast.success(`${provider} Authentication Successful!`, {
          description: `Welcome, ${socialUser.name}!`
        })
        
        setTimeout(() => router.push('/'), 1000)
      } else {
        toast.error(`${provider} login failed`, { description: data.error })
      }
    } catch (error) {
      console.error('Social login error:', error);
      toast.error(`${provider} connection error`, { description: 'Please try again' })
    } finally {
      setIsLoading(false)
    }
  }

  // Demo login for quick access
  const handleDemoLogin = async (role) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })
      
      const data = await response.json()
      
      if (data.success) {
        localStorage.setItem('farmbid_token', data.token)
        localStorage.setItem('farmbid_user', JSON.stringify(data.user))
        
        toast.success(`Demo ${role} login`, {
          description: `Welcome, ${data.user.name}!`
        })
        
        setTimeout(() => router.push('/'), 500)
      }
    } catch (error) {
      toast.error('Demo login failed')
    } finally {
      setIsLoading(false)
    }
  }

  // OTP Authentication Methods
  const handleSendOTP = async (phone, purpose = 'login') => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      toast.error('Invalid phone number', { description: 'Please enter a valid 10-digit phone number' })
      return false
    }

    setIsLoading(true)
    setOtpPhone(phone)
    
    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          userType,
          purpose
        })
      })

      const data = await response.json()

      if (data.success) {
        setOtpStep(1)
        setOtpExpiry(Date.now() + (data.expiryMinutes * 60 * 1000))
        setOtpAttempts(0)
        toast.success('OTP Sent!', { description: `Check your WhatsApp at ${phone}` })
        return true
      } else {
        toast.error('Failed to send OTP', { description: data.error })
        return false
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      toast.error('Connection error', { description: 'Failed to send OTP' })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (phone, otp, purpose = 'login') => {
    if (!otp || otp.length !== 6) {
      toast.error('Invalid OTP', { description: 'Please enter a valid 6-digit OTP' })
      return
    }

    setIsLoading(true)
    setOtpStep(2)

    try {
      let userData = null

      // If signup, include user data for account creation
      if (purpose === 'signup' && isSignUp) {
        userData = {
          name: signupForm.name,
          email: signupForm.email,
          password: signupForm.password,
          phone,
          location: signupForm.location,
          userType: userType === 'retailer' ? 'buyer' : 'farmer'
        }
<<<<<<< HEAD
=======

        // Create account
        const signupResponse = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })

        const signupData = await signupResponse.json()

        if (!signupData.success) {
          throw new Error(signupData.error || 'Signup failed')
        }
        userData = signupData.user
>>>>>>> 59bea7c68a2acc78c12faa5c1524d3b87f6fb904
      }

      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          otp,
          userType: userType === 'retailer' ? 'buyer' : 'farmer',
          userData
        })
      })

      const data = await response.json()

      if (data.success) {
        setSsiStep(2)
        setVerifiableCredential(data.credential)

        // Store token and user data
        localStorage.setItem('farmbid_token', data.token)
        localStorage.setItem('farmbid_user', JSON.stringify(data.user))

        const message = data.isNewUser ? 'Account created successfully!' : 'Welcome back!'
        toast.success(message, {
          description: `Logged in as ${data.user.name}`
        })

        // Reset forms
        setOtpStep(0)
        setOtpCode('')
        setLoginForm({ phone: '' })
        setSignupForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          location: '',
          userType: 'buyer'
        })

        // Redirect after showing success
        setTimeout(() => {
          setSsiStep(0)
          router.push('/')
        }, 2000)
      } else {
        setSsiStep(0)
        setOtpStep(1)
        toast.error('OTP verification failed', {
          description: data.error || 'Invalid OTP. Please try again.'
        })
      }
    } catch (error) {
      console.error('Verify OTP error:', error)
      setSsiStep(0)
      setOtpStep(1)
      toast.error('Connection error', { description: error.message || 'Please try again' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!otpPhone) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone })
      })

      const data = await response.json()

      if (data.success) {
        setOtpExpiry(Date.now() + (data.expiryMinutes * 60 * 1000))
        setOtpAttempts(0)
        setOtpCode('')
        toast.success('OTP Resent!', { description: 'Check your WhatsApp for the new OTP' })
      } else {
        toast.error('Failed to resend OTP', { description: data.error })
      }
    } catch (error) {
      toast.error('Connection error', { description: 'Please try again' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: '#FFFFFF'
    }}>
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#228B22]/10 to-[#228B22]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#228B22]/10 to-[#228B22]/5 rounded-full blur-3xl" />
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-4xl"
      >
        {/* Neuromorphic Card */}
        <div className="relative bg-[#FFFFFF] rounded-[30px] overflow-hidden" style={{
          boxShadow: '0 2px 8px rgba(38, 73, 65, 0.1)'
        }}>
          <div className="flex flex-col md:flex-row min-h-[600px]">
            
            {/* Left Panel - Sliding Accent */}
            <motion.div
              className="absolute md:relative w-full md:w-1/2 h-full z-10"
              initial={false}
              animate={{
                x: isSignUp ? '100%' : '0%',
                opacity: 1
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ display: 'none' }}
            />

            {/* Left Side - Welcome Panel */}
            <motion.div
              className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center items-center text-white relative overflow-hidden ${isSignUp ? 'md:order-2' : 'md:order-1'}`}
              style={{
                background: '#228B22'
              }}
              initial={false}
              animate={{ x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Decorative circles */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full" />
              <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full" />
              
              <motion.div
                key={isSignUp ? 'signup-welcome' : 'login-welcome'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center z-10"
              >
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Leaf className="h-8 w-8" />
                  </div>
                  <span className="text-3xl font-bold">FarmBid</span>
                </div>

                {isSignUp ? (
                  <>
                    <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
                    <p className="text-white/80 mb-8 max-w-xs">
                      Already have an account? Sign in to access your dashboard and continue bidding.
                    </p>
                    <button
                      onClick={() => setIsSignUp(false)}
                      className="px-8 py-3 border-2 border-white rounded-full font-semibold hover:bg-white hover:text-[#264941] transition-all duration-300"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold mb-4">Hello, Friend!</h2>
                    <p className="text-white/80 mb-8 max-w-xs">
                      Join our blockchain-powered agricultural marketplace. Fair prices, transparent auctions.
                    </p>
                    <button
                      onClick={() => setIsSignUp(true)}
                      className="px-8 py-3 border-2 border-white rounded-full font-semibold hover:bg-white hover:text-[#264941] transition-all duration-300"
                    >
                      Create Account
                    </button>
                  </>
                )}

                {/* SSI Badge */}
                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/70">
                  <Shield className="h-4 w-4" />
                  <span>Secured by Self-Sovereign Identity</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Side - Form Panel */}
            <div className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center ${isSignUp ? 'md:order-1' : 'md:order-2'}`}>
              <AnimatePresence mode="wait">
                {ssiStep === 2 ? (
                  // SSI Credential Display
                  <motion.div
                    key="credential"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 mx-auto mb-6 bg-[#264941] rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Credential Issued!</h3>
                    <p className="text-gray-500 mb-6">Your verifiable credential has been created</p>
                    
                    <div className="p-4 bg-white/50 rounded-2xl text-left" style={{
                      boxShadow: 'inset 4px 4px 8px #d1d5db, inset -4px -4px 8px #ffffff'
                    }}>
                      <p className="text-xs text-gray-400 mb-1">DID (Decentralized Identifier)</p>
                      <code className="text-xs text-[#264941] break-all">
                        {verifiableCredential?.credentialSubject?.id || 'did:farmbid:user:...'}
                      </code>
                      <div className="flex items-center gap-2 mt-3">
                        <Fingerprint className="h-4 w-4 text-[#264941]" />
                        <span className="text-sm text-gray-600">Blockchain-anchored identity</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-400 mt-4">Redirecting to dashboard...</p>
                  </motion.div>
                ) : ssiStep === 1 ? (
                  // SSI Verification Loading
                  <motion.div
                    key="verifying"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 mx-auto mb-6 relative">
                      <div className="absolute inset-0 border-4 border-[#228B22]/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-[#228B22] rounded-full border-t-transparent animate-spin" />
                      <div className="absolute inset-4 bg-[#264941] rounded-full flex items-center justify-center">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Creating SSI Credential</h3>
                    <p className="text-gray-500">Generating your decentralized identity...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={isSignUp ? 'signup' : 'login'}
                    initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isSignUp ? -20 : 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-gray-500 mb-6">
                      {isSignUp ? 'Join the agricultural revolution' : 'Welcome back to FarmBid'}
                    </p>

                    {/* Role Selection Segmented Control */}
                    <div className="flex p-1 gap-1 mb-8 bg-[#e0e5ec] rounded-2xl" 
                         style={{ boxShadow: 'inset 4px 4px 8px #bec3c9, inset -4px -4px 8px #ffffff' }}>
                      <button
                        onClick={() => setUserType('retailer')}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                          userType === 'retailer' 
                          ? 'bg-white text-[#228B22] shadow-[4px_4px_8px_#bec3c9]' 
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Retailer
                      </button>
                      <button
                        onClick={() => setUserType('farmer')}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                          userType === 'farmer' 
                          ? 'bg-white text-[#228B22] shadow-[4px_4px_8px_#bec3c9]' 
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Leaf className="h-4 w-4" />
                        Farmer/Agent
                      </button>
                    </div>

                    {/* Social Login */}
                    <div className="flex justify-center gap-4 mb-6">
                      {['Google', 'Facebook', 'LinkedIn'].map((provider) => {
                        const btn = (onClickFn) => (
                        <button
                          key={provider}
                          onClick={onClickFn}
                          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                          style={{
                            background: '#e0e5ec',
                            boxShadow: '5px 5px 10px #bec3c9, -5px -5px 10px #ffffff'
                          }}
                          onMouseDown={(e) => e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #bec3c9, inset -3px -3px 6px #ffffff'}
                          onMouseUp={(e) => e.currentTarget.style.boxShadow = '5px 5px 10px #bec3c9, -5px -5px 10px #ffffff'}
                          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '5px 5px 10px #bec3c9, -5px -5px 10px #ffffff'}
                        >
                          {provider === 'Google' && (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
                              <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2970244 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
                              <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
                              <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7720917 1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
                            </svg>
                          )}
                          {provider === 'Facebook' && (
                            <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          )}
                          {provider === 'LinkedIn' && (
                            <svg className="w-5 h-5" fill="#0A66C2" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          )}
                        </button>
                        );
                        
                        const isFacebookConfigured = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && process.env.NEXT_PUBLIC_FACEBOOK_APP_ID !== "123456789";
                        const isLinkedInConfigured = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID && process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID !== "123456789";

                        if (provider === 'Facebook' && isFacebookConfigured) {
                          return (
                            <FacebookLogin
                              key={provider}
                              appId={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}
                              callback={handleFacebookLogin}
                              fields="name,email,picture"
                              render={renderProps => btn(renderProps.onClick)}
                            />
                          );
                        }
                        
                        if (provider === 'LinkedIn' && isLinkedInConfigured) {
                          return (
                            <LinkedIn
                              key={provider}
                              clientId={process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID}
                              redirectUri={`${typeof window !== 'undefined' ? window.location.origin : ''}/linkedin`}
                              onSuccess={handleLinkedInLogin}
                              onError={() => toast.error('LinkedIn Login Failed')}
                            >
                              {({ linkedInLogin }) => btn(linkedInLogin)}
                            </LinkedIn>
                          );
                        }
                        
                        // Special handling for providers with real hooks
                        if (provider === 'Google') {
                          return btn(() => realGoogleLogin());
                        }

                        // Default: Use our handled mock/real logic for Dev Mode
                        return btn(() => handleSocialLogin(provider));
                      })}
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1 h-px bg-gray-300" />
                      <span className="text-gray-400 text-sm">or use phone</span>
                      <div className="flex-1 h-px bg-gray-300" />
                    </div>

                    {/* Form */}
                    <form className="space-y-4">
                        {isSignUp && (
                          <>
                            {/* Name Input for Signup */}
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <User className="h-5 w-5" />
                              </div>
                              <input
                                type="text"
                                placeholder="Full Name"
                                value={signupForm.name}
                                onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                                style={{
                                  background: '#FFFFFF'
                                }}
                              />
                            </div>

                            {/* Email Input for Signup */}
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <Mail className="h-5 w-5" />
                              </div>
                              <input
                                type="email"
                                placeholder="Email"
                                value={signupForm.email}
                                onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                                style={{
                                  background: '#FFFFFF'
                                }}
                              />
                            </div>

                            {/* Location */}
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <MapPin className="h-5 w-5" />
                              </div>
                              <input
                                type="text"
                                placeholder="Location (City/District)"
                                value={signupForm.location}
                                onChange={(e) => setSignupForm({...signupForm, location: e.target.value})}
                                className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                                style={{
                                  background: '#FFFFFF'
                                }}
                              />
                            </div>
                          </>
                        )}

                        {/* Phone Input for OTP */}
                        {otpStep === 0 && (
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                              <Phone className="h-5 w-5" />
                            </div>
                            <input
                              type="tel"
                              placeholder="Phone Number"
                              value={isSignUp ? signupForm.phone : loginForm.phone}
                              onChange={(e) => isSignUp
                                ? setSignupForm({...signupForm, phone: e.target.value})
                                : setLoginForm({...loginForm, phone: e.target.value})
                              }
                              required
                              className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                              style={{
                                background: '#FFFFFF'
                              }}
                            />
                          </div>
                        )}

                        {/* OTP Input Display */}
                        {otpStep === 1 && (
                          <div className="space-y-4">
                            <div className="text-center mb-4">
                              <Smartphone className="h-12 w-12 text-[#228B22] mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Enter OTP sent via WhatsApp to {otpPhone}</p>
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
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300 text-center tracking-widest"
                                style={{
                                  background: '#FFFFFF'
                                }}
                              />
                            </div>
                            {otpExpiry && (
                              <p className="text-xs text-gray-400 text-center">
                                OTP expires in {Math.max(0, Math.floor((otpExpiry - Date.now()) / 1000))} seconds
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
                            className="w-full py-3 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 hover:opacity-90"
                            style={{
                              background: '#228B22'
                            }}
                          >
                            {isLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                Send OTP
                                <ArrowRight className="h-5 w-5" />
                              </>
                            )}
                          </button>
                        )}

                        {/* Verify OTP Button */}
                        {otpStep === 1 && (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() => handleVerifyOTP(otpPhone, otpCode, isSignUp ? 'signup' : 'login')}
                              disabled={isLoading || otpCode.length !== 6}
                              className="w-full py-3 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                              style={{
                                background: '#228B22'
                              }}
                            >
                              {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <>
                                  Verify OTP
                                  <ArrowRight className="h-5 w-5" />
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleResendOTP}
                              disabled={isLoading}
                              className="w-full py-2 rounded-full font-medium text-[#228B22] transition-all duration-300 border border-[#228B22] hover:bg-[#228B22]/5"
                            >
                              Resend OTP
                            </button>
                          </div>
                        )}
                      </form>
<<<<<<< HEAD
=======
                    ) : (
                      // Email/Password Form
                      <form onSubmit={isSignUp ? handleSignup : handleLogin} className="space-y-4">
                      {isSignUp && (
                        <>
                          {/* User Type Selection */}
                          <div className="flex gap-2 p-1 rounded-full mb-4 border border-gray-300" style={{
                            background: '#FFFFFF'
                          }}>
                            {[{id: 'buyer', label: 'Buyer', icon: Building2}, {id: 'farmer', label: 'Farmer', icon: Leaf}].map((type) => (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() => setUserType(type.id)}
                                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                  userType === type.id
                                    ? 'bg-[#228B22] text-white shadow-lg'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </button>
                            ))}
                          </div>

                          {/* Name Input */}
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                              <User className="h-5 w-5" />
                            </div>
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={signupForm.name}
                              onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
                              required
                              className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                              style={{
                                background: '#FFFFFF'
                              }}
                            />
                          </div>
                        </>
                      )}

                      {/* Email Input */}
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <Mail className="h-5 w-5" />
                        </div>
                        <input
                          type="email"
                          placeholder="Email"
                          value={isSignUp ? signupForm.email : loginForm.email}
                          onChange={(e) => isSignUp 
                            ? setSignupForm({...signupForm, email: e.target.value})
                            : setLoginForm({...loginForm, email: e.target.value})
                          }
                          required
                          className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                          style={{
                            background: '#FFFFFF'
                          }}
                        />
                      </div>

                      {/* Password Input */}
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <Lock className="h-5 w-5" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={isSignUp ? signupForm.password : loginForm.password}
                          onChange={(e) => isSignUp 
                            ? setSignupForm({...signupForm, password: e.target.value})
                            : setLoginForm({...loginForm, password: e.target.value})
                          }
                          required
                          className="w-full pl-12 pr-12 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                          style={{
                            background: '#FFFFFF'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>

                      {isSignUp && (
                        <>
                          {/* Confirm Password */}
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                              <Lock className="h-5 w-5" />
                            </div>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Confirm Password"
                              value={signupForm.confirmPassword}
                              onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
                              required
                              className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                              style={{
                                background: '#FFFFFF'
                              }}
                            />
                          </div>

                          {/* Phone */}
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                              <Phone className="h-5 w-5" />
                            </div>
                            <input
                              type="tel"
                              placeholder="Phone Number"
                              value={signupForm.phone}
                              onChange={(e) => setSignupForm({...signupForm, phone: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                              style={{
                                background: '#FFFFFF'
                              }}
                            />
                          </div>

                          {/* Location */}
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                              <MapPin className="h-5 w-5" />
                            </div>
                            <input
                              type="text"
                              placeholder="Location (City/District)"
                              value={signupForm.location}
                              onChange={(e) => setSignupForm({...signupForm, location: e.target.value})}
                              className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent text-gray-700 placeholder-gray-400 outline-none transition-all border border-gray-300"
                              style={{
                                background: '#FFFFFF'
                              }}
                            />
                          </div>
                        </>
                      )}

                      {!isSignUp && (
                        <div className="text-right">
                          <button type="button" className="text-sm text-[#228B22] hover:text-[#228B22]/80">
                            Forgot password?
                          </button>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 hover:opacity-90"
                        style={{
                          background: '#228B22'
                        }}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            {isSignUp ? 'Create Account' : 'Sign In'}
                            <ArrowRight className="h-5 w-5" />
                          </>
                        )}
                      </button>
                    </form>
                    )}                    {/* Demo Role Access */}
                    {!isSignUp && (
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-center text-xs text-gray-400 mb-4 font-medium uppercase tracking-wider">Quick Demo Access</p>
                        <div className="flex justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleDemoLogin('buyer')}
                            className="flex-1 px-3 py-2 rounded-xl text-[10px] font-bold bg-[#f8fafc] text-blue-600 border border-blue-100 hover:bg-blue-50 transition-all"
                          >
                            Retailer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDemoLogin('farmer')}
                            className="flex-1 px-3 py-2 rounded-xl text-[10px] font-bold bg-[#fdfaf6] text-orange-600 border border-orange-100 hover:bg-orange-50 transition-all"
                          >
                            Farmer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDemoLogin('agent')}
                            className="flex-1 px-3 py-2 rounded-xl text-[10px] font-bold bg-[#f5fcf8] text-emerald-600 border border-emerald-100 hover:bg-emerald-50 transition-all"
                          >
                            Agent
                          </button>
                        </div>
                      </div>
                    )}
>>>>>>> 59bea7c68a2acc78c12faa5c1524d3b87f6fb904

                    {/* Mobile Toggle */}
                    <div className="md:hidden mt-6 text-center">
                      <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-[#264941] font-medium"
                      >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* SSI Info Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white backdrop-blur-sm text-sm text-gray-600 border border-gray-300">
            <Fingerprint className="h-4 w-4 text-[#228B22]" />
            <span>Self-Sovereign Identity powered by Polygon blockchain</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
