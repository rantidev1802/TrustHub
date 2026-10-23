// SPDX-License-Identifier: MIT
// src/components/ui/tabs.tsx
// shadcn/ui Tabs — styled for TrustHub nav pills

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-11 items-center justify-center rounded-md bg-zinc-900/70 backdrop-blur-md p-1 border border-border',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-trust-cyan/12 data-[state=active]:text-trust-cyan data-[state=active]:border data-[state=active]:border-trust-cyan/30 data-[state=active]:shadow-[0_4px_15px_rgba(0,242,254,0.15)]',
      'hover:data-[state=inactive]:bg-white/5 hover:data-[state=inactive]:text-white',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 animate-fade-in',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };