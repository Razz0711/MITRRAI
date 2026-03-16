// ============================================
// MitrAI - Campus Feed Store
// CRUD for posts and reactions
// ============================================

import { supabase } from './core';

export interface CampusPost {
  id: string;
  userId: string;
  content: string;
  category: string;
  subcategory: string | null;
  location: string;
  lat: number | null;
  lng: number | null;
  isAnonymous: boolean;
  createdAt: string;
  // Joined fields
  userName?: string;
  userPhotoUrl?: string;
  reactions?: { imin: number; reply: number; connect: number };
  myReactions?: string[]; // which types current user reacted with
}

/** Fetch posts with optional filters */
export async function getFeedPosts(opts: {
  category?: string;
  location?: string;
  limit?: number;
  offset?: number;
  userId?: string; // current user, for myReactions
}): Promise<{ posts: CampusPost[]; total: number }> {
  const { category, location, limit = 20, offset = 0, userId } = opts;

  let query = supabase
    .from('campus_posts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  if (location && location !== 'anywhere') {
    query = query.eq('location', location);
  }

  const { data, error, count } = await query;
  if (error) { console.error('getFeedPosts error:', error); return { posts: [], total: 0 }; }

  const posts: CampusPost[] = (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    content: row.content,
    category: row.category,
    subcategory: row.subcategory,
    location: row.location,
    lat: row.lat,
    lng: row.lng,
    isAnonymous: row.is_anonymous,
    createdAt: row.created_at,
  }));

  if (posts.length === 0) return { posts: [], total: count || 0 };

  // Fetch user info for non-anonymous posts
  const nonAnonUserIds = Array.from(new Set(posts.filter(p => !p.isAnonymous).map(p => p.userId)));
  const userMap = new Map<string, { name: string; photoUrl: string | null }>();
  if (nonAnonUserIds.length > 0) {
    const { data: users } = await supabase
      .from('students')
      .select('id, name, photo_url')
      .in('id', nonAnonUserIds);
    (users || []).forEach(u => userMap.set(u.id, { name: u.name, photoUrl: u.photo_url }));
  }

  // Fetch reaction counts
  const postIds = posts.map(p => p.id);
  const { data: reactions } = await supabase
    .from('post_reactions')
    .select('post_id, type')
    .in('post_id', postIds);

  const reactionCounts = new Map<string, { imin: number; reply: number; connect: number }>();
  (reactions || []).forEach(r => {
    if (!reactionCounts.has(r.post_id)) {
      reactionCounts.set(r.post_id, { imin: 0, reply: 0, connect: 0 });
    }
    const counts = reactionCounts.get(r.post_id)!;
    if (r.type === 'imin') counts.imin++;
    else if (r.type === 'reply') counts.reply++;
    else if (r.type === 'connect') counts.connect++;
  });

  // Fetch current user's reactions
  const myReactionsMap = new Map<string, string[]>();
  if (userId) {
    const { data: myReactions } = await supabase
      .from('post_reactions')
      .select('post_id, type')
      .eq('user_id', userId)
      .in('post_id', postIds);
    (myReactions || []).forEach(r => {
      if (!myReactionsMap.has(r.post_id)) myReactionsMap.set(r.post_id, []);
      myReactionsMap.get(r.post_id)!.push(r.type);
    });
  }

  // Enrich posts
  for (const post of posts) {
    if (post.isAnonymous) {
      post.userName = 'Anonymous';
      post.userId = ''; // Strip user_id for anonymous posts
    } else {
      const user = userMap.get(post.userId);
      post.userName = user?.name || 'Unknown';
      post.userPhotoUrl = user?.photoUrl || undefined;
    }
    post.reactions = reactionCounts.get(post.id) || { imin: 0, reply: 0, connect: 0 };
    post.myReactions = myReactionsMap.get(post.id) || [];
  }

  return { posts, total: count || 0 };
}

/** Create a new post */
export async function createPost(opts: {
  userId: string;
  content: string;
  category: string;
  subcategory?: string;
  location?: string;
  lat?: number;
  lng?: number;
  isAnonymous?: boolean;
}): Promise<{ success: boolean; post?: CampusPost; error?: string }> {
  if (!opts.content.trim()) return { success: false, error: 'Content required' };
  if (opts.content.length > 280) return { success: false, error: 'Max 280 characters' };

  const { data, error } = await supabase
    .from('campus_posts')
    .insert({
      user_id: opts.userId,
      content: opts.content.trim(),
      category: opts.category,
      subcategory: opts.subcategory || null,
      location: opts.location || 'Campus',
      lat: opts.lat || null,
      lng: opts.lng || null,
      is_anonymous: opts.isAnonymous || false,
    })
    .select()
    .single();

  if (error) { console.error('createPost error:', error); return { success: false, error: 'Failed to create post' }; }
  return {
    success: true,
    post: {
      id: data.id,
      userId: opts.isAnonymous ? '' : data.user_id,
      content: data.content,
      category: data.category,
      subcategory: data.subcategory,
      location: data.location,
      lat: data.lat,
      lng: data.lng,
      isAnonymous: data.is_anonymous,
      createdAt: data.created_at,
    },
  };
}

/** Delete own post */
export async function deletePost(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  // Verify ownership
  const { data: post } = await supabase.from('campus_posts').select('user_id').eq('id', postId).single();
  if (!post) return { success: false, error: 'Post not found' };
  if (post.user_id !== userId) return { success: false, error: 'Not your post' };

  // Delete reactions first, then post
  await supabase.from('post_reactions').delete().eq('post_id', postId);
  const { error } = await supabase.from('campus_posts').delete().eq('id', postId);
  if (error) return { success: false, error: 'Failed to delete post' };
  return { success: true };
}

/** Toggle a reaction on a post */
export async function toggleReaction(postId: string, userId: string, type: string): Promise<{ success: boolean; active: boolean; counts: { imin: number; reply: number; connect: number }; error?: string }> {
  if (!['imin', 'reply', 'connect'].includes(type)) {
    return { success: false, active: false, counts: { imin: 0, reply: 0, connect: 0 }, error: 'Invalid reaction type' };
  }

  // Check if already reacted
  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('type', type)
    .limit(1);

  let active: boolean;
  if (existing && existing.length > 0) {
    // Remove reaction
    await supabase.from('post_reactions').delete().eq('id', existing[0].id);
    active = false;
  } else {
    // Add reaction
    await supabase.from('post_reactions').insert({
      post_id: postId,
      user_id: userId,
      type,
    });
    active = true;
  }

  // Get updated counts
  const { data: allReactions } = await supabase
    .from('post_reactions')
    .select('type')
    .eq('post_id', postId);

  const counts = { imin: 0, reply: 0, connect: 0 };
  (allReactions || []).forEach(r => {
    if (r.type === 'imin') counts.imin++;
    else if (r.type === 'reply') counts.reply++;
    else if (r.type === 'connect') counts.connect++;
  });

  return { success: true, active, counts };
}
