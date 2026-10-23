// SPDX-License-Identifier: MIT
// src/components/PanelOracle.tsx
// TAB 2: Oracle Circuit Breaker Dashboard

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getOracle, setOraclePrice, unfreezeOracle, emergencyFreezeOracle, resetOracle, subscribe } from '@/protocol/state';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function PanelOracle() {
  const [oracle, setOracle] = useState(getOracle());

  useEffect(() => {
    setOracle(getOracle());
    return subscribe(() => setOracle(getOracle()));
  }, []);

  const currentPrice = oracle.price;
  const lastPrice = oracle.lastPrice;
  const delta = Math.abs(currentPrice - lastPrice);
  const pct = lastPrice > 0 ? (delta / lastPrice) * 100 : 0;
  const isUp = currentPrice >= lastPrice;

  const handlePriceChange = (newPrice: number, label: string, tripsFreeze: boolean) => {
    setOraclePrice(newPrice);
    if (tripsFreeze) {
      toast.error(`Circuit breaker tripped! ${label}: price is now $${newPrice.toFixed(2)}`);
    } else {
      toast.info(`Oracle price adjusted: ${label} ($${newPrice.toFixed(2)})`);
    }
  };

  const handleUnfreeze = () => {
    unfreezeOracle();
    toast.success('Admin unfreeze: Price feeds resynchronized to current market rate!');
  };

  const handleEmergencyFreeze = () => {
    emergencyFreezeOracle();
    toast.error('Admin manual emergency freeze engaged! All billing operations locked.');
  };

  const handleReset = () => {
    resetOracle();
    toast.success('Oracle reset to baseline $1.00 USD (Operational)');
  };

  return (
    <section className="space-y-6">
      <div className="panel-header">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Chainlink Oracle &amp; Volatility Circuit Breaker</h2>
          <p className="text-sm text-muted-foreground mt-1">
            If token price moves &gt;5% in a single cycle, TrustSubOracle automatically halts billing to protect both subscribers and merchants.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monitor Card */}
        <Card className="p-6 bg-zinc-900/60 border-white/10">
          <div className="card-header flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Live Feed Telemetry</h3>
            <Badge variant={oracle.isFrozen ? 'destructive' : 'success'}>
              {oracle.isFrozen ? 'BILLING HALTED' : 'Operational'}
            </Badge>
          </div>

          <div className="price-hero flex items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="price-val-wrap flex items-baseline gap-1">
              <span className="text-2xl text-muted-foreground">$</span>
              <motion.span
                key={currentPrice}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-5xl font-extrabold tracking-tight text-white font-mono"
              >
                {currentPrice.toFixed(2)}
              </motion.span>
              <span className="text-muted-foreground font-mono text-sm ml-1">USD</span>
            </div>
            <div>
              <Badge
                variant={pct > 5 || oracle.isFrozen ? 'destructive' : 'default'}
                className="price-delta-badge text-sm px-3 py-1 font-mono"
              >
                {isUp ? '+' : '-'}{pct.toFixed(1)}% Move
              </Badge>
            </div>
          </div>

          <div className="space-y-3 mb-6 text-sm text-zinc-300">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-muted-foreground">Last Baseline Price:</span>
              <strong className="font-mono text-white">${lastPrice.toFixed(4)}</strong>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-muted-foreground">Volatility Movement:</span>
              <strong id="oracleVolatilityPct" className={pct > 5 ? 'text-trust-rose font-mono' : 'text-trust-emerald font-mono'}>
                {pct.toFixed(2)}% (Max Threshold: 5.00%)
              </strong>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-muted-foreground">Feed Decimals:</span>
              <strong id="oracleDecimals" className="text-white">8 Decimals (Chainlink Standard)</strong>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-muted-foreground">Oracle Security Admin:</span>
              <strong className="font-mono text-trust-cyan">0x9999...EEEE (Multi-Sig)</strong>
            </div>
          </div>

          {/* Volatility gauge bar */}
          <div className="volatility-bar-wrap">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Circuit Breaker Proximity</span>
              <span id="volatilityThresholdDisplay" className="font-mono">{pct.toFixed(1)}% / 5.0% Max Allowed</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
              <motion.div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  pct > 5 || oracle.isFrozen ? 'bg-trust-rose shadow-[0_0_12px_rgba(244,63,94,0.6)]' : 'bg-gradient-to-r from-trust-cyan to-trust-emerald'
                )}
                style={{ width: `${Math.min(100, (pct / 8) * 100)}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Controls Card */}
        <Card className="p-6 bg-zinc-900/60 border-white/10 flex flex-col justify-between">
          <div>
            <div className="card-header mb-4">
              <h3 className="text-xl font-bold text-white">Simulate Market Volatility</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Test how the on-chain protocol behaves under mild market movements versus abrupt price crashes and spikes:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <Button
                variant="secondary"
                onClick={() => handlePriceChange(1.02, 'Normal Uptick (+2%)', false)}
                className="justify-start cursor-pointer hover:border-trust-cyan/40"
              >
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-400 mr-2">+2%</span>
                Normal Uptick ($1.02)
              </Button>
              <Button
                variant="secondary"
                onClick={() => handlePriceChange(0.98, 'Normal Dip (-2%)', false)}
                className="justify-start cursor-pointer hover:border-trust-cyan/40"
              >
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-400 mr-2">-2%</span>
                Normal Dip ($0.98)
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePriceChange(1.20, 'Abrupt Spike (+20%)', true)}
                className="justify-start border-trust-rose/40 text-trust-rose hover:bg-trust-rose/10 cursor-pointer"
              >
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-trust-rose/20 mr-2">+20%</span>
                Abrupt Spike ($1.20)
                <strong className="ml-auto text-xs text-trust-rose">TRIPS</strong>
              </Button>
              <Button
                variant="destructive"
                onClick={() => handlePriceChange(0.80, 'Abrupt Crash (-20%)', true)}
                className="justify-start cursor-pointer"
              >
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-black/30 mr-2">-20%</span>
                Abrupt Crash ($0.80)
                <strong className="ml-auto text-xs text-white">TRIPS</strong>
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Admin Recovery Controls</h4>
            <div className="flex gap-3 flex-wrap">
              <Button onClick={handleUnfreeze} className="cursor-pointer">
                Admin Unfreeze (Resync Baseline)
              </Button>
              <Button variant="outline" onClick={handleReset} className="cursor-pointer border-trust-cyan/40 text-trust-cyan">
                Reset Baseline ($1.00)
              </Button>
              <Button variant="destructive" onClick={handleEmergencyFreeze} className="cursor-pointer">
                Emergency Freeze
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}