/**
 * ============================================================
 *  fun.js — طبقة "الفِلّة": نكات، شارات، ألقاب، وأصوات مضحكة
 * ============================================================
 *  📚 درس — فصل المرح عن المنطق:
 *  كل ما يخص المتعة والعفوية (بدون أي تأثير على طريقة اللعب)
 *  في هذا الملف. يظل منطق اللعبة (النقاط/الوقت/الأهداف) كما هو.
 */

// نِكْنِيمَات للمضاعفات / الإنجازات (عناوين مضحكة فقط)
export const TITLES = {
  1: 'Rookie 🐣',
  2: 'Getting spicy 🌶️',
  3: 'Low-key baller 🏀',
  5: 'On fire 🔥',
  8: 'GOAT in training 🐐',
  10: 'Absolute LEGEND 👑',
  15: 'Handball GOD ⚡',
};

// نِكْنَام لرقم قياسي جديد (عشوائي)
export const NEW_BEST_TITLES = [
  '🐐 GOAT SZN',
  '👑 Certified legend',
  '🔥 Literally unplayable',
  '🚀 You broke the game',
  '💪 Gym hero vibes',
  '🏆 Record shattered',
];

// تعليقات ساخرة تظهر عشوائياً
export const TAUNTS = {
  good: [
    'Nice! 🎯', 'Clean shot! ✨', 'Basic but ok 😎', 'Warm-up 😏',
    'Your reflexes are showing 😳', 'EZ money 🤑', 'Precision! 🎯',
  ],
  combo: [
    'COMBO KING 👑', 'Stop it, it’s unfair 😤', 'Machine! 🤖',
    'Are you even human? 🤨', 'Ok ok we see you 👀',
  ],
  bad: [
    'That was a TRAP! 🚨', 'Yikes 😬', 'Ouch, butter fingers 🧈',
    'Why would you click that? 😭', 'Should have dodged! 💨',
  ],
  miss: [
    'So close! 👻', 'The ball is winning 😤', 'Focus! 🧠',
    'Breathe… ☕', 'It moved, I swear! 🪄',
  ],
};

// شارات/أوسمة تُفتح أثناء اللعب وتُحفظ مع المحاولة
export function medalsFor({ bestStreak, hits, accuracy, score, golds, isNewBest }) {
  const medals = [];
  if (bestStreak >= 10) medals.push({ icon: '🔥', name: 'Unstoppable' });
  else if (bestStreak >= 5) medals.push({ icon: '⚡', name: 'On Fire' });
  if (hits >= 10) medals.push({ icon: '🎯', name: 'Sharpshooter' });
  if (accuracy >= 80 && hits > 0) medals.push({ icon: '🎯', name: 'Precision' });
  else if (accuracy >= 60 && hits > 0) medals.push({ icon: '👌', name: 'Solid Aim' });
  if (score >= 100) medals.push({ icon: '🏆', name: 'Century' });
  else if (score >= 50) medals.push({ icon: '🏅', name: 'Half-Century' });
  if (golds >= 3) medals.push({ icon: '🥇', name: 'Golden Gut' });
  else if (golds >= 1) medals.push({ icon: '✨', name: 'Golden Touch' });
  if (isNewBest) medals.push({ icon: '🐐', name: 'New Record' });
  return medals.slice(0, 4); // حد أقصى 4 أوسمة لكل محاولة
}

/** اختيار عنصر عشوائي من مصفوفة. */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** تعليق عشوائي حسب النوع. */
export function randomTaunt(kind) {
  const list = TAUNTS[kind];
  return list ? pick(list) : '';
}

/** لقب عشوائي رقم قياسي جديد. */
export function randomNewBestTitle() {
  return pick(NEW_BEST_TITLES);
}

/** اللقب المطابق لطول السلسلة الحالية (إن تطابق تماماً). */
export function titleForStreak(streak) {
  if (TITLES[streak]) return TITLES[streak];
  return '';
}
