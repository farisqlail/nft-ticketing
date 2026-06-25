import { supabase } from './supabase';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  priceEth: string;
  priceLink: string;
  imageUrl: string;
  category: string;
  totalTickets: number;
  soldTickets: number;
  organizer?: string; // Address of the creator (if any)
}

export const MOCK_EVENTS: EventItem[] = [
  {
    id: '1',
    title: 'EtherSummit 2026',
    description: 'The premier global conference for Ethereum core developers, scaling researchers, and Web3 builders.',
    date: 'Oct 12, 2026',
    time: '09:00 AM UTC',
    venue: 'Metropolis Center, Denver & On-Chain',
    priceEth: '0.001',
    priceLink: '5',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600',
    category: 'Conference',
    totalTickets: 1000,
    soldTickets: 0,
  },
  {
    id: '2',
    title: 'CyberPunks On-Chain Rave',
    description: 'An immersive cyberpunk rave experience with generative visuals synchronized with smart contract events.',
    date: 'Nov 07, 2026',
    time: '10:00 PM UTC',
    venue: 'NeoTokyo Arena & Cryptovoxels Virtual Space',
    priceEth: '0.001',
    priceLink: '5',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=600',
    category: 'Music',
    totalTickets: 500,
    soldTickets: 0,
  },
  {
    id: '3',
    title: 'NFT Art Basel Gala',
    description: 'Private exhibition featuring top digital artists, physical-backed tokenized assets, and VIP collector auctions.',
    date: 'Dec 15, 2026',
    time: '07:00 PM UTC',
    venue: 'Skyline Mansion, Miami Beach',
    priceEth: '0.001',
    priceLink: '5',
    imageUrl: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&q=80&w=600',
    category: 'Art',
    totalTickets: 150,
    soldTickets: 0,
  },
  {
    id: '4',
    title: 'DeFi Summer Hackathon',
    description: 'Build the next generation of decentralized finance applications. $100k in developer bounties.',
    date: 'Sep 18, 2026',
    time: '12:00 PM UTC',
    venue: 'Hacker House, Berlin & Discord',
    priceEth: '0.001',
    priceLink: '5',
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=600',
    category: 'Hackathon',
    totalTickets: 300,
    soldTickets: 0,
  },
  {
    id: '5',
    title: 'Zero-Knowledge Cryptography Class',
    description: 'Master the mathematical foundations of ZK-snarks, rollups, and privacy-preserving smart contract structures.',
    date: 'Oct 28, 2026',
    time: '02:00 PM UTC',
    venue: 'Stanford Science Center & Zoom',
    priceEth: '0.002',
    priceLink: '8',
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=600',
    category: 'Conference',
    totalTickets: 250,
    soldTickets: 0,
  },
  {
    id: '6',
    title: 'Solidity Security Hackathon',
    description: 'Find vulnerabilities, audit smart contracts, and compete for $50,000 in bug bounties.',
    date: 'Nov 14, 2026',
    time: '09:00 AM UTC',
    venue: 'Crypto Oasis Hub, Dubai & Online',
    priceEth: '0.0015',
    priceLink: '6',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600',
    category: 'Hackathon',
    totalTickets: 400,
    soldTickets: 0,
  },
  {
    id: '7',
    title: 'Metaspace Digital Gallery Open',
    description: 'Step into virtual reality and explore high-definition 3D digital sculptures and virtual estate auctions.',
    date: 'Dec 05, 2026',
    time: '04:00 PM UTC',
    venue: 'Decentraland District 9',
    priceEth: '0.001',
    priceLink: '4',
    imageUrl: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&q=80&w=600',
    category: 'Art',
    totalTickets: 200,
    soldTickets: 0,
  },
  {
    id: '8',
    title: 'Decentralized Beats Festival',
    description: 'Electronic music festival utilizing token-gated backstage areas, live on-chain voting, and interactive NFTs.',
    date: 'Sep 30, 2026',
    time: '06:00 PM UTC',
    venue: 'Red Rocks Amphitheatre, Colorado',
    priceEth: '0.003',
    priceLink: '12',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=600',
    category: 'Music',
    totalTickets: 800,
    soldTickets: 0,
  },
  {
    id: '9',
    title: 'Global Web3 Sports Summit',
    description: 'Explore the convergence of professional sports leagues, fan tokens, digital collectibles, and virtual stadium environments.',
    date: 'Jan 22, 2027',
    time: '11:00 AM UTC',
    venue: 'Allianz Arena, Munich & Metaverse',
    priceEth: '0.0025',
    priceLink: '10',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600',
    category: 'Other',
    totalTickets: 600,
    soldTickets: 0,
  }
];

const LOCAL_STORAGE_KEY = 'lailtix_custom_events';

// Check if Supabase is properly configured with real credentials
const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(
    url && 
    !url.includes('placeholder-url') && 
    key && 
    !key.includes('placeholder-anon-key')
  );
};

// Get all events (Mock + Custom)
export const getEvents = async (): Promise<EventItem[]> => {
  let customEvents: EventItem[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*');
      
      if (!error && data) {
        customEvents = data.map((item: any) => ({
          id: String(item.id),
          title: item.title,
          description: item.description,
          date: item.date,
          time: item.time,
          venue: item.venue,
          priceEth: item.price_eth || item.priceEth,
          priceLink: item.price_link || item.priceLink,
          imageUrl: item.image_url || item.imageUrl,
          category: item.category,
          totalTickets: Number(item.total_tickets || item.totalTickets),
          soldTickets: Number(item.sold_tickets || item.soldTickets || 0),
          organizer: item.organizer,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local storage:', e);
    }
  }

  // Fallback or combine with localStorage if empty
  if (customEvents.length === 0 && typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        customEvents = JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached events:', e);
      }
    }
  }

  // Combine default mock events with custom events (ensuring no duplicate IDs)
  const allEvents = [...MOCK_EVENTS];
  customEvents.forEach((ce) => {
    if (!allEvents.some((me) => me.id === ce.id)) {
      allEvents.push(ce);
    }
  });

  // Dynamically calculate actual sold tickets from local purchases across all wallets
  if (typeof window !== 'undefined') {
    allEvents.forEach((event) => {
      let actualCount = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('lailtix_local_purchases_')) {
            const cached = localStorage.getItem(key);
            if (cached) {
              const purchases = JSON.parse(cached);
              if (Array.isArray(purchases)) {
                actualCount += purchases.filter((p: any) => String(p.eventId) === String(event.id)).length;
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
      event.soldTickets = actualCount;
    });
  }

  return allEvents;
};

// Create a new event
export const createEvent = async (event: Omit<EventItem, 'soldTickets'>): Promise<EventItem> => {
  const newEvent: EventItem = {
    ...event,
    soldTickets: 0,
  };

  // 1. Try to save to Supabase
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('events')
        .insert([{
          title: newEvent.title,
          description: newEvent.description,
          date: newEvent.date,
          time: newEvent.time,
          venue: newEvent.venue,
          price_eth: newEvent.priceEth,
          price_link: newEvent.priceLink,
          image_url: newEvent.imageUrl,
          category: newEvent.category,
          total_tickets: newEvent.totalTickets,
          sold_tickets: 0,
          organizer: newEvent.organizer,
        }]);

      if (error) throw error;
    } catch (e) {
      console.warn('Supabase insert failed, using local storage only:', e);
    }
  }

  // 2. Always save to localStorage for fallback persistence
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: EventItem[] = [];
    if (cached) {
      try {
        list = JSON.parse(cached);
      } catch (e) {
        // ignore
      }
    }
    list.push(newEvent);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  }

  return newEvent;
};

// Get events by organizer
export const getEventsByOrganizer = async (organizerAddress: string): Promise<EventItem[]> => {
  const all = await getEvents();
  return all.filter((e) => e.organizer?.toLowerCase() === organizerAddress.toLowerCase());
};

// Increment sold ticket counter locally / Supabase
export const recordTicketSale = async (eventId: string): Promise<void> => {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const list: EventItem[] = JSON.parse(cached);
        const updated = list.map((e) => {
          if (e.id === eventId) {
            return { ...e, soldTickets: e.soldTickets + 1 };
          }
          return e;
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      // Fetch current sold tickets
      const { data, error } = await supabase
        .from('events')
        .select('sold_tickets')
        .eq('id', eventId)
        .single();
      
      if (!error && data) {
        await supabase
          .from('events')
          .update({ sold_tickets: (data.sold_tickets || 0) + 1 })
          .eq('id', eventId);
      }
    } catch (e) {
      // ignore
    }
  }
};
