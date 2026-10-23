// SPDX-License-Identifier: MIT
// src/App.tsx
// Main application component — nav tabs, layout, protocol state wiring

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CheckCircle, Info, Shield, FolderPlus, LayoutDashboard, Activity } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PanelPlans } from '@/components/PanelPlans';
import { PanelOracle } from '@/components/PanelOracle';
import { PanelMerchant } from '@/components/PanelMerchant';
import { PanelKeeper } from '@/components/PanelKeeper';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { getActiveRole, subscribe } from '@/protocol/state';
import { Toaster } from '@/components/ui/toast';

export default function App() {
  const [activeTab, setActiveTab] = useState('plans');
  const [activeRole, setActiveRole] = useState<'alice' | 'merchant' | 'keeper' | 'admin'>('alice');

  useEffect(() => {
    setActiveRole(getActiveRole());
    return subscribe(() => {
      setActiveRole(getActiveRole());
    });
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Header />

        <Hero />

        {/* Unified Tabs Root wrapping both TabsList and TabsContent */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Navigation Tabs */}
          <nav className="nav-tabs mb-8">
            <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4 gap-1.5 h-auto p-1.5 bg-zinc-900/80 border border-white/10 rounded-xl">
              <TabsTrigger value="plans" className="flex items-center justify-center py-2.5 px-3">
                <LayoutDashboard className="h-4 w-4 mr-2 text-trust-cyan" />
                <span className="truncate">Plans &amp; Subscriptions</span>
              </TabsTrigger>
              <TabsTrigger value="oracle" className="flex items-center justify-center py-2.5 px-3">
                <Activity className="h-4 w-4 mr-2 text-trust-cyan" />
                <span className="truncate">Oracle Circuit Breaker</span>
              </TabsTrigger>
              <TabsTrigger value="merchant" className="flex items-center justify-center py-2.5 px-3">
                <FolderPlus className="h-4 w-4 mr-2 text-trust-cyan" />
                <span className="truncate">Merchant Studio</span>
              </TabsTrigger>
              <TabsTrigger value="keeper" className="flex items-center justify-center py-2.5 px-3">
                <Shield className="h-4 w-4 mr-2 text-trust-cyan" />
                <span className="truncate">Keeper Automation</span>
              </TabsTrigger>
            </TabsList>
          </nav>

          {/* Tab Panels */}
          <TabsContent value="plans">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PanelPlans />
            </motion.div>
          </TabsContent>

          <TabsContent value="oracle">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PanelOracle />
            </motion.div>
          </TabsContent>

          <TabsContent value="merchant">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PanelMerchant />
            </motion.div>
          </TabsContent>

          <TabsContent value="keeper">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PanelKeeper />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </main>
  );
}