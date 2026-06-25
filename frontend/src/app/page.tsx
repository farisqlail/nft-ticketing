'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Search, ArrowRight, X, Wallet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { parseEther, formatUnits, parseUnits, getAddress } from 'viem';
import { TICKET_NFT_ABI, ERC20_ABI } from '@/lib/abi';
import { getEvents, recordTicketSale, type EventItem } from '@/lib/events';

// Sepolia defaults
const LINK_TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
const DEFAULT_CONTRACT_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

// Multi-coin SVGs
const EthIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 784 1277" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M392 0L383.5 28.5V870.5L392 879L784 648L392 0Z" fill="#8C8C8C"/>
    <path d="M392 0L0 648L392 879V470V0Z" fill="#E5E5E5"/>
    <path d="M392 956L387 961V1271.5L392 1277L784 725.5L392 956Z" fill="#8C8C8C"/>
    <path d="M392 1277V956L0 725.5L392 1277Z" fill="#E5E5E5"/>
    <path d="M392 879L784 648L392 537V879Z" fill="#1A1A1A"/>
    <path d="M0 648L392 879V537L0 648Z" fill="#4C4C4C"/>
  </svg>
);

const LinkIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 6.5V15.5L12 20L20 15.5V6.5L12 2Z" stroke="#375BD2" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12 6L7 8.8V14.4L12 17.2L17 14.4V8.8L12 6Z" fill="#375BD2"/>
  </svg>
);

const UsdcIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#2775CA"/>
    <path d="M12 6V18M9.5 9.5H12.5C13.5 9.5 14 10 14 10.7C14 11.5 13.5 11.8 12.5 11.8H11.5C10.5 11.8 10 12.1 10 12.9C10 13.7 10.5 14.2 11.5 14.2H14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const UsdtIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#26A17B"/>
    <path d="M7.5 7.5H16.5M12 7.5V16.5M9.5 11H14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const WbtcIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#F7931A"/>
    <path d="M9 7H13.2C14.2 7 15 7.7 15 8.5C15 9.2 14.4 9.7 13.7 9.8C14.5 10 15 10.6 15 11.4C15 12.3 14.1 13 13 13H9M10.8 7V13M12.5 7V6M11.2 7V6M12.5 13V14M11.2 13V14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function Home() {
  const { address: userAddress, isConnected } = useAccount();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ETH' | 'LINK' | 'USDC' | 'USDT' | 'WBTC'>('ETH');
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_CONTRACT_ADDRESS);

  // Simulated Tx states for USDC/USDT/WBTC
  const [isSimulatingTx, setIsSimulatingTx] = useState(false);
  const [simulatedConfirming, setSimulatedConfirming] = useState(false);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);
  const [simulatedTxHash, setSimulatedTxHash] = useState<string | null>(null);

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
  const { data: ethBalance, refetch: refetchEth } = useBalance({ address: userAddress });
  const { data: linkBalance, refetch: refetchLink } = useReadContract({
    address: activeLinkTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });

  // Read Sepolia USDC balance
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });

  // Read Sepolia USDT balance
  const { data: usdtBalance, refetch: refetchUsdt } = useReadContract({
    address: '0xaA8E23Fb1079EA71e0a56F48a2aa51851D8433D0',
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });

  // Read Sepolia WBTC balance
  const { data: wbtcBalance, refetch: refetchWbtc } = useReadContract({
    address: '0x29f2D40B06052043ab910ff7f30bd65126829c50',
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
    setSimulatedSuccess(false);
    setSimulatedTxHash(null);

    const uri = `https://api.lailtix.io/metadata/${selectedEvent.id}`;

    if (paymentMethod === 'ETH') {
      try {
        const value = parseEther(selectedEvent.priceEth);
        await writeContractAsync({
          address: activeContractAddress,
          abi: TICKET_NFT_ABI,
          functionName: 'buyWithETH',
          args: [uri],
          value,
        });
      } catch (err: any) {
        console.error(err);
        setLocalError(err.message || 'Transaction rejected or failed.');
      }
    } else if (paymentMethod === 'LINK') {
      try {
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
      } catch (err: any) {
        console.error(err);
        setLocalError(err.message || 'Transaction rejected or failed.');
      }
    } else {
      // USDC, USDT, WBTC Simulation
      setIsSimulatingTx(true);
      setSimulatedConfirming(false);
      try {
        // Approval wait
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setSimulatedConfirming(true);
        // Mint wait
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        const mockHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
        setSimulatedTxHash(mockHash);
        setSimulatedSuccess(true);

        await recordTicketSale(selectedEvent.id);
        await loadAllEvents();

        if (userAddress) {
          const localKey = `lailtix_local_purchases_${userAddress.toLowerCase()}`;
          const cached = localStorage.getItem(localKey);
          let list: any[] = [];
          if (cached) {
            try { list = JSON.parse(cached); } catch(e) {}
          }
          list.push({
            eventId: selectedEvent.id,
            paymentMethod,
            txHash: mockHash,
            tokenId: String(Math.floor(Math.random() * 900) + 100),
            timestamp: Date.now()
          });
          localStorage.setItem(localKey, JSON.stringify(list));
        }

        // Refetch balances
        refetchEth();
        refetchLink();
        refetchUsdc();
        refetchUsdt();
        refetchWbtc();
      } catch (e: any) {
        setLocalError(e.message || 'Simulation error.');
      } finally {
        setIsSimulatingTx(false);
        setSimulatedConfirming(false);
      }
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

  // Helper values for dynamic calculations
  const getSelectedEventPrice = (method: typeof paymentMethod) => {
    if (!selectedEvent) return '0';
    switch (method) {
      case 'ETH': return selectedEvent.priceEth;
      case 'LINK': return selectedEvent.priceLink;
      case 'USDC': 
      case 'USDT': return (parseFloat(selectedEvent.priceLink) * 2.0).toFixed(1); // e.g. 10.0
      case 'WBTC': return (parseFloat(selectedEvent.priceEth) / 10.0).toFixed(5); // e.g. 0.0001
      default: return '0';
    }
  };

  const getBalanceDisplay = (method: typeof paymentMethod) => {
    if (!isConnected) return '0';
    switch (method) {
      case 'ETH':
        return ethBalance ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4) : '0';
      case 'LINK':
        return linkBalance ? parseFloat(formatUnits(BigInt(linkBalance.toString()), 18)).toFixed(1) : '0';
      case 'USDC':
        return usdcBalance ? parseFloat(formatUnits(BigInt(usdcBalance.toString()), 6)).toFixed(1) : '0';
      case 'USDT':
        return usdtBalance ? parseFloat(formatUnits(BigInt(usdtBalance.toString()), 6)).toFixed(1) : '0';
      case 'WBTC':
        return wbtcBalance ? parseFloat(formatUnits(BigInt(wbtcBalance.toString()), 8)).toFixed(5) : '0';
      default:
        return '0';
    }
  };

  const isSuccessState = isTxConfirmed || simulatedSuccess;
  const isPendingState = isTxPending || isTxConfirming || isSimulatingTx || simulatedConfirming;

  return (
    <div className="relative flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-24 flex flex-col gap-16 animate-in fade-in duration-300">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[5%] right-[-5%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative flex flex-col lg:flex-row items-center justify-between gap-10 pt-4 md:pt-8 pb-4">
        <div className="flex flex-col gap-6 text-left max-w-2xl flex-1">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-950/10 text-violet-300 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Next-Gen Ticketing Protocol</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-[0.9] uppercase">
            The Future of <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              Event Passes
            </span>
          </h1>

          {/* Description */}
          <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed max-w-xl">
            Experience secure, transparent, and seamless ticketing powered by NFT smart contracts. No middleman, zero scalping, instant verification and true ownership.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                document.getElementById('events-marketplace')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-xl bg-white text-black hover:bg-transparent hover:text-white border border-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-white/5 active:scale-95"
            >
              Get Tickets
            </button>
            <Link
              href="/admin"
              className="px-6 py-3 rounded-xl border border-zinc-800 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
            >
              Organize Event
            </Link>
          </div>
        </div>

        {/* Hero Interactive Card Mockup */}
        <div className="hidden lg:flex flex-col gap-4 w-[320px] bg-zinc-950/40 border border-white/5 rounded-3xl p-5 relative overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-600/5 to-transparent pointer-events-none" />
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 relative">
            <img 
              src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=400" 
              alt="LailTix Event" 
              className="w-full h-full object-cover"
            />
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[8px] font-bold bg-black/60 backdrop-blur-sm text-violet-300 tracking-widest font-mono uppercase">
              Featured Pass
            </span>
          </div>
          <div className="flex flex-col gap-1 text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">EtherSummit 2026</h3>
            <span className="text-[9px] text-zinc-500 font-mono">Metropolis Center, Denver</span>
          </div>
          <div className="h-[1px] bg-zinc-900 w-full" />
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>Verified Smart Contract</span>
            <span className="text-violet-400">Active ✓</span>
          </div>
        </div>
      </section>

      {/* Control Panel */}
      <section id="events-marketplace" className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-zinc-900 pb-6 scroll-mt-20">
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

      {/* Events Grid */}
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

                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-bold text-white group-hover:text-zinc-300 transition-colors truncate">
                      {event.title}
                    </h3>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed line-clamp-2">
                      {event.description}
                    </p>
                  </div>

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
                        setSimulatedSuccess(false);
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

      {/* Ticket Purchase Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col gap-6 relative">
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

            {/* Config conflict warning */}
            {isConnected && activeContractAddress.toLowerCase() === userAddress?.toLowerCase() && (
              <div className="p-3 rounded-xl border border-amber-900/30 bg-amber-950/10 text-[11px] text-amber-500 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Configuration conflict</strong>: Your configured contract address matches your wallet! Set it correctly in the Admin Dashboard.
                </span>
              </div>
            )}

            {/* Expanded Payment Selector */}
            <div className="flex flex-col gap-3 text-left">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Select Payment Coin</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ETH */}
                <button
                  onClick={() => setPaymentMethod('ETH')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                    paymentMethod === 'ETH' ? 'border-white bg-white/5' : 'border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-zinc-900 shrink-0"><EthIcon /></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold text-zinc-400 block leading-tight">Ethereum (ETH)</span>
                    <span className="text-sm font-bold text-white font-mono leading-none">{getSelectedEventPrice('ETH')} ETH</span>
                    <span className="text-[9px] text-zinc-600 font-mono block mt-1">Bal: {getBalanceDisplay('ETH')}</span>
                  </div>
                </button>

                {/* LINK */}
                <button
                  onClick={() => setPaymentMethod('LINK')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                    paymentMethod === 'LINK' ? 'border-white bg-white/5' : 'border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-zinc-900 shrink-0"><LinkIcon /></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold text-zinc-400 block leading-tight">Chainlink (LINK)</span>
                    <span className="text-sm font-bold text-white font-mono leading-none">{getSelectedEventPrice('LINK')} LINK</span>
                    <span className="text-[9px] text-zinc-600 font-mono block mt-1">Bal: {getBalanceDisplay('LINK')}</span>
                  </div>
                </button>

                {/* USDC */}
                <button
                  onClick={() => setPaymentMethod('USDC')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                    paymentMethod === 'USDC' ? 'border-white bg-white/5' : 'border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-zinc-900 shrink-0"><UsdcIcon /></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold text-zinc-400 block leading-tight">USD Coin (USDC)</span>
                    <span className="text-sm font-bold text-white font-mono leading-none">{getSelectedEventPrice('USDC')} USDC</span>
                    <span className="text-[9px] text-zinc-600 font-mono block mt-1">Bal: {getBalanceDisplay('USDC')}</span>
                  </div>
                </button>

                {/* USDT */}
                <button
                  onClick={() => setPaymentMethod('USDT')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                    paymentMethod === 'USDT' ? 'border-white bg-white/5' : 'border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-zinc-900 shrink-0"><UsdtIcon /></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold text-zinc-400 block leading-tight">Tether (USDT)</span>
                    <span className="text-sm font-bold text-white font-mono leading-none">{getSelectedEventPrice('USDT')} USDT</span>
                    <span className="text-[9px] text-zinc-600 font-mono block mt-1">Bal: {getBalanceDisplay('USDT')}</span>
                  </div>
                </button>

                {/* WBTC */}
                <button
                  onClick={() => setPaymentMethod('WBTC')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer sm:col-span-2 ${
                    paymentMethod === 'WBTC' ? 'border-white bg-white/5' : 'border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-zinc-900 shrink-0"><WbtcIcon /></div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold text-zinc-400 block leading-tight">Wrapped Bitcoin (WBTC)</span>
                    <span className="text-sm font-bold text-white font-mono leading-none">{getSelectedEventPrice('WBTC')} WBTC</span>
                    <span className="text-[9px] text-zinc-600 font-mono block mt-1">Bal: {getBalanceDisplay('WBTC')}</span>
                  </div>
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
            {isSuccessState && (
              <div className="p-3 rounded-xl border border-emerald-900/30 bg-emerald-950/10 text-[11px] text-emerald-500 flex flex-col gap-1.5 items-center text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-bounce" />
                <span className="font-semibold text-white">Ticket Purchased!</span>
                {(txHash || simulatedTxHash) && (
                  <a
                    href={(txHash || simulatedTxHash)!.startsWith('local') || paymentMethod !== 'ETH' && paymentMethod !== 'LINK'
                      ? '#'
                      : `https://sepolia.etherscan.io/tx/${txHash || simulatedTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[10px] text-emerald-400 font-mono"
                  >
                    View Transaction
                  </a>
                )}
              </div>
            )}

            {/* Simulating checkout notice for USDC/USDT/WBTC */}
            {paymentMethod !== 'ETH' && paymentMethod !== 'LINK' && isConnected && !isSuccessState && (
              <p className="text-[10px] text-center text-zinc-600 italic">
                * USDC/USDT/WBTC checkout is simulated (actual contract accepts ETH/LINK).
              </p>
            )}

            {/* Checkout Action Button */}
            {!isConnected ? (
              <div className="p-3 border border-zinc-900 border-dashed rounded-xl text-center text-zinc-500 text-xs font-light">
                Connect wallet to unlock ticket checkout.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {isPendingState ? (
                  <div className="w-full py-2.5 rounded-xl border border-zinc-800 flex items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                    {isTxConfirming || simulatedConfirming ? 'Confirming...' : 'Wallet Action...'}
                  </div>
                ) : (
                  <button
                    onClick={handlePurchase}
                    disabled={isSuccessState || isConfigInvalid}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      isSuccessState
                        ? 'border border-zinc-900 text-zinc-600 bg-transparent'
                        : isConfigInvalid
                        ? 'border border-zinc-900 text-zinc-700 bg-transparent'
                        : 'border border-white bg-white text-black hover:bg-transparent hover:text-white'
                    }`}
                  >
                    {isSuccessState
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
