// ============================================
// MitrAI - Store Barrel Export
// Re-exports all domain modules so existing
// `import { ... } from '@/lib/store'` keeps working.
// ============================================

// Core utilities (exported for tests / internal use)
export { camelToSnakeKey, snakeToCamelKey, toRow, fromRow } from './core';

// Domain modules
export * from './students';
export * from './sessions';
export * from './notifications';
export * from './materials';
export * from './availability';
export * from './bookings';
export * from './social';
export * from './subscriptions';
export * from './chat';
export * from './calendar';
export * from './attendance';
export * from './feedback';
export * from './circles';
export * from './gamification';
export * from './rooms';
export * from './doubts';
export * from './anon';
export * from './ratings';
