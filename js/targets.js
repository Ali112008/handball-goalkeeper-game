/**
 * ============================================================
 *  TargetManager — مدير الأهداف داخل اللعبة
 * ============================================================
 *  هذه "الفئة" (Class) مسؤولة عن كل ما يتعلق بالأهداف:
 *  إنشاؤها، رسمها، فحص النقر عليها، وحذفها بعد انتهاء وقتها.
 *
 *  📚 درس مهم — مبدأ فصل المسؤوليات (Separation of Concerns):
 *  لاحظ أن ملف game.js يهتم بالنقاط والوقت والحالة العامة،
 *  بينما هذا الملف يهتم فقط بالأهداف. فصل المهام هكذا يجعل
 *  الكود أسهل في الفهم والتعديل — وهذه مهارة احترافية مهمة.
 *
 *  أنواع الأهداف الثلاثة:
 *  - 'good'  → كرة خضراء = +10 نقاط (اضغط عليها)
 *  - 'bad'   → كرة حمراء = -5 نقاط (تجنبها!)
 *  - 'bonus' → كرة ذهبية = +25 نقطة و +2 ثانية (نادرة وذات توهج)
 *
 *  ميزات إضافية في هذه الفئة:
 *  - الأهداف تتقلص كلما قرب انتهاء وقتها (تنبيه بصري للاعب)
 *  - انفجار جزيئات (Particles) عند كل إصابة
 *  - نصوص نقاط طائرة مثل "+10" تطفو للأعلى
 */
class TargetManager {
    constructor(game) {
        // نحفظ مرجع للعبة الرئيسية حتى نصل لإعداداتها (مثل الصعوبة)
        this.game = game;
        this.targets = [];      // مصفوفة كل الأهداف الظاهرة حالياً على الشاشة
        this.particles = [];    // مصفوفة الجزيئات (تأثير الانفجار عند الإصابة)
        this.floatTexts = [];   // مصفوفة النصوص الطائرة ("+10" و "-5" ...)
        this.emoji = [];        // مصفوفة الرموز الطائرة للاحتفال (زخرفي 100%)
    }

    /** إنفجار رموز تعبيرية (زخرفي) — للاحتفالات فقط. */
    emojiBurst(x, y, emojis, count = 8) {
        // Perf cap: never let celebrations pile up and lag the frame.
        if (this.emoji.length > 40) this.emoji.splice(0, this.emoji.length - 40);
        const n = Math.min(count, 12);
        for (let i = 0; i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2.5;
            this.emoji.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                char: emojis[Math.floor(Math.random() * emojis.length)],
                size: 14 + Math.random() * 14,
                life: 40 + Math.random() * 20,
                maxLife: 60,
                rot: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 0.2,
            });
        }
    }

    /**
     * 📚 درس — الـ Getter في JavaScript:
     * كلمة "get" قبل اسم الخاصية تجعلها تُحسب تلقائياً كل مرة تستدعيها،
     * مثل خاصية عادية لكن قيمتها تُحسب من كود. نستخدمها هنا لأن
     * الإعدادات تعتمد على الصعوبة الحالية وقد تتغير أثناء اللعب.
     */
    get config() {
        // إعدادات مختلفة لكل مستوى صعوبة:
        // life = عمر الهدف بالمللي ثانية (2600 = ثانيتين و 6 أعشار)
        // shrink = هل يتقلص الهدف مع مرور وقته؟
        return {
            easy:   { life: 2600, shrink: false },   // سهل: عمر أطول وبلا تقلص
            medium: { life: 2000, shrink: true },    // متوسط: ثانيتان
            hard:   { life: 1500, shrink: true }     // صعب: أسرع وأصعب!
        }[this.game.difficulty] || { life: 2000, shrink: true }; // قيمة افتراضية احتياطية
    }

    /**
     * توليد (Spawn) أهداف جديدة إذا مضى وقت كافٍ منذ آخر هدف.
     * @param {number} timestamp - الوقت بالمللي ثانية من المتصفح (تأتي من requestAnimationFrame)
     *
     * 📚 درس مهم جداً — لماذا نستخدم timestamp وليس setInterval؟
     * لأن requestAnimationFrame يعطينا وقتاً دقيقاً لكل إطار،
     * وبمقارنته بوقت آخر توليد نضمن توليد الأهداف بإيقاع ثابت
     * مهما كانت سرعة الجهاز. (في النسخة القديمة كان هناك خطأ:
     * لم يكن الـ timestamp يُمرر، فلم تكن الأهداف تظهر أبداً!)
     */
    spawnTargets(timestamp) {
        // لا تولد أي أهداف إذا كانت اللعبة متوقفة أو لم تبدأ
        if (!this.game.gameActive) return;

        // Perf cap: max simultaneous targets (fewer on mobile = less overdraw).
        const maxTargets = this.game.isMobileLayout ? 4 : 7;
        if (this.targets.length >= maxTargets) {
            this.game.lastTargetSpawn = timestamp;
            return;
        }

        // هل مضى وقت كافٍ (targetSpawnRate) منذ آخر توليد؟
        if (timestamp - this.game.lastTargetSpawn > this.game.targetSpawnRate) {
            this.targets.push(this.createRandomTarget()); // أضف هدفاً جديداً للمصفوفة
            this.game.lastTargetSpawn = timestamp;         // سجّل وقت هذا التوليد

            // 📚 درس — تصعيد الصعوبة التدريجي:
            // كل هدف جديد يقلل الفاصل الزمني 4 مللي ثانية،
            // فاللعبة تزداد صعوبة كلما استمررت في اللعب!
            if (this.game.targetSpawnRate > 480) {   // حد أدنى حتى لا تصبح مستحيلة
                this.game.targetSpawnRate -= 4;
            }
        }
    }

    /**
     * إنشاء هدف عشوائي داخل حدود المرمى.
     *
     * 📚 درس — Math.random():
     * تعيد رقماً عشوائياً بين 0 و 1. نضربه بعرض المساحة
     * المتاحة للحصول على إحداثيات عشوائية داخل المرمى.
     * الـ padding يمنع ظهور الأهداف ملاصقة لقائم المرمى.
     */
    createRandomTarget() {
        // Touch-first sizing: guarantee ~44px CSS touch diameter on phones.
        // contentScale already includes dpr, so s*dpr math gives CSS size.
        const mobile = !!this.game.isMobileLayout;
        const s = Math.max(this.game.contentScale, 1.0) * (mobile ? 1.9 : 1.15);
        const padding = (mobile ? 34 : 30) * Math.max(this.game.contentScale, 1.0);
        const x = this.game.goalX + padding + Math.random() * (this.game.goalWidth - padding * 2);
        const y = this.game.goalY + padding + Math.random() * (this.game.goalHeight - padding * 2);

        // 📚 درس — الاحتمالات باستخدام رقم عشوائي واحد:
        // roll بين 0 و 1 → نقسمه لنطاقات لتحديد نوع الهدف
        const roll = Math.random();
        let type;
        if (roll < 0.08) type = 'bonus';       // 8% فرصة كرة ذهبية (نادرة!)
        else if (roll < 0.38) type = 'bad';    // 30% كرة حمراء (خطرة)
        else type = 'good';                    // 62% كرة خضراء (الأغلبية)

        // 📚 درس — حجم هدف يتكيف مع كل شاشة:
        // نضرب نصف القطر بمقياس المحتوى contentScale (المشتق من حجم
        // الشاشة) مع حد أدنى حتى تبقى الأهداف كبيرة وسهلة اللمس حتى على
        // الشاشات الصغيرة. على الهاتف نضاعف تقريباً (×1.9) لنصل
        // لقطر لمس ~44px CSS.
        // خصائص كل نوع: الحجم، الألوان، والنقاط
        const base = {
            good:  { radius: 17 * s, color: '#00e5a0', inner: '#7dffd0', points: 10 },
            bad:   { radius: 14.5 * s, color: '#ff4757', inner: '#ff8a94', points: -5 },
            bonus: { radius: 16 * s, color: '#ffd700', inner: '#fff3b0', points: 25 }
        }[type]; // 📚 درس: اختيار قيمة من كائن باستخدام متغير — {good:{...}}[type]

        // 📚 درس — الكائن المُعاد (Object Literal):
        // كل هدف هو كائن يحمل كل بياناته: الموقع، النوع، الألوان،
        // النقاط، العمر، ووقت الإنشاء (Date.now() = وقت الجهاز بالمللي ثانية)
        return {
            x: x,
            y: y,
            radius: base.radius,
            type: type,
            color: base.color,
            innerColor: base.inner,
            points: base.points,
            life: this.config.life,          // كم سيبقى هذا الهدف حياً؟
            shrink: type === 'bonus' ? true : this.config.shrink, // الذهبي يتقلص دائماً
            createdAt: Date.now()            // متى وُلد؟ (لحساب انتهاء عمره)
        };
    }

    /**
     * حذف الأهداف المنتهية وتحديث المؤثرات البصرية.
     *
     * 📚 درس — دالة filter() الذهبية:
     * filter تنشئ مصفوفة جديدة تحتوي فقط العناصر التي
     * أعادت شرطها "true". نستخدمها لحذف أي هدف انتهى عمره
     * (الوقت الحالي - وقت إنشائه) >= عمره الكلي.
     */
    updateTargets(timeScale = 1) {
        const now = Date.now();
        this.targets = this.targets.filter(t => (now - t.createdAt) < t.life);

        // تحرك الجزيئات (كل إطار): الموقع += السرعة
        // 📚 درس — فيزياء بسيطة: الجاذبية تزيد السرعة العمودية كل إطار
        this.particles = this.particles.filter(p => {
            p.x += p.vx * timeScale;        // تحريك أفقي
            p.y += p.vy * timeScale;        // تحريك عمودي
            p.vy += 0.15 * timeScale;       // جاذبية: تسحب الجزيء للأسفل تدريجياً
            p.life -= Math.max(timeScale, 0.5);           // كل جزيء له عمر محدد بالفريمات
            return p.life > 0;  // احتفظ بالحي فقط
        });

        // النصوص الطائرة: تصعد للأعلى وتتلاشى ببطء
        this.floatTexts = this.floatTexts.filter(f => {
            f.y -= 0.8 * timeScale;         // الصعود
            f.alpha -= 0.02 * timeScale;    // الشفافية (1 = معتم تماماً، 0 = مخفي)
            return f.alpha > 0;
        });

        // الرموز التعبيرية (الاحتفال): تطير وتدور وتتلاشى
        this.emoji = this.emoji.filter(e => {
            e.x += e.vx * timeScale;
            e.y += e.vy * timeScale;
            e.vy += 0.12 * timeScale;       // جاذبية خفيفة
            e.rot += e.vr * timeScale;
            e.life -= Math.max(timeScale, 0.5);
            return e.life > 0;
        });
    }

    /**
     * حساب مقياس الهدف الحالي (يتقلص قرب نهاية عمره).
     *
     * 📚 درس — الحساب النسبي:
     * نحسب ما نسبة الوقت المُستهلك من عمر الهدف،
     * ثم نطرحها من 1 (المقياس الكامل). مثال:
     * مضى 50% من عمر الهدف → المقياس 0.5 نصف الحجم.
     * دالة Math.max تضمن ألا ينزل المقياس تحت 0.25.
     */
    targetScale(target) {
        if (!target.shrink) return 1;   // بعض الأهداف لا تتقلص (المستوى السهل)
        const elapsed = Date.now() - target.createdAt;
        // الحد الأدنى 0.5 (بدلاً من 0.25) حتى يبقى الهدف واضحاً
        // وقابل للمس حتى مع اقتراب نهاية عمره
        return Math.max(0.5, 1 - (elapsed / target.life) * 0.75);
    }

    /** رسم كل الأهداف والمؤثرات على الكانفاس. */
    drawTargets() {
        const ctx = this.game.ctx;

        this.targets.forEach(target => {
            const scale = this.targetScale(target);
            const r = target.radius * scale;   // نصف القطر الفعلي بعد التقلص

            // الكرات الذهبية تحصل على توهج (glow) خاص
            // 📚 ملاحظة أداء: توقّفنا عن ctx.shadowBlur (مكلف جداً على
            // الهواتف). نرسم بدلاً منه حلقة ذهبية شفافة خلف الكرة —
            // مظهر توهج قريب مع أداء أفضل بمراحل.
            if (target.type === 'bonus') {
                ctx.beginPath();
                ctx.arc(target.x, target.y, r + 6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 215, 0, 0.18)';
                ctx.fill();
            }

            // رسم الدائرة الخارجية للهدف:
            // 📚 درس — arc(x, y, r, 0, Math.PI * 2) ترسم دائرة كاملة
            // (زوايا من 0 إلى 2π). beginPath تبدأ مساراً جديداً.
            ctx.beginPath();
            ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
            ctx.fillStyle = target.color;     // لون التعبئة
            ctx.fill();                        // املأ الدائرة
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; // لون الحدود
            ctx.lineWidth = 2;                 // سماكة الحدود
            ctx.stroke();                      // ارسم الحدود

            // الدائرة الداخلية (تصميم الكرة — حلقة داخلية أفتح)
            ctx.beginPath();
            ctx.arc(target.x, target.y, r / 2, 0, Math.PI * 2);
            ctx.fillStyle = target.innerColor;
            ctx.fill();

            // الكرة الذهبية: نقطة بيضاء صغيرة تمنح إحساس اللمعان
            if (target.type === 'bonus') {
                ctx.beginPath();
                ctx.arc(target.x, target.y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            }
        });

        // رسم الجزيئات (انفجار الإصابة)
        // 📚 درس — globalAlpha = الشفافية العامة للرسم التالي
        // نحسبها كنسبة: الجزء المتبقي من العمر / العمر الكلي
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;   // 📚 مهم: أعد الشفافية لطبيعتها للرسومات القادمة!

        // رسم النصوص الطائرة مثل "+10"
        // 📚 درس — strokeText + fillText معاً:
        // نرسم حدوداً سوداء خلف النص ثم ملء ملوّن فوقها،
        // فيظهر النص واضحاً فوق أي خلفية. مثل تأثير "outline".
        this.floatTexts.forEach(f => {
            ctx.globalAlpha = Math.max(f.alpha, 0);
            ctx.font = `800 ${f.size}px 'Segoe UI', Arial, sans-serif`; // 800 = خط عريض جداً
            ctx.textAlign = 'center';
            ctx.fillStyle = f.color;
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 3;
            ctx.strokeText(f.text, f.x, f.y);
            ctx.fillText(f.text, f.x, f.y);
        });
        ctx.globalAlpha = 1;

        // رسم الرموز التعبيرية للاحتفال (زخرفي 100%)
        this.emoji.forEach(e => {
            ctx.save();
            ctx.globalAlpha = Math.max(e.life / e.maxLife, 0);
            ctx.translate(e.x, e.y);
            ctx.rotate(e.rot);
            ctx.font = `${e.size}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(e.char, 0, 0);
            ctx.restore();
        });
        ctx.globalAlpha = 1;
    }

    /**
     * فحص هل النقرة أصابت هدفاً أم لا.
     * @returns {boolean} صحيح إذا أصابت هدفاً
     *
     * 📚 درس — كشف التصادم الدائري (Circle Collision):
     * الفكرة بسيطة وذكية: إذا كانت المسافة بين نقطة النقر
     * ومركز الهدف أقل من نصف قطره → إصابة!
     * Math.hypot(a, b) تحسب المسافة (نظرية فيثاغورس).
     */
    checkClick(x, y) {
        // نبحث من آخر هدف (الأحدث) لأنه المرسوم فوق الجميع
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            // Perf: squared distance avoids Math.hypot sqrt per target.
            const dx = x - t.x;
            const dy = y - t.y;

            // 📚 منطقة لمس سخية (Generous Touch Area):
            // الأصابع لا تنقر بدقة أكيدة، فنجعل منطقة الإصابة أكبر
            // بشكل ملحوظ من شكل الهدف المرئي. الحد الأدنى بالبكسل
            // كانفاس × دقة الجهاز حتى يبقى حجمُ اللمس مناسباً للأصابع
            // (حوالي 44 بكسل CSS) حتى لو تقلص الهدف أو كان صغيراً.
            const visualR = t.radius * this.targetScale(t);
            const hitRadius = Math.max(visualR * 1.6, this.game.dpr * 24);

            if (dx * dx + dy * dy <= hitRadius * hitRadius) {
                this.game.registerHit(t, x, y);  // أبلغ اللعبة بالإصابة (تحسب النقاط)
                this.targets.splice(i, 1);       // 📚 splice يحذف عنصراً من المصفوفة
                return true;
            }
        }
        this.game.registerMiss(x, y);  // لم نصب أي شيء → أخبر اللعبة (خطأ)
        return false;
    }

    /**
     * توليد انفجار جزيئات عند نقطة (x, y).
     *
     * 📚 درس — حساب حركة دائرية بزوايا عشوائية:
     * زاوية عشوائية (0 إلى 2π) + سرعة عشوائية =
     * كل جزيء ينطلق باتجاه مختلف = شكل انفجار كروي!
     * cos للاتجاه الأفقي و sin للاتجاه العمودي.
     */
    burst(x, y, color, count = 14) {
        // Perf cap: drop oldest particles instead of unbounded growth.
        if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
        if (this.floatTexts.length > 20) this.floatTexts.splice(0, this.floatTexts.length - 20);
        const n = Math.min(count, 16);
        for (let i = 0; i < n; i++) {
            const angle = Math.random() * Math.PI * 2;   // زاوية عشوائية
            const speed = 1.5 + Math.random() * 3.5;       // سرعة عشوائية
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,    // سرعة أفقية من الزاوية
                vy: Math.sin(angle) * speed - 1, // -1 يمنح دفعة أولية للأعلى
                size: 2 + Math.random() * 3,     // أحجام مختلفة للجزيئات
                color: color,
                life: 30 + Math.random() * 15,   // عمر عشوائي بالفريمات
                maxLife: 45
            });
        }
    }

    /** إضافة نص طائر مثل "+10" عند نقطة معينة. */
    addFloatText(x, y, text, color = '#fff', size = 22) {
        this.floatTexts.push({ x, y, text, color, alpha: 1, size });
    }

    /** مسح كل شيء (نستدعيها عند إعادة التعيين أو بدء جولة جديدة). */
    clearTargets() {
        this.targets = [];
        this.particles = [];
        this.floatTexts = [];
        this.emoji = [];
    }

    getTargets() { return this.targets; }
}

export { TargetManager };