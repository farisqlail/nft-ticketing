'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { getAddress } from 'viem';
import { ShieldCheck, Key, Settings, AlertCircle, ArrowRight } from 'lucide-react';
import { TICKET_NFT_ABI } from '@/lib/abi';
import { loginWithPasscode, logoutAdmin, isAddressAdmin } from '@/lib/auth';

const DEFAULT_CONTRACT_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

export default function AdminLoginPage() {
  const router = useRouter();
  const { address: userAddress, isConnected } = useAccount();

  const [isAdmin, setIsAdmin] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS);
  const [showConfig, setShowConfig] = useState(false);
  const [isContractAddressInvalid, setIsContractAddressInvalid] = useState(false);

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
    const interval = setInterval(checkAdminAuth, 1000);
    return () => clearInterval(interval);
  }, [userAddress, contractOwner]);

  // Redirect to my-events when admin is authorized
  useEffect(() => {
    if (isAdmin) {
      router.push('/my-events');
    }
  }, [isAdmin, router]);

  // Login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    const success = loginWithPasscode(passcode);
    if (success) {
      setIsAdmin(true);
      setPasscode('');
    } else {
      setLoginError('Invalid passcode. Access denied.');
    }
  };

  const handleAutoWalletLogin = () => {
    if (isConnected && userAddress && contractOwner && userAddress.toLowerCase() === (contractOwner as string).toLowerCase()) {
      setIsAdmin(true);
    }
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

  const isOwnerWalletConnected = 
    isConnected && 
    userAddress && 
    contractOwner && 
    userAddress.toLowerCase() === (contractOwner as string).toLowerCase();

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-6 py-24 flex flex-col justify-center gap-8 animate-in fade-in">
      <div className="flex flex-col gap-2 text-left">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">LailTix. Administration</span>
        <h1 className="text-3xl font-black tracking-tight text-white">Admin Login</h1>
        <p className="text-zinc-500 text-xs font-light">Enter passcode or connect the smart contract owner wallet to verify privileges.</p>
      </div>

      {isOwnerWalletConnected && (
        <div className="p-4 rounded-xl border border-emerald-900/30 bg-emerald-950/10 flex flex-col gap-2">
          <div className="flex items-start gap-2.5 text-xs text-emerald-500 font-light">
            <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-emerald-500 mt-0.5" />
            <span>
              <strong>Owner Wallet Detected</strong>: Your connected wallet is the smart contract deployer. You can bypass passcode login.
            </span>
          </div>
          <button
            onClick={handleAutoWalletLogin}
            className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            Enter Admin Panel <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Passcode</label>
          <div className="relative">
            <input
              type="password"
              required
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 bg-zinc-900/60 border border-white/5 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/30 transition-all font-mono"
            />
            <div className="absolute right-3.5 top-3 text-zinc-600">
              <Key className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>

        {loginError && (
          <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/10 text-red-300 text-[11px] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-violet-600/15 active:scale-95 transition-all cursor-pointer"
        >
          Verify Passcode
        </button>
      </form>

      <div className="border-t border-white/5 pt-4">
        {showConfig ? (
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col gap-3 animate-in fade-in duration-200">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Contract Config</span>
            <input
              type="text"
              defaultValue={contractAddress}
              placeholder="0x..."
              onBlur={(e) => handleSaveConfig(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-white/5 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500/30"
            />
            {isContractAddressInvalid && (
              <span className="text-[10px] text-red-500">Invalid Ethereum address format</span>
            )}
            <button
              onClick={() => setShowConfig(false)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 text-left underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            <Settings className="h-3.5 w-3.5" /> Configure deployment address
          </button>
        )}
      </div>
    </div>
  );
}
