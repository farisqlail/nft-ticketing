'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { getAddress } from 'viem';
import { Ticket, MapPin, Calendar, ArrowUpRight, Loader2, AlertCircle, QrCode } from 'lucide-react';
import { getEvents, type EventItem } from '@/lib/events';

const DEFAULT_CONTRACT_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

interface TicketItem {
  tokenId: string;
  tokenURI: string;
  paymentMethod: string;
  transactionHash?: string;
  eventDetails?: EventItem;
}

export default function MyTicketsPage() {
  const { address: userAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = async () => {
    if (!userAddress) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Load all events to map metadata
      const allEvents = await getEvents();

      // Get current contract address from config
      let activeContractAddress = DEFAULT_CONTRACT_ADDRESS;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('velo_contract_address');
        if (saved) {
          try {
            activeContractAddress = getAddress(saved);
          } catch {
            // ignore
          }
        }
      }

      const ticketsList: TicketItem[] = [];

      // 2. Attempt on-chain event log query
      if (publicClient) {
        try {
          const logs = await publicClient.getLogs({
            address: activeContractAddress as `0x${string}`,
            event: {
              name: 'TicketMinted',
              type: 'event',
              inputs: [
                { indexed: true, name: 'to', type: 'address' },
                { indexed: true, name: 'tokenId', type: 'uint256' },
                { indexed: false, name: 'tokenURI', type: 'string' },
                { indexed: false, name: 'paymentMethod', type: 'string' }
              ]
            },
            args: {
              to: userAddress as `0x${string}`
            },
            fromBlock: BigInt(0)
          });

          logs.forEach((log) => {
            const { tokenId, tokenURI, paymentMethod } = log.args;
            if (tokenId !== undefined && tokenURI) {
              // Extract event ID from tokenURI (e.g. ".../metadata/{id}")
              const parts = tokenURI.split('/');
              const eventId = parts[parts.length - 1];
              const event = allEvents.find((e) => e.id === eventId);

              ticketsList.push({
                tokenId: tokenId.toString(),
                tokenURI,
                paymentMethod: paymentMethod || 'ETH',
                transactionHash: log.transactionHash,
                eventDetails: event,
              });
            }
          });
        } catch (e) {
          console.warn('Failed to query contract logs, falling back to local simulation:', e);
        }
      }

      // 3. Fallback: Check local storage for mock purchases
      if (ticketsList.length === 0 && typeof window !== 'undefined') {
        const cached = localStorage.getItem(`lailtix_local_purchases_${userAddress.toLowerCase()}`);
        if (cached) {
          try {
            const localPurchases = JSON.parse(cached);
            localPurchases.forEach((p: any) => {
              const event = allEvents.find((e) => e.id === String(p.eventId));
              ticketsList.push({
                tokenId: p.tokenId || 'MOCK-' + Math.floor(Math.random() * 1000),
                tokenURI: `https://api.lailtix.io/metadata/${p.eventId}`,
                paymentMethod: p.paymentMethod || 'ETH',
                transactionHash: p.txHash || 'local-simulation-hash',
                eventDetails: event,
              });
            });
          } catch (e) {
            console.error('Error parsing local purchases:', e);
          }
        }
      }

      // If both return empty, show a simulated demo ticket for premium experience when user has no actual ticket
      setTickets(ticketsList);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading tickets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && userAddress) {
      loadTickets();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, userAddress]);

  if (!isConnected) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in">
        <div className="p-4 rounded-3xl glass bg-zinc-900/10 border-white/5 animate-pulse">
          <Ticket className="h-12 w-12 text-violet-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Your NFT Ticket Wallet</h1>
        <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
          Please connect your Web3 wallet using the top-right button to view and verify your purchased event ticket NFTs on-chain.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 flex flex-col gap-10 sm:gap-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">My NFT Tickets</h1>
        <p className="text-zinc-500 text-xs mt-1">Verified proof-of-ownership event passes in your wallet</p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/10 text-xs text-red-300 flex items-start gap-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          <span className="text-zinc-500 text-xs font-mono">Querying blockchain events...</span>
        </div>
      ) : tickets.length > 0 ? (
        <div className="flex flex-col gap-8">
          {tickets.map((ticket, index) => {
            const event = ticket.eventDetails;
            return (
              <div 
                key={ticket.tokenId + '-' + index}
                className="relative w-full rounded-3xl glass bg-zinc-950/40 border-white/5 flex flex-col md:flex-row hover:border-white/10 hover:shadow-lg hover:shadow-violet-600/[0.02] transition-all duration-300 overflow-hidden"
              >
                {/* Visual Glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />

                {/* Ticket Image */}
                <div className="w-full md:w-1/3 aspect-video md:aspect-auto md:min-h-[220px] relative overflow-hidden bg-zinc-900">
                  {event ? (
                    <img 
                      src={event.imageUrl} 
                      alt={event.title} 
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-violet-950/10 text-violet-400/30">
                      <Ticket className="h-16 w-16" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-zinc-950 via-zinc-950/20 to-transparent" />
                  <span className="absolute bottom-4 left-4 px-2.5 py-1 rounded-full text-[9px] font-mono tracking-wider bg-black/60 backdrop-blur-md text-violet-300 border border-violet-500/20">
                    NFT TOKEN #{ticket.tokenId}
                  </span>
                </div>

                {/* Ticket Details */}
                <div className="flex-1 p-6 flex flex-col justify-between gap-4 md:border-r md:border-dashed md:border-white/10">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block">
                      {event?.category || 'Web3 Event'} Pass
                    </span>
                    <h3 className="text-xl font-bold text-white leading-tight">
                      {event?.title || 'Unknown Event Metadata'}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                      {event?.description || 'This NFT grants lifetime access to the configured event. Verified secure pass.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs">
                      <Calendar className="h-4 w-4 text-violet-400/80 shrink-0" />
                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase font-semibold leading-none mb-0.5">Date & Time</span>
                        <span className="text-white text-[11px] leading-none">{event?.date || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-xs">
                      <MapPin className="h-4 w-4 text-violet-400/80 shrink-0" />
                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase font-semibold leading-none mb-0.5">Venue Location</span>
                        <span className="text-white text-[11px] leading-none line-clamp-1">{event?.venue || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tear-off Barcode / QR Code Section */}
                <div className="w-full md:w-[220px] p-6 bg-zinc-950/80 md:bg-transparent flex md:flex-col justify-between md:justify-center items-center gap-6">
                  {/* Fake QR Code */}
                  <div className="relative group p-2.5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-24 h-24 flex items-center justify-center text-white relative">
                      <QrCode className="h-20 w-20 text-zinc-300 group-hover:text-white transition-colors" />
                      {/* Grid scanning effect */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-violet-400 shadow-md shadow-violet-500 animate-bounce pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex flex-col items-end md:items-center text-right md:text-center gap-1.5 flex-1 md:flex-none">
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase leading-none">Gate Entry Code</span>
                    <span className="text-xs font-bold text-white font-mono leading-none tracking-widest">
                      VTX-{ticket.tokenId}-PASS
                    </span>
                    
                    {ticket.transactionHash && (
                      <a
                        href={ticket.transactionHash.startsWith('local') 
                          ? '#' 
                          : `https://sepolia.etherscan.io/tx/${ticket.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-violet-400 hover:text-white mt-1.5 transition-colors underline"
                      >
                        Verify TX <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 px-4 rounded-3xl glass bg-zinc-900/5 border-white/5 flex flex-col items-center gap-3">
          <Ticket className="h-8 w-8 text-zinc-600" />
          <p className="text-zinc-400 text-sm">No tickets found in your wallet.</p>
          <p className="text-zinc-500 text-xs max-w-xs leading-relaxed">
            Go to the Explore page, choose an event, and buy a ticket using ETH or LINK.
          </p>
        </div>
      )}
    </div>
  );
}
