// SPDX-License-Identifier: MIT
// src/components/PanelMerchant.tsx
// TAB 3: Merchant Studio — plan creation, analytics dashboard

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createPlan, getOracle, getAccounts, getPlans, subscribe } from '@/protocol/state';
import { toast } from 'sonner';

export function PanelMerchant() {
  const [title, setTitle] = useState('VIP Pro Member');
  const [token, setToken] = useState<'tsub' | 'usdc'>('tsub');
  const [priceUsd, setPriceUsd] = useState(25.00);
  const [intervalSec, setIntervalSec] = useState(2592000); // 30 days
  const [oracle, setOracle] = useState(getOracle());
  const [accounts, setAccounts] = useState(getAccounts());
  const [plans, setPlans] = useState(getPlans());

  useEffect(() => {
    setOracle(getOracle());
    setAccounts(getAccounts());
    setPlans(getPlans());

    return subscribe(() => {
      setOracle(getOracle());
      setAccounts(getAccounts());
      setPlans(getPlans());
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a plan title');
      return;
    }
    createPlan(title.trim(), token, priceUsd, intervalSec);
    toast.success(`Plan "${title}" deployed to on-chain vault!`);
    setTitle('VIP Pro Member');
  };

  const merchantAcc = accounts.merchant;
  const revenueUsd = merchantAcc.tsubBalance * oracle.price + merchantAcc.usdcBalance;

  // Real count of active subscribers across all accounts
  const activeSubscribersCount = Object.values(accounts).filter(
    (a) => a.activeSubscription && a.activeSubscription.active
  ).length;

  return (
    <section className="space-y-6">
      <div className="panel-header">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Merchant Studio</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure recurring plans, set USD subscription rates, and choose payment tokens.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Create Plan Card */}
        <Card className="p-6 bg-zinc-900/60 border-white/10">
          <div className="card-header mb-4">
            <h3 className="text-xl font-bold text-white">Deploy New Subscription Plan</h3>
            <p className="text-xs text-muted-foreground">Define pricing, intervals, and token mechanics</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="planTitleInput" className="text-sm font-medium text-zinc-300">
                Plan Title
              </label>
              <Input
                id="planTitleInput"
                placeholder="e.g. VIP Membership"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="planTokenSelect" className="text-sm font-medium text-zinc-300">
                Payment Token
              </label>
              <Select value={token} onValueChange={(v) => setToken(v as 'tsub' | 'usdc')}>
                <SelectTrigger id="planTokenSelect">
                  <SelectValue placeholder="Payment Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tsub">TrustSub Token (TSUB) - 18 Decimals</SelectItem>
                  <SelectItem value="usdc">USD Coin (USDC) - 6 Decimals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="planPriceInput" className="text-sm font-medium text-zinc-300">
                  Price in USD ($)
                </label>
                <Input
                  id="planPriceInput"
                  type="number"
                  min={1}
                  step={0.5}
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="planIntervalSelect" className="text-sm font-medium text-zinc-300">
                  Billing Interval
                </label>
                <Select
                  value={intervalSec.toString()}
                  onValueChange={(v) => setIntervalSec(parseInt(v, 10))}
                >
                  <SelectTrigger id="planIntervalSelect">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 Minute (Fast Test)</SelectItem>
                    <SelectItem value="86400">1 Day</SelectItem>
                    <SelectItem value="604800">7 Days (Weekly)</SelectItem>
                    <SelectItem value="2592000">30 Days (Monthly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full cursor-pointer">
              Deploy Subscription Plan
            </Button>
          </form>
        </Card>

        {/* Merchant Analytics */}
        <Card className="p-6 bg-zinc-900/60 border-white/10 space-y-4 flex flex-col justify-between">
          <div>
            <div className="card-header mb-4">
              <h3 className="text-xl font-bold text-white">Merchant Revenue &amp; Subscribers</h3>
              <p className="text-xs text-muted-foreground">Live telemetry for Bob's Merchant Account</p>
            </div>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Revenue Collected (Valued in USD)</span>
                <span className="text-3xl font-extrabold text-trust-cyan font-mono">${revenueUsd.toFixed(2)} USD</span>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Subscribers</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-extrabold text-white font-mono">{activeSubscribersCount}</span>
                  <Badge variant={activeSubscribersCount > 0 ? 'success' : 'default'}>
                    {activeSubscribersCount > 0 ? 'Active Stream' : 'Idle'}
                  </Badge>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Merchant Treasury Balances</span>
                <div className="flex justify-between items-center text-sm font-mono mt-1">
                  <span className="text-white font-bold">{merchantAcc.tsubBalance.toFixed(2)} TSUB</span>
                  <span className="text-trust-cyan font-bold">{merchantAcc.usdcBalance.toFixed(2)} USDC</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-xs text-muted-foreground">
            Vault contract settlement address: <span className="font-mono text-zinc-300">0xBb21...61c3</span>
          </div>
        </Card>
      </div>
    </section>
  );
}