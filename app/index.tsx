import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// --- Icons ---
const Icons = {
  Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Refresh: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>,
  Wallet: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h2v-4Z"></path></svg>,
  ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  ExternalLink: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  Info: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
};

// --- Mock Data ---
const WALLET_ADDRESS = "0x963a2d0BE2eb5d785C6E73ec904fcE8d65691773";
const SHORT_ADDRESS = "0x963a...1773";

// --- Components ---

const Button = ({ children, variant = 'primary', className = '', onClick, icon }: any) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    ghost: "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
    gradient: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25"
  };

  return (
    <button className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`} onClick={onClick}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

const TabButton: React.FC<{ active: boolean, children: React.ReactNode, onClick: () => void }> = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      active 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
    }`}
  >
    {children}
  </button>
);

const BalanceCard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Wallet Address Section */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            Active Wallet Address
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
                MetaMask Wallet <span className="text-emerald-500 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Active</span>
              </div>
              <div className="font-mono text-zinc-300 text-sm md:text-base break-all">
                {WALLET_ADDRESS}
              </div>
            </div>
            <Button variant="secondary" icon={<Icons.Copy />} onClick={() => navigator.clipboard.writeText(WALLET_ADDRESS)}>
              Copy Address
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Balance Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-8 shadow-2xl shadow-indigo-900/20">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="text-indigo-100 text-sm font-medium tracking-wide opacity-90">USDC BALANCE</div>
            <div className="text-4xl md:text-5xl font-bold text-white font-mono tracking-tight">
              0.846324 <span className="text-2xl text-indigo-200">USDC</span>
            </div>
          </div>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-sm font-medium backdrop-blur-sm transition-all flex items-center gap-2">
            <Icons.Refresh /> Refresh
          </button>
        </div>
      </div>

      {/* Tokens List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-200">Your Tokens</h3>
          <Button variant="secondary" className="text-xs">Load Tokens</Button>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 bg-zinc-800/50 rounded-full text-zinc-500">
            <Icons.Info />
          </div>
          <p className="text-zinc-300 font-medium">No tokens found</p>
          <p className="text-zinc-500 text-sm max-w-xs">
            Click "Load Tokens" to fetch from Registry or localStorage, or bridge assets to get started.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4">
        <Button variant="gradient" className="w-full sm:w-auto justify-center py-3 text-base">
          Get USDC from Faucet
        </Button>
      </div>
    </div>
  );
};

const PlaceholderView = ({ title, description }: { title: string, description: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 animate-fade-in">
    <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center text-indigo-500 border border-zinc-700/50">
      <Icons.Wallet />
    </div>
    <h2 className="text-2xl font-bold text-white">{title}</h2>
    <p className="text-zinc-400 max-w-md">{description}</p>
    <Button variant="secondary">Go back to Balance</Button>
  </div>
);

const App = () => {
  const [activeTab, setActiveTab] = useState('Balance');

  const tabs = [
    'Balance', 'Send', 'Deploy', 'History', 'Marketplace', 'Bridge', 'Batch', 'Invoices'
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'Balance': return <BalanceCard />;
      default: return <PlaceholderView title={activeTab} description={`This is the ${activeTab} interface. Functionality coming soon.`} />;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gradient">Arc Dex</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Network Selector */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg border border-zinc-700 cursor-pointer hover:border-zinc-600 transition-colors">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="text-sm font-medium text-zinc-200">Arc (Active)</span>
              <Icons.ChevronDown />
            </div>

            {/* Wallet Info */}
            <div className="hidden md:flex items-center gap-0 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
              <div className="px-3 py-1.5 text-orange-400 text-sm font-mono border-r border-zinc-700 bg-orange-500/10">
                {SHORT_ADDRESS}
              </div>
              <button className="px-3 py-1.5 text-red-400 text-sm font-medium hover:bg-red-500/10 hover:text-red-300 transition-colors">
                Disconnect
              </button>
            </div>

            {/* Mobile Menu (simplified) */}
            <div className="md:hidden">
              <Button variant="secondary" className="px-2">
                <Icons.Wallet />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Navigation Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-1 min-w-max p-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
            {tabs.map((tab) => (
              <TabButton 
                key={tab} 
                active={activeTab === tab} 
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </TabButton>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="glass-panel rounded-2xl p-1 md:p-8 min-h-[600px]">
          {renderContent()}
        </div>

      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);