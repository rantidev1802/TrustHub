// SPDX-License-Identifier: MIT
// src/protocol/state.ts
// Core protocol logic ported from app.js — 100% functional parity.
// All mutation is explicit and synchronous so React can react to it.

import type { Plan, Account, Subscription, OracleState, LogEntry, RoleKey } from './types';
import { CONTRACTS, ACCOUNTS, INITIAL_PLANS, ORACLE_DEFAULT, INTERVAL_OPTIONS } from './constants';

/** Helper — format an address as 0x1234...98A1 */
export const formatAddress = (addr: string): string => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

/** Helper — now as unix seconds */
export const nowSec = (): number => Math.floor(Date.now() / 1000);

/** Convert USD price to token amount using current oracle price */
export const convertUsdToToken = (priceUsd: number, tokenSymbol: string, oraclePrice: number): number => {
  if (tokenSymbol === 'USDC') {
    // USDC is ~$1.00
    return Math.round((priceUsd / 1.0) * 100) / 100;
  }
  return Math.round((priceUsd / oraclePrice) * 100) / 100;
};

/** Check if oracle circuit breaker is active for the current token price */
export const checkOracleFrozen = (oracle: OracleState): boolean => {
  const { price, lastPrice, threshold, isFrozen } = oracle;
  if (isFrozen) return true;
  const delta = Math.abs(price - lastPrice);
  const pct = delta / lastPrice;
  return pct > threshold;
};

/** Deep clone helper for immutable-ish updates */
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// ---- Internal mutable state (the single source of truth) ----
let _plans: Plan[] = clone(INITIAL_PLANS);
let _accounts: Record<RoleKey, Account> = (() => {
  const acc = clone(ACCOUNTS) as Record<RoleKey, Account>;
  // Alice starts with an active subscription to Pro plan (id: 2)
  acc.alice.activeSubscription = {
    planId: 2,
    subscriber: ACCOUNTS.alice.address,
    nextPaymentTimestamp: nowSec() + 29 * 24 * 3600, // 29 days left
    active: true,
    createdAt: nowSec() - 3600,
  };
  return acc;
})();
let _oracle: OracleState = clone(ORACLE_DEFAULT);
let _logs: LogEntry[] = [];
let _activeRole: RoleKey = 'alice';

// ---- Event bus for React re-renders ----
type Listener = () => void;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((fn) => fn());

export const subscribe = (fn: Listener) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

// ---- Getters ----
export const getPlans = (): Plan[] => clone(_plans);
export const getAccounts = (): Record<RoleKey, Account> => clone(_accounts);
export const getOracle = (): OracleState => clone(_oracle);
export const getLogs = (): LogEntry[] => clone(_logs);
export const getActiveRole = (): RoleKey => _activeRole;
export const getActiveAccount = (): Account => clone(_accounts[_activeRole]);
export const getContracts = () => CONTRACTS;
export const getIntervalOptions = () => INTERVAL_OPTIONS;

// ---- Logging ----
const addLog = (action: string, detail: string, level: LogEntry['level'] = 'success') => {
  const timestamp = new Date().toLocaleTimeString();
  _logs.unshift({ action, detail, level, timestamp });
  if (_logs.length > 50) _logs.length = 50;
  notify();
};

// ---- Mutations ----
export const setActiveRole = (role: RoleKey) => {
  _activeRole = role;
  notify();
};

export const startSubscription = (planId: number) => {
  const plan = _plans.find((p) => p.id === planId);
  if (!plan) return;

  // Circuit breaker check
  if (checkOracleFrozen(_oracle)) {
    addLog('Subscription Failed', `Plan #${planId} blocked by Oracle Circuit Breaker (>5% move detected)`, 'danger');
    return;
  }

  const account = _accounts[_activeRole];
  // Simulate EIP-2612 Gasless Permit Signature
  account.nonce++;
  const permitValue = 1_000_000;
  if (plan.token === 'tsub') {
    account.tsubAllowance = permitValue;
  } else {
    account.usdcAllowance = permitValue;
  }

  account.activeSubscription = {
    planId: plan.id,
    subscriber: account.address,
    nextPaymentTimestamp: nowSec() + plan.intervalSec,
    active: true,
    createdAt: nowSec(),
  };

  addLog(
    'SubscriptionStarted',
    `User ${formatAddress(account.address)} subscribed to Plan #${plan.id} (${plan.title})`,
    'success'
  );
  notify();
};

export const cancelSubscription = () => {
  const account = _accounts[_activeRole];
  if (!account.activeSubscription) return;

  account.activeSubscription.active = false;
  addLog('SubscriptionCancelled', `User ${formatAddress(account.address)} cancelled active subscription`, 'warning');
  notify();
};

export const runKeeperAutomation = (): { triggeredCount: number; isFrozen: boolean } => {
  if (checkOracleFrozen(_oracle)) {
    addLog('Keeper Heartbeat Blocked', 'Oracle volatility threshold exceeded; automated billing paused for user protection', 'danger');
    return { triggeredCount: 0, isFrozen: true };
  }

  let triggeredCount = 0;
  const now = nowSec();

  Object.values(_accounts).forEach((account) => {
    const sub = account.activeSubscription;
    if (!sub || !sub.active) return;

    const plan = _plans.find((p) => p.id === sub.planId);
    if (!plan) return;

    const tokenAmount = convertUsdToToken(plan.priceUsd, plan.tokenSymbol, _oracle.price);
    const balance = plan.token === 'tsub' ? account.tsubBalance : account.usdcBalance;
    const allowance = plan.token === 'tsub' ? account.tsubAllowance : account.usdcAllowance;

    if (balance >= tokenAmount && allowance >= tokenAmount) {
      // Pull payment
      if (plan.token === 'tsub') {
        account.tsubBalance -= tokenAmount;
        _accounts.merchant.tsubBalance += tokenAmount;
      } else {
        account.usdcBalance -= tokenAmount;
        _accounts.merchant.usdcBalance += tokenAmount;
      }

      // Renew cycle
      sub.nextPaymentTimestamp = now + plan.intervalSec;
      triggeredCount++;

      addLog(
        'PaymentCollected',
        `Keeper pulled ${tokenAmount} ${plan.tokenSymbol} from ${formatAddress(account.address)} for Plan #${plan.id}`,
        'success'
      );
    } else {
      addLog(
        'PaymentFailed',
        `Subscriber ${formatAddress(account.address)} insufficient balance/allowance for Plan #${plan.id}`,
        'warning'
      );
    }
  });

  if (triggeredCount > 0) {
    addLog('Keeper Heartbeat', `Successfully collected ${triggeredCount} payment(s)`, 'success');
  } else {
    addLog('Keeper Heartbeat', 'All active subscriptions are up to date', 'info');
  }
  notify();
  return { triggeredCount, isFrozen: false };
};

export const setOraclePrice = (newPrice: number) => {
  const prev = _oracle.price;
  _oracle.price = newPrice;
  const delta = Math.abs(newPrice - _oracle.lastPrice);
  const pct = (delta / _oracle.lastPrice) * 100;

  if (pct > _oracle.threshold * 100) {
    _oracle.isFrozen = true;
    addLog('PriceFrozen', `Abrupt move from $${prev.toFixed(2)} to $${newPrice.toFixed(2)} (${pct.toFixed(1)}% move). Billing locked.`, 'danger');
  } else {
    _oracle.isFrozen = false;
    addLog('PriceUpdated', `Token price adjusted to $${newPrice.toFixed(2)} (${pct.toFixed(1)}% move)`, 'info');
  }
  notify();
};

export const unfreezeOracle = () => {
  _oracle.isFrozen = false;
  _oracle.lastPrice = _oracle.price;
  addLog('PriceUnfrozen', `Admin synchronized baseline price to $${_oracle.price.toFixed(2)} and unfreezed feeds`, 'success');
  notify();
};

export const resetOracle = () => {
  _oracle.price = 1.00;
  _oracle.lastPrice = 1.00;
  _oracle.isFrozen = false;
  addLog('PriceReset', 'Oracle reset to baseline $1.00 USD (Circuit Breaker Cleared)', 'info');
  notify();
};

export const emergencyFreezeOracle = () => {
  _oracle.isFrozen = true;
  addLog('PriceFrozen', 'Protocol Admin invoked manual emergency freeze', 'danger');
  notify();
};

export const mintFaucetTokens = () => {
  const account = _accounts[_activeRole];
  account.tsubBalance += 500;
  account.usdcBalance += 500;
  addLog('Faucet Mint', `Minted 500 TSUB and 500 USDC to ${formatAddress(account.address)}`, 'info');
  notify();
};

export const createPlan = (title: string, token: 'tsub' | 'usdc', priceUsd: number, intervalSec: number) => {
  const newId = _plans.length + 1;
  const newPlan: Plan = {
    id: newId,
    title,
    merchant: formatAddress(ACCOUNTS.merchant.address),
    token,
    tokenSymbol: token.toUpperCase() as 'TSUB' | 'USDC',
    tokenDecimals: token === 'usdc' ? 6 : 18,
    priceUsd,
    intervalSec,
    intervalLabel: intervalSec === 60 ? '1 Min' : intervalSec === 86_400 ? '1 Day' : intervalSec === 604_800 ? '7 Days' : '30 Days',
    active: true,
    features: ['Custom billing interval', 'EIP-2612 Gasless Approval', 'Chainlink Volatility Guard'],
  };

  _plans.push(newPlan);
  addLog('PlanCreated', `Merchant deployed Plan #${newId}: $${priceUsd.toFixed(2)} USD in ${token.toUpperCase()}`, 'success');
  notify();
};

export const clearLogs = () => {
  _logs = [];
  notify();
};