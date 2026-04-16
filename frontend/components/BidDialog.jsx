'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gavel, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function BidDialog({ listing, isOpen, onClose, onSubmit }) {
  const [bidAmount, setBidAmount] = useState('')
  
  if (!listing) return null

  const minBid = (listing.currentBidPerKg || listing.minPricePerKg) + 1
  const totalValue = bidAmount ? bidAmount * listing.quantity : 0

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleSubmit = () => {
    if (bidAmount >= minBid) {
      onSubmit(listing.id || listing._id, parseFloat(bidAmount))
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0f172a] text-white border-white/10 rounded-[30px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <span className="text-3xl">{listing.produceIcon || 'ðŸŒ¾'}</span>
            Place Bid - {listing.produce}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Current Floor: {formatINR(listing.currentBidPerKg || listing.minPricePerKg)}/kg
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black">Quantity</p>
              <p className="font-bold">{listing.quantity} {listing.unit}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase font-black">Quality Grade</p>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                {listing.qualityIndex}% Index
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 font-bold ml-1">Your Bid per kg</Label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
              <Input 
                type="number" 
                placeholder={`Min ${minBid}/kg`} 
                value={bidAmount} 
                onChange={(e) => setBidAmount(e.target.value)} 
                className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-xl font-bold focus:ring-emerald-500"
                min={minBid} 
              />
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase ml-1">
              Minimum increment is â‚¹1.00/kg
            </p>
          </div>

          {bidAmount >= minBid && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex justify-between items-center"
            >
              <div>
                <p className="text-[10px] text-emerald-500 uppercase font-black">Total Auction Value</p>
                <p className="text-3xl font-black text-white">{formatINR(totalValue)}</p>
              </div>
              <div className="h-12 w-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                <Gavel className="h-6 w-6" />
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="ghost" className="rounded-2xl h-12 flex-1 text-gray-400 hover:text-white hover:bg-white/5" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="rounded-2xl h-12 flex-1 bg-white text-black font-bold hover:bg-emerald-500 hover:text-white"
            onClick={handleSubmit} 
            disabled={!bidAmount || bidAmount < minBid}
          >
            Confirm Bid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
