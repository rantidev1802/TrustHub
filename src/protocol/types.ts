// SPDX-License-Identifier: MIT
// src/protocol/types.ts
// Shared TypeScript types mirroring the Solidity structs in TrustSubVault /
// TrustSubOracle / TrustSubToken.

export type TokenSymbol = 'TSUB' | 'USDC';

export type RoleKey = 'alice' | 'merchant' | 'keeper' | 'admin';

export interface Plan {
  id: number;
  title: string;
  merchant: string;
  token: string; // address
  tokenSymbol: TokenSymbol;
  tokenDecimals: number;
  priceUsd: number; // USD amount, 2 decimals
  intervalSec: number;
  intervalLabel: string;
  active: boolean;
  featured?: boolean;
  features: string[];
}

export interface Subscription {
  planId: number;
  subscriber: string;
  nextPaymentTimestamp: number; // unix seconds
  active: boolean;
  createdAt: number;
}

export interface Account {
  address: string;
  name: string;
  tsubBalance: number;
  usdcBalance: number;
  tsubAllowance: number;
  usdcAllowance: number;
  nonce: number;
  activeSubscription: Subscription | null;
}

export interface OracleState {
  price: number; // USD per token
  lastPrice: number; // synchronized baseline
  isFrozen: boolean;
  threshold: number; // 5% = 0.05
}

export interface ProtocolContracts {
  token: string;
  oracle: string;
  vault: string;
  automation: string;
  access: string;
}

export interface LogEntry {
  action: string;
  detail: string;
  level: 'success' | 'info' | 'warning' | 'danger';
  timestamp: string;
}