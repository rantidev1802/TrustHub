// SPDX-License-Identifier: MIT
// src/components/ui/badge.tsx
// shadcn/ui Badge — TrustHub accent variants

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-trust-cyan/12 text-trust-cyan border border-trust-cyan/30',
        secondary: 'bg-white/10 text-white/70 border-white/10',
        destructive: 'bg-trust-rose/15 text-trust-rose border-trust-rose/35',
        success: 'bg-trust-emerald/15 text-trust-emerald border-trust-emerald/35',
        warning: 'bg-trust-amber/15 text-trust-amber border-trust-amber/35',
        info: 'bg-trust-cyan/12 text-trust-cyan border-trust-cyan/30',
        outline: 'border-white/20 text-white/70',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };