// 進階版輸入管理模組
const Input = {
    keys: {
        left: false,
        right: false,
        jump: false,
        dash: false
    },

    // 初始化鍵盤與觸控事件
    init() {
        // --- 鍵盤監聽 ---
        window.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.jump = true;
            // 新增 Dash: Shift 鍵
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.dash = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.jump = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.dash = false;
        });

        // --- 虛擬搖桿觸控監聽 ---
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnJump = document.getElementById('btn-jump');
        const btnDash = document.getElementById('btn-dash');

        const attachTouch = (btn, keyName) => {
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[keyName] = true; btn.classList.add('active'); }, { passive: false });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[keyName] = false; btn.classList.remove('active'); }, { passive: false });
            btn.addEventListener('touchcancel', (e) => { e.preventDefault(); this.keys[keyName] = false; btn.classList.remove('active'); }, { passive: false });

            // 讓滑鼠也能測試
            btn.addEventListener('mousedown', () => { this.keys[keyName] = true; btn.classList.add('active'); });
            btn.addEventListener('mouseup', () => { this.keys[keyName] = false; btn.classList.remove('active'); });
            btn.addEventListener('mouseleave', () => { this.keys[keyName] = false; btn.classList.remove('active'); });
        };

        attachTouch(btnLeft, 'left');
        attachTouch(btnRight, 'right');
        attachTouch(btnJump, 'jump');
        attachTouch(btnDash, 'dash');
    },

    reset() {
        // 用於清空只允許觸發一次的事件 (目前採持續按壓判定為主)
    }
};
