// ============================================
// MitrAI - Anonymous Chat Store Module
// Queue, rooms, messages, reports, blocks, passes, coupons
// ============================================

import { supabase } from './core';
import { generateAlias } from '../anon-aliases';
import type { AnonRoomType } from '../anon-aliases';
import { v4 as uuidv4 } from 'uuid';
import { getUserSubscription } from './subscriptions';
import { normalizeOptionalPaymentReference } from '../payment-validation';

// ═══════════════════════════════════════════
// Types (local to avoid bloating types.ts)
// ═══════════════════════════════════════════

export interface AnonQueueEntry {
  id: string;
  userId: string;
  roomType: AnonRoomType;
  alias: string;
  joinedAt: string;
}

export interface AnonRoom {
  id: string;
  roomType: string;
  status: 'active' | 'revealed' | 'closed';
  createdAt: string;
  closedAt: string | null;
}

export interface AnonRoomMember {
  id: string;
  roomId: string;
  userId: string;
  alias: string;
  revealConsent: boolean;
  joinedAt: string;
}

export interface AnonMessage {
  id: string;
  roomId: string;
  senderId: string;
  alias: string;
  text: string;
  createdAt: string;
}

export interface AnonReport {
  id: string;
  roomId: string;
  reporterId: string;
  reportedUserId: string;
  messageId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface AnonPass {
  id: string;
  userId: string;
  plan: string;
  price: number;
  source: string;
  couponCode: string;
  activatedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface AnonCoupon {
  code: string;
  plan: string;
  maxUses: number;
  usedCount: number;
  active: boolean;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

export const ANON_OPEN_ACCESS_ENDS_AT = '2026-04-14T23:59:59+05:30';

export function isAnonOpenAccessActive(now: Date = new Date()): boolean {
  return now.getTime() <= new Date(ANON_OPEN_ACCESS_ENDS_AT).getTime();
}

export function getOpenAccessPass(userId: string): AnonPass {
  const now = new Date().toISOString();
  return {
    id: 'anon-open-access',
    userId,
    plan: 'open_access',
    price: 0,
    source: 'open_access',
    couponCode: '',
    activatedAt: now,
    expiresAt: ANON_OPEN_ACCESS_ENDS_AT,
    createdAt: now,
  };
}

// ═══════════════════════════════════════════
// PASS / ACCESS CHECK
// ═══════════════════════════════════════════

/** Check if user has an active (non-expired) pass OR an active Pro subscription */
export async function hasActivePass(userId: string): Promise<boolean> {
  if (isAnonOpenAccessActive()) return true;

  // Check Pro subscription first
  const sub = await getUserSubscription(userId);
  if (sub && sub.status === 'active' && sub.plan !== 'free') return true;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('anon_passes')
    .select('id')
    .eq('user_id', userId)
    .gt('expires_at', now)
    .limit(1);
  if (error) { console.error('hasActivePass error:', error); return false; }
  return (data || []).length > 0;
}

/** Check if user is a Pro subscriber (active paid subscription) */
export async function isProSubscriber(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  return !!(sub && sub.status === 'active' && sub.plan !== 'free');
}

/** Get user's active pass details (returns a virtual pass for Pro subscribers) */
export async function getActivePass(userId: string): Promise<AnonPass | null> {
  if (isAnonOpenAccessActive()) {
    return getOpenAccessPass(userId);
  }

  // Pro subscribers get a virtual "pro" pass
  const sub = await getUserSubscription(userId);
  if (sub && sub.status === 'active' && sub.plan !== 'free') {
    return {
      id: 'pro-subscription',
      userId,
      plan: 'pro',
      price: 0,
      source: 'pro-subscription',
      couponCode: '',
      activatedAt: sub.startDate,
      expiresAt: sub.endDate || new Date(Date.now() + 365 * 86400000).toISOString(),
      createdAt: sub.createdAt,
    };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('anon_passes')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return snakeToPass(data);
}

// ═══════════════════════════════════════════
// FREE TRIAL
// ═══════════════════════════════════════════

const FREE_TRIAL_DAYS = 7;

/** Check if user has ever had a free trial (active or expired) */
export async function hasUsedFreeTrial(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('anon_passes')
    .select('id')
    .eq('user_id', userId)
    .eq('source', 'free_trial')
    .limit(1);
  if (error) { console.error('hasUsedFreeTrial error:', error); return false; }
  return (data || []).length > 0;
}

/** Grant a one-time 7-day free trial. Returns the pass if granted, null if already used. */
export async function grantFreeTrial(userId: string): Promise<AnonPass | null> {
  if (isAnonOpenAccessActive()) return null;

  // Already has an active pass? Don't grant.
  const existing = await hasActivePass(userId);
  if (existing) return null;

  // Already used a trial before? Don't grant.
  const used = await hasUsedFreeTrial(userId);
  if (used) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const { data: pass, error } = await supabase
    .from('anon_passes')
    .insert({
      user_id: userId,
      plan: 'weekly',
      price: 0,
      source: 'free_trial',
      coupon_code: '',
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  if (error) { console.error('grantFreeTrial error:', error); return null; }
  return snakeToPass(pass);
}

// ═══════════════════════════════════════════
// COUPON REDEMPTION
// ═══════════════════════════════════════════

/** Redeem a coupon code → create a pass */
export async function redeemCoupon(userId: string, code: string): Promise<{ success: boolean; error?: string; pass?: AnonPass }> {
  const trimmed = code.trim().toUpperCase();

  // 1. Find coupon
  const { data: coupon, error: cErr } = await supabase
    .from('anon_coupons')
    .select('*')
    .eq('code', trimmed)
    .single();
  if (cErr || !coupon) return { success: false, error: 'Invalid coupon code' };
  if (!coupon.active) return { success: false, error: 'Coupon is no longer active' };
  if (coupon.used_count >= coupon.max_uses) return { success: false, error: 'Coupon has been fully used' };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { success: false, error: 'Coupon has expired' };

  // 2. Check if user already has active pass — if so, extend it instead of blocking
  const activePass = await getActivePass(userId);

  // 3. Calculate duration
  const plan = coupon.plan as string;
  const durationDays = plan === 'weekly' ? 7 : plan === 'monthly' ? 30 : 180;
  const now = new Date();

  // If user has an active pass (not a pro subscription), extend from current expiry
  if (activePass && activePass.plan !== 'pro') {
    const currentExpiry = new Date(activePass.expiresAt);
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Update existing pass expiry
    const { error: updateErr } = await supabase
      .from('anon_passes')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', activePass.id);
    if (updateErr) return { success: false, error: 'Failed to extend pass' };

    // Increment coupon used_count
    await supabase
      .from('anon_coupons')
      .update({ used_count: coupon.used_count + 1 })
      .eq('code', trimmed);

    return { success: true, pass: { ...activePass, expiresAt: newExpiry.toISOString() } };
  }

  // Pro subscribers — don't need a coupon
  if (activePass && activePass.plan === 'pro') {
    return { success: false, error: 'Pro subscribers already have unlimited access!' };
  }

  // 4. No active pass — create new one
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const { data: pass, error: pErr } = await supabase
    .from('anon_passes')
    .insert({
      user_id: userId,
      plan,
      price: 0,
      source: 'coupon',
      coupon_code: trimmed,
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  if (pErr) return { success: false, error: 'Failed to activate pass' };

  // 4. Increment coupon used_count
  await supabase
    .from('anon_coupons')
    .update({ used_count: coupon.used_count + 1 })
    .eq('code', trimmed);

  return { success: true, pass: snakeToPass(pass) };
}

// ═══════════════════════════════════════════
// BAN CHECK
// ═══════════════════════════════════════════

/** Check if user is currently banned */
export async function isUserBanned(userId: string): Promise<{ banned: boolean; reason?: string; expiresAt?: string }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('anon_bans')
    .select('*')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return { banned: false };
  return { banned: true, reason: data[0].reason, expiresAt: data[0].expires_at };
}

// ═══════════════════════════════════════════
// QUEUE MANAGEMENT
// ═══════════════════════════════════════════

/** Join the matching queue */
export async function joinQueue(userId: string, roomType: AnonRoomType): Promise<{ success: boolean; alias: string; error?: string }> {
  const alias = generateAlias();

  // Check if already in queue
  const { data: existing } = await supabase.from('anon_queue').select('id').eq('user_id', userId).limit(1);
  if (existing && existing.length > 0) {
    // Update room type
    await supabase.from('anon_queue').update({ room_type: roomType, alias, joined_at: new Date().toISOString() }).eq('user_id', userId);
    return { success: true, alias };
  }

  // Check if already in an active room
  const { data: activeRoom } = await supabase
    .from('anon_room_members')
    .select('room_id, anon_rooms!inner(status)')
    .eq('user_id', userId)
    .eq('anon_rooms.status', 'active')
    .limit(1);
  if (activeRoom && activeRoom.length > 0) {
    return { success: false, alias: '', error: 'You already have an active anonymous chat' };
  }

  const { error } = await supabase.from('anon_queue').insert({
    user_id: userId,
    room_type: roomType,
    alias,
    joined_at: new Date().toISOString(),
  });
  if (error) { console.error('joinQueue error:', error); return { success: false, alias: '', error: 'Failed to join queue' }; }
  return { success: true, alias };
}

/** Leave the queue */
export async function leaveQueue(userId: string): Promise<void> {
  await supabase.from('anon_queue').delete().eq('user_id', userId);
}

/** Poll for a match — returns room ID if matched */
export async function pollForMatch(userId: string): Promise<{ matched: boolean; roomId?: string }> {
  // 1. Check if already assigned to an active room
  const { data: existing } = await supabase
    .from('anon_room_members')
    .select('room_id')
    .eq('user_id', userId);

  if (existing && existing.length > 0) {
    // Verify room is active
    for (const mem of existing) {
      const { data: room } = await supabase.from('anon_rooms').select('status').eq('id', mem.room_id).single();
      if (room && room.status === 'active') {
        // Remove from queue
        await supabase.from('anon_queue').delete().eq('user_id', userId);
        return { matched: true, roomId: mem.room_id };
      }
    }
  }

  // 2. Try to find a match in the queue
  const { data: myEntry } = await supabase.from('anon_queue').select('*').eq('user_id', userId).single();
  if (!myEntry) return { matched: false };

  // Get blocked users
  const { data: blocks } = await supabase.from('anon_blocks').select('blocked_id').eq('blocker_id', userId);
  const blockedIds = (blocks || []).map(b => b.blocked_id);

  // Find another person in queue with same room type
  const query = supabase
    .from('anon_queue')
    .select('*')
    .eq('room_type', myEntry.room_type)
    .neq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1);

  const { data: candidates } = await query;
  if (!candidates || candidates.length === 0) return { matched: false };

  const partner = candidates.find(c => !blockedIds.includes(c.user_id));
  if (!partner) return { matched: false };

  // 3. Create room + add both members
  const roomId = `anon_${uuidv4().slice(0, 8)}`;
  const { error: roomErr } = await supabase.from('anon_rooms').insert({
    id: roomId,
    room_type: myEntry.room_type,
    status: 'active',
  });
  if (roomErr) { console.error('create room error:', roomErr); return { matched: false }; }

  // Add both members
  await supabase.from('anon_room_members').insert([
    { room_id: roomId, user_id: userId, alias: myEntry.alias },
    { room_id: roomId, user_id: partner.user_id, alias: partner.alias },
  ]);

  // Remove both from queue
  await supabase.from('anon_queue').delete().in('user_id', [userId, partner.user_id]);

  return { matched: true, roomId };
}

// ═══════════════════════════════════════════
// ROOM & MESSAGES
// ═══════════════════════════════════════════

/** Get room details + members */
export async function getAnonRoom(roomId: string): Promise<{ room: AnonRoom; members: AnonRoomMember[] } | null> {
  const { data: room, error } = await supabase.from('anon_rooms').select('*').eq('id', roomId).single();
  if (error || !room) return null;

  const { data: members } = await supabase.from('anon_room_members').select('*').eq('room_id', roomId);

  return {
    room: {
      id: room.id,
      roomType: room.room_type,
      status: room.status,
      createdAt: room.created_at,
      closedAt: room.closed_at,
    },
    members: (members || []).map(m => ({
      id: m.id,
      roomId: m.room_id,
      userId: m.user_id,
      alias: m.alias,
      revealConsent: m.reveal_consent || false,
      joinedAt: m.joined_at,
    })),
  };
}

/** Get messages for a room */
export async function getAnonMessages(roomId: string, limit = 100): Promise<AnonMessage[]> {
  const { data, error } = await supabase
    .from('anon_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) { console.error('getAnonMessages error:', error); return []; }
  return (data || []).map(m => ({
    id: m.id,
    roomId: m.room_id,
    senderId: m.sender_id,
    alias: m.alias,
    text: m.text,
    createdAt: m.created_at,
  }));
}

/** Send a message */
export async function sendAnonMessage(roomId: string, senderId: string, alias: string, text: string): Promise<AnonMessage | null> {
  const msg = {
    id: `amsg_${uuidv4().slice(0, 12)}`,
    room_id: roomId,
    sender_id: senderId,
    alias,
    text,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('anon_messages').insert(msg);
  if (error) { console.error('sendAnonMessage error:', error); return null; }
  return { id: msg.id, roomId, senderId, alias, text, createdAt: msg.created_at };
}

// ═══════════════════════════════════════════
// REVEAL & CLOSE
// ═══════════════════════════════════════════

/** Toggle reveal consent for a member */
export async function toggleRevealConsent(roomId: string, userId: string): Promise<{ revealed: boolean; myConsent: boolean; partnerConsent: boolean }> {
  // Get current state
  const { data: member } = await supabase
    .from('anon_room_members')
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();
  if (!member) return { revealed: false, myConsent: false, partnerConsent: false };

  const newConsent = !member.reveal_consent;
  await supabase.from('anon_room_members').update({ reveal_consent: newConsent }).eq('room_id', roomId).eq('user_id', userId);

  // Check if both consented
  const { data: allMembers } = await supabase.from('anon_room_members').select('*').eq('room_id', roomId);
  const partner = (allMembers || []).find(m => m.user_id !== userId);
  const partnerConsent = partner?.reveal_consent || false;

  if (newConsent && partnerConsent) {
    // Both consented — mark room as revealed
    await supabase.from('anon_rooms').update({ status: 'revealed' }).eq('id', roomId);
    return { revealed: true, myConsent: newConsent, partnerConsent };
  }

  return { revealed: false, myConsent: newConsent, partnerConsent };
}

/** Close/leave a room — EPHEMERAL: deletes all messages, members, and the room itself */
export async function closeAnonRoom(roomId: string): Promise<void> {
  // 1. Delete all messages (no trace)
  await supabase.from('anon_messages').delete().eq('room_id', roomId);
  // 2. Delete all members
  await supabase.from('anon_room_members').delete().eq('room_id', roomId);
  // 3. Delete the room itself
  await supabase.from('anon_rooms').delete().eq('id', roomId);
}

/** Get user's active room (if any) */
export async function getUserActiveRoom(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('anon_room_members')
    .select('room_id, anon_rooms!inner(status)')
    .eq('user_id', userId)
    .eq('anon_rooms.status', 'active');
  if (!data || data.length === 0) return null;
  return data[0].room_id;
}

// ═══════════════════════════════════════════
// REPORTS & BLOCKS
// ═══════════════════════════════════════════

/** Get live stats: users in queue and active rooms — REAL-TIME only */
export async function getAnonLiveStats(): Promise<{ queueCount: number; activeRooms: number; queueByType: Record<string, number> }> {
  // Only count queue entries from last 5 minutes (fresh entries)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: queueData, error: qErr } = await supabase
    .from('anon_queue')
    .select('room_type')
    .gte('joined_at', fiveMinAgo);
  const queueCount = queueData?.length || 0;
  const queueByType: Record<string, number> = {};
  (queueData || []).forEach(q => {
    queueByType[q.room_type] = (queueByType[q.room_type] || 0) + 1;
  });

  // Count active rooms (these are real since we now delete closed ones)
  const { count, error: rErr } = await supabase
    .from('anon_rooms')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  const activeRooms = count || 0;

  if (qErr) console.error('getAnonStats queue error:', qErr);
  if (rErr) console.error('getAnonStats rooms error:', rErr);

  return { queueCount, activeRooms, queueByType };
}

/** Report a user in anonymous chat */
export async function reportAnonUser(roomId: string, reporterId: string, reportedUserId: string, reason: string, messageId?: string): Promise<boolean> {
  const { error } = await supabase.from('anon_reports').insert({
    room_id: roomId,
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    message_id: messageId || '',
    reason,
  });
  if (error) { console.error('reportAnonUser error:', error); return false; }

  // Auto-ban check: 3+ reports = auto-ban
  const { count } = await supabase
    .from('anon_reports')
    .select('id', { count: 'exact' })
    .eq('reported_user_id', reportedUserId);

  if (count && count >= 3) {
    // Check existing bans to escalate
    const { data: existingBans } = await supabase.from('anon_bans').select('id').eq('user_id', reportedUserId);
    const banCount = existingBans?.length || 0;

    let expiresAt: string | null = null;
    if (banCount === 0) {
      // First ban: 48 hours
      expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    } else if (banCount === 1) {
      // Second ban: 7 days
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    // Third+: permanent (expiresAt = null)

    await supabase.from('anon_bans').insert({
      user_id: reportedUserId,
      reason: `Auto-ban: ${count} reports received`,
      expires_at: expiresAt,
    });
  }

  return true;
}

/** Block a user */
export async function blockAnonUser(blockerId: string, blockedId: string): Promise<boolean> {
  const { error } = await supabase.from('anon_blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  if (error && !error.message.includes('duplicate')) {
    console.error('blockAnonUser error:', error);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════
// ADMIN: COUPONS
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// PAYMENTS (UPI-based)
// ═══════════════════════════════════════════

export interface AnonPayment {
  id: string;
  userId: string;
  plan: string;
  amount: number;
  transactionId: string;
  upiRef: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedByLabel: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

/** Submit a UPI payment for verification */
export async function submitPayment(userId: string, plan: string, amount: number, transactionId: string, upiRef?: string): Promise<{ success: boolean; error?: string }> {
  if (isAnonOpenAccessActive()) {
    return { success: false, error: 'Anonymous chat is free for everyone until April 14, 2026.' };
  }

  // Check if user already has active pass
  const active = await hasActivePass(userId);
  if (active) return { success: false, error: 'You already have an active pass!' };

  const normalizedTransactionId = transactionId.trim().toUpperCase();
  const normalizedUpiRef = normalizeOptionalPaymentReference(upiRef);

  // Check for duplicate pending payment
  const { data: existing } = await supabase
    .from('anon_payments')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(1);
  if (existing && existing.length > 0) return { success: false, error: 'You already have a pending payment. Please wait for admin approval.' };

  const { data: duplicateTxn } = await supabase
    .from('anon_payments')
    .select('id')
    .eq('transaction_id', normalizedTransactionId)
    .in('status', ['pending', 'approved'])
    .limit(1);
  if (duplicateTxn && duplicateTxn.length > 0) {
    return { success: false, error: 'This transaction ID has already been used for another payment.' };
  }

  const { error } = await supabase
    .from('anon_payments')
    .insert({
      user_id: userId,
      plan,
      amount,
      transaction_id: normalizedTransactionId,
      upi_ref: normalizedUpiRef || null,
      status: 'pending',
    });
  if (error) { console.error('submitPayment error:', error); return { success: false, error: 'Failed to submit payment' }; }
  return { success: true };
}

/** Get user's pending payment status */
export async function getUserPaymentStatus(userId: string): Promise<AnonPayment | null> {
  const { data, error } = await supabase
    .from('anon_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return snakeToPayment(data);
}

/** List pending payments (admin) */
export async function listPendingPayments(): Promise<AnonPayment[]> {
  const { data, error } = await supabase
    .from('anon_payments')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) { console.error('listPendingPayments error:', error); return []; }

  // Enrich with user info
  const payments = (data || []).map(snakeToPayment);
  if (payments.length === 0) return [];

  const userIds = Array.from(new Set(payments.map(p => p.userId)));
  const { data: users } = await supabase.from('students').select('id, name, email').in('id', userIds);
  const userMap = new Map((users || []).map(u => [u.id, u]));

  return payments.map(p => ({
    ...p,
    userName: userMap.get(p.userId)?.name || 'Unknown',
    userEmail: userMap.get(p.userId)?.email || '',
  }));
}

/** Approve a payment → create pass (admin) */
export async function approvePayment(
  paymentId: string,
  adminId: string | null,
  reviewerLabel?: string,
): Promise<{ success: boolean; error?: string }> {
  // Get payment
  const { data: payment, error: pErr } = await supabase
    .from('anon_payments')
    .select('*')
    .eq('id', paymentId)
    .single();
  if (pErr || !payment) return { success: false, error: 'Payment not found' };
  if (payment.status !== 'pending') return { success: false, error: 'Payment already processed' };

  const plan = payment.plan as string;
  const durationDays = plan === 'weekly' ? 7 : plan === 'monthly' ? 30 : 180;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Create pass
  const { error: passErr } = await supabase
    .from('anon_passes')
    .insert({
      user_id: payment.user_id,
      plan,
      price: payment.amount,
      source: 'upi',
      coupon_code: '',
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  if (passErr) return { success: false, error: 'Failed to create pass' };

  // Update payment status
  const reviewUpdate: Record<string, string> = {
    status: 'approved',
    reviewed_at: now.toISOString(),
  };
  if (adminId) reviewUpdate.reviewed_by = adminId;
  if (reviewerLabel) reviewUpdate.reviewed_by_label = reviewerLabel;

  const { error: updateErr } = await supabase
    .from('anon_payments')
    .update(reviewUpdate)
    .eq('id', paymentId);
  if (updateErr) return { success: false, error: 'Failed to update payment status' };

  return { success: true };
}

/** Reject a payment (admin) */
export async function rejectPayment(
  paymentId: string,
  adminId: string | null,
  reviewerLabel?: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const reviewUpdate: Record<string, string> = {
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    rejection_reason: reason || 'Payment could not be verified',
  };
  if (adminId) reviewUpdate.reviewed_by = adminId;
  if (reviewerLabel) reviewUpdate.reviewed_by_label = reviewerLabel;

  const { error } = await supabase
    .from('anon_payments')
    .update(reviewUpdate)
    .eq('id', paymentId);
  if (error) return { success: false, error: 'Failed to reject payment' };
  return { success: true };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snakeToPayment(row: any): AnonPayment {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    amount: row.amount,
    transactionId: row.transaction_id,
    upiRef: row.upi_ref || '',
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedByLabel: row.reviewed_by_label || null,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  };
}

/** Generate coupon codes */
export async function generateCoupons(plan: string, count: number, maxUses: number, createdBy: string, expiresAt?: string): Promise<string[]> {
  const codes: string[] = [];
  const rows = [];
  for (let i = 0; i < count; i++) {
    const code = `MITR${plan.toUpperCase().slice(0, 1)}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    codes.push(code);
    rows.push({
      code,
      plan,
      max_uses: maxUses,
      used_count: 0,
      active: true,
      created_by: createdBy,
      expires_at: expiresAt || null,
    });
  }
  const { error } = await supabase.from('anon_coupons').insert(rows);
  if (error) { console.error('generateCoupons error:', error); return []; }
  return codes;
}

/** List all coupons */
export async function listCoupons(): Promise<AnonCoupon[]> {
  const { data, error } = await supabase
    .from('anon_coupons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('listCoupons error:', error); return []; }
  return (data || []).map(c => ({
    code: c.code,
    plan: c.plan,
    maxUses: c.max_uses,
    usedCount: c.used_count,
    active: c.active,
    createdBy: c.created_by,
    createdAt: c.created_at,
    expiresAt: c.expires_at,
  }));
}

/** Get anon pass stats for admin */
export async function getAnonStats(): Promise<{ totalPasses: number; activePasses: number; totalReports: number; pendingReports: number; totalBans: number }> {
  const now = new Date().toISOString();
  const [passesRes, activeRes, reportsRes, pendingRes, bansRes] = await Promise.all([
    supabase.from('anon_passes').select('id', { count: 'exact' }),
    supabase.from('anon_passes').select('id', { count: 'exact' }).gt('expires_at', now),
    supabase.from('anon_reports').select('id', { count: 'exact' }),
    supabase.from('anon_reports').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabase.from('anon_bans').select('id', { count: 'exact' }),
  ]);
  return {
    totalPasses: passesRes.count || 0,
    activePasses: activeRes.count || 0,
    totalReports: reportsRes.count || 0,
    pendingReports: pendingRes.count || 0,
    totalBans: bansRes.count || 0,
  };
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snakeToPass(row: any): AnonPass {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    price: row.price,
    source: row.source,
    couponCode: row.coupon_code || '',
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}
