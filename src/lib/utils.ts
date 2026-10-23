// SPDX-License-Identifier: MIT
// src/lib/utils.ts
// Class merging utility (clsx + tailwind-merge)

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}