'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Tag, Search, Flame, ArrowRight, ShieldCheck, Zap, X, Wallet, CheckCircle2, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { parseEther, formatUnits, parseUnits, getAddress } from 'viem';
import { TICKET_NFT_ABI, ERC20_ABI } from '@/lib/abi';

import { getEvents, recordTicketSale, type EventItem } from '@/lib/events';


// Sepolia contracts
const LINK_TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
const DEFAULT_CONTRACT_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'; // Checksummed default TicketNFT address

export default function Home() {
  const { address: userAddress, isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'ETH' | 'LINK'>('ETH');
  
  // Custom contract address configuration
  const [contractAddress, setContractAddress] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

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
    } else {
      setContractAddress(DEFAULT_CONTRACT_ADDRESS);
    }
    loadAllEvents();
  }, []);

  const [isContractAddressInvalid, setIsContractAddressInvalid] = useState(false);

  const getActiveAddress = (): `0x${string}` => {
    const raw = contractAddress || DEFAULT_CONTRACT_ADDRESS;
    try {
      return getAddress(raw);
    } catch {
      return getAddress(DEFAULT_CONTRACT_ADDRESS);
    }
  };

  const activeContractAddress = getActiveAddress();

  const handleSaveConfig = (addr: string) => {
    try {
      const formatted = getAddress(addr);
      setContractAddress(formatted);
      localStorage.setItem('velo_contract_address', formatted);
      setIsContractAddressInvalid(false);
      setShowConfig(false);
    } catch {
      setIsContractAddressInvalid(true);
    }
  };

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

  // Read LINK allowance for this contract
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

      const localKey = `velotix_local_purchases_${userAddress.toLowerCase()}`;
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
      const uri = `https://api.velotix.io/metadata/${selectedEvent.id}`;

      if (paymentMethod === 'ETH') {
        // Send ETH transaction
        const value = parseEther(selectedEvent.priceEth);
        await writeContractAsync({
          address: activeContractAddress,
          abi: TICKET_NFT_ABI,
          functionName: 'buyWithETH',
          args: [uri],
          value,
        });
      } else {
        // LINK transaction flow
        const linkRequired = parseUnits(selectedEvent.priceLink, 18);
        
        // 1. Check Allowance
        const currentAllowance = allowance ? BigInt(allowance.toString()) : BigInt(0);
        if (currentAllowance < linkRequired) {
          // Trigger approval first
          await writeContractAsync({
            address: activeLinkTokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [activeContractAddress, linkRequired],
          });
          // Refetch allowance after approval transaction finishes
          setTimeout(() => refetchAllowance(), 4000);
          return;
        }

        // 2. Buy with LINK
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
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 flex flex-col gap-12 sm:gap-16">
      
      {/* Top Banner Settings Override */}
      <div className="flex justify-end -mb-6">
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass hover:glass-hover text-zinc-400 hover:text-white text-xs transition-all cursor-pointer"
        >
          <Settings className="h-3.5 w-3.5" /> Configure Contract
        </button>
      </div>

      {/* Settings Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl glass bg-zinc-950/95 border-white/10 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-lg">Smart Contract Settings</h3>
              <button onClick={() => setShowConfig(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-semibold">TICKET NFT CONTRACT (SEPOLIA)</label>
              <input
                type="text"
                placeholder={DEFAULT_CONTRACT_ADDRESS}
                value={contractAddress}
                onChange={(e) => {
                  setContractAddress(e.target.value);
                  setIsContractAddressInvalid(false);
                }}
                className={`w-full px-3 py-2 bg-zinc-900 border rounded-xl text-sm text-white focus:outline-none font-mono ${
                  isContractAddressInvalid
                    ? 'border-red-500 focus:border-red-500/50'
                    : 'border-white/10 focus:border-violet-500/50'
                }`}
              />
              {isContractAddressInvalid && (
                <span className="text-[10px] text-red-400">Invalid Ethereum address format (must be 40 hex chars and match checksum).</span>
              )}
              <span className="text-[10px] text-zinc-500">
                Deploy `TicketNFT.sol` to Sepolia and paste address here to test transactions.
              </span>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setContractAddress(DEFAULT_CONTRACT_ADDRESS)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Reset Default
              </button>
              <button 
                onClick={() => handleSaveConfig(contractAddress)}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all"
              >
                Save Config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="text-center flex flex-col items-center gap-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold glass text-violet-400 border-violet-500/20 bg-violet-500/5">
          <Flame className="h-3.5 w-3.5" /> Next-Gen Ticketing Infrastructure
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-none">
          Decentralized Tickets,{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
            Real Experiences
          </span>
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl">
          Purchase tickets securely using native **ETH** or **LINK** tokens on Sepolia. Immutable proof of ownership, zero scalpers.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-4 max-w-xl">
          <div className="flex items-center gap-3 p-4 rounded-2xl glass bg-zinc-900/20 border-white/5">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-white">Multi-Token Payments</h3>
              <p className="text-xs text-zinc-500">Pay using ETH or LINK token directly</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl glass bg-zinc-900/20 border-white/5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-white">Sepolia Testing</h3>
              <p className="text-xs text-zinc-500">Optimized for public sandbox faucets</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar Section */}
      <section className="w-full flex flex-col gap-4 p-4 rounded-3xl glass bg-zinc-950/40 border-white/5">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search events, venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/40 rounded-xl border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
          </div>

          <div className="flex w-full md:w-auto items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar justify-start md:justify-end">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'glass text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Events Grid Section */}
      <section className="flex flex-col gap-6 w-full">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Upcoming Events ({filteredEvents.length})
        </h2>

        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredEvents.map((event) => {
              const progress = (event.soldTickets / event.totalTickets) * 100;
              return (
                <div
                  key={event.id}
                  className="group flex flex-col rounded-3xl glass bg-zinc-900/10 border-white/5 hover:glass-hover transition-all duration-300 overflow-hidden"
                >
                  <div className="relative aspect-video w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/60 backdrop-blur-md text-violet-300 border border-violet-500/20">
                      {event.category}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors line-clamp-1">
                        {event.title}
                      </h3>
                      <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">
                        {event.description}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs">
                        <Calendar className="h-4 w-4 text-violet-400/80" />
                        <span>{event.date} • {event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400 text-xs">
                        <MapPin className="h-4 w-4 text-violet-400/80" />
                        <span className="line-clamp-1">{event.venue}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[10px] font-semibold text-zinc-500">
                        <span>{event.soldTickets} / {event.totalTickets} Sold</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-zinc-500">STARTING FROM</span>
                        <span className="text-sm font-bold text-violet-300">{event.priceEth} ETH / {event.priceLink} LINK</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          resetTx();
                          setLocalError(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-lg shadow-violet-600/20 active:scale-95 transition-all cursor-pointer animate-pulse hover:animate-none"
                      >
                        Get Ticket <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 px-4 rounded-3xl glass bg-zinc-900/5 border-white/5">
            <Tag className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No events found matching your filter criteria.</p>
          </div>
        )}
      </section>

      {/* Ticket Purchase Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-6 rounded-3xl glass bg-zinc-950/95 border-white/10 flex flex-col gap-6 relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">GET TICKET</span>
              <h3 className="text-xl font-bold text-white leading-tight">{selectedEvent.title}</h3>
              <p className="text-xs text-zinc-400 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-zinc-500" /> {selectedEvent.venue}
              </p>
            </div>

            {/* Config warning */}
            <div className="px-3 py-2 rounded-xl bg-violet-950/20 border border-violet-500/10 text-[10px] text-violet-300 font-mono flex items-center justify-between">
              <span>Contract: {activeContractAddress.substring(0, 8)}...{activeContractAddress.substring(38)}</span>
              <button onClick={() => setShowConfig(true)} className="underline hover:text-white">Change</button>
            </div>

            {/* Warning if contract address equals wallet address */}
            {isConnected && activeContractAddress.toLowerCase() === userAddress?.toLowerCase() && (
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Warning</strong>: Your active contract address is set to your <strong>own wallet address</strong>! You cannot approve yourself to spend tokens. Please configure it to the deployed TicketNFT address.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setContractAddress(DEFAULT_CONTRACT_ADDRESS);
                    localStorage.removeItem('velo_contract_address');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[10px] font-bold text-amber-200 self-end transition-all cursor-pointer"
                >
                  Reset to Default Contract Address
                </button>
              </div>
            )}

            {/* Warning if contract address equals LINK address */}
            {activeContractAddress.toLowerCase() === activeLinkTokenAddress.toLowerCase() && (
              <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Warning</strong>: Your active contract address is set to the <strong>LINK token address</strong>! You cannot approve the token contract to spend its own tokens. Please change it to the TicketNFT contract address.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setContractAddress(DEFAULT_CONTRACT_ADDRESS);
                    localStorage.removeItem('velo_contract_address');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[10px] font-bold text-amber-200 self-end transition-all cursor-pointer"
                >
                  Reset to Default Contract Address
                </button>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-zinc-400 tracking-wide">SELECT PAYMENT METHOD</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* ETH Option */}
                <button
                  onClick={() => setPaymentMethod('ETH')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'ETH'
                      ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/10'
                      : 'border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Ethereum (ETH)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">Native</span>
                  </div>
                  <div>
                    <span className="text-lg font-black text-white">{selectedEvent.priceEth}</span>
                    <span className="text-xs font-semibold text-zinc-400"> ETH</span>
                  </div>
                  {isConnected && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Bal: {ethBalance ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4) : '0.00'} ETH
                    </span>
                  )}
                </button>

                {/* LINK Option */}
                <button
                  onClick={() => setPaymentMethod('LINK')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'LINK'
                      ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/10'
                      : 'border-white/5 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Chainlink (LINK)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">ERC-20</span>
                  </div>
                  <div>
                    <span className="text-lg font-black text-white">{selectedEvent.priceLink}</span>
                    <span className="text-xs font-semibold text-zinc-400"> LINK</span>
                  </div>
                  {isConnected && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Bal: {linkBalance ? parseFloat(formatUnits(BigInt(linkBalance.toString()), 18)).toFixed(2) : '0.00'} LINK
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {(localError || txError) && (
              <div className="p-3 rounded-2xl bg-red-950/20 border border-red-500/10 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <div className="flex-1 break-all">
                  {localError || txError?.message || 'Transaction failed.'}
                </div>
              </div>
            )}

            {/* Success State */}
            {isTxConfirmed && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/10 text-xs text-emerald-300 flex flex-col gap-2 items-center text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-bounce" />
                <div>
                  <h5 className="font-bold text-sm text-white">Ticket Purchased Successfully!</h5>
                  <p className="text-[10px] text-zinc-400 mt-1">Your NFT ticket has been successfully minted on Sepolia.</p>
                </div>
                {txHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[10px] text-emerald-400 font-mono mt-1 hover:text-white"
                  >
                    View Tx on Etherscan
                  </a>
                )}
              </div>
            )}

            {/* Wallet Action Button */}
            {!isConnected ? (
              <div className="p-4 rounded-2xl border border-dashed border-white/10 text-center flex flex-col items-center gap-2">
                <Wallet className="h-6 w-6 text-zinc-500" />
                <span className="text-xs text-zinc-400">Please connect your Web3 wallet using the top-right button.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {isTxPending || isTxConfirming ? (
                  <div className="w-full py-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-center gap-2 text-zinc-300 text-xs font-bold font-mono">
                    <RefreshCw className="h-4 w-4 animate-spin text-violet-400" />
                    {isTxConfirming ? 'Confirming On-Chain...' : 'Confirm in Wallet...'}
                  </div>
                ) : (
                  <button
                    onClick={handlePurchase}
                    disabled={isTxConfirmed || isConfigInvalid}
                    className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-wide text-white uppercase shadow-lg transition-all active:scale-95 ${
                      isTxConfirmed
                        ? 'bg-emerald-600/50 cursor-not-allowed shadow-none'
                        : isConfigInvalid
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5 shadow-none'
                        : paymentMethod === 'LINK' && !isApproved()
                        ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 cursor-pointer'
                        : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/20 cursor-pointer'
                    }`}
                  >
                    {isTxConfirmed
                      ? 'Bought ✓'
                      : isConfigInvalid
                      ? 'Invalid Contract Address'
                      : paymentMethod === 'LINK' && !isApproved()
                      ? 'Step 1: Approve LINK Spender'
                      : `Buy Ticket with ${paymentMethod}`}
                  </button>
                )}
                {paymentMethod === 'LINK' && isConnected && (
                  <p className="text-[10px] text-center text-zinc-500">
                    {!isApproved()
                      ? 'Approval transaction required to let the contract spend LINK.'
                      : 'LINK approved. You are ready to purchase.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
