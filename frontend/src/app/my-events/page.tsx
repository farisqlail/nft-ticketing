'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Plus, X, Award, Users, DollarSign, Loader2, Compass, AlertCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { getEventsByOrganizer, createEvent, type EventItem } from '@/lib/events';

export default function MyEventsPage() {
  const { address: userAddress, isConnected } = useAccount();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
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

  const loadEvents = async () => {
    if (!userAddress) return;
    setIsLoading(true);
    try {
      const orgEvents = await getEventsByOrganizer(userAddress);
      setEvents(orgEvents);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && userAddress) {
      loadEvents();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, userAddress]);

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
      // Basic fallback image if none provided
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

      // Reset Form & Close Modal
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

  if (!isConnected) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center gap-6">
        <div className="p-4 rounded-3xl glass bg-zinc-900/10 border-white/5 animate-pulse">
          <Calendar className="h-12 w-12 text-violet-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Create & Manage Your Events</h1>
        <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
          Please connect your Web3 wallet using the top-right button to create tickets, customize events, and track sales revenue on-chain.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 flex flex-col gap-10 sm:gap-12 animate-in fade-in duration-300">
      
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">My Organized Events</h1>
          <p className="text-zinc-500 text-xs mt-1">Manage ticket availability and track live purchases</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold text-white shadow-lg shadow-violet-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Create New Event
        </button>
      </div>

      {/* Stats Panel */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl glass bg-zinc-900/10 border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/10">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 block uppercase tracking-wider">Events Created</span>
            <span className="text-2xl font-extrabold text-white font-mono">{totalCreated}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl glass bg-zinc-900/10 border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 block uppercase tracking-wider">Total Tickets Sold</span>
            <span className="text-2xl font-extrabold text-white font-mono">{totalSold}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl glass bg-zinc-900/10 border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/10">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 block uppercase tracking-wider">Total Est. Revenue</span>
            <span className="text-base font-bold text-white font-mono block leading-tight">
              {revenueEth.toFixed(4)} ETH
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              {revenueLink.toFixed(2)} LINK
            </span>
          </div>
        </div>
      </section>

      {/* Events List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          <span className="text-zinc-500 text-xs font-mono">Loading events list...</span>
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const progress = event.totalTickets > 0 ? (event.soldTickets / event.totalTickets) * 100 : 0;
            return (
              <div 
                key={event.id}
                className="group flex flex-col rounded-3xl glass bg-zinc-900/10 border-white/5 hover:glass-hover transition-all duration-300 overflow-hidden"
              >
                <div className="relative aspect-video w-full overflow-hidden">
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
                      <span className="text-[10px] font-medium text-zinc-500">PRICE TIERS</span>
                      <span className="text-xs font-bold text-violet-300 font-mono">
                        {event.priceEth} ETH / {event.priceLink} LINK
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/10">
                      Live
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-3xl glass bg-zinc-900/5 border-white/5 flex flex-col items-center gap-3">
          <Calendar className="h-8 w-8 text-zinc-600" />
          <p className="text-zinc-400 text-sm">You haven't created any events yet.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass hover:glass-hover text-xs font-bold text-violet-400 hover:text-white transition-all cursor-pointer"
          >
            Create Event Now <Compass className="h-3.5 w-3.5 animate-spin" />
          </button>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl p-6 rounded-3xl glass bg-zinc-950/95 border-white/10 flex flex-col gap-6 relative my-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div>
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block">ORGANIZER HUB</span>
              <h3 className="text-xl font-bold text-white leading-tight">Create Tickets & Event</h3>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Title */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Event Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="EtherSummit 2026"
                    className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Description</label>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide description of event, speakers, schedule..."
                    className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all resize-none"
                  />
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Date</label>
                  <input
                    type="text"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    placeholder="Oct 12, 2026"
                    className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>

                {/* Time */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Time</label>
                  <input
                    type="text"
                    name="time"
                    required
                    value={formData.time}
                    onChange={handleInputChange}
                    placeholder="09:00 AM UTC"
                    className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>

                {/* Venue */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Venue</label>
                  <input
                    type="text"
                    name="venue"
                    required
                    value={formData.venue}
                    onChange={handleInputChange}
                    placeholder="Metropolis Center, Denver & On-Chain"
                    className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-zinc-950">{c}</option>
                    ))}
                  </select>
                </div>

                {/* Total Tickets (Supply) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Ticket Supply</label>
                  <input
                    type="number"
                    name="totalTickets"
                    required
                    min={1}
                    value={formData.totalTickets}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>

                {/* Price ETH */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Price (ETH)</label>
                  <input
                    type="text"
                    name="priceEth"
                    required
                    value={formData.priceEth}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono"
                  />
                </div>

                {/* Price LINK */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Price (LINK)</label>
                  <input
                    type="text"
                    name="priceLink"
                    required
                    value={formData.priceLink}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono"
                  />
                </div>

                {/* Image URL */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs text-zinc-400 font-semibold uppercase">Image URL (Optional)</label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Submit Section */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:text-zinc-400 text-xs font-bold text-white shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    'Publish Event'
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
