// SPDX-License-Identifier: MIT
// src/components/Header.tsx
// Protocol header with role selector, wallet status, oracle status, faucet

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Droplets, Check, Copy } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getActiveRole, getActiveAccount, getOracle, subscribe, formatAddress, setActiveRole, mintFaucetTokens } from '@/protocol/state';
import { ACCOUNTS } from '@/protocol/constants';
import { toast } from 'sonner';

export function Header() {
  const [role, setRole] = useState<'alice' | 'merchant' | 'keeper' | 'admin'>('alice');
  const [oracle, setOracle] = useState(getOracle());
  const [account, setAccount] = useState(getActiveAccount());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOracle(getOracle());
    setAccount(getActiveAccount());
    setRole(getActiveRole());

    return subscribe(() => {
      setOracle(getOracle());
      setAccount(getActiveAccount());
      setRole(getActiveRole());
    });
  }, []);

  const isFrozen = oracle.isFrozen;

  const handleRoleChange = (v: 'alice' | 'merchant' | 'keeper' | 'admin') => {
    setRole(v);
    setActiveRole(v);
    toast.info(`Switched active role to ${ACCOUNTS[v].name}`);
  };

  const handleFaucet = () => {
    mintFaucetTokens();
    toast.success(`Minted +500 TSUB & +500 USDC to ${account.name}!`);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    toast.success(`Copied ${formatAddress(account.address)} to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl glass-card mb-8 shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-white/10">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br from-trust-cyan/15 to-trust-blue/15 border border-trust-cyan/35 shadow-[0_0_20px_rgba(0,242,254,0.25)]">
          <Wallet className="w-6 h-6 text-trust-cyan" />
        </div>
        <div>
          <h1 className="gradient-text-cyan text-xl font-black tracking-tight leading-none">TrustHub</h1>
          <span className="text-[0.65rem] font-bold tracking-wider text-trust-cyan uppercase">PROTOCOL v1.0</span>
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-trust-cyan/6 border border-trust-cyan/20">
        <motion.div
          className="w-2.5 h-2.5 rounded-full"
          animate={isFrozen ? { backgroundColor: '#f43f5e', boxShadow: '0 0 10px #f43f5e' } : { backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }}
          transition={{ duration: 0.3 }}
          initial={false}
        />
        <span className="text-xs sm:text-sm font-medium">
          Oracle: <strong className={isFrozen ? 'text-trust-rose' : 'text-trust-emerald'}>
            {isFrozen ? 'FROZEN (Circuit Breaker)' : 'Operational'}
          </strong>
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-xs sm:text-sm font-medium">
          Price: <strong className="text-white">${oracle.price.toFixed(2)} USD</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Select value={role} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-[210px] min-w-0 bg-white/5 border-white/15">
            <SelectValue placeholder="Active Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alice">Alice (Subscriber) - {formatAddress(ACCOUNTS.alice.address)}</SelectItem>
            <SelectItem value="merchant">Bob (Merchant) - {formatAddress(ACCOUNTS.merchant.address)}</SelectItem>
            <SelectItem value="keeper">Charlie (Keeper) - {formatAddress(ACCOUNTS.keeper.address)}</SelectItem>
            <SelectItem value="admin">Protocol Admin - {formatAddress(ACCOUNTS.admin.address)}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="secondary"
          className="gap-2 cursor-pointer hover:border-trust-cyan/50"
          onClick={handleCopyAddress}
          title="Click to copy address"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-trust-emerald" /> : <Copy className="w-3.5 h-3.5 text-trust-cyan" />}
          <span className="font-mono text-xs">{formatAddress(account.address)}</span>
        </Button>

        <Button
          variant="outline"
          className="gap-2 cursor-pointer border-trust-cyan/40 hover:bg-trust-cyan/15"
          onClick={handleFaucet}
          title="Mint test tokens to active account"
        >
          <Droplets className="w-4 h-4 text-trust-cyan" />
          <span>Faucet +500 TSUB</span>
        </Button>
      </div>
    </header>
  );
}