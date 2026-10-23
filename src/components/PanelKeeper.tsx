// SPDX-License-Identifier: MIT
// src/components/PanelKeeper.tsx
// TAB 4: Keeper Automation — heartbeat runner, subscriber table, activity logs

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  runKeeperAutomation,
  getPlans,
  getOracle,
  getAccounts,
  formatAddress,
  subscribe,
  getLogs,
  clearLogs,
} from '@/protocol/state';
import { LogEntry } from '@/protocol/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function PanelKeeper() {
  const [oracle, setOracle] = useState(getOracle());
  const [logs, setLogsState] = useState<LogEntry[]>(getLogs());
  const [accounts, setAccounts] = useState(getAccounts());
  const [plans, setPlans] = useState(getPlans());

  useEffect(() => {
    setOracle(getOracle());
    setLogsState(getLogs());
    setAccounts(getAccounts());
    setPlans(getPlans());

    return subscribe(() => {
      setOracle(getOracle());
      setLogsState(getLogs());
      setAccounts(getAccounts());
      setPlans(getPlans());
    });
  }, []);

  const isFrozen = oracle.isFrozen;

  // Real active subscriptions from state
  const activeSubs = Object.values(accounts).filter(
    (acc) => acc.activeSubscription && acc.activeSubscription.active
  );

  const handleTriggerHeartbeat = () => {
    const res = runKeeperAutomation();
    if (res.isFrozen) {
      toast.error('Keeper Heartbeat Blocked: Circuit Breaker is active!');
    } else if (res.triggeredCount > 0) {
      toast.success(`Keeper Heartbeat: Pulled ${res.triggeredCount} recurring payment(s) to merchant!`);
    } else {
      toast.info('Keeper Heartbeat executed: Subscriptions are up to date.');
    }
  };

  const handleClearLogs = () => {
    clearLogs();
    toast.info('Activity logs cleared');
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="panel-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">TrustSubAutomation Keeper Hub</h2>
          <p className="text-sm text-muted-foreground mt-1">Off-chain heartbeat runner checking subscriptions and executing automated pull payments.</p>
        </div>
        <Button variant="default" onClick={handleTriggerHeartbeat} className="cursor-pointer self-start sm:self-auto">
          <RotateCcw className="w-4 h-4 mr-2" />
          Trigger Keeper Heartbeat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* Table Card */}
        <Card className="p-6 bg-zinc-900/60 border-white/10">
          <div className="card-header flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Subscribers in Vault Registry</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Live on-chain standing pull authorizations</p>
            </div>
            <Badge variant="info">{activeSubs.length} Active</Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-zinc-400">Subscriber</TableHead>
                  <TableHead className="text-zinc-400">Plan</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSubs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No active subscriptions found. Subscribe to a plan in the Plans tab!
                    </TableCell>
                  </TableRow>
                ) : (
                  activeSubs.map((acc) => {
                    const plan = plans.find((p) => p.id === acc.activeSubscription?.planId);
                    return (
                      <TableRow key={acc.address} className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-mono text-zinc-300 text-xs">
                          {formatAddress(acc.address)} ({acc.name.split(' ')[0]})
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          {plan?.title ?? `Plan #${acc.activeSubscription?.planId}`}
                        </TableCell>
                        <TableCell>
                          {isFrozen ? (
                            <Badge variant="destructive">Price Frozen</Badge>
                          ) : (
                            <Badge variant="success">Ready / Due</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isFrozen}
                            onClick={handleTriggerHeartbeat}
                            className="cursor-pointer"
                          >
                            Collect Now
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Activity Logs */}
        <Card className="p-6 bg-zinc-900/60 border-white/10 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Protocol Activity Logs</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time on-chain event stream</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearLogs} className="cursor-pointer hover:bg-white/10">
              Clear
            </Button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto font-mono text-xs pr-1 scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No activity logged yet. Perform an action to see logs.</p>
            ) : (
              logs.map((log, i) => (
                <motion.div
                  key={`${log.timestamp}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'p-2.5 rounded bg-black/40 border-l-2',
                    log.level === 'success' && 'border-l-trust-emerald text-emerald-200',
                    log.level === 'danger' && 'border-l-trust-rose text-rose-200',
                    log.level === 'warning' && 'border-l-trust-amber text-amber-200',
                    log.level === 'info' && 'border-l-trust-cyan text-cyan-200'
                  )}
                >
                  <span className="text-muted-foreground mr-2 font-mono">[{log.timestamp}]</span>
                  <strong>{log.action}:</strong> {log.detail}
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}