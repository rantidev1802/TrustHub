// SPDX-License-Identifier: MIT
// src/components/Hero.tsx
// Hero section with stats grid — motion animated

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CreditCard, Wallet, ShieldCheck, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getActiveAccount, getOracle, subscribe } from '@/protocol/state';

const statCards = [
  { label: 'Active Subscription', valueId: 'subStatus', hintId: 'subHint', icon: CreditCard },
  { label: 'Wallet Balance', valueId: 'tsubBal', hintId: 'usdcBal', icon: Wallet },
  { label: 'Vault Standing Allowance', valueId: 'allowance', hint: 'Auto-draw enabled', icon: Lock },
  { label: 'Access Gate Status', valueId: 'accessStatus', hintId: 'accessPeriod', icon: ShieldCheck },
];

export function Hero() {
  const [account, setAccount] = useState(getActiveAccount());
  const [oracle, setOracle] = useState(getOracle());
  const [subStatus, setSubStatus] = useState('Inactive');
  const [subHint, setSubHint] = useState('Select a plan to start');
  const [accessStatus, setAccessStatus] = useState('Revoked');
  const [accessPeriod, setAccessPeriod] = useState('No subscription found');

  const updateUI = (acc: ReturnType<typeof getActiveAccount>, oracleState: ReturnType<typeof getOracle>) => {
    const sub = acc.activeSubscription;
    if (sub && sub.active) {
      const daysLeft = Math.max(0, Math.ceil((sub.nextPaymentTimestamp - Date.now() / 1000) / 86400));
      setSubStatus('Active');
      setSubHint(`Renewal in ${daysLeft > 0 ? `${daysLeft} days` : 'today'}`);
      setAccessStatus('Granted');
      setAccessPeriod('Active Subscription');
    } else {
      setSubStatus('Inactive');
      setSubHint('Select a plan to start');
      setAccessStatus('Revoked');
      setAccessPeriod('No subscription found');
    }
  };

  useEffect(() => {
    const acc = getActiveAccount();
    const oracleState = getOracle();
    setAccount(acc);
    setOracle(oracleState);
    updateUI(acc, oracleState);

    return subscribe(() => {
      const currentAcc = getActiveAccount();
      const currentOracle = getOracle();
      setAccount(currentAcc);
      setOracle(currentOracle);
      updateUI(currentAcc, currentOracle);
    });
  }, []);

  return (
    <section className="text-center max-w-5xl mx-auto mb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <Badge variant="info" className="gap-1.5 mb-4">
          <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <Sparkles className="w-4 h-4 text-trust-cyan" />
          </motion.span>
          Trust-Minimized Web3 Subscriptions
        </Badge>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="gradient-text text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] mb-4"
        >
          Decentralized Recurring Billing with Volatility Protection
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          Autonomous pull payments secured by <strong>TrustSubVault</strong>, instant{' '}
          <strong>EIP-2612 gasless permits</strong>, Chainlink volatility circuit breakers, and a
          3-day subscriber grace period.
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.valueId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.05, duration: 0.3 }}
          >
            <Card className="text-left h-full flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                <stat.icon className="w-4 h-4 text-trust-cyan" />
                <span className="uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="space-y-1">
                <div id={stat.valueId} className="text-xl sm:text-2xl font-bold text-white">
                  {stat.valueId === 'subStatus' ? (
                    <span className={subStatus === 'Active' ? 'text-trust-emerald' : 'text-muted-foreground'}>
                      {subStatus}
                    </span>
                  ) :
                   stat.valueId === 'tsubBal' ? `${account.tsubBalance.toLocaleString()} TSUB` :
                   stat.valueId === 'allowance' ? (account.tsubAllowance > 999999 ? 'Unlimited' : `${account.tsubAllowance} TSUB`) :
                   stat.valueId === 'accessStatus' ? (
                     <span className={accessStatus === 'Granted' ? 'text-trust-emerald' : 'text-trust-rose'}>
                       {accessStatus}
                     </span>
                   ) : ''}
                </div>
                <div id={stat.hintId} className="text-xs sm:text-sm text-trust-cyan truncate">
                  {stat.valueId === 'subStatus' ? subHint :
                   stat.valueId === 'tsubBal' ? `${account.usdcBalance.toLocaleString()} USDC` :
                   stat.hint || (stat.valueId === 'accessStatus' ? accessPeriod : '')}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}