// ============================================================
//  ui.js — أدوات الواجهة: الصعوبة، الصوت، وعرض سجل المحاولات
// ============================================================
//  📚 درس — وحدة ES تعرّف دالة setupUI(game, store) تُستدعى من
//  main.js بعد إنشاء مثيل اللعبة. فصل المسؤوليات: هذا الملف يهتم
//  فقط بربط عناصر الواجهة بالمنطق.
import { useGameStore } from './store.js';

/**
 * عرض سجل المحاولات في القائمة المنسدلة.
 * @param {HTMLElement} listEl - عنصر القائمة (ul)
 */
function renderHistory(listEl) {
    const tries = useGameStore.getState().tries;
    listEl.innerHTML = '';

    if (!tries.length) {
        const li = document.createElement('li');
        li.className = 'try-item try-empty';
        li.textContent = 'No tries yet — play a round!';
        listEl.appendChild(li);
        return;
    }

    tries.forEach((t) => {
        const li = document.createElement('li');
        li.className = 'try-item';

        const score = document.createElement('span');
        score.className = 'try-score';
        score.textContent = t.score;

        const meta = document.createElement('span');
        meta.className = 'try-meta';
        const date = new Date(t.date).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        meta.textContent = `${date} · ${t.difficulty} · ${t.accuracy}% · 🔥${t.bestStreak}`;

        // أوسمة المحاولة (شارات صغيرة تحت البيانات)
        if (Array.isArray(t.medals) && t.medals.length) {
            const medals = document.createElement('span');
            medals.className = 'try-medals';
            medals.innerHTML = t.medals.map(m =>
                `<span class="mini-medal" title="${m.name}">${m.icon}</span>`
            ).join('');
            li.appendChild(medals);
        }

        li.appendChild(score);
        li.appendChild(meta);
        listEl.appendChild(li);
    });
}

/**
 * ربط كل عناصر الواجهة.
 * @param {object} game - مثيل HandballGoalkeeperGame
 */
export function setupUI(game) {
    // ---------- محدد مستوى الصعوبة ----------
    const difficultySelect = document.getElementById('difficulty');
    if (difficultySelect) {
        difficultySelect.addEventListener('change', (e) => {
            game.difficulty = e.target.value;
            game.targetSpawnRate = { easy: 1400, medium: 1000, hard: 700 }[game.difficulty];
        });
    }

    // ---------- زر تشغيل/كتم الصوت 🔊 ----------
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            game.sound.enabled = !game.sound.enabled;
            soundBtn.textContent = game.sound.enabled ? '🔊' : '🔇';
            soundBtn.classList.toggle('muted', !game.sound.enabled);
            if (game.sound.enabled) game.sound.beep(700, 0.08);
        });
    }

    // ---------- سجل المحاولات (قائمة منسدلة) ----------
    const historyToggle = document.getElementById('historyToggle');
    const historyPanel = document.getElementById('historyPanel');
    const historyList = document.getElementById('historyList');
    const bestScoreEl = document.getElementById('historyBest');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    if (historyToggle && historyPanel) {
        historyToggle.addEventListener('click', () => {
            const isOpen = historyPanel.classList.toggle('open');
            historyToggle.textContent = isOpen ? '📜 Hide History' : '📜 History';
            if (isOpen) refreshHistory();
        });

        function refreshHistory() {
            const { best, tries } = useGameStore.getState();
            if (bestScoreEl) bestScoreEl.textContent = best;
            if (clearHistoryBtn) clearHistoryBtn.style.display = tries.length ? '' : 'none';
            renderHistory(historyList);
        }

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                useGameStore.getState().clearTries();
                refreshHistory();
            });
        }
    }
}
