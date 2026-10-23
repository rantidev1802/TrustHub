// SPDX-License-Identifier: MIT
// src/components/ui/button.tsx
// shadcn/ui Button — ported to TrustHub accent palette

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-trust-cyan to-trust-blue text-bg-primary shadow-[0_4px_18px_rgba(0,242,254,0.35)] hover:shadow-[0_6px_24px_rgba(0,242,254,0.5)] hover:-translate-y-0.5',
        destructive: 'bg-trust-rose text-white hover:bg-rose-600 shadow-[0_4px_18px_rgba(244,63,94,0.35)]',
        outline: 'border border-trust-cyan/40 bg-trust-cyan/8 text-trust-cyan hover:bg-trust-cyan/16 hover:border-trust-cyan',
        secondary: 'bg-white/6 border-white/10 text-white hover:bg-white/12 hover:border-white/20',
        ghost: 'text-muted-foreground hover:bg-white/5 hover:text-white',
        link: 'text-trust-cyan underline-offset-4 hover:underline',
        dangerOutline: 'border-trust-rose/40 bg-trust-rose/10 text-trust-rose hover:bg-trust-rose/20 hover:border-trust-rose',
        warning: 'border-trust-amber/40 bg-trust-amber/12 text-trust-amber hover:bg-trust-amber/20 hover:border-trust-amber',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };