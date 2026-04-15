'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Icons
import {
  Gavel, Leaf, Shield, Wallet, Clock, TrendingUp, Users, Package,
  ChevronRight, Search, Bell, Moon, Sun, Menu, X, Home, ShoppingCart,
  MessageSquare, Settings, BarChart3, AlertTriangle, CheckCircle2,
  Timer, IndianRupee, MapPin, Scale, Sparkles, Link2, ExternalLink,
  ArrowUpRight, ArrowDownRight, Send, Mic, Image as ImageIcon,
  Phone, MoreVertical, Check, Copy, Filter, RefreshCw, Truck,
  FileText, CreditCard, Building2, Star, Award, Zap, Globe, Lock,
  LogOut, User, Fingerprint
} from 'lucide-react'

// WhatsApp demo messages
const whatsappMessages = {
  english: [
    { type: 'bot', text: 'Welcome to FarmBid! I am your assistant. How can I help you today?' },
    { type: 'bot', text: 'Reply with:\n1️⃣ Create new listing\n2️⃣ Check my listings\n3️⃣ View earnings\n4️⃣ Help' },
    { type: 'user', text: '1' },
    { type: 'bot', text: "Great! Let's create a new listing. Please send a photo of your produce." },
    { type: 'user', text: '[Photo of tomatoes]', isImage: true },
    { type: 'bot', text: '🍅 I see fresh Tomatoes! Quality looks Premium grade.\n\nWhat is the total weight (in kg)?' },
    { type: 'user', text: '500 kg' },
    { type: 'bot', text: 'Got it! 500 kg of Tomatoes.\n\nWhat is your minimum price per kg? (Current market: ₹30-40/kg)' },
    { type: 'user', text: '32' },
    { type: 'bot', text: 'Perfect! ₹32 per kg minimum.\n\nWhen was this harvested? (DD/MM or today)' },
    { type: 'user', text: 'today' },
    { type: 'bot', text: '✅ Your listing is being processed...\n\n📋 Summary:\n🍅 Tomatoes - 500 kg\n💰 Min Price: ₹32/kg\n🏷️ Total Value: ₹16,000+\n📍 Srinivaspur, Kolar\n\n⛓️ Anchoring to blockchain...' },
    { type: 'bot', text: '🎉 Listing is LIVE!\n\nAuction ID: #KOL-2025-0628\nEnds in: 24 hours\n\nYou will receive updates when buyers bid.\n\n🔗 Chain Hash: 0x8f9a...8f9a' }
  ],
  hindi: [
    { type: 'bot', text: 'FarmBid में आपका स्वागत है! मैं आपका सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?' },
    { type: 'bot', text: 'जवाब दें:\n1️⃣ नई लिस्टिंग बनाएं\n2️⃣ मेरी लिस्टिंग देखें\n3️⃣ कमाई देखें\n4️⃣ मदद' },
    { type: 'user', text: '1' },
    { type: 'bot', text: 'बहुत अच्छा! नई लिस्टिंग बनाते हैं। कृपया अपनी उपज की फोटो भेजें।' },
    { type: 'user', text: '[टमाटर की फोटो]', isImage: true },
    { type: 'bot', text: '🍅 ताजे टमाटर दिख रहे हैं! गुणवत्ता प्रीमियम ग्रेड है।\n\nकुल वजन कितना है (किलो में)?' }
  ],
  kannada: [
    { type: 'bot', text: 'FarmBid ಗೆ ಸ್ವಾಗತ! ನಾನು ನಿಮ್ಮ ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?' },
    { type: 'bot', text: 'ಉತ್ತರಿಸಿ:\n1️⃣ ಹೊಸ ಪಟ್ಟಿ ರಚಿಸಿ\n2️⃣ ನನ್ನ ಪಟ್ಟಿಗಳನ್ನು ನೋಡಿ\n3️⃣ ಗಳಿಕೆ ನೋಡಿ\n4️⃣ ಸಹಾಯ' },
    { type: 'user', text: '1' },
    { type: 'bot', text: 'ಅದ್ಭುತ! ಹೊಸ ಪಟ್ಟಿ ಮಾಡೋಣ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಉತ್ಪನ್ನದ ಫೋಟೋ ಕಳಿಸಿ.' },
    { type: 'user', text: '[ಟೊಮೆಟೊ ಫೋಟೋ]', isImage: true },
    { type: 'bot', text: '🍅 ತಾಜಾ ಟೊಮೆಟೊ ಕಾಣಿಸುತ್ತಿದೆ! ಗುಣಮಟ್ಟ ಪ್ರೀಮಿಯಂ ಆಗಿದೆ.\n\nಒಟ್ಟು ತೂಕ ಎಷ್ಟು (ಕೆಜಿಯಲ್ಲಿ)?' }
  ]
}

// Format time remaining
const formatTimeRemaining = (ms) => {
  if (ms <= 0) return 'Ended'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

// Format currency
const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}

// Quality Index Ring
const QualityRing = ({ value, size = 60 }) => {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference
  const color = value >= 85 ? '#16a34a' : value >= 70 ? '#ca8a04' : '#dc2626'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{value}</span>
      </div>
    </div>
  )
}

// Trust Score Badge
const TrustBadge = ({ score }) => {
  const color = score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium ${color}`}>
            <Shield className="h-3 w-3" />
            {score}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Trust Score: {score}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Countdown Timer Component
const CountdownTimer = ({ endsAt, status }) => {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime()
      const end = new Date(endsAt).getTime()
      return Math.max(0, end - now)
    }

    setTimeLeft(calculateTime())
    const interval = setInterval(() => {
      setTimeLeft(calculateTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [endsAt])

  const isUrgent = timeLeft < 60 * 60 * 1000 && timeLeft > 0
  const isEnding = timeLeft < 15 * 60 * 1000 && timeLeft > 0

  return (
    <div className={`flex items-center gap-1.5 ${isEnding ? 'timer-urgent text-destructive' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
      <Timer className="h-4 w-4" />
      <span className="font-mono font-medium">{formatTimeRemaining(timeLeft)}</span>
    </div>
  )
}

// Auction Card Component
const AuctionCard = ({ listing, onBid }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="auction-card-glow"
    >
      <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 ${listing.isUpdating ? 'border-primary ring-2 ring-primary/50 animate-pulse' : ''}`}>
        <div className="relative">
          <img
            src={listing.images?.[0] || 'https://images.pexels.com/photos/15279908/pexels-photo-15279908.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'}
            alt={listing.produce}
            className="w-full h-40 object-cover"
          />
          <div className="absolute top-2 left-2 flex gap-1.5">
            <Badge variant={listing.status === 'ending_soon' ? 'destructive' : 'default'} className="backdrop-blur-sm">
              {listing.status === 'ending_soon' ? '🔥 Ending Soon' : listing.status === 'live' ? '🟢 Live' : listing.status}
            </Badge>
          </div>
          <div className="absolute top-2 right-2 space-y-1">
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-primary/30 flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              On-Chain
            </Badge>
            {listing.images?.length > 1 && (
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-secondary/30">
                {listing.images.length} photos
              </Badge>
            )}
          </div>
          <div className="absolute bottom-2 right-2">
            <QualityRing value={listing.qualityIndex} size={50} />
          </div>
        </div>

        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>{listing.produceIcon || '🌾'}</span>
                {listing.produce || 'Farm Produce'}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1 text-sm">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {listing.location || 'Unknown location'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {listing.farmerName || 'Farmer'}
                </span>
              </CardDescription>
            </div>
            <TrustBadge score={listing.farmerTrustScore || 60} />
          </div>
        </CardHeader>

        {listing.images?.length > 1 && (
          <div className="grid grid-cols-3 gap-1 mb-3 px-4">
            {listing.images.slice(0, 3).map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`${listing.produce || 'Produce'} image ${index + 1}`}
                className="h-16 w-full object-cover rounded"
              />
            ))}
          </div>
        )}

        <CardContent className="pb-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Quantity</p>
              <p className="font-semibold">{listing.quantity} {listing.unit}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Floor Price</p>
              <p className="font-semibold">{formatINR(listing.minPricePerKg)}/kg</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current Bid</p>
              <p className="font-bold text-primary text-lg">{formatINR(listing.currentBidPerKg)}/kg</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Value</p>
              <p className="font-semibold text-amber-600">{formatINR((listing.currentBidPerKg || listing.minPricePerKg) * listing.quantity)}</p>
            </div>
          </div>

          {listing.harvestDate && (
            <div className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Harvest Ready:</span> {listing.harvestDate}
            </div>
          )}

          <Separator className="my-3" />

          <div className="flex justify-between items-center">
            <CountdownTimer endsAt={listing.auctionEndsAt} status={listing.status} />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Gavel className="h-4 w-4" />
              {listing.totalBids} bids
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button className="w-full" onClick={() => onBid(listing)}>
            <Gavel className="h-4 w-4 mr-2" />
            Place Bid
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

// WhatsApp Chat Component
const WhatsAppChat = ({ language }) => {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)

  const allMessages = whatsappMessages[language] || whatsappMessages.english

  useEffect(() => {
    setMessages([])
    setCurrentIndex(0)
  }, [language])

  useEffect(() => {
    if (currentIndex < allMessages.length) {
      const timer = setTimeout(() => {
        if (allMessages[currentIndex].type === 'bot') {
          setIsTyping(true)
          setTimeout(() => {
            setIsTyping(false)
            setMessages(prev => [...prev, allMessages[currentIndex]])
            setCurrentIndex(prev => prev + 1)
          }, 1000)
        } else {
          setMessages(prev => [...prev, allMessages[currentIndex]])
          setCurrentIndex(prev => prev + 1)
        }
      }, allMessages[currentIndex].type === 'user' ? 1500 : 500)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, allMessages])

  return (
    <div className="flex flex-col h-[600px] bg-[#e5ddd5] dark:bg-zinc-900 rounded-xl overflow-hidden shadow-2xl">
      {/* WhatsApp Header */}
      <div className="bg-[#075e54] dark:bg-zinc-800 px-4 py-3 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150" />
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-white">FarmBid Assistant</h3>
          <p className="text-xs text-green-200">Online</p>
        </div>
        <div className="flex items-center gap-4 text-white/80">
          <Phone className="h-5 w-5 cursor-pointer hover:text-white" />
          <MoreVertical className="h-5 w-5 cursor-pointer hover:text-white" />
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 shadow ${
                  msg.type === 'user'
                    ? 'bg-[#dcf8c6] dark:bg-green-800 text-foreground'
                    : 'bg-white dark:bg-zinc-800 text-foreground'
                }`}
              >
                {msg.isImage ? (
                  <img
                    src="https://images.pexels.com/photos/15279908/pexels-photo-15279908.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                    alt="Produce"
                    className="w-48 h-32 object-cover rounded"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                )}
                <p className="text-[10px] text-muted-foreground text-right mt-1">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.type === 'user' && <Check className="h-3 w-3 inline ml-1 text-blue-500" />}
                </p>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white dark:bg-zinc-800 rounded-lg px-4 py-3 shadow">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-[#f0f0f0] dark:bg-zinc-800 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-gray-500">
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Input
          placeholder="Type a message"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1 bg-white dark:bg-zinc-700 border-0"
        />
        <Button variant="ghost" size="icon" className="text-gray-500">
          <Mic className="h-5 w-5" />
        </Button>
        <Button size="icon" className="bg-[#075e54] hover:bg-[#064e46]">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Blockchain Event Row
const BlockchainEvent = ({ event }) => {
  const typeIcons = {
    listing_created: <Package className="h-4 w-4 text-green-500" />,
    bid_placed: <Gavel className="h-4 w-4 text-blue-500" />,
    quality_anchored: <Sparkles className="h-4 w-4 text-purple-500" />,
    escrow_locked: <Lock className="h-4 w-4 text-amber-500" />,
    settlement_released: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    dispute_raised: <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  const [copied, setCopied] = useState(false)

  const copyHash = () => {
    navigator.clipboard.writeText(event.txHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-lg bg-card hover:bg-muted/50 transition-colors"
    >
      <div className="mt-1">{typeIcons[event.type] || <Link2 className="h-4 w-4" />}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{event.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <code className="text-xs text-muted-foreground blockchain-hash truncate">
            {event.txHash}
          </code>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyHash}>
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>Block #{event.blockNumber}</span>
          <span>•</span>
          <span>{new Date(event.timestamp).toLocaleString()}</span>
        </div>
      </div>
      <Button variant="outline" size="sm" className="shrink-0">
        <ExternalLink className="h-3 w-3 mr-1" />
        View
      </Button>
    </motion.div>
  )
}

// Admin KPI Card
const KPICard = ({ title, value, icon: Icon, trend, trendUp }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={`text-xs flex items-center mt-1 ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
              {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend}
            </p>
          )}
        </div>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Bid Dialog
const BidDialog = ({ listing, isOpen, onClose, onSubmit }) => {
  const [bidAmount, setBidAmount] = useState('')

  if (!listing) return null

  const minBid = listing.currentBidPerKg + 1
  const totalValue = bidAmount ? bidAmount * listing.quantity : 0

  const handleSubmit = () => {
    if (bidAmount >= minBid) {
      onSubmit(listing.id, parseFloat(bidAmount))
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{listing.produceIcon}</span>
            Place Bid - {listing.produce}
          </DialogTitle>
          <DialogDescription>
            From {listing.farmerName} ({listing.farmerCode})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Quantity</p>
              <p className="font-semibold">{listing.quantity} {listing.unit}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Bid</p>
              <p className="font-bold text-primary">{formatINR(listing.currentBidPerKg)}/kg</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Floor Price</p>
              <p className="font-semibold">{formatINR(listing.minPricePerKg)}/kg</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quality</p>
              <Badge variant={listing.qualityGrade === 'Premium' ? 'default' : 'secondary'}>
                {listing.qualityGrade}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your Bid (per kg)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder={`Min ${formatINR(minBid)}`}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="pl-9"
                min={minBid}
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum bid: {formatINR(minBid)}/kg</p>
          </div>

          {bidAmount >= minBid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-primary/10 rounded-lg border border-primary/20"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Lot Value</span>
                <span className="text-xl font-bold text-primary">{formatINR(totalValue)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This amount will be locked in escrow if you win
              </p>
            </motion.div>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Your wallet funds will be locked upon placing a bid. If you win, the amount moves to escrow.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!bidAmount || bidAmount < minBid}>
            <Gavel className="h-4 w-4 mr-2" />
            Place Bid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Payment Dialog
const PaymentDialog = ({ isOpen, onClose, amount, onConfirm }) => {
  const [method, setMethod] = useState('phonepe')

  const methods = [
    { 
      id: 'phonepe', 
      name: 'PhonePe', 
      isImage: true, 
      imgSrc: 'https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg' 
    },
    { 
      id: 'gpay', 
      name: 'Google Pay', 
      isImage: true, 
      imgSrc: 'https://pay.google.com/about/static_kcs/images/logos/google-pay-logo.png' 
    },
    { 
      id: 'razorpay', 
      name: 'Razorpay', 
      isImage: true, 
      imgSrc: 'https://razorpay.com/assets/razorpay-logo.svg' 
    },
    { 
      id: 'card', 
      name: 'Credit/Debit Card', 
      isImage: true, 
      imgSrc: 'https://img.icons8.com/fluency/96/bank-cards.png' 
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Select a payment method to add {formatINR(amount || 0)} to your wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {methods.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${
                  method === m.id ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'hover:bg-muted'
                }`}
                onClick={() => setMethod(m.id)}
              >
                <div className="h-10 flex items-center justify-center mb-1">
                  {m.isImage ? (
                    <img src={m.imgSrc} alt={m.name} className="max-h-8 max-w-[100px] object-contain" />
                  ) : (
                    <div className="text-3xl">{m.icon}</div>
                  )}
                </div>
                <div className="font-medium text-sm text-center">{m.name}</div>
              </div>
            ))}
          </div>

          {method === 'card' && (
            <div className="space-y-3 mt-2 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <Label>Card Number</Label>
                <Input placeholder="0000 0000 0000 0000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Expiry</Label>
                  <Input placeholder="MM/YY" />
                </div>
                <div className="space-y-1">
                  <Label>CVV</Label>
                  <Input placeholder="123" />
                </div>
              </div>
            </div>
          )}

          {method !== 'card' && (
            <div className="space-y-3 mt-2 p-4 border rounded-lg bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground">You will be redirected to the {methods.find(m => m.id === method)?.name} portal to securely complete this transaction.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(method)}>Pay {formatINR(amount || 0)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main App Component
export default function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [currentView, setCurrentView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState(null)
  const [bidDialogOpen, setBidDialogOpen] = useState(false)
  const [blockchainEvents, setBlockchainEvents] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [lockedBids, setLockedBids] = useState(0)
  const [whatsappLanguage, setWhatsappLanguage] = useState('english')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [topupAmount, setTopupAmount] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  
  // Authentication state
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Track listings that are currently updating (price changed)
  const [updatingListingIds, setUpdatingListingIds] = useState(new Set())

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('farmbid_token')
      const userData = localStorage.getItem('farmbid_user')

      if (token && userData) {
        try {
          // Verify token with server
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${API_URL}/auth/verify-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          const data = await response.json();

          if (data.success && data.authenticated) {
            const user = data.user;
            setCurrentUser(user);
            setIsAuthenticated(true);
            setWalletBalance(0);
          } else {
            // Token invalid or expired
            console.error('Auth verification failed:', data.error);
            handleLogout();
          }
        } catch (e) {
          console.error('Error during auth verification:', e);
          handleLogout();
        }
      }
    };
    checkAuth();
  }, [])

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('farmbid_token')
    localStorage.removeItem('farmbid_user')
    setCurrentUser(null)
    setIsAuthenticated(false)
    window.location.href = '/login'
  }

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const [listingsRes, eventsRes, walletRes] = await Promise.all([
          fetch(`${API_URL}/listings?status=all`),
          fetch(`${API_URL}/blockchain/events`),
          fetch(`${API_URL}/wallet/balance?buyerId=${currentUser?.id || 'b1'}`)
        ])
        const listingsData = await listingsRes.json()
        const eventsData = await eventsRes.json()
        const walletData = await walletRes.json()
        setListings(listingsData.listings || [])
        setBlockchainEvents(eventsData.events || [])
        if (walletData.success) {
          setWalletBalance(0)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentUser?.id])

  // Polling for realtime listings updates
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('[Realtime] Starting bid polling interval');
    const pollInterval = setInterval(async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await fetch(`${API_URL}/listings?status=all&t=${Date.now()}`);
        const data = await res.json();

        if (data.success && data.listings) {
          setListings(prevListings => {
            const newListings = data.listings;
            const updated = newListings.map(newListing => {
              const oldListing = prevListings.find(l => String(l.id) === String(newListing.id));
              
              if (oldListing) {
                const oldPrice = Number(oldListing.currentBidPerKg);
                const newPrice = Number(newListing.currentBidPerKg);
                
                if (oldPrice !== newPrice) {
                  console.log(`[Realtime] Bid update detected for ${newListing.produce}: ₹${oldPrice} -> ₹${newPrice}`);
                  
                  // Mark as updating for visual feedback
                  setUpdatingListingIds(prev => new Set(prev).add(newListing.id));
                  
                  // Remove updating flag after 2 seconds
                  setTimeout(() => {
                    setUpdatingListingIds(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(newListing.id);
                      return newSet;
                    });
                  }, 2000);
                  
                  return { ...newListing, isUpdating: true };
                }
              }
              return newListing;
            });
            return updated;
          });
        }
      } catch (error) {
        console.error('[Realtime] Polling error:', error);
      }
    }, 4000); // Poll every 4 seconds

    return () => {
      console.log('[Realtime] Stopping bid polling interval');
      clearInterval(pollInterval);
    };
  }, [isAuthenticated]);

  // Toggle dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const handleBid = (listing) => {
    setSelectedListing(listing)
    setBidDialogOpen(true)
  }

  const handleSubmitBid = async (listingId, bidAmount) => {
    try {
      if (!isAuthenticated || !currentUser) {
        toast.error('Please login to place a bid');
        router.push('/login');
        return;
      }

      if (currentUser.role !== 'buyer') {
        toast.error('Only buyers can place bids');
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('farmbid_token');
      const response = await fetch(`${API_URL}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listingId,
          buyerId: currentUser.id,
          bidPerKg: bidAmount
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Bid placed successfully!', {
          description: `Your bid of ${formatINR(bidAmount)}/kg has been anchored to blockchain.`
        })
        console.log(`[BidSubmit] Success! Updating listing ${listingId} locally to ₹${bidAmount}`);
        // Update listings
        setListings(prev => {
          const matched = prev.find(l => String(l.id) === String(listingId));
          if (!matched) {
            console.warn(`[BidSubmit] Warning: Could not find listing ${listingId} in local state to update UI!`);
          }
          return prev.map(l =>
            String(l.id) === String(listingId)
              ? { ...l, currentBidPerKg: bidAmount, totalBids: (Number(l.totalBids) || 0) + 1, isUpdating: true }
              : l
          );
        });
        // Add blockchain event
        if (data.blockchainEvent) {
          setBlockchainEvents(prev => [data.blockchainEvent, ...prev])
        }
      }
    } catch (error) {
      toast.error('Failed to place bid')
    }
  }

  const handleTopupClick = () => {
    if (!isAuthenticated || !currentUser) {
      toast.error('Please login to top up wallet');
      // If we use Next router, it would be router.push. Fallback to location:
      window.location.href = '/login';
      return;
    }

    if (!topupAmount || isNaN(topupAmount) || parseFloat(topupAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setPaymentDialogOpen(true)
  }

  const handlePaymentConfirm = async (method) => {
    setPaymentDialogOpen(false)
    setTopupLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('farmbid_token');
      const response = await fetch(`${API_URL}/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: parseFloat(topupAmount),
          paymentMethod: method
        })
      })
      const data = await response.json()
      if (data.success) {
        setWalletBalance(prev => prev + parseFloat(topupAmount))
        setTopupAmount('')
        toast.success('Wallet topped up successfully!', {
          description: `₹${topupAmount} has been added via ${method}.`
        })
      } else {
        toast.error(data.error || 'Topup failed')
      }
    } catch (error) {
      toast.error('Connection error')
    } finally {
      setTopupLoading(false)
    }
  }

  const handleEscrowLock = async (orderId, farmerAddress, amount) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/escrow/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, farmerAddress, amountMATIC: amount })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Funds locked in Escrow!', {
          description: `Transaction: ${data.txHash.substring(0, 10)}...`
        })
      } else {
        toast.error(data.error || 'Escrow failed')
      }
    } catch (error) {
      toast.error('Connection error')
    }
  }

  const handleEscrowRelease = async (orderId) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/escrow/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          secret: process.env.NEXT_PUBLIC_WEBHOOK_SECRET || 'your_random_secret_string' 
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Funds released to farmer!', {
          description: `Transaction: ${data.txHash.substring(0, 10)}...`
        })
      } else {
        toast.error(data.error || 'Release failed')
      }
    } catch (error) {
      toast.error('Connection error')
    }
  }

  const handleEscrowPenalize = async (orderId, type, reason) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const endpoint = type === 'farmer' ? 'penalize-farmer' : 'penalize-buyer';
      const response = await fetch(`${API_URL}/escrow/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          reason,
          secret: process.env.NEXT_PUBLIC_WEBHOOK_SECRET || 'your_random_secret_string' 
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Escrow penalized (${type})!`, {
          description: `Transaction: ${data.txHash.substring(0, 10)}...`
        })
      } else {
        toast.error(data.error || 'Penalization failed')
      }
    } catch (error) {
      toast.error('Connection error')
    }
  }

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.produce.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const NavItem = ({ icon: Icon, label, view, badge }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        currentView === view
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      {sidebarOpen && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {badge && (
            <Badge variant="secondary" className="ml-auto">
              {badge}
            </Badge>
          )}
        </>
      )}
    </button>
  )

  return (
    <TooltipProvider>
      <div className={`min-h-screen bg-background ${darkMode ? 'dark' : ''}`}>
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center gap-4 px-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">FarmBid</span>
            </div>

            <div className="flex-1 max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search auctions, farmers, produce..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Wallet */}
              <Button variant="outline" className="gap-2" onClick={() => setCurrentView('wallet')}>
                <Wallet className="h-4 w-4" />
                <span className="font-semibold">{formatINR(walletBalance)}</span>
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>

              {/* Dark Mode Toggle */}
              <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* User Profile Dropdown */}
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-medium">{currentUser.name?.split(' ')[0] || 'User'}</span>
                    <span className="text-xs text-muted-foreground capitalize">{currentUser.role}</span>
                  </div>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={currentUser.profileImage || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"} />
                    <AvatarFallback>{currentUser.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="default" onClick={() => window.location.href = '/login'}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} shrink-0 border-r bg-card transition-all duration-300`}>
            <nav className="sticky top-16 p-3 space-y-1">
              <NavItem icon={Home} label="Dashboard" view="dashboard" />
              <NavItem icon={Gavel} label="Live Auctions" view="auctions" badge={listings.length} />
              <NavItem icon={ShoppingCart} label="My Orders" view="orders" />
              <NavItem icon={Wallet} label="Wallet" view="wallet" />
              <NavItem icon={AlertTriangle} label="Disputes" view="disputes" badge="1" />

              <Separator className="my-3" />

              <p className={`px-3 py-2 text-xs font-semibold text-muted-foreground uppercase ${!sidebarOpen && 'hidden'}`}>
                Demo Modes
              </p>
              <NavItem icon={MessageSquare} label="WhatsApp Flow" view="whatsapp" />
              <NavItem icon={Sparkles} label="Quality Lab" view="quality" />
              <NavItem icon={Link2} label="Blockchain Ledger" view="blockchain" />

              <Separator className="my-3" />

              <p className={`px-3 py-2 text-xs font-semibold text-muted-foreground uppercase ${!sidebarOpen && 'hidden'}`}>
                Admin
              </p>
              <NavItem icon={BarChart3} label="Admin Dashboard" view="admin" />
              <NavItem icon={Users} label="Farmers" view="farmers" />
              <NavItem icon={AlertTriangle} label="Fraud Monitor" view="fraud" />
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <AnimatePresence mode="wait">
              {/* Dashboard View */}
              {currentView === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Hero Banner */}
                  <Card className="overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <h1 className="text-2xl font-bold">
                            Welcome{currentUser ? `, ${currentUser.name?.split(' ')[0]}` : ''}!
                          </h1>
                          <p className="text-muted-foreground max-w-lg">
                            Farmers set the floor. Buyers bid upward. Every transaction anchored to blockchain.
                          </p>
                          {currentUser?.did && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full w-fit">
                              <Fingerprint className="h-3 w-3" />
                              <span className="font-mono">{currentUser.did.substring(0, 35)}...</span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button onClick={() => setCurrentView('auctions')}>
                              <Gavel className="h-4 w-4 mr-2" />
                              Browse Auctions
                            </Button>
                            <Button variant="outline" onClick={() => setCurrentView('blockchain')}>
                              <Link2 className="h-4 w-4 mr-2" />
                              View Ledger
                            </Button>
                          </div>
                        </div>
                        <img
                          src="https://images.pexels.com/photos/15279908/pexels-photo-15279908.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                          alt="Fresh Produce"
                          className="h-40 w-64 object-cover rounded-lg hidden lg:block"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard title="Wallet Balance" value={formatINR(walletBalance)} icon={Wallet} trend="+₹0 today" />
                    <KPICard title="Active Bids" value="0" icon={Gavel} trend="0 leading" />
                    <KPICard title="Won Auctions" value="0" icon={Award} trend="+0 this week" />
                    <KPICard title="Total Saved" value="₹0" icon={TrendingUp} trend="+0% vs mandi rates" />
                  </div>

                  {/* Featured Auctions */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Featured Auctions</h2>
                      <Button variant="ghost" onClick={() => setCurrentView('auctions')}>
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {listings.slice(0, 3).map(listing => (
                        <AuctionCard key={listing.id} listing={listing} onBid={handleBid} />
                      ))}
                    </div>
                  </div>

                  {/* Recent Blockchain Events */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-primary" />
                        Recent On-Chain Activity
                      </CardTitle>
                      <CardDescription>
                        Real-time blockchain anchoring events from Polygon Mainnet
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {blockchainEvents.slice(0, 4).map(event => (
                          <BlockchainEvent key={event.id} event={event} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Auctions View */}
              {currentView === 'auctions' && (
                <motion.div
                  key="auctions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">Live Auctions</h1>
                      <p className="text-muted-foreground">Bid on fresh produce directly from Karnataka farmers</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-40">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="ending_soon">Ending Soon</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredListings.map(listing => (
                      <AuctionCard key={listing.id} listing={listing} onBid={handleBid} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* WhatsApp Demo View */}
              {currentView === 'whatsapp' && (
                <motion.div
                  key="whatsapp"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center max-w-2xl mx-auto mb-8">
                    <Badge className="mb-4">Farmer Experience</Badge>
                    <h1 className="text-3xl font-bold mb-3">WhatsApp-First Farmer Interface</h1>
                    <p className="text-muted-foreground">
                      Farmers don't need complex apps. They create listings, receive bid updates, and get paid—all through WhatsApp in their local language.
                    </p>
                  </div>

                  <div className="flex justify-center gap-4 mb-6">
                    {['english', 'hindi', 'kannada'].map(lang => (
                      <Button
                        key={lang}
                        variant={whatsappLanguage === lang ? 'default' : 'outline'}
                        onClick={() => setWhatsappLanguage(lang)}
                        className="capitalize"
                      >
                        {lang}
                      </Button>
                    ))}
                  </div>

                  <div className="max-w-md mx-auto">
                    <WhatsAppChat language={whatsappLanguage} />
                  </div>

                  <Card className="max-w-2xl mx-auto mt-8">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Key Features for Farmers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">Simple Chat Flow</p>
                            <p className="text-sm text-muted-foreground">No app downloads needed</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Globe className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">Local Languages</p>
                            <p className="text-sm text-muted-foreground">Kannada, Hindi, English</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <ImageIcon className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">Photo-Based Listing</p>
                            <p className="text-sm text-muted-foreground">AI grades produce automatically</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <IndianRupee className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium">Direct UPI Payments</p>
                            <p className="text-sm text-muted-foreground">No middlemen, instant settlement</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Blockchain Ledger View */}
              {currentView === 'blockchain' && (
                <motion.div
                  key="blockchain"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center max-w-3xl mx-auto mb-8">
                    <Badge className="mb-4" variant="outline">
                      <Link2 className="h-3 w-3 mr-1" />
                      Polygon Mainnet
                    </Badge>
                    <h1 className="text-3xl font-bold mb-3">On-Chain Transparency</h1>
                    <p className="text-muted-foreground">
                      Every listing, bid, quality score, and settlement is anchored to Polygon blockchain.
                      This creates a tamper-proof audit trail that cannot be silently altered.
                    </p>
                  </div>

                  <Card className="mb-6">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center gap-8 flex-wrap">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary">{blockchainEvents.length}</p>
                          <p className="text-sm text-muted-foreground">Total Events</p>
                        </div>
                        <Separator orientation="vertical" className="h-12" />
                        <div className="text-center">
                          <p className="text-3xl font-bold">58,234,600</p>
                          <p className="text-sm text-muted-foreground">Latest Block</p>
                        </div>
                        <Separator orientation="vertical" className="h-12" />
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-500">100%</p>
                          <p className="text-sm text-muted-foreground">Verification Rate</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>Event Timeline</CardTitle>
                        <CardDescription>All blockchain-anchored events in chronological order</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[500px] pr-4">
                          <div className="space-y-3">
                            {blockchainEvents.map(event => (
                              <BlockchainEvent key={event.id} event={event} />
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Why Blockchain?</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <p className="font-medium">Tamper-Proof Records</p>
                              <p className="text-sm text-muted-foreground">
                                No one can silently alter historical data
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                            <div>
                              <p className="font-medium">Instant Verification</p>
                              <p className="text-sm text-muted-foreground">
                                Anyone can verify transaction authenticity
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Lock className="h-5 w-5 text-amber-500 mt-0.5" />
                            <div>
                              <p className="font-medium">Smart Contract Escrow</p>
                              <p className="text-sm text-muted-foreground">
                                Funds locked until delivery confirmed
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <p className="text-sm text-center text-muted-foreground">
                            <strong>Note:</strong> Blockchain stores proof, not payments.
                            UPI moves the money. Chain provides the trust.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quality Lab View */}
              {currentView === 'quality' && (
                <motion.div
                  key="quality"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center max-w-2xl mx-auto mb-8">
                    <Badge className="mb-4">AI-Powered</Badge>
                    <h1 className="text-3xl font-bold mb-3">Quality Analysis Lab</h1>
                    <p className="text-muted-foreground">
                      Our AI analyzes produce photos to generate objective quality scores, anchored to blockchain for permanent record.
                    </p>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Sample Analysis: Premium Tomatoes</CardTitle>
                        <CardDescription>Quality assessment from listing KOL-2025-0628</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <img
                          src="https://images.pexels.com/photos/15279908/pexels-photo-15279908.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                          alt="Tomatoes"
                          className="w-full h-48 object-cover rounded-lg"
                        />

                        <div className="flex items-center justify-center gap-8">
                          <div className="text-center">
                            <QualityRing value={92} size={100} />
                            <p className="text-sm font-medium mt-2">Quality Index</p>
                          </div>
                          <div>
                            <Badge className="text-lg px-4 py-1">Premium Grade</Badge>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Freshness</span>
                              <span className="font-medium">95%</span>
                            </div>
                            <Progress value={95} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Color Uniformity</span>
                              <span className="font-medium">90%</span>
                            </div>
                            <Progress value={90} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Surface Quality</span>
                              <span className="font-medium">92%</span>
                            </div>
                            <Progress value={92} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Model Confidence</span>
                              <span className="font-medium">94%</span>
                            </div>
                            <Progress value={94} className="h-2" />
                          </div>
                        </div>

                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <Link2 className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">Anchored:</span>
                            <code className="text-xs blockchain-hash">0xa1b2c3d4e5f6a7b8c9d0e1f2...</code>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Grade Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full" />
                                <span className="font-medium">Premium (85-100)</span>
                              </div>
                              <Badge variant="secondary">67%</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                                <span className="font-medium">Standard (65-84)</span>
                              </div>
                              <Badge variant="secondary">28%</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full" />
                                <span className="font-medium">At Risk (&lt;65)</span>
                              </div>
                              <Badge variant="secondary">5%</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">How It Works</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                              <div>
                                <p className="font-medium">Farmer uploads photo</p>
                                <p className="text-sm text-muted-foreground">Via WhatsApp or web</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                              <div>
                                <p className="font-medium">AI processes image</p>
                                <p className="text-sm text-muted-foreground">MobileNet-based quality model</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                              <div>
                                <p className="font-medium">Score anchored to chain</p>
                                <p className="text-sm text-muted-foreground">Immutable quality record</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
                              <div>
                                <p className="font-medium">Buyers see verified grade</p>
                                <p className="text-sm text-muted-foreground">Transparent quality info</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Admin Dashboard View */}
              {currentView === 'admin' && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                      <p className="text-muted-foreground">Platform overview and operations</p>
                    </div>
                    <Badge variant="outline">
                      <Globe className="h-3 w-3 mr-1" />
                      Karnataka Pilot
                    </Badge>
                  </div>

                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard title="Total GMV" value="₹42.85L" icon={IndianRupee} trend="+12.5% this week" trendUp />
                    <KPICard title="Active Farmers" value="247" icon={Users} trend="+18 this week" trendUp />
                    <KPICard title="Active Auctions" value="28" icon={Gavel} />
                    <KPICard title="Success Rate" value="94.5%" icon={CheckCircle2} trend="+2.1%" trendUp />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard title="Avg Quality Index" value="84" icon={Sparkles} />
                    <KPICard title="Avg Settlement" value="4.2 hrs" icon={Clock} trend="-0.5 hrs" trendUp />
                    <KPICard title="Dispute Rate" value="3.2%" icon={AlertTriangle} trend="-0.8%" trendUp />
                    <KPICard title="Fraud Flags Today" value="2" icon={Shield} />
                  </div>

                  {/* District Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>District-wise Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium">District</th>
                              <th className="text-right py-3 px-4 font-medium">Farmers</th>
                              <th className="text-right py-3 px-4 font-medium">Listings</th>
                              <th className="text-right py-3 px-4 font-medium">GMV</th>
                              <th className="text-left py-3 px-4 font-medium">Top Crop</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { district: 'Kolar', farmers: 156, listings: 312, gmv: 2450000, topCrop: 'Tomatoes' },
                              { district: 'Bengaluru Rural', farmers: 45, listings: 98, gmv: 980000, topCrop: 'Chilies' },
                              { district: 'Chikkaballapur', farmers: 28, listings: 54, gmv: 520000, topCrop: 'Grapes' },
                              { district: 'Ramanagara', farmers: 18, listings: 32, gmv: 335000, topCrop: 'Potatoes' }
                            ].map((row, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-3 px-4 font-medium">{row.district}</td>
                                <td className="py-3 px-4 text-right">{row.farmers}</td>
                                <td className="py-3 px-4 text-right">{row.listings}</td>
                                <td className="py-3 px-4 text-right">{formatINR(row.gmv)}</td>
                                <td className="py-3 px-4">{row.topCrop}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity & Pending Actions */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent On-Chain Anchors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {blockchainEvents.slice(0, 5).map(event => (
                            <BlockchainEvent key={event.id} event={event} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Pending Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-center py-8">
                          <div className="text-4xl mb-3 opacity-20 hover:opacity-40 transition-opacity">✅</div>
                          <p className="text-muted-foreground font-medium">No actions required</p>
                          <p className="text-sm text-muted-foreground opacity-70">You have 0 disputes and 0 pending verifications.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* Wallet View */}
              {currentView === 'wallet' && (
                <motion.div
                  key="wallet"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <h1 className="text-2xl font-bold">Wallet & Payments</h1>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      <CardContent className="pt-6">
                        <p className="text-sm opacity-80">Available Balance</p>
                        <p className="text-3xl font-bold mt-1">{formatINR(walletBalance - lockedBids)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Locked in Bids</p>
                        <p className="text-2xl font-bold mt-1 text-amber-500">{formatINR(lockedBids)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Total Balance</p>
                        <p className="text-2xl font-bold mt-1">{formatINR(walletBalance)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Up Wallet</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          {[5000, 10000, 25000].map(amount => (
                            <Button 
                              key={amount} 
                              variant="outline" 
                              className="text-lg"
                              onClick={() => setTopupAmount(amount.toString())}
                            >
                              +{formatINR(amount)}
                            </Button>
                          ))}
                        </div>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Enter amount" 
                            className="pl-9" 
                            value={topupAmount}
                            onChange={(e) => setTopupAmount(e.target.value)}
                          />
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={handleTopupClick}
                          disabled={topupLoading || !topupAmount}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {topupLoading ? 'Processing...' : 'Add via UPI / Card'}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-center py-8">
                          <div className="text-4xl mb-3 opacity-20 hover:opacity-40 transition-opacity">📭</div>
                          <p className="text-muted-foreground font-medium">No recent transactions</p>
                          <p className="text-sm text-muted-foreground opacity-70">Your payment and top-up history will appear here.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* Orders View */}
              {currentView === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <h1 className="text-2xl font-bold">My Orders</h1>

                  <Tabs defaultValue="active">
                    <TabsList>
                      <TabsTrigger value="active">Active</TabsTrigger>
                      <TabsTrigger value="completed">Completed</TabsTrigger>
                      <TabsTrigger value="disputed">Disputed</TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="p-4 border rounded-lg">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="text-3xl">🍅</div>
                                  <div>
                                    <h3 className="font-semibold">Tomatoes - 500 kg</h3>
                                    <p className="text-sm text-muted-foreground">Order #KOL-2025-0628</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleEscrowLock('KOL-2025-0628', '0x7e...7b8c', 0.05)}
                                  >
                                    <Lock className="h-3 w-3 mr-1" /> Lock Escrow
                                  </Button>
                                  <Badge>Awaiting Pickup</Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Farmer</p>
                                  <p className="font-medium">Ramappa Gowda</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Final Price</p>
                                  <p className="font-medium">₹38/kg</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Total Value</p>
                                  <p className="font-semibold text-primary">₹19,000</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Est. Delivery</p>
                                  <p className="font-medium">Today, 4 PM</p>
                                </div>
                              </div>

                              {/* Order Progress */}
                              <div className="flex items-center justify-between mb-2">
                                {['Won', 'Escrow', 'Pickup', 'Transit', 'Delivered'].map((step, i) => (
                                  <div key={step} className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      i <= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {i <= 1 ? <Check className="h-4 w-4" /> : i + 1}
                                    </div>
                                    <span className="text-xs mt-1">{step}</span>
                                  </div>
                                ))}
                              </div>
                              <Progress value={40} className="h-2" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-3xl">🍅</div>
                                <div>
                                  <h3 className="font-semibold">Tomatoes - 400 kg</h3>
                                  <p className="text-sm text-muted-foreground">Order #KOL-2025-0625</p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Settled
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Final Price</p>
                                <p className="font-medium">₹42/kg</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Total Paid</p>
                                <p className="font-semibold">₹16,800</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="font-medium">Jun 25, 2025</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="disputed" className="mt-4">
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <div className="text-5xl mb-3 opacity-20">👍</div>
                          <p className="font-medium">No disputed orders</p>
                          <p className="text-sm text-muted-foreground">You don't have any orders currently under dispute.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}

              {/* Disputes View */}
              {currentView === 'disputes' && (
                <motion.div
                  key="disputes"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <h1 className="text-2xl font-bold">Dispute Center</h1>

                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <div className="text-6xl mb-4 opacity-20 hover:opacity-40 transition-opacity">🤝</div>
                      <h3 className="text-xl font-semibold mb-2">No Active Disputes</h3>
                      <p className="text-muted-foreground text-center max-w-sm">
                        You're all caught up! There are no orders requiring dispute resolution or mediation at this time.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Farmers View */}
              {currentView === 'farmers' && (
                <motion.div
                  key="farmers"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <h1 className="text-2xl font-bold">Registered Farmers</h1>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { id: 'f1', code: 'KA-KOL-001', name: 'Ramappa Gowda', village: 'Srinivaspur', district: 'Kolar', trustScore: 95, listings: 47, verified: true },
                      { id: 'f2', code: 'KA-KOL-002', name: 'Lakshmi Devi', village: 'Bangarpet', district: 'Kolar', trustScore: 88, listings: 23, verified: true },
                      { id: 'f3', code: 'KA-KOL-003', name: 'Venkatesh Naidu', village: 'Mulbagal', district: 'Kolar', trustScore: 72, listings: 12, verified: false },
                      { id: 'f4', code: 'KA-BLR-001', name: 'Manjunath Kumar', village: 'Anekal', district: 'Bengaluru Rural', trustScore: 100, listings: 65, verified: true }
                    ].map(farmer => (
                      <Card key={farmer.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback>{farmer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <TrustBadge score={farmer.trustScore} />
                          </div>
                          <h3 className="font-semibold">{farmer.name}</h3>
                          <p className="text-sm text-muted-foreground">{farmer.code}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {farmer.village}, {farmer.district}
                          </div>
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                            <div className="text-center">
                              <p className="text-lg font-bold">{farmer.listings}</p>
                              <p className="text-xs text-muted-foreground">Listings</p>
                            </div>
                            <div className="text-center">
                              <Badge variant={farmer.verified ? 'default' : 'secondary'}>
                                {farmer.verified ? 'Verified' : 'Pending'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Fraud Monitor View */}
              {currentView === 'fraud' && (
                <motion.div
                  key="fraud"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">Fraud Monitoring</h1>
                      <p className="text-muted-foreground">Real-time fraud detection and prevention</p>
                    </div>
                    <Badge variant="destructive">2 Active Alerts</Badge>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <KPICard title="Weight Mismatches" value="3" icon={Scale} trend="This week" />
                    <KPICard title="Suspicious Patterns" value="2" icon={AlertTriangle} />
                    <KPICard title="Blocked Accounts" value="1" icon={Shield} />
                    <KPICard title="Trust Score Drops" value="5" icon={TrendingUp} trend="more than 10 points" />
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-500 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Active Alerts
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge variant="destructive">High Severity</Badge>
                              <h4 className="font-semibold mt-2">Weight Discrepancy - 8%</h4>
                              <p className="text-sm text-muted-foreground">Farmer KA-BLR-001</p>
                              <p className="text-xs text-muted-foreground mt-1">Detected: Jun 24, 2025</p>
                            </div>
                            <Button size="sm" variant="destructive">Investigate</Button>
                          </div>
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge variant="outline" className="border-amber-500 text-amber-600">Medium</Badge>
                              <h4 className="font-semibold mt-2">Suspicious Bidding Pattern</h4>
                              <p className="text-sm text-muted-foreground">Buyer b2 → Farmer f3</p>
                              <p className="text-xs text-muted-foreground mt-1">Same buyer winning over 80% auctions</p>
                            </div>
                            <Button size="sm" variant="outline">Review</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Fraud Prevention Measures</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { name: 'Land Record Verification', status: 'active', icon: FileText },
                            { name: 'Physical Weigh-In Required', status: 'active', icon: Scale },
                            { name: 'AI Quality Scoring', status: 'active', icon: Sparkles },
                            { name: 'Trust Score Tracking', status: 'active', icon: Shield },
                            { name: 'Device/IP Pattern Detection', status: 'active', icon: Globe },
                            { name: 'Identity Deduplication', status: 'active', icon: Users }
                          ].map((measure, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <measure.icon className="h-4 w-4 text-primary" />
                                <span className="font-medium">{measure.name}</span>
                              </div>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Active
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Bid Dialog */}
        <BidDialog
          listing={selectedListing}
          isOpen={bidDialogOpen}
          onClose={() => setBidDialogOpen(false)}
          onSubmit={handleSubmitBid}
        />

        {/* Payment Dialog */}
        <PaymentDialog
          isOpen={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          amount={topupAmount}
          onConfirm={handlePaymentConfirm}
        />
      </div>
    </TooltipProvider>
  )
}
