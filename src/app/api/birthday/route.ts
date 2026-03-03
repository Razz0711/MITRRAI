// ============================================
// MitrAI - Birthday API
// GET: upcoming birthdays & today's birthday
// POST: send birthday wish
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllStudents, addNotification, hasWishedToday, addBirthdayWish, getBirthdayWishesForUser } from '@/lib/store';
import { BirthdayInfo } from '@/lib/types';
import { NOTIFICATION_TYPES } from '@/lib/constants';
import { sendPushToUser } from '@/lib/store/push-subscriptions';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

function getDayMonth(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}`;
}

function getDaysUntilBirthday(dobStr: string): number {
  const now = new Date();
  const dob = new Date(dobStr);
  const thisYear = now.getFullYear();

  // Birthday this year
  let birthday = new Date(thisYear, dob.getMonth(), dob.getDate());
  if (birthday < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    // Birthday already passed this year, look at next year
    birthday = new Date(thisYear + 1, dob.getMonth(), dob.getDate());
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// GET /api/birthday?days=7 — get upcoming birthdays
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`birthday:${authUser.id}`, 30, 60_000)) return rateLimitExceeded();
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const userId = searchParams.get('userId');

    // Fetch all students from DB — DOBs are now stored server-side
    const students = await getAllStudents();
    const birthdays: BirthdayInfo[] = [];

    for (const student of students) {
      if (!student.dob || !student.showBirthday) continue;

      const daysUntil = getDaysUntilBirthday(student.dob);

      if (daysUntil <= days) {
        birthdays.push({
          userId: student.id,
          userName: student.name,
          department: student.department || '',
          dayMonth: getDayMonth(student.dob),
          isToday: daysUntil === 0,
          daysUntil,
        });
      }
    }

    // Sort: today first, then closest upcoming
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);

    // Get wishes count for today's birthday persons
    const todayBirthdays = birthdays.filter(b => b.isToday);

    // Check if current user already wished each birthday person
    const wishedMap: Record<string, boolean> = {};
    if (userId) {
      for (const b of todayBirthdays) {
        wishedMap[b.userId] = await hasWishedToday(userId, b.userId);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        birthdays,
        todayBirthdays,
        wishedMap,
      }
    });
  } catch (error) {
    console.error('Birthday GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch birthdays' }, { status: 500 });
  }
}

// POST /api/birthday — send a birthday wish
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`birthday-wish:${authUser.id}`, 10, 60_000)) return rateLimitExceeded();
  try {
    const body = await request.json();
    const { fromUserId, fromUserName, toUserId } = body;

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ success: false, error: 'Missing user IDs' }, { status: 400 });
    }
    // Ownership: can only send wishes from yourself
    if (fromUserId !== authUser.id) return forbidden();

    // Check if already wished today
    if (await hasWishedToday(fromUserId, toUserId)) {
      return NextResponse.json({ success: false, error: 'You already wished them today!' }, { status: 400 });
    }

    // Add wish
    await addBirthdayWish({
      id: uuidv4(),
      fromUserId,
      fromUserName: fromUserName || 'Someone',
      toUserId,
      createdAt: new Date().toISOString(),
    });

    // Send notification to birthday person
    await addNotification({
      id: uuidv4(),
      userId: toUserId,
      type: NOTIFICATION_TYPES.BIRTHDAY_WISH,
      title: '🎂 Birthday Wish!',
      message: `${fromUserName || 'Someone'} wished you Happy Birthday! 🎉`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    sendPushToUser(toUserId, { title: '🎂 Birthday Wish!', body: `${fromUserName || 'Someone'} wished you Happy Birthday! 🎉`, url: '/home' }).catch(() => {});

    // Count total wishes
    const wishes = await getBirthdayWishesForUser(toUserId);
    const todayWishes = wishes.filter(w => w.createdAt.startsWith(new Date().toISOString().split('T')[0]));

    return NextResponse.json({
      success: true,
      data: { wishCount: todayWishes.length }
    });
  } catch (error) {
    console.error('Birthday POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send wish' }, { status: 500 });
  }
}
