'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { 
  Gavel, Leaf, Shield, Wallet, Clock, TrendingUp, Users, Package,
  Search, Bell, Menu, X, ShoppingCart, MessageSquare, 
  IndianRupee, MapPin, Sparkles, Filter, RefreshCw
} from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function RetailerDashboard({ user, listings, onBid, isLoading }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const matchesSearch = l.produce.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           l.location.toLowerCase().includes(searchQuery.toLowerCase())
      if (activeFilter === 'all') return matchesSearch
      return matchesSearch && l.status === activeFilter
    })
  }, [listings, searchQuery, activeFilter])

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-8 p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Retailer Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            Retailer Sourcing Hub
          </h1>
          <p className="text-gray-400">Direct from farm auctions. Verified quality. Blockchain secured.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
          <div className="px-4 py-2 border-r border-white/10">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Wallet Balance</p>
            <p className="text-lg font-black text-emerald-400">{formatINR(user?.walletBalance || 50000)}</p>
          </div>
          <Button variant="ghost" className="text-emerald-400 hover:bg-emerald-500/10">
            Top Up
          </Button>
        </div>
      </div>

      {/* Global Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <Input 
            placeholder="Search by produce, variety or location..." 
            className="pl-12 bg-white/5 border-white/10 text-white rounded-2xl h-14 text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="h-14 rounded-2xl border-white/10 text-white gap-2">
                <Filter className="h-5 w-5" />
                Filters
            </Button>
        </div>
      </div>

      {/* Market Tabs */}
      <Tabs defaultValue="live" className="w-full">
        <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white/5 border-white/10 p-1 rounded-2xl">
                <TabsTrigger value="live" className="rounded-xl px-8 data-[state=active]:bg-[#228B22]">Live Markets</TabsTrigger>
                <TabsTrigger value="ending" className="rounded-xl px-8 data-[state=active]:bg-red-600">Ending Soon</TabsTrigger>
                <TabsTrigger value="my-bids" className="rounded-xl px-8 data-[state=active]:bg-blue-600">My Active Bids</TabsTrigger>
            </TabsList>
            
            <div className="text-xs text-gray-500 flex items-center gap-2">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Updating Live
            </div>
        </div>

        <TabsContent value="live" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              [1,2,3,4,5,6].map(i => <div key={i} className="h-[400px] rounded-3xl bg-white/5 animate-pulse" />)
            ) : filteredListings.filter(l => l.status === 'live').length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">No active auctions found</h3>
                <p className="text-gray-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredListings.filter(l => l.status === 'live').map((listing) => (
                <AuctionCard key={listing._id || listing.id} listing={listing} onBid={onBid} formatINR={formatINR} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="ending" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.filter(l => l.status === 'ending_soon').length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">No auctions ending soon</h3>
                <p className="text-gray-400">All auctions have plenty of time remaining.</p>
              </div>
            ) : (
              filteredListings.filter(l => l.status === 'ending_soon').map((listing) => (
                <AuctionCard key={listing._id || listing.id} listing={listing} onBid={onBid} formatINR={formatINR} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-bids" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.filter(l => l.highestBidderId === user.id || l.highestBidderId === user._id).length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <Gavel className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">You haven't placed any bids yet</h3>
                <p className="text-gray-400">Bids you place will appear here so you can track them.</p>
              </div>
            ) : (
              filteredListings.filter(l => l.highestBidderId === user.id || l.highestBidderId === user._id).map((listing) => (
                <AuctionCard key={listing._id || listing.id} listing={listing} onBid={onBid} formatINR={formatINR} isHighestBidder={true} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AuctionCard({ listing, onBid, formatINR, isHighestBidder }) {
  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden group hover:border-[#228B22]/50 transition-all duration-300 rounded-[30px] flex flex-col relative">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={listing.images?.[0] || 'https://images.unsplash.com/photo-1595855759920-86582396740b?w=500'} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={listing.produce}
        />
        <div className="absolute top-4 left-4 flex gap-2">
            <Badge className={listing.status === 'ending_soon' ? 'bg-red-600 text-white animate-pulse' : 'bg-[#228B22] text-white'}>
                {listing.status === 'ending_soon' ? 'Ending Soon' : 'Live Bidding'}
            </Badge>
            <Badge className="bg-black/50 backdrop-blur-md border-white/10">{listing.location}</Badge>
        </div>
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">QI: {listing.qualityIndex}%</span>
            </div>
        </div>
      </div>
      
      <CardHeader className="pt-6">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl font-bold text-white">{listing.produceIcon || '🌾'} {listing.produce}</CardTitle>
                <CardDescription className="text-gray-400 mt-1">Farmer: {listing.farmerName}</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Qty</p>
                <p className="font-bold text-white leading-none">{listing.quantity} {listing.unit}</p>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl mb-4">
            <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Floor</p>
                <p className="text-sm font-semibold">{formatINR(listing.minPricePerKg)}/kg</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold">High Bid</p>
                <p className="text-lg font-black text-emerald-400 leading-none">{formatINR(listing.currentBidPerKg)}/kg</p>
            </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
                <Clock className={`h-4 w-4 ${listing.status === 'ending_soon' ? 'text-red-500' : 'text-orange-400'}`} />
                <span>Ends in {listing.status === 'ending_soon' ? 'Less than 1h' : '4h 22m'}</span>
            </div>
            <div className="flex items-center gap-1">
                <Gavel className="h-4 w-4" />
                <span>{listing.totalBids || 0} Bids</span>
            </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-6 px-6">
        <Button 
          className={`w-full h-12 rounded-2xl font-bold transition-all duration-300 ${isHighestBidder ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white text-black hover:bg-emerald-400 hover:text-white'}`}
          onClick={() => onBid(listing)}
        >
          {isHighestBidder ? 'You are Leading' : 'Place Higher Bid'}
        </Button>
      </CardFooter>
      
      {isHighestBidder && (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-tighter"
        >
            Winning
        </motion.div>
      )}
    </Card>
  )
}
