/**
 * ============================================================
 *  main.js — نقطة الدخول (Entry Point) للعبة عبر Vite
 * ============================================================
 *  📚 درس — Vite يضيف Vite يدعم ES Modules مباشرة، فكل ملف
 *  يبدأ بـ import ويستورد ما يحتاجه. هذا الملف هو نقطة البداية
 *  التي ينفّذها المتصفح (نستدعيه بـ <script type="module" src="js/main.js">).
 *
 *  العمل هنا:
 *  1) نستورد فئة اللعبة وأدوات الواجهة.
 *  2) ننتظر جاهزية الصفحة (DOMContentLoaded) لنبدأ.
 *  3) ننشئ مثيل اللعبة ونربط الواجهة به.
 */
import { HandballGoalkeeperGame } from './game.js';
import { setupUI } from './ui.js';

/**
 * بدء اللعبة عندما تكون الصفحة جاهزة.
 * نستخدم DOMContentLoaded (بدل إنشاء فوري) حتى تكون
 * كل عناصر الواجهة موجودة في DOM قبل ربط الأحداث.
 */
document.addEventListener('DOMContentLoaded', () => {
    const game = new HandballGoalkeeperGame();
    setupUI(game);

    // نخزّنها عالمياً للوصول أثناء التطوير (مثل وحدة التحكم)
    window.gameInstance = game;
});
