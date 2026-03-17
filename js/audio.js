// 音效管理模組
// Web Audio API 會受到瀏覽器的自動播放政策限制，必須要在使用者點擊螢幕後才能發聲。
// 在主選單點擊 "START" 時，會呼叫 init()。

const AudioObj = {
    audioCtx: null,

    // 簡化的合成音效產生器 (不需要外部檔案即可運作)
    init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    },

    playSound(type) {
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;

        switch (type) {
            case 'jump':
                // 典型跳躍音：頻率快速升高
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'coin':
                // 吃到金幣：高頻的叮音
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.setValueAtTime(1200, now + 0.05);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            case 'stomp':
                // 踩敵人：低頻波
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'die':
                // 死亡：一連串不和諧的聲音降調
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            case 'clear':
                // 過關旋律：簡單的上揚音
                osc.type = 'square';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.setValueAtTime(400, now + 0.2);
                osc.frequency.setValueAtTime(500, now + 0.4);
                osc.frequency.setValueAtTime(600, now + 0.6);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0, now + 1);
                osc.start(now);
                osc.stop(now + 1);
                break;
            case 'dash':
                // 衝刺音效：急促的風切聲 (用白噪音近似，這裡用高頻快速下降代替)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1000, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'break':
                // 破壞磚塊音效
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.1);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
        }
    },

    // BGM 背景音樂播放功能
    bgm: null, // HTML5 Audio 物件（用於播放 MP3 背景音樂）

    playBGM() {
        try {
            // 如果尚未建立 Audio 物件，則建立一個
            if (!this.bgm) {
                this.bgm = new Audio('alexgrohl-energetic-action-sport-500409.mp3');
                this.bgm.loop = true;   // 啟用循環播放
                this.bgm.volume = 0.4;  // 音量設為 40%，避免蓋過音效
            }
            // 從頭開始播放
            this.bgm.currentTime = 0;
            this.bgm.play().catch(err => {
                console.warn('BGM 播放失敗（可能是瀏覽器自動播放限制）:', err);
            });
        } catch (e) {
            console.warn('BGM 初始化失敗:', e);
        }
    },

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0; // 重置播放位置
        }
    }
};
