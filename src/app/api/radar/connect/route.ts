// ============================================
// MitrAI - Radar Connect API
// When someone clicks "Connect" on a broadcast:
//   1. Sends notification + push to the broadcaster
//   2. For anonymous pings: creates an anon chat room
//   3. For non-anonymous pings: returns chat redirect info
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { addNotification } from '@/lib/store/notifications';
import { sendPushToUser } from '@/lib/store/push-subscriptions';
import { generateAlias } from '@/lib/anon-aliases';
import { NOTIFICATION_TYPES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// POST /api/radar/connect — connect to someone's broadcast
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await req.json();
    const { pingId, connectorName } = body;

    if (!pingId) {
      return NextResponse.json({ success: false, error: 'pingId is required' }, { status: 400 });
    }

    // Look up the ping
    const { data: ping, error: pingErr } = await supabase
      .from('radar_pings')
      .select('*')
      .eq('id', pingId)
      .single();

    if (pingErr || !ping) {
      return NextResponse.json({ success: false, error: 'Broadcast not found or expired' }, { status: 404 });
    }

    const broadcasterId = ping.user_id as string;
    const broadcasterName = ping.user_name as string;
    const activityId = ping.activity_id as string;
    const isAnonymous = (ping.is_anonymous || false) as boolean;

    // Don't allow connecting to your own ping
    if (broadcasterId === authUser.id) {
      return NextResponse.json({ success: false, error: 'Cannot connect to your own broadcast' }, { status: 400 });
    }

    // Activity label for notification
    const ACTIVITIES: Record<string, string> = {
      'study-dsa': 'DSA Practice', 'study-math': 'Math Study', 'study-general': 'General Study',
      'music': 'Music Jam', 'cricket': 'Cricket', 'gym': 'Gym Buddy',
      'gaming': 'Gaming', 'chai': 'Chai & Chat', 'walk': 'Evening Walk',
      'movie': 'Watch Movie', 'food': 'Food Run', 'hangout': 'Just Hangout',
    };
    const actLabel = ACTIVITIES[activityId] || 'an activity';
    const displayName = connectorName || 'Someone';

    if (isAnonymous) {
      // ═══ ANONYMOUS CONNECT FLOW ═══
      // Create an anonymous chat room so both can talk without revealing identity
      const roomId = `radar_${uuidv4().slice(0, 8)}`;
      const connectorAlias = generateAlias();
      const broadcasterAlias = generateAlias();

      // Create the anon room
      const { error: roomErr } = await supabase.from('anon_rooms').insert({
        id: roomId,
        room_type: 'radar',
        status: 'active',
      });
      if (roomErr) {
        console.error('radar connect: create room error:', roomErr);
        return NextResponse.json({ success: false, error: 'Could not create anonymous room' }, { status: 500 });
      }

      // Add both members with anonymous aliases
      const { error: memberErr } = await supabase.from('anon_room_members').insert([
        { room_id: roomId, user_id: authUser.id, alias: connectorAlias },
        { room_id: roomId, user_id: broadcasterId, alias: broadcasterAlias },
      ]);
      if (memberErr) {
        console.error('radar connect: add members error:', memberErr);
      }

      // Send notification to broadcaster (embed roomId so deeplink goes directly to the room)
      const notifId = uuidv4();
      await addNotification({
        id: notifId,
        userId: broadcasterId,
        type: NOTIFICATION_TYPES.RADAR_CONNECT,
        title: '🤝 Anonymous Connect!',
        message: `Someone wants to join you for ${actLabel}! Tap to chat anonymously. {{room:${roomId}}}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      // Send push notification
      sendPushToUser(broadcasterId, {
        title: '🤝 Anonymous Connect!',
        body: `Someone wants to join you for ${actLabel}! Open to chat anonymously.`,
        url: `/anon/${roomId}`,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: {
          type: 'anonymous',
          roomId,
          alias: connectorAlias,
        },
      });

    } else {
      // ═══ REGULAR CONNECT FLOW ═══
      // Send notification to broadcaster that someone wants to connect

      const notifId = uuidv4();
      await addNotification({
        id: notifId,
        userId: broadcasterId,
        type: NOTIFICATION_TYPES.RADAR_CONNECT,
        title: '🤝 Someone wants to connect!',
        message: `${displayName} wants to join you for ${actLabel}! Check your messages.`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      // Send push notification
      sendPushToUser(broadcasterId, {
        title: '🤝 Connect Request!',
        body: `${displayName} wants to join you for ${actLabel}!`,
        url: '/chat',
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: {
          type: 'direct',
          broadcasterId,
          broadcasterName,
        },
      });
    }

  } catch (err) {
    console.error('radar connect error:', err);
    return NextResponse.json({ success: false, error: 'Failed to connect' }, { status: 500 });
  }
}
