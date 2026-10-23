// SPDX-License-Identifier: MIT
// src/lib/wagmi.ts
// The single Web3 stack for TrustHub: wagmi v2 + viem + TanStack Query.
// We configure a local Hardhat/Anvil-style chain (31337) plus a public
// fallback (Sepolia) so the app works both in dev and in production.

import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { mainnet, sepolia } from 'wagmi/chains';
import { defineChain } from 'viem';

// Local dev chain (Anvil / Hardhat default).
export const trustLocal = defineChain({
  id: 31337,
  name: 'TrustHub Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'] },
  },
});

// The chain the protocol is actually deployed on. Defaults to local dev
// so the demo runs out of the box; point VITE_CHAIN_ID at Sepolia for testnet.
const chainId = Number(import.meta.env.VITE_CHAIN_ID) || 31337;

const chains = [trustLocal, sepolia, mainnet] as const;
const defaultChain = chains.find((c) => c.id === chainId) ?? trustLocal;

export const config = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [trustLocal.id]: http(import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});

export { defaultChain, sepolia, mainnet };