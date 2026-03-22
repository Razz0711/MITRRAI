// ============================================
// MitrRAI - Arya Sticker Library
// Emoji-based sticker pack for Arya/Aryan chat
// ============================================

export interface Sticker {
  emoji: string;
  label: string;
  color: string; // gradient colors
}

export const STICKERS: Record<string, Sticker> = {
  hug:       { emoji: '🤗',    label: 'Sending you a hug!',   color: 'from-pink-500/20 to-rose-500/20' },
  heart:     { emoji: '💕',    label: 'Lots of love!',         color: 'from-red-500/20 to-pink-500/20' },
  laugh:     { emoji: '😂',    label: 'Hahaha!!',              color: 'from-yellow-500/20 to-amber-500/20' },
  shock:     { emoji: '😱',    label: 'OMG!!',                 color: 'from-violet-500/20 to-purple-500/20' },
  cry:       { emoji: '😢',    label: 'This made me sad...',   color: 'from-blue-500/20 to-cyan-500/20' },
  star:      { emoji: '⭐✨',  label: "You're amazing!",       color: 'from-amber-500/20 to-yellow-500/20' },
  study:     { emoji: '📚✏️',  label: "Let's study!",          color: 'from-emerald-500/20 to-teal-500/20' },
  bye:       { emoji: '👋',    label: 'See you later!',        color: 'from-sky-500/20 to-blue-500/20' },
  coffee:    { emoji: '☕',    label: 'Coffee break?',         color: 'from-amber-600/20 to-orange-500/20' },
  fire:      { emoji: '🔥',    label: "You're on fire!",       color: 'from-orange-500/20 to-red-500/20' },
  blush:     { emoji: '🥺💕',  label: 'Awww...',               color: 'from-rose-500/20 to-pink-500/20' },
  flex:      { emoji: '💪',    label: 'Go for it!',            color: 'from-indigo-500/20 to-violet-500/20' },
  celebrate: { emoji: '🎉🥳',  label: "Let's celebrate!",      color: 'from-violet-500/20 to-pink-500/20' },
  goodnight: { emoji: '🌙😴',  label: 'Good night!',           color: 'from-indigo-900/30 to-violet-800/20' },
  thinking:  { emoji: '🤔💭',  label: 'Hmm let me think...',   color: 'from-slate-500/20 to-gray-500/20' },
};

export function getStickerIds(): string {
  return Object.keys(STICKERS).join(', ');
}
