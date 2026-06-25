'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Plus, X, Award, Users, DollarSign, Loader2, Compass, AlertCircle, ShieldAlert, ArrowRight, ShieldCheck, Settings, RefreshCw } from 'lucide-react';
import { useAccount, useReadContract } from 'wagmi';
import { getAddress } from 'viem';
import { TICKET_NFT_ABI } from '@/lib/abi';
import { getEventsByOrganizer, getEvents, createEvent, type EventItem } from '@/lib/events';
import { logoutAdmin, isAddressAdmin } from '@/lib/auth';

const DEFAULT_CONTRACT_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { address: userAddress, isConnected } = useAccount();
  
  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Contract configuration state
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS);
  const [showConfig, setShowConfig] = useState(false);
  const [isContractAddressInvalid, setIsContractAddressInvalid] = useState(false);

  // Events/Form State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    category: 'Conference',
    totalTickets: 100,
    priceEth: '0.001',
    priceLink: '5',
    imageUrl: '',
  });

  const categories = ['Conference', 'Music', 'Art', 'Hackathon', 'Other'];

  // Load configured contract address
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('velo_contract_address');
      if (saved) setContractAddress(saved);
    }
  }, []);

  // Fetch contract owner
  const { data: contractOwner } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: TICKET_NFT_ABI,
    functionName: 'owner',
  });

  // Verify and update Admin state
  const checkAdminAuth = () => {
    const isOwner = isAddressAdmin(userAddress, contractOwner as string);
    setIsAdmin(isOwner);
  };

  useEffect(() => {
    checkAdminAuth();
    // Poll to keep in sync in case session key is cleared/added
    const interval = setInterval(checkAdminAuth, 1000);
    return () => clearInterval(interval);
  }, [userAddress, contractOwner]);

  const loadEvents = async () => {
    if (!userAddress) return;
    setIsLoading(true);
    try {
      const orgEvents = await getEventsByOrganizer(userAddress);
      
      // Also fetch default static mock events which don't have an organizer
      const allEvents = await getEvents();
      const mockEvents = allEvents.filter((e) => !e.organizer);
      
      const combined = [...orgEvents];
      mockEvents.forEach((me) => {
        if (!combined.some((e) => e.id === me.id)) {
          combined.push(me);
        }
      });
      
      setEvents(combined);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && userAddress) {
      loadEvents();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, userAddress]);



  const handleLogout = () => {
    logoutAdmin();
    setIsAdmin(false);
    setEvents([]);
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'totalTickets' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) return;
    setIsSubmitting(true);

    try {
      const finalImageUrl = formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600';
      
      const newEvent = {
        id: String(Date.now()),
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        category: formData.category,
        totalTickets: formData.totalTickets,
        priceEth: formData.priceEth,
        priceLink: formData.priceLink,
        imageUrl: finalImageUrl,
        organizer: userAddress,
      };

      await createEvent(newEvent);
      await loadEvents();

      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        venue: '',
        category: 'Conference',
        totalTickets: 100,
        priceEth: '0.001',
        priceLink: '5',
        imageUrl: '',
      });
      setShowCreateModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats Calculations
  const totalCreated = events.length;
  const totalSold = events.reduce((sum, e) => sum + e.soldTickets, 0);
  const revenueEth = events.reduce((sum, e) => sum + (e.soldTickets * parseFloat(e.priceEth)), 0);
  const revenueLink = events.reduce((sum, e) => sum + (e.soldTickets * parseFloat(e.priceLink)), 0);

  // Render Access Denied for non-admins
  if (!isAdmin) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto px-6 py-24 flex flex-col justify-center items-center text-center gap-6 animate-in fade-in">
        <div className="p-4 rounded-3xl glass bg-red-950/10 border-red-500/10 animate-pulse text-red-400">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Access Denied</h1>
        <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">
          Admin privileges required. Please navigate to the dedicated login page to authorize.
        </p>
        <button
          onClick={() => router.push('/admin')}
          className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-lg shadow-violet-600/15 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
        >
          Go to Admin Login <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Render Admin Dashboard for authenticated admin
  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-24 flex flex-col gap-12 animate-in fade-in duration-300">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block">PORTAL GRANTED</span>
          <h1 className="text-3xl font-black tracking-tight text-white">Admin Panel</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Configure address settings, create new ticket events, and view logs.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Settings Override Trigger */}
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-900 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs transition-all cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" /> Contract Settings
          </button>
          
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg border border-red-900/30 bg-red-950/10 hover:bg-red-950/20 text-red-400 hover:text-red-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Log Out Portal
          </button>
        </div>
      </div>

      {/* Settings Panel Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">TicketNFT Configuration</h3>
              <button onClick={() => setShowConfig(false)} className="text-zinc-500 hover:text-white">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-zinc-500 font-semibold uppercase">Active NFT Contract Address (Sepolia)</label>
              <input
                type="text"
                placeholder={DEFAULT_CONTRACT_ADDRESS}
                value={contractAddress}
                onChange={(e) => {
                  setContractAddress(e.target.value);
                  setIsContractAddressInvalid(false);
                }}
                className={`w-full px-3 py-2 bg-transparent border rounded-lg text-xs text-white focus:outline-none font-mono ${
                  isContractAddressInvalid
                    ? 'border-red-900'
                    : 'border-zinc-900 focus:border-zinc-700'
                }`}
              />
              {isContractAddressInvalid && (
                <span className="text-[9px] text-red-500 font-mono">Invalid hex address. Must match checksum format.</span>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setContractAddress(DEFAULT_CONTRACT_ADDRESS)}
                className="px-3 py-1.5 rounded-md text-[10px] font-semibold text-zinc-500 hover:text-white transition-colors"
              >
                Reset Default
              </button>
              <button 
                onClick={() => handleSaveConfig(contractAddress)}
                className="px-3 py-1.5 rounded-md bg-white hover:bg-zinc-200 text-black text-[10px] font-bold transition-all cursor-pointer"
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary Dashboard */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl border border-zinc-900 flex items-center gap-4">
          <div className="p-3 rounded-lg border border-zinc-900 text-zinc-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Events Hosted</span>
            <span className="text-xl font-extrabold text-white font-mono">{totalCreated}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-900 flex items-center gap-4">
          <div className="p-3 rounded-lg border border-zinc-900 text-zinc-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Total Passes Sold</span>
            <span className="text-xl font-extrabold text-white font-mono">{totalSold}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-900 flex items-center gap-4">
          <div className="p-3 rounded-lg border border-zinc-900 text-zinc-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Total Sales (ETH)</span>
            <span className="text-xl font-extrabold text-white font-mono leading-none block">{revenueEth.toFixed(3)} ETH</span>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">{revenueLink.toFixed(1)} LINK</span>
          </div>
        </div>
      </section>

      {/* Active Listing Section */}
      <section className="flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
          <h2 className="text-lg font-bold text-white">Active Event Listings</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white hover:bg-white hover:text-black text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> List New Event
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="h-5 w-5 text-zinc-600 animate-spin" />
            <span className="text-zinc-500 text-[10px] font-mono">Syncing listings...</span>
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const progress = event.totalTickets > 0 ? (event.soldTickets / event.totalTickets) * 100 : 0;
              return (
                <div 
                  key={event.id}
                  className="group flex flex-col gap-4 border border-zinc-900 rounded-2xl p-4"
                >
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-zinc-900 relative">
                    <img src={event.imageUrl} alt={event.title} className="object-cover w-full h-full grayscale" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider bg-black/80 text-zinc-400">
                      {event.category}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-white truncate">{event.title}</h3>
                    <p className="text-zinc-500 text-[11px] font-light truncate">{event.description}</p>
                  </div>

                  <div className="flex flex-col gap-1 text-[10px] text-zinc-500 font-mono">
                    <span>Date: {event.date}</span>
                    <span>Venue: {event.venue}</span>
                  </div>

                  <div className="w-full h-[2px] bg-zinc-900 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-white" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                    <span>{event.soldTickets} / {event.totalTickets} Sold</span>
                    <span>{Math.round(progress)}%</span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-zinc-900 mt-2 text-[11px]">
                    <span className="font-mono text-zinc-400">{event.priceEth} ETH / {event.priceLink} LINK</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 text-[9px] font-bold uppercase tracking-wider">Active</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-zinc-900 rounded-2xl flex flex-col items-center gap-3">
            <p className="text-zinc-600 text-xs font-light">No hosted listings found.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[10px] font-bold text-zinc-400 hover:text-white underline cursor-pointer"
            >
              List your first event pass
            </button>
          </div>
        )}
      </section>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col gap-6 relative my-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div>
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest block">ADMIN CONTRACT MINT</span>
              <h3 className="text-lg font-bold text-white">Create New Event Ticket</h3>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Event Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="EtherSummit 2026"
                    className="w-full px-3 py-2 bg-transparent border border-zinc-900 rounded-lg text-xs text-white focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Description</label>
                  <textarea
                    name="description"
                    required
                    rows={2}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide overview of event..."
                    className="w-full px-3 py-2 bg-transparent border border-zinc-900 rounded-lg text-xs text-white focus:outline-none focus:border-zinc-700 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Date</label>
                  <input
                    type="text"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    placeholder="Oct 12, 2026"
                    className="w-full px-3.5 py-2 bg-transparent border border-zinc-900 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Time</label>
                  <input
                    type="text"
                    name="time"
                    required
                    value={formData.time}
                    onChange={handleInputChange}
                    placeholder="09:00 AM UTC"
                    className="w-full px-3.5 py-2 bg-transparent border border-zinc-900 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Venue</label>
                  <input
                    type="text"
                    name="venue"
                    required
                    value={formData.venue}
                    onChange={handleInputChange}
                    placeholder="Denver Convention Center"
                    className="w-full px-3.5 py-2 bg-transparent border border-zinc-900 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-lg text-xs text-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Total Passes Supply</label>
                  <input
                    type="number"
                    name="totalTickets"
                    required
                    min={1}
                    value={formData.totalTickets}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-transparent border border-zinc-900 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Price (ETH)</label>
                  <input
                    type="text"
                    name="priceEth"
                    required
                    value={formData.priceEth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-transparent border border-zinc-900 rounded-lg text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Price (LINK)</label>
                  <input
                    type="text"
                    name="priceLink"
                    required
                    value={formData.priceLink}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-transparent border border-zinc-900 rounded-lg text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase">Image URL (Optional)</label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3.5 py-2 bg-transparent border border-zinc-900 rounded-lg text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-xs font-bold text-black transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Publishing...
                    </>
                  ) : (
                    'Publish Event Pass'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
