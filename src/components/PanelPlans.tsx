// SPDX-License-Identifier: MIT
// src/components/PanelPlans.tsx
// TAB 1: Plans & Subscriptions — plan cards grid

import { useEffect, useState } from 'react';
import { Plan } from '@/protocol/types';
import {
  getPlans,
  getActiveRole,
  getAccounts,
  getOracle,
  subscribe,
  createPlan,
  startSubscription,
  cancelSubscription,
  setActiveRole,
} from '@/protocol/state';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function PanelPlans() {
  const [plans, setPlans] = useState<Plan[]>(getPlans());
  const [accounts, setAccounts] = useState(getAccounts());
  const [activeRole, setActiveRoleState] = useState(getActiveRole());
  const [oracle, setOracle] = useState(getOracle());

  const [form, setForm] = useState({
    title: '',
    token: 'tsub' as 'tsub' | 'usdc',
    priceUsd: 25,
    intervalSec: 2592000,
  });

  useEffect(() => {
    setPlans(getPlans());
    setAccounts(getAccounts());
    setActiveRoleState(getActiveRole());
    setOracle(getOracle());

    return subscribe(() => {
      setPlans(getPlans());
      setAccounts(getAccounts());
      setActiveRoleState(getActiveRole());
      setOracle(getOracle());
    });
  }, []);

  const handleSubscribe = (planId: number) => {
    if (activeRole !== 'alice') {
      setActiveRole('alice');
    }
    if (oracle.isFrozen) {
      toast.error('Oracle Circuit Breaker is active! Subscription paused.');
      return;
    }
    const plan = plans.find((p) => p.id === planId);
    startSubscription(planId);
    toast.success(`Subscribed to ${plan?.title ?? `Plan #${planId}`}! Gasless permit signed.`);
  };

  const handleCancel = () => {
    cancelSubscription();
    toast.info('Active subscription cancelled.');
  };

  const activeAcc = accounts[activeRole] || accounts.alice;
  const activeSub = activeAcc?.activeSubscription?.active
    ? plans.find((p) => p.id === activeAcc.activeSubscription?.planId)
    : null;

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter a plan title');
      return;
    }
    createPlan(form.title.trim(), form.token, form.priceUsd, form.intervalSec);
    toast.success(`Plan "${form.title}" created successfully!`);
    setForm({ title: '', token: 'tsub', priceUsd: 25, intervalSec: 2592000 });
  };

  return (
    <section className="space-y-8">
      <div className="panel-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Available Subscription Plans</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Subscribe with gasless EIP-2612 signatures. Funds are pulled automatically by the keeper relayer.
          </p>
        </div>
        <Badge variant="info" className="text-xs self-start sm:self-auto px-3 py-1">
          {plans.length} Active Plans
        </Badge>
      </div>

      <div className="plans-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isSubscribed = activeSub?.id === plan.id;
          const tokenPriceEquivalent =
            plan.tokenSymbol === 'USDC'
              ? plan.priceUsd.toFixed(2)
              : (plan.priceUsd / (oracle.price || 1)).toFixed(2);

          return (
            <Card
              key={plan.id}
              className={cn(
                'plan-card relative flex flex-col justify-between overflow-hidden transition-all duration-300 border-white/10 bg-zinc-900/60',
                plan.featured && 'border-trust-cyan/50 shadow-[0_0_30px_rgba(0,242,254,0.15)] ring-1 ring-trust-cyan/30',
                isSubscribed && 'border-trust-emerald/50 ring-1 ring-trust-emerald/30'
              )}
            >
              {plan.featured && (
                <div className="absolute top-4 right-4">
                  <Badge variant="info">Popular</Badge>
                </div>
              )}
              {isSubscribed && (
                <div className="absolute top-4 right-4">
                  <Badge variant="success">Current Plan</Badge>
                </div>
              )}

              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-white">{plan.title}</h3>
                <div className="text-xs text-muted-foreground">
                  By Merchant: <span className="font-mono text-zinc-300">{plan.merchant}</span>
                </div>

                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-extrabold text-white">${plan.priceUsd.toFixed(2)}</span>
                  <span className="text-muted-foreground text-sm">/{plan.intervalLabel}</span>
                </div>

                <div className="text-xs text-trust-cyan bg-trust-cyan/10 border border-trust-cyan/20 rounded-md px-3 py-1.5 inline-block">
                  ≈ {tokenPriceEquivalent} {plan.tokenSymbol} @ current rate (${oracle.price.toFixed(2)})
                </div>

                <ul className="space-y-2 text-sm text-zinc-300 pt-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-trust-emerald flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 pt-0 border-t border-white/5">
                {isSubscribed ? (
                  <Button variant="secondary" className="w-full border-trust-emerald/40 text-trust-emerald cursor-default" disabled>
                    <span className="mr-1">✓</span> Subscribed
                  </Button>
                ) : activeRole !== 'alice' ? (
                  <Button
                    variant="default"
                    className="w-full cursor-pointer"
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    Switch to Alice &amp; Subscribe
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="w-full cursor-pointer"
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    Subscribe (1-Click Permit)
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Active Subscription Card */}
      {activeSub && (
        <Card className="border-trust-emerald/40 bg-gradient-to-br from-emerald-500/10 via-zinc-900/80 to-zinc-900/90 p-6">
          <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Badge variant="success">Active Subscription</Badge>
              <h3 className="text-xl font-bold text-white">{activeSub.title}</h3>
            </div>
            <Button variant="destructive" onClick={handleCancel} className="cursor-pointer">
              Cancel Subscription
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Billing Cycle</span>
              <span className="font-semibold text-white">Every {activeSub.intervalLabel}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">USD Rate</span>
              <span className="font-semibold text-white">${activeSub.priceUsd.toFixed(2)} / cycle</span>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Next Payment Due</span>
              <span className="font-semibold font-mono text-trust-cyan">29 days 23 hours</span>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">Merchant Address</span>
              <span className="font-mono font-semibold text-zinc-300 truncate block">{activeSub.merchant}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Create New Plan Form */}
      <Card className="mt-8 border-white/10 bg-zinc-900/60 p-6">
        <div className="card-header mb-4">
          <h3 className="text-xl font-bold text-white">Deploy New Subscription Plan</h3>
          <p className="text-xs text-muted-foreground">Merchants can create customized subscription tiers on-chain.</p>
        </div>
        <form className="space-y-4" onSubmit={handleCreatePlan}>
          <div className="space-y-1.5">
            <label htmlFor="planTitleInput" className="text-sm font-medium text-zinc-300">Plan Title</label>
            <Input
              id="planTitleInput"
              placeholder="e.g. VIP Membership"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="planTokenSelect" className="text-sm font-medium text-zinc-300">Payment Token</label>
            <Select value={form.token} onValueChange={(v) => setForm({ ...form, token: v as 'tsub' | 'usdc' })}>
              <SelectTrigger id="planTokenSelect"><SelectValue placeholder="Payment Token" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tsub">TrustSub Token (TSUB) - 18 Decimals</SelectItem>
                <SelectItem value="usdc">USD Coin (USDC) - 6 Decimals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="planPriceInput" className="text-sm font-medium text-zinc-300">Price in USD ($)</label>
              <Input
                id="planPriceInput"
                type="number"
                min={1}
                step={0.5}
                value={form.priceUsd}
                onChange={(e) => setForm({ ...form, priceUsd: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="planIntervalSelect" className="text-sm font-medium text-zinc-300">Billing Interval</label>
              <Select value={form.intervalSec.toString()} onValueChange={(v) => setForm({ ...form, intervalSec: parseInt(v, 10) })}>
                <SelectTrigger id="planIntervalSelect"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 Minute (Fast Test)</SelectItem>
                  <SelectItem value="86400">1 Day</SelectItem>
                  <SelectItem value="604800">7 Days (Weekly)</SelectItem>
                  <SelectItem value="2592000">30 Days (Monthly)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full cursor-pointer">Create Subscription Plan</Button>
        </form>
      </Card>
    </section>
  );
}