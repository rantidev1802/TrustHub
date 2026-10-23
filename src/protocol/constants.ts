// SPDX-License-Identifier: MIT
// src/protocol/constants.ts
// Static mock data mirroring the original app.js PROTOCOL_STATE.
// Contract addresses (TrustHub protocol on Anvil / local)
export const CONTRACTS = {
  token: '0x34A1D3fff3958843C43aD80F30b94c510645C316',
  oracle: '0xA8452Ec99ce0C64f20701dB7dD3abDb607c00496',
  vault: '0xBb2180ebd78ce97360503434eD37fcf4a1Df61c3',
  automation: '0xDB8cFf278adCCF9E9b5da745B44E754fC4EE3C76',
  access: '0x50EEf481cae4250d252Ae577A09bF514f224C6C4',
} as const;

// Role accounts (matching original simulation)
export const ACCOUNTS: Record<string, Omit<import('./types').Account, 'activeSubscription'>> = {
  alice: {
    address: '0x12345678901234567890123456789012345698A1',
    name: 'Alice (Subscriber)',
    tsubBalance: 1000,
    usdcBalance: 1000,
    tsubAllowance: 1_000_000,
    usdcAllowance: 1_000_000,
    nonce: 0,
  },
  merchant: {
    address: '0xABCD1234EF56789012345678901234567845C2',
    name: 'Bob (Merchant)',
    tsubBalance: 40,
    usdcBalance: 50,
    tsubAllowance: 0,
    usdcAllowance: 0,
    nonce: 0,
  },
  keeper: {
    address: '0x7777888899990000111122223333444455556666',
    name: 'Charlie (Keeper)',
    tsubBalance: 100,
    usdcBalance: 100,
    tsubAllowance: 0,
    usdcAllowance: 0,
    nonce: 0,
  },
  admin: {
    address: '0x9999AAAA8888BBBB7777CCCC6666DDDD5555EEEE',
    name: 'Protocol Admin',
    tsubBalance: 10000,
    usdcBalance: 10000,
    tsubAllowance: 0,
    usdcAllowance: 0,
    nonce: 0,
  },
};

// Initial plans (matching original app.js)
export const INITIAL_PLANS = [
  {
    id: 1,
    title: 'Starter Subscription',
    merchant: '0xABCD...45C2',
    token: 'tsub',
    tokenSymbol: 'TSUB' as const,
    tokenDecimals: 18,
    priceUsd: 10.00,
    intervalSec: 2_592_000, // 30 days
    intervalLabel: '30 Days',
    active: true,
    features: ['Full platform access', 'Gasless EIP-2612 renewal', '3-day payment grace period'],
  },
  {
    id: 2,
    title: 'Pro Developer Plan',
    merchant: '0xABCD...45C2',
    token: 'tsub',
    tokenSymbol: 'TSUB' as const,
    tokenDecimals: 18,
    priceUsd: 20.00,
    intervalSec: 2_592_000,
    intervalLabel: '30 Days',
    active: true,
    featured: true,
    features: ['Unlimited API queries', 'Priority relayer processing', 'Instant circuit-breaker alerts'],
  },
  {
    id: 3,
    title: 'Enterprise Gateway',
    merchant: '0xABCD...45C2',
    token: 'usdc',
    tokenSymbol: 'USDC' as const,
    tokenDecimals: 6,
    priceUsd: 50.00,
    intervalSec: 2_592_000,
    intervalLabel: '30 Days',
    active: true,
    features: ['USDC stablecoin settlements', 'Dedicated keeper queue', 'SLA guarantee + audit logs'],
  },
];

// Oracle default state
export const ORACLE_DEFAULT = {
  price: 1.00,
  lastPrice: 1.00,
  isFrozen: false,
  threshold: 0.05, // 5%
};

// Interval options for merchant form
export const INTERVAL_OPTIONS = [
  { value: 60, label: '1 Minute (Fast Test)' },
  { value: 86_400, label: '1 Day' },
  { value: 604_800, label: '7 Days (Weekly)' },
  { value: 2_592_000, label: '30 Days (Monthly)' },
] as const;