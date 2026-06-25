'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { getAddress, formatUnits } from 'viem';
import { User, Mail, Shield, Check, Copy, RefreshCw, Ticket, Calendar, Wallet } from 'lucide-react';
import { getEventsByOrganizer, getEvents } from '@/lib/events';
import { ERC20_ABI, TICKET_NFT_ABI } from '@/lib/abi';
import { loginWithPasscode, logoutAdmin, isAddressAdmin } from '@/lib/auth';

const DEFAULT_CONTRACT_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
const LINK_TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150', // Avatar 1
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150', // Avatar 2
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150', // Avatar 3
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150', // Avatar 4
];

export default function ProfilePage() {
  const { address: userAddress, isConnected, chain } = useAccount();
  const { data: ethBalance, refetch: refetchEth } = useBalance({ address: userAddress });

  // Custom contract and LINK address mapping
  const [activeLinkAddress, setActiveLinkAddress] = useState(LINK_TOKEN_ADDRESS);
  const [copied, setCopied] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Admin settings states
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS);

  // Fetch contract owner
  const { data: contractOwner } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: TICKET_NFT_ABI,
    functionName: 'owner',
  });

  const checkAdminAuthStatus = () => {
    const isOwner = isAddressAdmin(userAddress, contractOwner as string);
    setIsAdmin(isOwner);
  };

  useEffect(() => {
    checkAdminAuthStatus();
    const interval = setInterval(checkAdminAuthStatus, 1500);
    return () => clearInterval(interval);
  }, [userAddress, contractOwner]);

  // Profile Form State
  const [profile, setProfile] = useState({
    username: '',
    bio: '',
    email: '',
    avatarUrl: PRESET_AVATARS[0],
  });

  // Stat Counts
  const [organizedCount, setOrganizedCount] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);

  // Load custom LINK address from localStorage if configured
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('velo_contract_address');
      if (saved) {
        // Normally we'd read linkToken from contract, but we default to Sepolia LINK for profiles
        setActiveLinkAddress(LINK_TOKEN_ADDRESS);
      }
    }
  }, []);

  // Read LINK balance
  const { data: linkBalance, refetch: refetchLink } = useReadContract({
    address: activeLinkAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });

  // Load user profile and stats
  const loadProfileAndStats = async () => {
    if (!userAddress) return;

    // 1. Load Profile
    const localProfileKey = `lailtix_profile_${userAddress.toLowerCase()}`;
    const savedProfile = localStorage.getItem(localProfileKey);
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        // ignore
      }
    } else {
      // Default initial profile
      setProfile({
        username: `User-${userAddress.substring(2, 8)}`,
        bio: 'Web3 enthusiast and event attendee.',
        email: '',
        avatarUrl: PRESET_AVATARS[0],
      });
    }

    // 2. Load Stats
    try {
      const organized = await getEventsByOrganizer(userAddress);
      setOrganizedCount(organized.length);

      // Tickets purchased count (combining local storage count + chain log mock)
      let ticketsCountLocal = 0;
      const cachedPurchases = localStorage.getItem(`lailtix_local_purchases_${userAddress.toLowerCase()}`);
      if (cachedPurchases) {
        try {
          ticketsCountLocal = JSON.parse(cachedPurchases).length;
        } catch (e) {}
      }
      setTicketsCount(ticketsCountLocal);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isConnected && userAddress) {
      loadProfileAndStats();
    }
  }, [isConnected, userAddress]);

  const handleCopyAddress = () => {
    if (!userAddress) return;
    navigator.clipboard.writeText(userAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarSelect = (url: string) => {
    setProfile((prev) => ({
      ...prev,
      avatarUrl: url,
    }));
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) return;

    const localProfileKey = `lailtix_profile_${userAddress.toLowerCase()}`;
    localStorage.setItem(localProfileKey, JSON.stringify(profile));
    
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleRefreshBalances = () => {
    refetchEth();
    refetchLink();
  };

  if (!isConnected) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in">
        <div className="p-4 rounded-3xl glass bg-zinc-900/10 border-white/5 animate-pulse">
          <User className="h-12 w-12 text-violet-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Your Web3 Profile</h1>
        <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
          Please connect your Web3 wallet using the top-right button to configure your event organization credentials and check balances.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 flex flex-col gap-10 sm:gap-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">My Profile</h1>
        <p className="text-zinc-500 text-xs mt-1">Manage event identity details and token balances</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card & Edit Form */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          <div className="p-6 rounded-3xl glass bg-zinc-950/40 border-white/5 flex flex-col gap-6">
            
            {/* Live Card Preview */}
            <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-violet-500/20 shrink-0">
                <img 
                  src={profile.avatarUrl} 
                  alt="Avatar Preview" 
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-white text-lg truncate">
                  {profile.username || 'Anonymous User'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                  {profile.bio || 'No bio written yet.'}
                </p>
                {profile.email && (
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" /> {profile.email}
                  </span>
                )}
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              
              {/* Select Avatar */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Select Avatar Icon</label>
                <div className="flex gap-4 items-center">
                  <div className="flex gap-2">
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAvatarSelect(url)}
                        className={`h-11 w-11 rounded-full overflow-hidden border-2 transition-all relative shrink-0 ${
                          profile.avatarUrl === url
                            ? 'border-violet-500 scale-105 shadow-md shadow-violet-500/20'
                            : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        <img src={url} alt="preset avatar" className="object-cover w-full h-full" />
                        {profile.avatarUrl === url && (
                          <div className="absolute inset-0 bg-violet-600/40 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white font-bold" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <span className="text-zinc-600 text-xs px-2">or</span>
                  <input
                    type="url"
                    name="avatarUrl"
                    placeholder="Custom Image URL..."
                    value={profile.avatarUrl.startsWith('http') && !PRESET_AVATARS.includes(profile.avatarUrl) ? profile.avatarUrl : ''}
                    onChange={(e) => handleAvatarSelect(e.target.value)}
                    className="flex-1 min-w-0 px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="VeloDev"
                  value={profile.username}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all font-semibold"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="name@provider.com"
                  value={profile.email}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono"
                />
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Bio / Description</label>
                <textarea
                  name="bio"
                  rows={4}
                  placeholder="Tell us about yourself or your organization..."
                  value={profile.bio}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all resize-none"
                />
              </div>

              {/* Save Alert Status */}
              {profileSaved && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Profile updated successfully! Details persisted locally.</span>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-2 border-t border-white/5">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-lg shadow-violet-600/15 active:scale-95 transition-all cursor-pointer"
                >
                  Save Profile Settings
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right Column: Wallet Info & Balances */}
        <section className="flex flex-col gap-6">
          
          {/* Wallet Connection Status */}
          <div className="p-5 rounded-3xl glass bg-zinc-950/40 border-white/5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Wallet Status</span>
              <button 
                onClick={handleRefreshBalances}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                title="Refresh balances"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Connected Network</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-violet-400" /> {chain?.name || 'Localhost / Unknown'}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Wallet Address</span>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 font-mono text-[10px]">
                <span className="text-zinc-300 truncate flex-1">{userAddress}</span>
                <button 
                  onClick={handleCopyAddress}
                  className="text-zinc-500 hover:text-white shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Token Balances */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Available Balances</span>
              
              {/* ETH Balance */}
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-violet-600/10 border border-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-400">Ξ</div>
                  <span className="text-xs text-zinc-300">Ethereum</span>
                </div>
                <span className="text-xs font-bold text-white font-mono">
                  {ethBalance ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4) : '0.0000'} ETH
                </span>
              </div>

              {/* LINK Balance */}
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-indigo-600/10 border border-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400">L</div>
                  <span className="text-xs text-zinc-300">Chainlink</span>
                </div>
                <span className="text-xs font-bold text-white font-mono">
                  {linkBalance ? parseFloat(formatUnits(BigInt(linkBalance.toString()), 18)).toFixed(2) : '0.00'} LINK
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="p-5 rounded-3xl glass bg-zinc-950/40 border-white/5 flex flex-col gap-4">
            <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Activity Metrics</span>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
                <Ticket className="h-5 w-5 text-violet-400 mb-1" />
                <span className="text-[9px] text-zinc-500 font-bold uppercase block leading-none">Passes Bought</span>
                <span className="text-lg font-black text-white font-mono leading-none">{ticketsCount}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
                <Calendar className="h-5 w-5 text-indigo-400 mb-1" />
                <span className="text-[9px] text-zinc-500 font-bold uppercase block leading-none">Events Hosted</span>
                <span className="text-lg font-black text-white font-mono leading-none">{organizedCount}</span>
              </div>
            </div>
          </div>

          {/* Admin Authentication Hub Card */}
          <div className="p-5 rounded-3xl glass bg-zinc-950/40 border-white/5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Admin Hub</span>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                isAdmin 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                  : 'bg-zinc-900 text-zinc-500'
              }`}>
                {isAdmin ? 'Admin Granted' : 'Standard User'}
              </span>
            </div>

            {isAdmin ? (
              <div className="flex flex-col gap-3 text-left">
                <p className="text-xs text-zinc-400 font-light">
                  You are logged in as an administrator. You can configure contracts and add new listings in the Admin Panel.
                </p>
                <button
                  onClick={() => {
                    logoutAdmin();
                    setIsAdmin(false);
                  }}
                  className="w-full py-2 rounded-xl bg-red-950/30 border border-red-900/20 hover:bg-red-950/50 text-xs font-semibold text-red-400 transition-all cursor-pointer"
                >
                  Log Out Admin
                </button>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setAdminLoginError(null);
                  const success = loginWithPasscode(adminPasscode);
                  if (success) {
                    setIsAdmin(true);
                    setAdminPasscode('');
                  } else {
                    setAdminLoginError('Incorrect passcode.');
                  }
                }}
                className="flex flex-col gap-3 text-left"
              >
                <p className="text-[11px] text-zinc-500 font-light leading-snug">
                  Unlock the dashboard event list controls by entering LailTix admin passcode.
                </p>
                <div className="flex flex-col gap-1.5">
                  <input
                    type="password"
                    required
                    placeholder="Enter passcode"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/60 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500/30 transition-all"
                  />
                </div>
                {adminLoginError && (
                  <span className="text-[10px] text-red-500 font-mono">{adminLoginError}</span>
                )}
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl border border-white bg-white text-black hover:bg-transparent hover:text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Authorize Admin
                </button>
              </form>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
