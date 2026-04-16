'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Leaf, TrendingUp, Users, Package, Clock, IndianRupee,
  MapPin, Plus, Gavel, ChevronRight, Shield, Search,
  CheckCircle2, AlertTriangle
} from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function FarmerAgentDashboard({ user }) {
  const [listings, setListings] = useState([])
  const [farmers, setFarmers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [farmerSearch, setFarmerSearch] = useState('')
  const [selectedFarmer, setSelectedFarmer] = useState(null)
  const [newListing, setNewListing] = useState({
    produce: '',
    quantity: '',
    unit: 'kg',
    minPricePerKg: '',
    location: user?.village || '',
    harvestDate: new Date().toISOString().split('T')[0]
  })

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
  const isAgent = user?.role === 'agent'

  // Fetch all listings (for agents see all, farmers see their own)
  const fetchMyListings = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('farmbid_token')
      const endpoint = isAgent
        ? `${API_URL}/listings?status=all`
        : `${API_URL}/listings/farmer/${user.id || user._id}`
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setListings(data.listings || [])
      }
    } catch (error) {
      console.error('Fetch listings error:', error)
      toast.error('Failed to load listings')
    } finally {
      setIsLoading(false)
    }
  }, [user, API_URL, isAgent])

  // Fetch registered farmers (for agents only)
  const fetchFarmers = useCallback(async () => {
    if (!isAgent) return
    try {
      const token = localStorage.getItem('farmbid_token')
      const response = await fetch(`${API_URL}/farmers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setFarmers(data.farmers.filter(f => f.role === 'farmer' || !f.role))
      }
    } catch (error) {
      console.error('Fetch farmers error:', error)
    }
  }, [isAgent, API_URL])

  useEffect(() => {
    fetchMyListings()
    fetchFarmers()
    // Poll every 30 seconds
    const interval = setInterval(fetchMyListings, 30000)
    return () => clearInterval(interval)
  }, [fetchMyListings, fetchFarmers])

  const handleCreateListing = async (e) => {
    e.preventDefault()
    if (isAgent && !selectedFarmer) {
      toast.error('Please select a farmer to list on behalf of.')
      return
    }
    try {
      const token = localStorage.getItem('farmbid_token')
      const targetFarmerId = isAgent ? selectedFarmer.id : (user.id || user._id)
      const response = await fetch(`${API_URL}/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newListing,
          farmerId: targetFarmerId,
          agentId: isAgent ? (user.id || user._id) : undefined,
          source: isAgent ? 'web_agent' : 'web_farmer',
          pincode: '000000', // Default mock pincode
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          auctionEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Listing created for ${isAgent ? selectedFarmer.name : user.name}!`)
        setIsDialogOpen(false)
        setSelectedFarmer(null)
        setNewListing({ produce: '', quantity: '', unit: 'kg', minPricePerKg: '', location: user?.village || '', harvestDate: new Date().toISOString().split('T')[0] })
        fetchMyListings()
      } else {
        toast.error(data.error || 'Failed to create listing')
      }
    } catch (error) {
      toast.error('Connection error')
    }
  }

  const formatINR = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(amount || 0)

  const liveListings = listings.filter(l => l.status === 'live')
  const endedListings = listings.filter(l => l.status === 'ended')
  const filteredFarmers = farmers.filter(f =>
    f.name?.toLowerCase().includes(farmerSearch.toLowerCase()) ||
    f.village?.toLowerCase().includes(farmerSearch.toLowerCase()) ||
    f.phone?.includes(farmerSearch)
  )

  const statsData = [
    { label: 'Active Auctions', value: liveListings.length, icon: Gavel, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Est. Revenue', value: formatINR(liveListings.reduce((acc, l) => acc + ((l.currentBidPerKg || 0) * (l.quantity || 0)), 0)), icon: IndianRupee, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Trust Score', value: `${user?.trustScore || 85}%`, icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { label: isAgent ? 'Farmers Covered' : 'Total Sales', value: isAgent ? farmers.length : (user?.successfulSales || 0), icon: isAgent ? Users : TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  ]

  return (
    <div className="space-y-8 p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              {isAgent ? 'Agent Console' : 'Farmer Dashboard'}
            </h1>
            {isAgent && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs font-black uppercase">Field Agent</Badge>
            )}
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {user?.village || 'Village'}, {user?.district || 'District'}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-[#228B22] hover:bg-[#1a6b1a] text-white rounded-2xl px-8 shadow-xl shadow-[#228B22]/20 gap-2 h-12">
              <Plus className="h-5 w-5" />
              {isAgent ? 'List for Farmer' : 'New Produce Listing'}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {isAgent ? 'List Produce for Farmer' : 'List Your Produce'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {isAgent
                  ? 'Select the farmer you represent, then fill in the crop details.'
                  : 'Set your floor price and harvest details for retailers to bid on.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateListing} className="space-y-4 py-2">
              {/* Agent: Farmer Selection Step */}
              {isAgent && (
                <div className="space-y-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <Label className="text-amber-400 font-bold flex items-center gap-2">
                    <Users className="h-4 w-4" /> Select Farmer to Represent
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, village or phone..."
                      value={farmerSearch}
                      onChange={(e) => setFarmerSearch(e.target.value)}
                      className="pl-10 bg-muted border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {filteredFarmers.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-2">No farmers found. They need to be registered first.</p>
                    ) : filteredFarmers.map(farmer => (
                      <button
                        type="button"
                        key={farmer.id || farmer._id}
                        onClick={() => setSelectedFarmer(farmer)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                          selectedFarmer?.id === farmer.id
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-foreground'
                            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-sm">{farmer.name}</p>
                          <p className="text-xs text-muted-foreground">{farmer.village} • {farmer.phone}</p>
                        </div>
                        {selectedFarmer?.id === farmer.id && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                  {selectedFarmer && (
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-sm">
                      <p className="text-emerald-400 font-bold">✓ Listing for: {selectedFarmer.name}</p>
                      <p className="text-muted-foreground text-xs">Trust Score: {selectedFarmer.trustScore || 50}/100</p>
                    </div>
                  )}
                </div>
              )}

              {/* Produce Details */}
              <div className="space-y-2">
                <Label>Produce Name</Label>
                <Input
                  placeholder="e.g. Tomatoes, Chilies, Rice"
                  value={newListing.produce}
                  onChange={(e) => setNewListing({ ...newListing, produce: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={newListing.quantity}
                    onChange={(e) => setNewListing({ ...newListing, quantity: e.target.value })}
                    className="bg-muted border-border text-foreground"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={newListing.unit} onValueChange={(v) => setNewListing({ ...newListing, unit: v })}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border text-foreground">
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="quintal">Quintals (qtl)</SelectItem>
                      <SelectItem value="ton">Tons (t)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Minimum Base Price (per kg)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="35"
                    value={newListing.minPricePerKg}
                    onChange={(e) => setNewListing({ ...newListing, minPricePerKg: e.target.value })}
                    className="bg-muted border-border text-foreground pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location / Village</Label>
                <Input
                  placeholder="e.g. Srinivaspur"
                  value={newListing.location}
                  onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Harvest Date</Label>
                <Input
                  type="date"
                  value={newListing.harvestDate}
                  onChange={(e) => setNewListing({ ...newListing, harvestDate: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-muted-foreground">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#228B22] hover:bg-[#1a6b1a] text-white rounded-xl px-8"
                  disabled={isAgent && !selectedFarmer}
                >
                  🚀 Launch Auction
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card className="bg-card border-border backdrop-blur-xl hover:bg-muted transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</CardTitle>
                <div className={`p-2 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-black text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Listing Tabs */}
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="bg-muted border border-border w-full md:w-auto p-1 rounded-2xl mb-6">
          <TabsTrigger value="live" className="rounded-xl px-8 data-[state=active]:bg-[#228B22] data-[state=active]:text-primary-foreground">
            Live ({liveListings.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-xl px-8 data-[state=active]:bg-[#228B22] data-[state=active]:text-primary-foreground">
            Completed ({endedListings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isLoading ? (
              [1, 2].map(i => <div key={i} className="h-52 rounded-3xl bg-muted animate-pulse" />)
            ) : liveListings.length === 0 ? (
              <Card className="col-span-full bg-muted/50 border-border border-dashed py-20 flex flex-col items-center justify-center text-center rounded-3xl">
                <div className="bg-background p-4 rounded-full mb-4">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">No Active Listings</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  {isAgent ? 'Select a farmer and create a listing to get started.' : 'Start by listing your produce for retailers to bid on.'}
                </p>
                <Button variant="outline" onClick={() => setIsDialogOpen(true)} className="border-border text-foreground hover:bg-muted">
                  Create First Listing
                </Button>
              </Card>
            ) : (
              liveListings.map((listing) => (
                <ListingCard key={listing._id || listing.id} listing={listing} formatINR={formatINR} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {endedListings.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No completed auctions yet.</p>
              </div>
            ) : (
              endedListings.map((listing) => (
                <ListingCard key={listing._id || listing.id} listing={listing} formatINR={formatINR} ended />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Agent Farmer Management Panel */}
      {isAgent && (
        <Card className="bg-card border-border rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-xl">
              <Users className="h-5 w-5 text-amber-400" />
              Managed Farmer Pool
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-2">{farmers.length} registered</Badge>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              These are the farmers you can create listings for. They registered via WhatsApp or the web platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {farmers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No farmers are registered yet. Ask farmers to register via WhatsApp first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {farmers.map((farmer, i) => {
                  const farmerListings = listings.filter(l => l.farmerId === (farmer.id || farmer._id))
                  return (
                    <div key={i} className="p-4 rounded-2xl bg-muted/50 border border-border hover:border-amber-500/50 transition-all cursor-pointer">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-xl">
                          👨‍🌾
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{farmer.name}</p>
                          <p className="text-xs text-muted-foreground">{farmer.village || 'Village N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Trust Score</p>
                          <Progress value={farmer.trustScore || 50} className="h-1.5 w-24 bg-muted" />
                        </div>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                          {farmerListings.length} Listings
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ListingCard({ listing, formatINR, ended = false }) {
  const sourceColor = listing.source === 'whatsapp'
    ? 'bg-green-600/20 text-green-500 border-green-600/30'
    : listing.source === 'web_agent'
      ? 'bg-amber-600/20 text-amber-400 border-amber-600/30'
      : 'bg-blue-600/20 text-blue-500 border-blue-600/30'

  const sourceLabel = listing.source === 'whatsapp' ? '📱 WhatsApp' : listing.source === 'web_agent' ? '🧑‍💼 Agent' : '🌐 Web'

  return (
    <Card className={`bg-card border-border overflow-hidden group hover:border-[#228B22]/50 transition-all duration-300 rounded-2xl ${ended ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#228B22]/20 flex items-center justify-center text-3xl">
              {listing.produceIcon || '🌾'}
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">{listing.produce}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-muted-foreground text-xs">
                <Clock className="h-3 w-3" />
                {ended ? 'Auction ended' : `Ends ${new Date(listing.auctionEndsAt).toLocaleTimeString()}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {listing.status === 'won' && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] font-black uppercase">🏆 Won</Badge>
            )}
            <Badge className={sourceColor}>{sourceLabel}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Base Price</p>
            <p className="text-sm font-semibold text-foreground">{formatINR(listing.minPricePerKg)}/kg</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Highest Bid</p>
            <p className="text-sm font-bold text-emerald-400">{formatINR(listing.currentBidPerKg)}/kg</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Weight</p>
            <p className="text-sm font-semibold text-foreground">{listing.quantity} {listing.unit}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Bid Activity</span>
            <span className="text-[#228B22] font-bold">{listing.totalBids || 0} Bids</span>
          </div>
          <Progress value={Math.min((listing.totalBids || 0) * 10, 100)} className="h-2 bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 border-t border-border px-5 py-3 flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Farmer: {listing.farmerName || 'N/A'}</p>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-0 h-auto text-xs gap-1">
          View Bids <ChevronRight className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  )
}
