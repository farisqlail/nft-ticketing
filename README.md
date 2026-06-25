# VeloTix - Hybrid Web3 Event Ticketing dApp

A next-generation hybrid Web3 event ticketing platform built using Next.js (App Router), Tailwind CSS, Shadcn/ui, Wagmi/Viem, and Hardhat smart contracts on Ethereum Sepolia.

---

## 📂 Project Structure

```
lail-nft-ticketing/
├── frontend/             # Next.js App Router (React 19 + Tailwind v4 + TypeScript)
│   ├── src/
│   │   ├── app/          # App Router routes (Explore, My Events, My Tickets, Profile)
│   │   ├── components/   # UI & Web3 Config components (Navbar, Web3Provider)
│   │   └── lib/          # Centralized helper utilities (events, supabase, ABI)
│   └── tsconfig.json     # TypeScript config (ES2020 target)
└── contracts/            # Hardhat smart contracts environment
    ├── contracts/        # Solidity contract files (TicketNFT.sol, MockToken.sol)
    ├── scripts/          # Deployment and run scripts (deploy.ts)
    └── hardhat.config.ts # Hardhat Configuration (Solidity 0.8.24 + Cancun EVM)
```

---

## 🛠️ Smart Contracts Setup

Go to the `contracts/` directory to manage the on-chain infrastructure:
```bash
cd contracts
```

### 1. Installation
Install Hardhat and smart contract dependencies:
```bash
npm install
```

### 2. Configuration
Create a `.env` file in the `contracts/` root directory:
```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=your_infura_or_alchemy_sepolia_url_here
```

<details>
<summary>📝 Smart Contract Reference & API Details</summary>

### Smart Contract Methods (`TicketNFT.sol`)

- **`buyWithETH(string memory uri)`**: Mint a ticket using native ETH.
- **`buyWithLINK(string memory uri)`**: Mint a ticket using ERC-20 LINK tokens. Requires token approval first.
- **`setPrices(uint256 _ethPrice, uint256 _linkPrice)`**: (Owner-only) Adjust prices dynamically.
- **`withdrawETH()`**: (Owner-only) Withdraw accumulated ETH from sales.
- **`withdrawERC20(address token)`**: (Owner-only) Withdraw accumulated ERC-20 tokens (e.g. LINK).

### Commands List
- **Compile contracts**: `npx hardhat compile`
- **Run local tests**: `npx hardhat test`
- **Start local node**: `npx hardhat node`
- **Deploy locally**: `npx hardhat run scripts/deploy.ts --network localhost`
- **Deploy to Sepolia**: `npx hardhat run scripts/deploy.ts --network sepolia`

</details>

---

## 💻 Frontend Web App Setup

Go to the `frontend/` directory to run the Next.js user interface:
```bash
cd frontend
```

### 1. Installation
Install Next.js and Web3 libraries:
```bash
npm install
```

### 2. Configuration
Create a `.env.local` file in the `frontend/` root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3007](http://localhost:3007) to view the application.

<details>
<summary>🌟 UI Pages & Web3 Integrations</summary>

### Implemented Pages
- **Explore (Home)**: Search and filter upcoming events. Purchase tickets directly with ETH or LINK through the multi-token payment modal.
- **My Organized Events**: Organized Hub for creators to list custom events, check ticket progress bars, and track sales revenue.
- **My NFT Tickets**: Verified ticket drawer showing purchased assets, simulated ticket barcode/QR scanner, and on-chain log validation.
- **Profile**: Customize nickname, email, bio, preset avatars, and inspect live wallet connection details alongside token balances.

### Core Technologies
- **Next.js 16 (App Router)**
- **Tailwind CSS v4 & Glassmorphism styling**
- **Wagmi v2 & Viem v2**
- **RainbowKit (Web3 Wallet Connector)**
- **Supabase Client API** with robust `localStorage` fallbacks.

</details>
