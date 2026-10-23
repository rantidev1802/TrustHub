// SPDX-License-Identifier: MIT
// src/components/ui/input.tsx
// shadcn/ui Input

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md bg-zinc-900/90 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none transition-all duration-150',
          'focus:border-trust-cyan focus:ring-2 focus:ring-trust-cyan/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };