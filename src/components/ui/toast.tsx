// SPDX-License-Identifier: MIT
// src/components/ui/toast.tsx
// Toast wrapper around sonner (better than custom)

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      theme="dark"
      toastOptions={{
        classNames: {
          toast: 'bg-zinc-900/95 border-border backdrop-blur-xl',
          description: 'text-sm',
          actionButton: 'bg-trust-cyan/20 text-trust-cyan hover:bg-trust-cyan/30',
          cancelButton: 'bg-white/10 hover:bg-white/20',
        },
      }}
    />
  );
}