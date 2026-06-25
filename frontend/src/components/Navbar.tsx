'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X, Ticket, Calendar, User, Compass } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Explore', icon: Compass },
    { href: '/my-events', label: 'My Events', icon: Calendar },
    { href: '/my-tickets', label: 'My Tickets', icon: Ticket },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass bg-black/40 backdrop-blur-xl border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-violet-400 animate-pulse" />
            <span className="font-bold text-white text-lg tracking-wider bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              LailTix
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors duration-200"
                >
                  <Icon className="h-4 w-4 text-violet-400/80" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Connect Button & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* RainbowKit Connect Button with customized styling wrapper */}
            <div className="scale-90 sm:scale-100 origin-right">
              <ConnectButton showBalance={false} />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 md:hidden transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden glass bg-zinc-950/95 backdrop-blur-2xl border-b border-white/10 animate-in slide-in-from-top duration-200">
          <div className="space-y-1 px-4 py-4 sm:px-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  <Icon className="h-5 w-5 text-violet-400" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
