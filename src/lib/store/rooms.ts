// ============================================
// MitrRAI - Study Rooms Store
// ============================================

import { supabase, fromRow, toRow } from './core';

export interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  circleId: string;
  creatorId: string;
  maxMembers: number;
  status: string;
  createdAt: string;
  durationMinutes: number;
  expiresAt: string;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  role: string;
  joinedAt: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

// ── Room CRUD ──
export async function getActiveRooms(circleId?: string, limit = 50): Promise<StudyRoom[]> {
  let query = supabase.from('study_rooms').select('*').eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false }).limit(limit);
  if (circleId) query = query.eq('circle_id', circleId);
  const { data, error } = await query;
  if (error) { console.error('getActiveRooms error:', error); return []; }
  return (data || []).map((r) => fromRow<StudyRoom>(r));
}

export async function getRoomById(id: string): Promise<StudyRoom | null> {
  const { data, error } = await supabase.from('study_rooms').select('*').eq('id', id).single();
  if (error || !data) return null;
  return fromRow<StudyRoom>(data);
}

export async function createRoom(room: Omit<StudyRoom, 'id' | 'status' | 'createdAt' | 'expiresAt'> & { durationMinutes?: number }, creatorName = 'Student'): Promise<StudyRoom | null> {
  const id = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const durationMinutes = room.durationMinutes ?? 120;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  const full = { ...room, id, status: 'active', createdAt, durationMinutes, expiresAt } as StudyRoom;
  const row = toRow(full);
  const { error } = await supabase.from('study_rooms').insert(row);
  if (error) { console.error('createRoom error:', error); return null; }
  // Auto-join creator
  await supabase.from('room_members').insert(
    toRow({ roomId: id, userId: room.creatorId, userName: creatorName, role: 'creator', joinedAt: new Date().toISOString() })
  );
  return full;
}

export async function archiveRoom(roomId: string): Promise<boolean> {
  const { error } = await supabase.from('study_rooms').update({ status: 'archived' }).eq('id', roomId);
  if (error) { console.error('archiveRoom error:', error); return false; }
  return true;
}

// ── Members ──
export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at');
  if (error) { console.error('getRoomMembers error:', error); return []; }
  return (data || []).map((r) => fromRow<RoomMember>(r));
}

export async function joinRoom(roomId: string, userId: string, userName: string, role = 'member'): Promise<boolean> {
  const { error } = await supabase.from('room_members').upsert(
    toRow({ roomId, userId, userName, role, joinedAt: new Date().toISOString() }),
    { onConflict: 'room_id,user_id' }
  );
  if (error) { console.error('joinRoom error:', error); return false; }
  return true;
}

export async function leaveRoom(roomId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);
  if (error) { console.error('leaveRoom error:', error); return false; }
  return true;
}

export async function getUserRooms(userId: string): Promise<StudyRoom[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId);
  if (error || !data || data.length === 0) return [];
  const roomIds = data.map(r => r.room_id);
  const { data: rooms, error: err2 } = await supabase
    .from('study_rooms')
    .select('*')
    .in('id', roomIds)
    .order('created_at', { ascending: false });
  if (err2) { console.error('getUserRooms error:', err2); return []; }
  return (rooms || []).map(r => fromRow<StudyRoom>(r));
}

// ── Room Messages ──
export async function getRoomMessages(roomId: string, limit = 100): Promise<RoomMessage[]> {
  const { data, error } = await supabase
    .from('room_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) { console.error('getRoomMessages error:', error); return []; }
  return (data || []).map((r) => fromRow<RoomMessage>(r));
}

export async function sendRoomMessage(msg: Omit<RoomMessage, 'id'>): Promise<boolean> {
  const row = toRow({ ...msg, id: `rm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` });
  const { error } = await supabase.from('room_messages').insert(row);
  if (error) { console.error('sendRoomMessage error:', error); return false; }
  return true;
}
