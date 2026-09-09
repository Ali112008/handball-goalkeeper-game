/**
 * ============================================================
 *  ES Module imports — عبر Vite
 * ============================================================
 *  📚 درس — وحدات ES (ES Modules):
 *  قسمنا اللعبة إلى وحدات مستقلة: مدير الأهداف (targets) وحالة
 *  اللعبة المحفوظة (store). نستوردها هنا بـ import عوضاً عن
 *  تحميلها بالترتيب في HTML كما قبل.
 */
import { TargetManager } from './targets.js';
import { useGameStore } from './store.js';
import { medalsFor, randomTaunt, randomNewBestTitle, titleForStreak } from './fun.js';

/**
 * ============================================================
 *  SoundFX — مؤثرات صوتية بدون أي ملفات صوت! 🎵
 * ============================================================
 *  📚 درس رائع — Web Audio API:
 *  المتصفح يستطيع توليد الأصوات رياضياً (مثل الآلة الحاسبة
 *  الموسيقية)! ننشئ "مذبذب" (Oscillator) يهتز بتردد معين
 *  فيسمعه المستخدم كنغمة. الملفات الصوتية غير مطلوبة إطلاقاً.
 */
class SoundFX {
    constructor() { this.enabled = true; this.ctx = null; }

    /**
     * إنشاء AudioContext عند الحاجة فقط.
     * 📚 درس — قاعدة المتصفحات الأمنية:
     * المتصفح يمنع تشغيل الصوت قبل تفاعل المستخدم (نقرة/لمسة).
     * لذلك لا ننشئ السياق في البداية، بل عند أول نقرة.
     * try/catch تحمينا من المتصفحات القديمة.
     */
    ensureCtx() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { this.enabled = false; }   // متصفح قديم → عطّل الصوت بهدوء
        }
        // إذا كان الصوت "معلقاً" (موقوفاً من المتصفح) → استأنفه
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    /**
     * تشغيل نغمة (Beep) واحدة.
     * 📚 درس — المعاملات الافتراضية (Default Parameters):
     * beep() بدون معاملات = 600 هرتز لمدة 0.08 ثانية.
     * 📚 درس — exponentialRampToValueAtTime:
     * يخفض الصوت تدريجياً (لا فجأة) فيصبح طبيعياً كأنك تخفض
     * زر الصوت بسرعة، بدلاً من "قطع" الصوت بشكل مزعج.
     */
    beep(freq = 600, duration = 0.08, type = 'sine', volume = 0.15, opts = {}) {
        if (!this.enabled) return;      // الصوت مكتوم من زر 🔇
        this.ensureCtx();
        if (!this.ctx) return;         // فشل إنشاء السياق → اخرج بهدوء

        const osc = this.ctx.createOscillator();   // المذبذب: يولد الموجة
        const gain = this.ctx.createGain();        // التحكم بمستوى الصوت

        osc.type = type;               // شكل الموجة: sine ناعمة، sawtooth خشنة
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);    // التردد: هرتز أعلى = صوت أعلى حدة

        // 📚 اختياري — انزلاق ترددي (opts.slideTo): يغير التردد تدريجياً
        // خلال المدة (مثل صوت "boing" المطاطي). يتجاهل الجميع إن غاب.
        if (opts.slideTo) {
            osc.frequency.exponentialRampToValueAtTime(opts.slideTo, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);                              // ابدأ بمستوى الصوت المطلوب
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);      // خفّض تدريجياً حتى الصفر

        // 📚 درس — توصيل المسار الصوتي (سلسلة):
        // المذبذب → التحكم بالصوت → مكبر الصوت (destination)
        osc.connect(gain).connect(this.ctx.destination);

        osc.start();                                      // ابدأ الاهتزاز
        osc.stop(this.ctx.currentTime + duration);      // وتوقف بعد المدة
    }

    /** نغمة صاعدة مزدوجة عند إصابة هدف أخضر. */
    hit()  { this.beep(660, 0.06); setTimeout(() => this.beep(880, 0.08), 40); }
    /** صوت أزيز منخفض للكرات الحمراء (موجة sawtooth الخشنة). */
    bad()  { this.beep(200, 0.2, 'sawtooth', 0.12); }
    /** أربيجيو (نغمات متتالية صاعدة) للكرة الذهبية — مثل كنز! */
    bonus() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, 0.09, 'triangle'), i * 70)); }
    /** نغمة هابطة حزينة عند الخطأ. */
    miss() { this.beep(300, 0.08); setTimeout(() => this.beep(220, 0.1), 60); }
    /** نغمات ختامية عند انتهاء الوقت. */
    over() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.beep(f, 0.22, 'triangle', 0.18), i * 180)); }
}

/**
 * ============================================================
 *  LoFiMusic — موسيقى خلفية "لو-فاي" مبرمجة بالكامل 🎧
 * ============================================================
 *  📚 درس — توقيت الموسيقى (Lookahead Scheduler):
 *  بدل setInterval لكل نغمة (قد يتأخر ويهدرر)، نجعل مؤقتاً
 *  واحداً يتقدم "بخطوة" وينظم النغمات القادمة قبل موعدها بهامش
 *  صغير (0.3 ثانية). هذه هي الطريقة الاحترافية لمزامنة الصوت.
 *
 *  الموسيقى: إيقاع هادئ 76 نبضة/دقيقة — كِك (باس منخفض)،
 *  سناير عالٍ، هاي هات خفيف، بالإضافة إلى خط باس وعقد لطيفة.
 *  كل أصواتها مبنية من المذبذبات والضوضاء — بلا ملفات صوتية.
 */
class LoFiMusic {
    constructor(game) {
        this.game = game;
        this.enabled = true;
        this.ctx = null;
        this.timer = null;
        this.step = 0;
        this.nextTime = 0;
        this.bpm = 76;
    }

    stepDur() { return (60 / this.bpm) / 2; }   // نصف نوتة (المدة الزمنية لكل خطوة)

    start() {
        if (!this.enabled || this.timer) return;
        this.game.sound.ensureCtx();                 // أنشئ/استأنف AudioContext (نفس سياق المؤثرات)
        this.ctx = this.game.sound.ctx;
        if (!this.ctx) return;
        this.step = 0;
        this.nextTime = this.ctx.currentTime + 0.1;
        this.timer = setInterval(() => this.tick(), 90);
    }

    stop() {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    toggle() {
        if (this.timer) this.stop(); else this.start();
        return this.timer !== null;
    }

    isPlaying() { return this.timer !== null; }

    /** المؤقت "ينظر للأمام" وينظم كل الخطوات القادمة قبل موعدها. */
    tick() {
        if (!this.ctx) return;
        const horizon = this.ctx.currentTime + 0.3;
        while (this.nextTime < horizon) {
            this.scheduleStep(this.step, this.nextTime);
            this.step += 1;
            this.nextTime += this.stepDur();
        }
    }

    /** ترتيب نغمة/ضربة واحدة عند خطوة معينة. */
    scheduleStep(step, t) {
        const b16 = step % 16;
        const bar = Math.floor(step / 16) % 4;

        // كِك على "ضربات" الإيقاع (كل 4 خطوات)
        if (b16 % 4 === 0) this.kick(t);
        // سناير خفيف (الضربة الثانية من كل شطر)
        if (b16 === 4 || b16 === 12) this.snare(t);
        // هاي-هات خافت على النصفات، ألمع على "و"
        if (b16 % 2 === 1) this.hat(t, b16 % 8 === 3 ? 0.045 : 0.028);
        // خط الباس الهادي (يمشي بين أصل العقد والدرجات)
        if (b16 % 2 === 0) this.bass(t, b16);
        // عقد الأرغن الناعمة عند بداية كل إيقاع
        if (b16 === 0) this.pad(t, bar);
    }

    /** كِك: نغمة باس منخفض ينخفض ترددها (مثل "دم") — سر الخشونة الدافئة. */
    kick(t) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(g).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.2);
    }

    /** سناير: موجة ضوضاء قصيرة مرشحة عند التردد المتوسط العالي. */
    snare(t) { this.noise(t, 0.13, 0.12, 'bandpass', 1900); }

    /** هاي-هات: قطعة ضوضاء قصيرة جداً عالية التردد. */
    hat(t, vol) { this.noise(t, 0.035, vol, 'highpass', 7000); }

    /** ضوضاء مرشّحة (بودرة لصناعة الطبقات). */
    noise(start, dur, vol, filterType, filterFreq) {
        if (!this.ctx) return;
        const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, start);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        src.connect(g);
        if (filterType) {
            const flt = this.ctx.createBiquadFilter();
            flt.type = filterType;
            flt.frequency.setValueAtTime(filterFreq, start);
            g.connect(flt); flt.connect(this.ctx.destination);
        } else {
            g.connect(this.ctx.destination);
        }
        src.start(start);
    }

    /** خط الباس: وترية منخفضة ناعمة (ترتيب يوحي بوتر أم الصغير). */
    bass(t, b16) {
        if (!this.ctx) return;
        const WALK = [57, 0, 57, 55, 53, 0, 53, 48, 53, 0, 55, 60, 0, 59, 57, 0];
        const m = WALK[b16 % 16];
        if (!m) return;
        const f = 440 * Math.pow(2, (m - 69) / 12);
        this.note('triangle', f, t, 0.26, 0.07, 520);
    }

    /** عقد مكتومة ناعمة تبدأ كل إيقاع (جو لوفي). */
    pad(t, bar) {
        if (!this.ctx) return;
        const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am7 – Fmaj7 – Cmaj7 – G
        chords[bar % 4].forEach(n => {
            const f = 440 * Math.pow(2, (n - 69) / 12);
            this.note('triangle', f, t, 4.2, 0.018, 300);
        });
    }

    /** نغمة واحدة ناعمة (مع مرشح منخفض إن مررنا التردد). */
    note(type, freq, start, dur, vol, filterFreq = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(vol, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(g);
        if (filterFreq) {
            const flt = this.ctx.createBiquadFilter();
            flt.type = 'lowpass';
            flt.frequency.setValueAtTime(filterFreq, start);
            g.connect(flt); flt.connect(this.ctx.destination);
        } else {
            g.connect(this.ctx.destination);
        }
        osc.start(start); osc.stop(start + dur + 0.05);
    }
}

/**
 * ============================================================
 *  HandballGoalkeeperGame — محرك اللعبة الرئيسي 🥅
 * ============================================================
 *  هذه الفئة تدير كل شيء: النقاط، الوقت، الرسم، الأحداث...
 *
 *  الميزات:
 *  - بدء / إيقاف مؤقت / إعادة تعيين + اختصار زر المسافة
 *  - عد تنازلي 3-2-1-انطلق قبل كل جولة
 *  - مضاعف سلسلة الإصابات (x2 عند 5 إصابات متتالية، x3 عند 10)
 *  - كرات ذهبية إضافية (+25 نقطة و +2 ثانية)
 *  - حفظ أعلى نتيجة في localStorage (تبقى حتى بعد إغلاق المتصفح!)
 *  - دعم اللمس والماوس معاً (Pointer Events)
 *  - إيقاف مؤقت تلقائي عند إخفاء التبويب
 *
 *  📚 درس — نمط تصميم شائع في الألعاب:
 *  1) حدث (نقرة) → 2) تحديث المنطق (نقاط/فيزياء) → 3) رسم
 *  هذا "حلقة اللعبة" (Game Loop) تتكرر ~60 مرة بالثانية.
 */
class HandballGoalkeeperGame {
    constructor() {
        // ---------- 1) ربط عناصر الواجهة (DOM) ----------
        // 📚 درس — Canvas و Context:
        // الكانفاس هو "لوحة رسم" 800×600 بكسل، و ctx هو
        // "الفرشاة" التي نرسم بها عليها (دوائر، خطوط، نصوص...)
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');           // عنصر النقاط
        this.timeElement = document.getElementById('time');               // عنصر الوقت
        this.streakElement = document.getElementById('streak');          // عنصر السلسلة
        this.bestElement = document.getElementById('best');             // عنصر الأفضل
        this.timerBox = document.getElementById('timerBox');             // صندوق الوقت (يتوهج أحمر)
        this.startOverlay = document.getElementById('startOverlay');     // شاشة البداية/الإيقاف
        this.gameOverOverlay = document.getElementById('gameOverOverlay'); // شاشة النهاية
        this.countdownOverlay = document.getElementById('countdownOverlay'); // شاشة العد التنازلي
        this.countdownText = document.getElementById('countdownText');   // نص العد (3/2/1/انطلق)

        // ---------- UI Effect Elements ----------
        this.gameArea = document.getElementById('gameArea');
        this.flashRed = document.getElementById('flashRed');
        this.flashGold = document.getElementById('flashGold');
        this.flashGreen = document.getElementById('flashGreen');
        this.comboPopup = document.getElementById('comboPopup');
        this.slowmoIndicator = document.getElementById('slowmoIndicator');
        this.milestoneBadge = document.getElementById('milestoneBadge');
        this.timerBar = document.getElementById('timerBar');
        this.tauntEl = document.getElementById('taunt');
        this.titleEl = document.getElementById('bonusTitle');
        this.chipShield = document.getElementById('chipShield');
        this.chipMagnet = document.getElementById('chipMagnet');
        this.chipFreeze = document.getElementById('chipFreeze');

        // ---------- 2) حالة اللعبة (State) ----------
        // 📚 درس — "الحالة" هي كل البيانات التي تصف اللعبة الآن:
        // النقاط الحالية، الوقت المتبقي... فصلها عن الرسم مهم جداً.
        this.score = 0;               // النقاط الحالية
        this.timeLeft = 60;           // الوقت المتبقي بالثواني
        this.totalTime = 60;          // إجمالي الوقت (لحساب شريط التقدم)
        this.gameActive = false;      // هل الجولة تسير الآن؟
        this.gameStarted = false;     // هل بدأت أول جولة على الإطلاق؟
        this.countingDown = false;    // هل نحن في العد التنازلي 3-2-1؟
        this.gameLoopId = null;       // معرّف حلقة الرسم (لإيقافها لاحقاً)
        this.timerInterval = null;    // معرّف مؤقت الثانية الواحدة
        this.difficulty = 'medium';   // الصعوبة الحالية
        this.targetSpawnRate = 1000;  // كل كم مللي ثانية يظهر هدف جديد
        this.lastTargetSpawn = 0;     // وقت آخر هدف وُلد (للمقارنة)
        this.streak = 0;              // إصابات متتالية بدون خطأ
        this.bestStreak = 0;          // أطول سلسلة حققتها بالجولة
        this.hits = 0;                // عدد الإصابات الناجحة
        this.clicks = 0;             // عدد كل النقرات (لحساب الدقة)
        this.golds = 0;              // عدد الكرات الذهبية الملتقطة (للأوسمة)
        this.multiplierShown = 1;     // المضاعف المعروض حالياً (لكشف التغيير)
        this.slowmoActive = false;    // هل السلوو-مو نشط؟
        this.slowmoTimeout = null;    // مؤقت إنهاء السلوو-مو

        // ---------- وضع اللعب (Game Mode) ----------
        // 📚 درس — أوضاع لعب مختلفة بنفس المحرك:
        // mode تحدد سلوك الوقت والعقاب، وكل وضع يحفظ رقماً
        // قياسياً خاصاً به في localStorage.
        this.mode = 'classic';        // classic | survival | onelife
        this.wave = 1;                // رقم الموجة الحالية (تصاعد تدريجي)
        this.timeElapsed = 0;         // ثوانٍ انقضت منذ بدء الجولة (للأمواج)

        // ---------- قوى إضافية (Power-ups) ----------
        this.shieldActive = false;    // درع يحمي من الكرة الحمراء القادمة
        this.magnetActive = false;    // مغناطيس: الكرات الخضراء تُسحب للمؤشر
        this.magnetTimeout = null;
        this.freezeActive = false;    // تجميد: الزمن يتوقف (تنفس!)
        this.freezeTimeout = null;

        // ---------- المؤشر (للوحة المفاتيح و يد التحكم) ----------
        this.cursorX = 0;             // مؤشر تصويب للكيبورد/يد التحكم (إحداثيات كانفاس)
        this.cursorY = 0;
        this.cursorMode = 'pointer';  // pointer | key | pad
        this.lastFrame = 0;
        this.keys = {};
        this.padFireLock = false;
        this.padPauseLock = false;
        // 📚 درس — الحالة المحفوظة عبر Zustand store:
        // نقرأ أفضل نتيجة من useGameStore (المحفوظة في localStorage
        // تلقائياً عبر middleware-persist). فيبقى الرقم حتى بعد الإغلاق.
        this.best = useGameStore.getState().best;

        // ---------- 3) أبعاد الكانفاس والمرمى ----------
        // 📚 درس — Canvas متجاوب مع الجهاز (Responsive Canvas):
        // الهاتف يعرض الكانفاس بحجم أصغر لكن بدقة أعلى (devicePixelRatio
        // = عادة 2 أو 3). لذلك نضبط الحجم الداخلي على حجم العرض الفعلي ×
        // دقة الجهاز، ثم نرسم المرمى والأهداف بنِسَبٍ من الحجم لا بأرقام
        // ثابتة — فيكبر كل شيء تلقائياً على الشاشات الكبيرة.
        this.dpr = window.devicePixelRatio || 1;
        this.resizeCanvas();

        // ---------- 4) إنشاء المديرين ----------
        this.targetManager = new TargetManager(this);   // نمرر اللعبة نفسها له!
        this.sound = new SoundFX();

        // ---------- 5) التهيئة الأولى ----------
        this.initEventListeners();   // اربط الأزرار والنقرات
        this.drawGoal();             // ارسم المرمى للمرة الأولى
        this.updateHUD();            // اعرض النقاط في الواجهة
        this.bestElement.textContent = this.best;   // اعرض أفضل نتيجة محفوظة
    }

    /**
     * ضبط الحجم الداخلي للكانفاس ليطابق حجمه المعروض × دقة الجهاز.
     * 📚 درس — لماذا × dpr؟ لأن الهاتف عالي الدقة يعرض كل بكسل CSS
     * بـ 2-3 بكسل فيزيائي. إن أبقينا الكانفاس 800×600 سيبقى الرسم
     * صغيراً. بجعل الحجم الداخلي يساوي الحجم الفعلي نملأ الشاشة كلها.
     */
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width * this.dpr));
        const h = Math.max(1, Math.round(rect.height * this.dpr));
        if (this.canvas.width !== w) this.canvas.width = w;
        if (this.canvas.height !== h) this.canvas.height = h;
        this.width = w;
        this.height = h;
        this.cssWidth = rect.width;      // العرض ببكسل CSS (نسباً للحسابات)
        this.cssHeight = rect.height;
        this.computeGoal();
    }

    /**
     * حساب أبعاد المرمى بنِسَبٍ من حجم الكانفاس (لا أرقام ثابتة).
     * بهذا يتمدد المرمى ليملأ الشاشة مهما كان مقاسها.
     * 📚 درس — مقياس الأحجام contentScale: يُعيد ضرب مقاسات العناصر
     * (الأهداف والنصوص والخطوط) حسب حجم الشاشة بالنسبة للتصميم المرجعي 600px.
     */
    computeGoal() {
        this.goalWidth = this.width * 0.62;    // المرمى يأخذ 62% من العرض
        this.goalHeight = this.height * 0.56;  // و56% من الارتفاع
        this.goalX = (this.width - this.goalWidth) / 2;
        this.goalY = this.height * 0.06;       // قليل من الهامش أعلى المرمى
        // 📚 مقياس المحتوى: يحوّل أحجام العناصر من "بكسل كانفاس" إلى
        // حجم معقول على الشاشة. canvas بكسل = CSS بكسل × dpr، لنضرب بدقة
        // الجهاز حتى تظهر الأهداف والخطوط بحجم واحد واضح على كل المقاسات.
        // (كلما كانت أصغر شاشة أصغر، نكبر قليلاً لنحافظ على سهولة اللمس)
        this.contentScale = this.dpr * Math.min(this.cssWidth, this.cssHeight) / 600;
    }

    /** ربط كل أحداث الواجهة (الأزرار، النقر، لوحة المفاتيح). */
    initEventListeners() {        // 📚 درس — الدوال السهمية (=>) داخل الفئة:
        // نستخدم () => this.startGame() وليس this.startGame
        // لأن الدالة السهمية تحافظ على معنى "this" (اللعبة الحالية).
        // لو استخدمنا دالة عادية لأصبح "this" هو الزر نفسه — خطأ شائع!
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('startBtn2').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());

        // 📚 درس مهم — Pointer Events بدلاً من click:
        // الحدث pointerdown يعمل مع الماوس واللمس والقلم معاً،
        // وينطلق فوراً على الهاتف (حدث click التقليدي يتأخر ~300ms!).
        this.canvas.addEventListener('pointerdown', (event) => this.handleCanvasClick(event));
        // منع النقرات المزدوجة / القوائم السياقية من إزعاج اللاعب
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // زر المسافة = إيقاف/استئناف (اختصار لوحة المفاتيح)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameStarted && !this.countingDown) {
                e.preventDefault();   // امنع المتصفح من تمرير الصفحة عند ضغط المسافة
                this.togglePause();
            }
        });

        // 📚 درس — إيقاف تلقائي عند مغادرة التبويب:
        // لو فتح المستخدم تبويباً آخر واللعبة مستمرة، سيفقد
        // أهدافاً بلا نقاط. الحدث visibilitychange يخبرنا بأن
        // المستخدم غاب → نوقف مؤقتاً تلقائياً (عدالة للعب!).
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameActive) this.pauseGame();
        });

        // 📚 درس — إعادة الضبط عند تغيير الحجم/تدوير الجهاز:
        // لو أدار المستخدم هاتفه أو غيّر حجم النافذة، نعيد ضبط
        // أبعاد الكانفاس وموقع المرمى ليلائما الجديد فوراً.
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (this.gameActive) this.drawGoal();
        });
    }

    /** بدء جولة جديدة (تصفير الحالة ثم العد التنازلي). */
    startGame() {
        // حماية: لا تبدأ إذا كنا في العد التنازلي أو اللعبة تسير
        if (this.countingDown || this.gameActive) return;

        // 📚 درس — تصفير الحالة بداية كل جولة:
        // كل جولة جديدة تبدأ من الصفر: نقاط، وقت، إحصائيات.
        this.score = 0;
        this.timeLeft = 60;
        this.totalTime = 60;
        this.streak = 0;
        this.bestStreak = 0;
        this.hits = 0;
        this.clicks = 0;
        this.golds = 0;
        this.titleShown = '';
        this.lastHitX = null;
        this.lastHitY = null;
        this.multiplierShown = 1;
        // سرعة ظهور الأهداف حسب الصعوبة المختارة (مللي ثانية بين هدف وآخر)
        this.targetSpawnRate = { easy: 1400, medium: 1000, hard: 700 }[this.difficulty];
        this.targetManager.clearTargets();  // امسح أهداف الجولة السابقة
        this.clearCanvas();                 // نظف لوحة الرسم
        this.drawGoal();                    // ارسم المرمى من جديد
        this.updateHUD();                   // حدّث النقاط المعروضة
        this.timeElement.textContent = this.timeLeft;   // اعرض 60 ثانية
        this.timerBox.classList.remove('warning');      // أزل تحذير الوقت الأحمر
        this.updateTimerBar();                          // حدّث شريط الوقت
        this.hideMilestoneBadge();                      // أخفِ شارة الإنجاز
        this.hideComboPopup();                          // وأخفِ نبضة المضاعف
        this.gameArea.classList.remove('shake', 'shake-hard');  // أزل أي اهتزاز سابق
        this.hideSlowmo();                              // أوقف السلوو-مو إن كان نشطاً

        // أخفِ شاشتي البداية والنهاية — ستبدأ الجولة بعد العد
        this.startOverlay.classList.add('hidden');
        this.gameOverOverlay.classList.add('hidden');

        // العد التنازلي ثم الانطلاق!
        this.countingDown = true;
        this.runCountdown(() => {
            this.countingDown = false;
            this.gameStarted = true;
            this.gameActive = true;
            // 📚 ابدأ حلقة اللعبة — لاحظ تمرير timestamp (هذا كان الخطأ القديم!)
            this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts));
            this.startTimer();
        });
    }

    /**
     * العد التنازلي 3-2-1-انطلق.
     *
     * 📚 درس — الاستدعاء الرجعي (Callback):
     * نمرر "دالة" كمعامل (onDone) تُستدعى لاحقاً عند انتهاء
     * العد. بهذا تصبح الدالة عامة: "افعل شيئاً ما بعد العد".
     *
     * 📚 درس — إعادة تشغيل أنيميشن CSS من الجافاسكريبت:
     * الحيلة: أوقف الأنيميشن → أجبر المتصفح على إعادة الحساب
     * (offsetWidth) → أعد الأنيميشن. فيبدأ من جديد فوراً!
     */
    runCountdown(onDone) {
        const numbers = ['3', '2', '1', 'GO!'];
        this.countdownOverlay.classList.remove('hidden');   // أظهر شاشة العد
        let i = 0;
        this.countdownText.textContent = numbers[0];         // ابدأ بـ "3"
        this.sound.beep(600, 0.08);                          // صوت "تك"

        const step = () => {
            i++;
            if (i < numbers.length) {
                this.countdownText.textContent = numbers[i];
                // أعد تشغيل أنيميشن القفزة (pop) للرقم الجديد
                this.countdownText.style.animation = 'none';
                void this.countdownText.offsetWidth;   // 📚 void = "اقرأ القيمة وتجاهلها" — يُجبر إعادة الحساب!
                this.countdownText.style.animation = '';
                this.sound.beep(i === numbers.length - 1 ? 900 : 600, 0.08);  // "انطلق" بنغمة أعلى
                setTimeout(step, 700);                // الرقم التالي بعد 0.7 ثانية
            } else {
                this.countdownOverlay.classList.add('hidden');   // أخفِ شاشة العد
                onDone();    // 📚 استدعِ الدالة الممررة (بدء اللعبة!)
            }
        };
        setTimeout(step, 700);   // بعد 0.7 ثانية: انتقل من "3" إلى "2"
    }

    /**
     * مؤقت الثانية الواحدة.
     * 📚 درس — setInterval تنفذ الدالة كل فترة زمنية.
     * نحفظ معرفها حتى نستطيع إيقافها لاحقاً بـ clearInterval
     * (عند الإيقاف المؤقت أو انتهاء اللعبة).
     */
    startTimer() {
        clearInterval(this.timerInterval);   // أوقف أي مؤقت سابق (حماية من التكرار!)
        this.timerInterval = setInterval(() => {
            // السلوو-مو: الزمن يتدفق أبطأ أثناء نشاطه! (مرتان أبطأ)
            if (this.slowmoActive) return;

            this.timeLeft--;                                   // ثانية انقضت
            this.timeElement.textContent = this.timeLeft;       // اعرض الجديد
            this.updateTimerBar();                             // حدّث شريط الوقت
            // 📚 toggle مع شرط ثانٍ: يضيف class إن تحقق ويزيله إن لا
            this.timerBox.classList.toggle('warning', this.timeLeft <= 10);

            if (this.timeLeft <= 0) {
                this.endGame();                 // انتهى الوقت → النتيجة
            } else if (this.timeLeft <= 5) {
                this.sound.beep(400, 0.05);     // تنبيه صوتي لآخر 5 ثوانٍ
            }
        }, 1000);   // كل 1000 مللي ثانية = ثانية واحدة
    }

    /** تبديل: إذا كانت اللعبة تسير → أوقفها، والعكس. */
    togglePause() {
        if (this.gameActive) this.pauseGame();
        else if (this.gameStarted) this.resumeGame();
    }

    /** الإيقاف المؤقت: أوقف الرسم والعد وأظهر شاشة "متوقف". */
    pauseGame() {
        if (!this.gameActive) return;                 // ليست تعمل أصلاً
        this.gameActive = false;                      // أوقف الحالة
        cancelAnimationFrame(this.gameLoopId);        // 📚 أوقف حلقة الرسم
        clearInterval(this.timerInterval);            // وأوقف مؤقت الثواني
        this.startOverlay.classList.remove('hidden'); // أظهر شاشة التوقف
        // غيّر نصوص الشاشة لتناسب وضع الإيقاف المؤقت
        this.startOverlay.querySelector('.game-title').textContent = '⏸ متوقف مؤقتاً';
        this.startOverlay.querySelector('#startBtn').textContent = '▶ استئناف';
    }

    /** الاستئناف بعد الإيقاف المؤقت. */
    resumeGame() {
        if (this.gameActive || !this.gameStarted) return;   // حماية من الاستدعاء الخاطئ
        this.gameActive = true;
        this.startOverlay.classList.add('hidden');   // أخفِ شاشة الإيقاف
        this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts));  // استأنف الرسم
        this.startTimer();                            // واستأنف العد
    }

    /** إعادة التعيين الكامل — العودة لشاشة الترحيب. */
    resetGame() {
        this.pauseGame();          // أوقف أي شيء يعمل (لو كانت اللعبة تسير)
        this.gameStarted = false;
        this.countingDown = false;
        this.score = 0;            // صفّر كل الإحصائيات
        this.streak = 0;
        this.bestStreak = 0;
        this.hits = 0;
        this.clicks = 0;
        this.golds = 0;
        this.titleShown = '';
        this.lastHitX = null;
        this.lastHitY = null;
        this.timeLeft = 60;
        this.totalTime = 60;
        this.multiplierShown = 1;
        this.targetManager.clearTargets();  // امسح الأهداف والجزيئات
        this.clearCanvas();                 // نظف الكانفاس
        this.drawGoal();                    // ارسم المرمى
        this.updateHUD();                   // حدّث العرض
        this.timeElement.textContent = this.timeLeft;
        this.timerBox.classList.remove('warning');
        this.updateTimerBar();                          // حدّث شريط الوقت
        this.hideMilestoneBadge();                      // أخفِ شارة الإنجاز
        this.hideComboPopup();                          // وأخفِ نبضة المضاعف
        this.gameArea.classList.remove('shake', 'shake-hard');  // أزل أي اهتزاز
        this.hideSlowmo();                              // أوقف السلوو-مو
        this.gameOverOverlay.classList.add('hidden');     // أخفِ شاشة النتيجة
        this.countdownOverlay.classList.add('hidden');    // وأي عد تنازلي
        this.startOverlay.classList.remove('hidden');     // أظهر شاشة البداية
        // أعد نصوص شاشة البداية لأصلها (كانت تغيّرت لوضع الإيقاف)
        this.startOverlay.querySelector('.game-title').textContent = '🥅 Handball Keeper';
        this.startOverlay.querySelector('#startBtn').textContent = '▶ Start Game';
    }

    /** انتهاء الجولة وعرض النتائج النهائية. */
    endGame() {
        this.gameActive = false;          // أوقف اللعبة
        this.gameStarted = false;
        cancelAnimationFrame(this.gameLoopId);    // أوقف الرسم
        clearInterval(this.timerInterval);        // أوقف العد
        this.hideSlowmo();                        // أوقف السلوو-مو
        this.hideMilestoneBadge();                // أخفِ شارة الإنجاز

        // 📚 درس — حفظ أعلى نتيجة وسجل المحاولة عبر Zustand store:
        // نحسب الدقة، ثم نُسجّل محاولة جديدة في store (يحدّث السجل
        // وأفضل نتيجة ويحفظهما في localStorage تلقائياً). الدالة
        // recordTry تُرجع أفضل نتيجة محدّثة.
        const accuracy = this.clicks > 0 ? Math.round((this.hits / this.clicks) * 100) : 0;
        const isNewBest = this.score > this.best;

        // 📚 الفِلّة: احسب الأوسمة (معرفة بأرقام اللعب الحقيقية فقط —
        // لا تغيّر أي شيء في المنطق)، ثم سجّلها مع المحاولة.
        const medals = medalsFor({
            bestStreak: this.bestStreak,
            hits: this.hits,
            accuracy,
            score: this.score,
            golds: this.golds,
            isNewBest,
        });

        const newBest = useGameStore.getState().recordTry({
            score: this.score,
            hits: this.hits,
            accuracy,
            bestStreak: this.bestStreak,
            difficulty: this.difficulty,
            medals,
        });

        this.best = newBest;
        if (isNewBest) {
            this.bestElement.textContent = this.best;
            // لقب عشوائي فخم في شاشة "رقم قياسي جديد!"
            const nb = document.getElementById('newBest');
            nb.textContent = randomNewBestTitle();
            this.playGag('clash');   // لحظة انتصار!
            this.celebrate(this.width / 2, this.height * 0.4, ['👑', '🏆', '✨', '🎉'], 18, null);
        }

        // املأ خانات الإحصائيات في شاشة النهاية
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalHits').textContent = this.hits;
        document.getElementById('finalAccuracy').textContent = accuracy + '%';
        document.getElementById('finalStreak').textContent = this.bestStreak;
        document.getElementById('newBest').classList.toggle('hidden', !isNewBest);  // أظهر "رقم قياسي!" إن تحقق

        // اعرض أوسمة المحاولة في شاشة النهاية (إن وُجدت)
        const medalsBox = document.getElementById('finalMedals');
        medalsBox.innerHTML = medals.map(m =>
            `<span class="medal-chip" title="${m.name}">${m.icon}</span>`
        ).join('');

        this.gameOverOverlay.classList.remove('hidden');   // أظهر شاشة النتائج
        this.sound.over();                                  // شغّل النغمات الختامية
    }

    /** تحديث أرقام النقاط والسلسلة في الواجهة. */
    updateHUD() {
        // تمايز بصري: النقاط الناقصة (عقوبة حمراء) تصيغ أحمر ثم تعود
        const newScore = this.scoreElement.textContent;
        if (String(this.score) !== newScore) {
            const goingDown = this.score < parseInt(newScore, 10);
            this.scoreElement.classList.remove('score-pop', 'score-pop-negative');
            void this.scoreElement.offsetWidth;   // أعد تشغيل أنيميشن النبضة
            this.scoreElement.classList.add(goingDown ? 'score-pop-negative' : 'score-pop');
            setTimeout(() => this.scoreElement.classList.remove('score-pop', 'score-pop-negative'), 350);
        }
        this.scoreElement.textContent = this.score;
        this.streakElement.textContent = this.streak;

        // توهج سلسلة الإصابات عندما يتفعل مضاعف
        const streakItem = this.streakElement.closest('.hud-item');
        const mult = this.multiplier;
        streakItem.classList.toggle('streak-active', this.streak >= 5);
        streakItem.classList.toggle('streak-x3', this.streak >= 10);

        // كشف تغيّر المضاعف لعرض نبضة إنجاز
        if (mult !== this.multiplierShown) {
            this.multiplierShown = mult;
            if (mult > 1) this.showComboPopup(mult);
            if (mult === 3) this.showMilestoneBadge('🔥 x3 MAX COMBO!');
        }

        // لقب مضحك عند الوصول للحد الأدنى لسلسلة معينة (زخرفي)
        const title = titleForStreak(this.streak);
        if (title && title !== this.titleShown) {
            this.titleShown = title;
            this.showTitle(title);
        }
        if (!title) this.titleShown = '';
    }

    /** نبضة مضاعف كبيرة وسط الشاشة (x2 / x3). */
    showComboPopup(mult) {
        const colors = { 2: '#ffd700', 3: '#00e5a0' };
        this.comboPopup.style.color = colors[mult] || '#fff';
        this.comboPopup.textContent = `COMBO x${mult}`;
        this.comboPopup.style.fontSize = mult === 3 ? 'clamp(48px, 12vw, 96px)' : 'clamp(36px, 9vw, 72px)';
        this.comboPopup.classList.remove('show');
        void this.comboPopup.offsetWidth;   // أعد تشغيل الأنيميشن!
        this.comboPopup.classList.add('show');
        if (mult === 2) this.sound.beep(880, 0.1);
        else this.sound.bonus();

        // احتفال: رموز تطير عند آخر إصابة + تعليق كومبو
        if (this.lastHitX != null) {
            this.celebrate(this.lastHitX, this.lastHitY, ['🎉', '🔥', '💥', '👑'], 10, 'combo');
        } else {
            this.showTaunt('combo');
        }
    }

    /** إخفاء نبضة المضاعف فوراً (عند البدء/إعادة التعيين). */
    hideComboPopup() {
        this.comboPopup.classList.remove('show');
    }

    /** شارة إنجاز أسفل الشاشة (سلسلة طويلة). */
    showMilestoneBadge(text) {
        this.milestoneBadge.textContent = text;
        this.milestoneBadge.classList.add('show');
        clearTimeout(this.milestoneBadge._hideTimer);
        this.milestoneBadge._hideTimer = setTimeout(() => this.hideMilestoneBadge(), 1400);
    }
    hideMilestoneBadge() {
        this.milestoneBadge.classList.remove('show');
    }

    /** تعليق ساخر عشوائي يظهر أسفل الشاشة ثم يختفي (زخرفي). */
    showTaunt(kind, delay = 0) {
        // 💤 مهلة تباعد: لا تعليق لمدة 4 ثوانٍ بعد آخر تعليق —
        // حتى لا تتكدس النكات وتشتّت اللاعب
        if (Date.now() - (this._lastTauntAt || 0) < 4000) return;
        this._lastTauntAt = Date.now();
        const text = randomTaunt(kind);
        if (!text || !this.tauntEl) return;
        const el = this.tauntEl;
        const show = () => {
            el.textContent = text;
            el.classList.remove('show');
            void el.offsetWidth;   // أعد تشغيل أنيميشن الظهور
            el.classList.add('show');
            clearTimeout(el._hideTimer);
            el._hideTimer = setTimeout(() => el.classList.remove('show'), 1300);
        };
        if (delay) setTimeout(show, delay); else show();
    }

    /** عنوان (نِكْنِيم) يُعرض أسفل الشاشة عند إنجاز (زخرفي). */
    showTitle(text) {
        if (!this.titleEl || !text) return;
        const el = this.titleEl;
        el.textContent = text;
        el.classList.remove('show');
        void el.offsetWidth;
        el.classList.add('show');
        clearTimeout(el._titleTimer);
        el._titleTimer = setTimeout(() => el.classList.remove('show'), 1600);
    }

    /** احتفال مؤقّت: رموز تطير + تعليق (لا يغيِّر اللعب). */
    celebrate(x, y, emojis, count, tauntKind) {
        this.targetManager.emojiBurst(x, y, emojis, count);
        if (tauntKind) this.showTaunt(tauntKind, 250);
    }

    /** نكتة صوتية سريعة (لا تؤثر سلباً — قد تكون قوية قليلاً). */
    playGag(kind) {
        if (!this.sound.enabled) return;
        // نكت صاخبة نكتّمها جزئياً حتى لا تكون مزعجة
        const gags = {
            boing: () => this.sound.beep(150, 0.25, 'sawtooth', 0.05, { slide: true, slideTo: 700 }),
            womp:  () => { this.sound.beep(320, 0.2, 'sawtooth', 0.06); setTimeout(() => this.sound.beep(180, 0.3, 'sawtooth', 0.06), 120); },
            ding:  () => this.sound.beep(1180, 0.14, 'triangle', 0.12),
            clash: () => { this.sound.beep(900, 0.06, 'square', 0.08); setTimeout(() => this.sound.beep(1200, 0.08, 'square', 0.08), 30); },
        };
        const g = gags[kind];
        if (g) g();
    }

    /** اهتزاز شاشة اللعب (قوي عند الخطأ/الأحمر، خفيف عند الإشباع). */
    shakeScreen(hard = false) {
        this.gameArea.classList.remove('shake', 'shake-hard');
        void this.gameArea.offsetWidth;   // أعد تشغيل أنيميشن الاهتزاز
        this.gameArea.classList.add(hard ? 'shake-hard' : 'shake');
        this.gameArea._shakeTimer = setTimeout(() => {
            this.gameArea.classList.remove('shake', 'shake-hard');
        }, 400);
    }

    /** وميض ملوّن يملأ الشاشة (أحمر/ذهبي/أخضر). */
    flash(color) {
        const el = { red: this.flashRed, gold: this.flashGold, green: this.flashGreen }[color];
        if (!el) return;
        el.classList.remove('active');
        void el.offsetWidth;
        el.classList.add('active');
    }

    /** تفعيل السلوو-مو (الوقت يتباطأ، الأهداف تتنفس). */
    activateSlowmo(duration = 2000) {
        if (this.slowmoTimeout) clearTimeout(this.slowmoTimeout);
        this.slowmoActive = true;
        this.slowmoIndicator.classList.add('active');
        this.slowmoTimeout = setTimeout(() => this.deactivateSlowmo(), duration);
    }
    deactivateSlowmo() {
        this.slowmoActive = false;
        this.slowmoIndicator.classList.remove('active');
        this.slowmoTimeout = null;
    }
    hideSlowmo() {
        this.deactivateSlowmo();
    }

    /** تحديث شريط الوقت المرئي (نسبة الوقت المتبقي). */
    updateTimerBar() {
        const pct = Math.max(0, (this.timeLeft / this.totalTime) * 100);
        this.timerBar.style.width = pct + '%';
    }

    /**
     * 📚 درس — الـ Getter لمضاعف السلسلة (Combo):
     * عند 5 إصابات متتالية → النقاط ×2
     * عند 10 إصابات متتالية → النقاط ×3
     * مكافأة على التركيز والاستمرارية!
     */
    get multiplier() {
        if (this.streak >= 10) return 3;
        if (this.streak >= 5) return 2;
        return 1;
    }

    /**
     * يستدعيها TargetManager عند إصابة هدف.
     * هنا نحسب النقاط ونطبق قواعد اللعبة.
     */
    registerHit(target, x, y) {
        this.clicks++;                     // عدد كل النقرات (لحساب الدقة)
        const tm = this.targetManager;

        if (target.type === 'good' || target.type === 'bonus') {
            // ---------- إصابة ناجحة (أخضر أو ذهبي) ----------
            this.hits++;                   // إصابة ناجحة
            this.streak++;                 // زد السلسلة المتتالية
            this.bestStreak = Math.max(this.bestStreak, this.streak);  // 📚 Math.max = الأكبر (سجل جديد؟)
            this.lastHitX = x;
            this.lastHitY = y;

            const mult = this.multiplier;          // المضاعف الحالي (1 أو 2 أو 3)
            const gained = target.points * mult;   // النقاط بعد المضاعفة!

            this.score += gained;                  // أضفها للرصيد
            // مؤثر الانفجار: جزيئات أكثر للكرة الذهبية (26 مقابل 16)
            tm.burst(x, y, target.color, target.type === 'bonus' ? 26 : 16);
            // نص طائر "+10" أو "+20 x2" فوق مكان الإصابة
            // 📚 درس — Template Literals (النصوص بين `):
            // تسمح بتضمين المتغيرات مباشرة: `+${gained}`
            tm.addFloatText(x, y - 18,
                `+${gained}` + (mult > 1 ? ` x${mult}` : ''),
                target.type === 'bonus' ? '#ffd700' : '#7dffd0',
                target.type === 'bonus' ? 26 : 20);

            // مؤثرات بصرية: وميض أخضر ناعم عند كل إصابة
            if (target.type === 'bonus') {
                this.golds++;                         // عد الكنوز للأوسمة
                this.flash('gold');                       // وميض ذهبي للكنز
                this.activateSlowmo(2000);                // سلوو-مو درامي!
                this.sound.bonus();              // صوت الكنز
                // احتفال: رموز ذهبية تطير + تعليق سعيد (زخرفي)
                this.celebrate(x, y, ['🌟', '💛', '✨', '🏅'], 12, 'good');
                this.playGag('ding');               // لحظة ألماسية!
                // الكرة الذهبية تضيف ثانيتين للوقت المتبقي!
                this.timeLeft += 2;
                this.totalTime = Math.max(this.totalTime, this.timeLeft);
                this.timeElement.textContent = this.timeLeft;
                this.updateTimerBar();                    // حدّث الشريط
                tm.addFloatText(x, y - 46, '+2s', '#6ee7ff', 16);   // أخبر اللاعب بصرياً
            } else {
                this.flash('green');                      // وميض أخضر خفيف
                this.sound.hit();               // صوت الإصابة العادية
                // لا تعليق هنا — حتى لا يتكرر مع كل كرة!
            }
        } else {
            // ---------- كرة حمراء: عقوبة! ----------
            this.streak = 0;                    // السلسلة تنكسر (هذا هو العقاب الحقيقي)
            this.score += target.points;        // points سالب (-5) فالجمع ينقص!
            tm.burst(x, y, target.color, 12);
            tm.addFloatText(x, y - 18, `${target.points}`, '#ff8a94', 20);
            this.flash('red');                   // وميض أحمر
            this.shakeScreen(true);              // واهتزاز قوي!
            this.sound.bad();                   // صوت الخطأ
            this.playGag('womp');               // تعليق صوتي أسف!
            this.showTaunt('bad', 350);         // واختبار ساخر بعد لحظة
        }

        this.updateHUD();   // اعرض النتيجة الجديدة فوراً
    }

    /** عند النقر وعدم إصابة أي هدف (خطأ). */
    registerMiss(x, y) {
        this.clicks++;          // النقرة تُحسب (تؤثر على الدقة)
        // كسر سلسلة 5+ يستحق اهتزازاً خفيفاً (تحذير بصري)
        const wasHighStreak = this.streak >= 5;
        this.streak = 0;        // وتكسر السلسلة أيضاً!
        this.updateHUD();
        if (wasHighStreak) this.shakeScreen(false);   // اهتزاز لطيف عند فقدان سلسلة قوية
        this.sound.miss();      // صوت خفيف يوضح أنك أخطأت
        // تعليق ساخر نادر (8%) — لا تشتيت أبداً
        if (Math.random() < 0.08) this.showTaunt('miss');
    }

    /**
     * حلقة اللعبة الرئيسية (Game Loop) — قلب اللعبة النابض! 💓
     *
     * 📚 درس من أهم الدروس في برمجة الألعاب:
     * هذه الدالة تعمل ~60 مرة في الثانية، وفي كل مرة:
     *   1) امسح الشاشة القديمة
     *   2) ارسم الخلفية
     *   3) حدّث الأهداف (احذف المنتهية، حرّك الجزيئات)
     *   4) ولّد أهدافاً جديدة
     *   5) ارسم كل شيء
     * ثم تطلب من المتصفح استدعاءها مجدداً للإطار التالي.
     *
     * 📚 درس — requestAnimationFrame:
     * يطلب من المتصفح "نادني قبل الرسم التالي" — أسرع وأكفأ
     * من setInterval لأنه يتزامن مع تحديث الشاشة، ويتوقف
     * تلقائياً عندما تكون الصفحة مخفية (توفير بطارية!).
     *
     * ⚠️ تذكّر: نمرر (ts) للإطار القادم — نسيان تمرير
     * timestamp كان سبب اختفاء الأهداف في النسخة القديمة!
     */
    gameLoop(timestamp = 0) {
        if (!this.gameActive) return;    // اللعبة متوقفة → لا ترسم

        // السلوو-مو: نصف سرعة الحركة (مؤثر إضافي فوق بطء الزمن)
        const timeScale = this.slowmoActive ? 0.5 : 1;

        this.clearCanvas();                              // 1) امسح
        this.drawGoal();                                 // 2) الخلفية
        this.targetManager.updateTargets(timeScale);     // 3) حدّث
        this.targetManager.spawnTargets(timestamp);      // 4) ولّد
        this.targetManager.drawTargets();               // 5) ارسم

        this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts));  // 6) كرر!
    }

    /** مسح لوحة الرسم بالكامل (استعداداً لإطار جديد). */
    clearCanvas() {
        // clearRect يمسح مستطيلاً — من (0,0) بعرض وارتفاع الكانفاس كله
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * رسم المرمى والشبكة والأرضية وخلفية الملعب.
     *
     * 📚 درس — ترتيب الرسم مهم! (مبدأ الطبقات):
     * نرسم الخلفية أولاً ثم ما فوقها — تماماً كالرسام:
     * من يُرسم أولاً يختفي تحت من يُرسم بعده.
     * لذلك: الخلفية → الأرضية → الشبكة → القوائم.
     */
    drawGoal() {
        const ctx = this.ctx;

        // 1) خلفية متدرجة (سماء الصالة) — 📚 createLinearGradient
        // يحول التدرج من لون عند نقطة لأخرى (هنا: من أعلى لأسفل)
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#16223e');    // لون البداية (أعلى)
        grad.addColorStop(1, '#0d1424');    // لون النهاية (أسفل)
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);   // املأ الشاشة كلها

        // 2) نقاط "الجمهور" الباهتة للأجواء
        // 📚 درس — حيلة (i * 137) % width: توليد مواقع "شبه عشوائية"
        // ثابتة بنمط متكرر — تبدو كجمهور من بعيد بدون حسابات عشوائية!
        ctx.fillStyle = 'rgba(255,255,255,0.05)';   // rgba: شفافية 5% فقط
        for (let i = 0; i < 60; i++) {
            const cx = (i * 137) % this.width;
            const cy = (i * 89) % Math.max(1, this.height * 0.16);
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1, this.width * 0.003), 0, Math.PI * 2);
            ctx.fill();
        }

        // 3) أرضية الملعب (أزرق) مع خط أبيض عريض في حدها
        const floorH = this.height * 0.15;            // نسبة من الارتفاع
        ctx.fillStyle = '#1d4e89';
        ctx.fillRect(0, this.height - floorH, this.width, floorH);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, this.height - floorH, this.width, this.height * 0.008);

        // 4) ظل المرمى (مزاح قليلاً = عمق ثلاثي الأبعاد!)
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(this.goalX + this.width * 0.01, this.goalY + this.height * 0.017, this.goalWidth, this.goalHeight);

        // 5) خلفية الشبكة (بياض شفيف داخل المرمى)
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(this.goalX, this.goalY, this.goalWidth, this.goalHeight);

        // 6) خطوط الشبكة
        // 📚 درس — حلقتان ترسمان خطوطاً متوازية:
        // عمودية (من أعلى لأسفل) وأفقية (يسار لليمين).
        // moveTo بداية الخط، lineTo نهايته، stroke يرسمه.
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1;
        const step = Math.max(18, this.width * 0.033);   // مسافة كل خلية (نسبة من العرض)
        for (let x = this.goalX + step; x < this.goalX + this.goalWidth; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, this.goalY);
            ctx.lineTo(x, this.goalY + this.goalHeight);
            ctx.stroke();
        }
        for (let y = this.goalY + step; y < this.goalY + this.goalHeight; y += step) {
            ctx.beginPath();
            ctx.moveTo(this.goalX, y);
            ctx.lineTo(this.goalX + this.goalWidth, y);
            ctx.stroke();
        }

        // 7) قوائم المرمى البيضاء (سماكة نسبة من الحجم = قوي وواضح)
        // 📚 strokeRect يرسم مستطيلاً "مفرغاً" (الحدود فقط)
        ctx.strokeStyle = '#f2f5ff';
        ctx.lineWidth = Math.max(4, this.width * 0.008);
        ctx.strokeRect(this.goalX, this.goalY, this.goalWidth, this.goalHeight);
        // وإطار خارجي داكن رفيع يعطي إحساس "الحديد" المزدوج للقوائم
        const frame = Math.max(2, this.width * 0.004);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.goalX - frame, this.goalY - frame, this.goalWidth + frame * 2, this.goalHeight + frame * 2);
    }

    /**
     * تحويل مكان النقر/اللمس إلى إحداثيات الكانفاس.
     *
     * 📚 درس مهم جداً للهواتف (Responsive Canvas):
     * الكانفاس داخلياً 800×600 دائماً، لكن CSS يصغّره ليلائم
     * الشاشة! لذلك نقطة النقر على الشاشة لا تطابق إحداثيات
     * الكانفاس. الحل: نسبة التصغير × فرق الموضع.
     *
     * مثال: لو الشاشة تعرض الكانفاس بعرض 400 (نصف الحجم):
     * scaleX = 800/400 = 2 → نقرة عند x=100 شاشة = 200 كانفاس.
     */
    getCanvasPosition(event) {
        const rect = this.canvas.getBoundingClientRect();   // حجم/موقع الكانفاس المعروض
        const scaleX = this.canvas.width / rect.width;      // نسبة التصغير الأفقية
        const scaleY = this.canvas.height / rect.height;    // نسبة التصغير العمودية
        return {
            x: (event.clientX - rect.left) * scaleX,   // موضع النقر × النسبة = الموقع الحقيقي
            y: (event.clientY - rect.top) * scaleY
        };
    }

    /** معالجة النقر/اللمس على الكانفاس. */
    handleCanvasClick(event) {
        if (!this.gameActive) return;                 // اللعبة متوقفة → تجاهل
        event.preventDefault();                       // امنع التكبير/التمرير العرضي
        // 📚 درس — pointerId: إذا لمستَ بأصبعين معاً (متعدد اللمس)
        // نتعامل مع أول لمسة فقط حتى لا تُحتسب لمسة ثانية كخطأ
        if (event.isPrimary === false) return;
        const pos = this.getCanvasPosition(event);    // حوّل النقرة لإحداثيات صحيحة
        this.targetManager.checkClick(pos.x, pos.y);  // واسأل المدير: هل أصبنا هدفاً؟
    }
}

export { HandballGoalkeeperGame };
