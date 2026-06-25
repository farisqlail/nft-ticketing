'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Search, ArrowRight, X, Wallet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { parseEther, formatUnits, parseUnits, getAddress } from 'viem';
import { TICKET_NFT_ABI, ERC20_ABI } from '@/lib/abi';
import { getEvents, recordTicketSale, type EventItem } from '@/lib/events';

// Sepolia defaults
const LINK_TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
const DEFAULT_CONTRACT_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

export default function Home() {
  const { address: userAddress, isConnected } = useAccount();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ETH' | 'LINK'>('ETH');
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_CONTRACT_ADDRESS);

  const loadAllEvents = async () => {
    try {
      const all = await getEvents();
      setEvents(all);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('velo_contract_address');
    if (saved) {
      setContractAddress(saved);
    }
    loadAllEvents();
  }, []);

  const getActiveAddress = (): `0x${string}` => {
    const raw = contractAddress || DEFAULT_CONTRACT_ADDRESS;
    try {
      return getAddress(raw);
    } catch {
      return getAddress(DEFAULT_CONTRACT_ADDRESS);
    }
  };

  const activeContractAddress = getActiveAddress();
  const categories = ['All', 'Conference', 'Music', 'Art', 'Hackathon'];

  // Read LINK token address dynamically from TicketNFT contract
  const { data: contractLinkAddress } = useReadContract({
    address: activeContractAddress,
    abi: TICKET_NFT_ABI,
    functionName: 'linkToken',
  });

  const activeLinkTokenAddress = (contractLinkAddress || LINK_TOKEN_ADDRESS) as `0x${string}`;

  // Read User balances
  const { data: ethBalance } = useBalance({ address: userAddress });
  const { data: linkBalance } = useReadContract({
    address: activeLinkTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });

  // Read LINK allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: activeLinkTokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && activeContractAddress ? [userAddress, activeContractAddress] : undefined,
  });

  // Write Contract Hooks
  const { writeContractAsync, data: txHash, error: txError, isPending: isTxPending, reset: resetTx } = useWriteContract();

  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isTxConfirmed && selectedEvent && userAddress) {
      recordTicketSale(selectedEvent.id).then(() => {
        loadAllEvents();
      });

      const localKey = `lailtix_local_purchases_${userAddress.toLowerCase()}`;
      const cached = localStorage.getItem(localKey);
      let list: any[] = [];
      if (cached) {
        try {
          list = JSON.parse(cached);
        } catch (e) {}
      }
      if (txHash && !list.some((p: any) => p.txHash === txHash)) {
        list.push({
          eventId: selectedEvent.id,
          paymentMethod,
          txHash,
          tokenId: String(Math.floor(Math.random() * 900) + 100),
          timestamp: Date.now()
        });
        localStorage.setItem(localKey, JSON.stringify(list));
      }
    }
  }, [isTxConfirmed, selectedEvent, userAddress, txHash, paymentMethod]);

  const [localError, setLocalError] = useState<string | null>(null);

  const isConfigInvalid = 
    Boolean(userAddress && activeContractAddress.toLowerCase() === userAddress.toLowerCase()) ||
    activeContractAddress.toLowerCase() === activeLinkTokenAddress.toLowerCase();

  // Buy Ticket Logic
  const handlePurchase = async () => {
    if (!selectedEvent || isConfigInvalid) return;
    setLocalError(null);
    resetTx();

    try {
      const uri = `https://api.lailtix.io/metadata/${selectedEvent.id}`;

      if (paymentMethod === 'ETH') {
        const value = parseEther(selectedEvent.priceEth);
        await writeContractAsync({
          address: activeContractAddress,
          abi: TICKET_NFT_ABI,
          functionName: 'buyWithETH',
          args: [uri],
          value,
        });
      } else {
        const linkRequired = parseUnits(selectedEvent.priceLink, 18);
        const currentAllowance = allowance ? BigInt(allowance.toString()) : BigInt(0);

        if (currentAllowance < linkRequired) {
          await writeContractAsync({
            address: activeLinkTokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [activeContractAddress, linkRequired],
          });
          setTimeout(() => refetchAllowance(), 4000);
          return;
        }

        await writeContractAsync({
          address: activeContractAddress,
          abi: TICKET_NFT_ABI,
          functionName: 'buyWithLINK',
          args: [uri],
        });
      }
    } catch (err: any) {
      console.error(err);
      setLocalError(err.message || 'Transaction rejected or failed.');
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isApproved = () => {
    if (!selectedEvent) return false;
    const required = parseUnits(selectedEvent.priceLink, 18);
    const current = allowance ? BigInt(allowance.toString()) : BigInt(0);
    return current >= required;
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-24 flex flex-col gap-16 animate-in fade-in duration-300">
      
      {/* Hero Section - Modern Minimalist */}
      <section className="flex flex-col gap-4 text-left max-w-2xl">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-none">
          LailTix.
        </h1>
        <p className="text-zinc-500 text-base sm:text-lg font-light leading-relaxed">
          Decentralized event ticket passes on Ethereum Sepolia. No scalpers, zero friction, immediate ownership proof.
        </p>
      </section>

      {/* Control Panel: Minimalist search & filters */}
      <section className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-zinc-900 pb-6">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent rounded-lg border border-zinc-900 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all font-light"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                selectedCategory === category
                  ? 'border border-white text-white bg-white/5'
                  : 'border border-zinc-900 text-zinc-500 hover:text-white hover:border-zinc-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Events Minimal Grid */}
      <section className="flex flex-col gap-6">
        {isLoadingEvents ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="h-5 w-5 text-zinc-600 animate-spin" />
            <span className="text-zinc-500 text-[10px] font-mono">Loading marketplace...</span>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => {
              const progress = (event.soldTickets / event.totalTickets) * 100;
              return (
                <div
                  key={event.id}
                  className="group flex flex-col gap-4 border border-zinc-900 rounded-2xl p-4 hover:border-zinc-800 transition-all duration-300"
                >
                  {/* Event Thumbnail */}
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-zinc-900 relative">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider bg-black/80 text-zinc-400">
                      {event.category}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-bold text-white group-hover:text-zinc-300 transition-colors truncate">
                      {event.title}
                    </h3>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed line-clamp-2">
                      {event.description}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-900 text-[11px] text-zinc-400 font-light">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                      <span>{event.date} • {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  </div>

                  {/* Supply & Price Bar */}
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1 font-mono">
                    <span>{event.soldTickets} / {event.totalTickets} Passes Sold</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-[2px] bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Pricing and Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-900 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-600 uppercase font-semibold">TICKET PRICE</span>
                      <span className="text-xs font-semibold text-white font-mono">{event.priceEth} ETH</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        resetTx();
                        setLocalError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-white hover:bg-white hover:text-black text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
                    >
                      Get Pass <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-zinc-900 rounded-2xl">
            <p className="text-zinc-600 text-xs font-light">No events found matching criteria.</p>
          </div>
        )}
      </section>

      {/* Ticket Purchase Modal - Minimalist */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col gap-6 relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col gap-1 text-left">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">GATE ADMISSION PASS</span>
              <h3 className="text-lg font-bold text-white leading-tight truncate">{selectedEvent.title}</h3>
              <p className="text-[11px] text-zinc-500 flex items-center gap-1 font-light">
                <MapPin className="h-3 w-3 text-zinc-700" /> {selectedEvent.venue}
              </p>
            </div>

            {/* Warnings (Admin address overrides check) */}
            {isConnected && activeContractAddress.toLowerCase() === userAddress?.toLowerCase() && (
              <div className="p-3 rounded-xl border border-amber-900/30 bg-amber-950/10 text-[11px] text-amber-500 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Configuration conflict</strong>: Your configured contract address is set to your own wallet! Set it to a deployed TicketNFT contract address in the Admin Dashboard.
                </span>
              </div>
            )}

            {/* Payment Selector */}
            <div className="flex flex-col gap-2.5 text-left">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Select Token</span>
              <div className="grid grid-cols-2 gap-3">
                {/* ETH */}
                <button
                  onClick={() => setPaymentMethod('ETH')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'ETH'
                      ? 'border-white bg-white/5'
                      : 'border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <span className="text-[10px] font-semibold text-zinc-400">Ethereum (ETH)</span>
                  <span className="text-base font-bold text-white font-mono">{selectedEvent.priceEth}</span>
                  {isConnected && (
                    <span className="text-[9px] text-zinc-600 font-mono">
                      Bal: {ethBalance ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4) : '0'}
                    </span>
                  )}
                </button>

                {/* LINK */}
                <button
                  onClick={() => setPaymentMethod('LINK')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'LINK'
                      ? 'border-white bg-white/5'
                      : 'border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <span className="text-[10px] font-semibold text-zinc-400">Chainlink (LINK)</span>
                  <span className="text-base font-bold text-white font-mono">{selectedEvent.priceLink}</span>
                  {isConnected && (
                    <span className="text-[9px] text-zinc-600 font-mono">
                      Bal: {linkBalance ? parseFloat(formatUnits(BigInt(linkBalance.toString()), 18)).toFixed(1) : '0'}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Errors */}
            {(localError || txError) && (
              <div className="p-3 rounded-xl border border-red-900/30 bg-red-950/10 text-[11px] text-red-500 flex items-start gap-2 max-h-[80px] overflow-y-auto font-mono">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="break-all">{localError || txError?.message || 'Transaction failed.'}</span>
              </div>
            )}

            {/* Success */}
            {isTxConfirmed && (
              <div className="p-3 rounded-xl border border-emerald-900/30 bg-emerald-950/10 text-[11px] text-emerald-500 flex flex-col gap-1.5 items-center text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-bounce" />
                <span className="font-semibold text-white">Ticket Purchased!</span>
                {txHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[10px] text-emerald-400 font-mono"
                  >
                    View Transaction
                  </a>
                )}
              </div>
            )}

            {/* Checkout Action Button */}
            {!isConnected ? (
              <div className="p-3 border border-zinc-900 border-dashed rounded-xl text-center text-zinc-500 text-xs font-light">
                Connect wallet to unlock ticket checkout.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {isTxPending || isTxConfirming ? (
                  <div className="w-full py-2.5 rounded-xl border border-zinc-800 flex items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                    {isTxConfirming ? 'Confirming...' : 'Wallet Action...'}
                  </div>
                ) : (
                  <button
                    onClick={handlePurchase}
                    disabled={isTxConfirmed || isConfigInvalid}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      isTxConfirmed
                        ? 'border border-zinc-900 text-zinc-600 bg-transparent'
                        : isConfigInvalid
                        ? 'border border-zinc-900 text-zinc-700 bg-transparent'
                        : 'border border-white bg-white text-black hover:bg-transparent hover:text-white'
                    }`}
                  >
                    {isTxConfirmed
                      ? 'Purchased ✓'
                      : isConfigInvalid
                      ? 'Configuration Conflict'
                      : paymentMethod === 'LINK' && !isApproved()
                      ? 'Approve LINK Spending'
                      : `Buy Ticket with ${paymentMethod}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
