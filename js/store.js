/**
 * ============================================================
 *  Zustand Store — إدارة حالة اللعبة (أفضل نتيجة + سجل المحاولات)
 * ============================================================
 *  📚 درس — Zustand:
 *  مكتبة صغيرة لإدارة الحالة (State) بطريقة React-like بدون
 *  الحاجة إلى React نفسه. نعرّف store عبر create() ونصل إليه
 *  في أي ملف عبر useGameStore.getState() أو subscribe.
 *
 *  ⚠️ مهم — نستورد من zustand/vanilla (المحرك النقي) وليس من
 *  zustand (ذات الإدخال الرئيسي) لأن الإدخال الرئيسي يتطلب React
 *  كاعتماد مساعد (peer dependency). بما أن هذه اللعبة Canvas خالصة
 *  بلا React، نستخدم المحرك الفانيلا الذي لا يحتاج أي مكتبة خارجية.
 *  كما أن persist من zustand/middleware يعمل معه بشكلٍ متوافق.
 *
 *  هنا نستخدم middleware-persist (من zustand/middleware) ليحفظ
 *  الحالة في localStorage تلقائياً — فيبقى أفضل نتيجة وسجل
 *  المحاولات محفوظين حتى بعد إغلاق المتصفح.
 */
import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';

// معرف مفتاح التخزين (نفس المفتاح القديم حتى لا تفقد النتيجة السابقة)
const STORAGE_KEY = 'hbg_best';

/**
 * كائن الحالة والـ actions.
 * - tries: مصفوفة المحاولات السابقة (أحدثها أولاً)
 * - best: أعلى نتيجة تم تحقيقها على الإطلاق
 * - recordTry: يُسجّل محاولة جديدة ويحدّث أفضل نتيجة
 * - clearTries: يحذف سجل المحاولات بالكامل
 */
export const useGameStore = createStore(
  persist(
    (set, get) => ({
      best: 0,
      tries: [],

      /**
       * تسجيل محاولة جديدة عند انتهاء الجولة.
       * @param {object} data - { score, hits, accuracy, bestStreak, difficulty, medals }
       * نضيف المحاولة للأعلى (الأحدث أولاً) ونحدّث أفضل نتيجة إن لزم.
       */
      recordTry: (data) => {
        const { best, tries } = get();
        const tryEntry = {
          id: Date.now() + Math.random(),      // معرف فريد لكل محاولة
          score: data.score || 0,
          hits: data.hits || 0,
          accuracy: data.accuracy || 0,
          bestStreak: data.bestStreak || 0,
          difficulty: data.difficulty || 'medium',
          medals: Array.isArray(data.medals) ? data.medals : [],
          date: new Date().toISOString(),      // تاريخ المحاولة
        };
        const newBest = Math.max(best, tryEntry.score);
        // نقتصر على آخر 100 محاولة لتفادي انتفاخ التخزين
        const newTries = [tryEntry, ...tries].slice(0, 100);
        set({ tries: newTries, best: newBest });
        return newBest;
      },

      /** حذف كل سجل المحاولات (يبقى أفضل نتيجة محفوظة). */
      clearTries: () => set({ tries: [] }),

      /** إعادة ضبط كل شيء (أفضل نتيجة وتاريخ). */
      resetAll: () => set({ best: 0, tries: [] }),
    }),
    {
      name: STORAGE_KEY,   // المفتاح في localStorage
      version: 1,
    }
  )
);
