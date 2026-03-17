// 遊戲主要運行核心
const Game = {
    canvas: null,
    ctx: null,

    // 遊戲狀態與存檔
    // MAIN_MENU, LEVEL_SELECT, PLAYING, DEAD_ANIMATION, LEVELCLEAR_ANIMATION, LEVELCLEAR, GAMEOVER, ALLCLEAR
    state: 'MAIN_MENU',
    currentLevel: 1,
    maxLevel: 30,
    score: 0,
    coins: 0,
    lives: 3,
    coinsCollectedThisRun: 0, // [BUG FIX] 追蹤本局實際收集的金幣總數（不受兌換命扣減影響）
    saveData: null,
    boss: null, // 當前Boss物件

    // 遊戲物件群
    player: null,
    camera: null,
    platforms: [],
    enemies: [],
    items: [],
    traps: [],
    flag: null,
    particles: [],

    // 迴圈與幀率控制
    lastTime: 0,
    deltaTime: 0,
    reqAnimation: null,

    // 初始化遊戲
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        Input.init();
        this.camera = new Camera(this.canvas.width, this.canvas.height);
        this.saveData = SaveSystem.load();

        this.bindEvents();
        this.showMainMenu();
        this.loop(0);
    },

    bindEvents() {
        document.getElementById('btn-start-game').addEventListener('click', () => {
            if (typeof AudioObj !== 'undefined') AudioObj.init();
            this.currentLevel = this.saveData.maxUnlockedLevel;
            this.lives = 3;
            this.score = this.saveData.totalScore || 0;
            this.coins = this.saveData.totalCoins || 0;
            this.startGame();
        });

        document.getElementById('btn-level-select').addEventListener('click', () => {
            if (typeof AudioObj !== 'undefined') AudioObj.init();
            this.showLevelSelect();
        });

        document.getElementById('btn-reset-save').addEventListener('click', () => {
            if (confirm('確定要重置所有進度與分數嗎？')) {
                this.saveData = SaveSystem.reset();
                this.updateMenuStats();
                alert('已重置存檔！');
            }
        });

        document.getElementById('btn-back-menu').addEventListener('click', () => {
            this.showMainMenu();
        });

        document.getElementById('overlay-btn').addEventListener('click', () => {
            this.handleOverlayClick();
        });
    },

    // 顯示主選單
    showMainMenu() {
        this.state = 'MAIN_MENU';
        document.getElementById('menu-layer').style.display = 'flex';
        document.getElementById('main-menu').classList.add('active');
        document.getElementById('level-select-menu').classList.remove('active');
        document.getElementById('ui-layer').style.display = 'none';
        this.canvas.style.display = 'none';
        document.getElementById('touch-controls').style.display = 'none';
        this.updateMenuStats();
    },

    updateMenuStats() {
        document.getElementById('main-stats').innerText =
            `最高分數: ${this.saveData.totalScore || 0} | 累計金幣: ${this.saveData.totalCoins || 0}`;
    },

    // 顯示關卡選擇
    showLevelSelect() {
        this.state = 'LEVEL_SELECT';
        document.getElementById('main-menu').classList.remove('active');
        document.getElementById('level-select-menu').classList.add('active');
        this.generateLevelGrid();
    },

    generateLevelGrid() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';

        for (let i = 1; i <= this.maxLevel; i++) {
            const card = document.createElement('div');
            card.classList.add('level-card');
            if (i % 10 === 0) card.classList.add('boss');

            const isUnlocked = i <= this.saveData.maxUnlockedLevel;
            card.classList.add(isUnlocked ? 'unlocked' : 'locked');
            card.innerHTML = `<span class="lvl-num">${i}</span>`;

            if (isUnlocked) {
                card.addEventListener('click', () => {
                    this.currentLevel = i;
                    this.lives = 3;
                    this.score = this.saveData.totalScore || 0;
                    this.coins = this.saveData.totalCoins || 0;
                    this.startGame();
                });
            }
            grid.appendChild(card);
        }
    },

    startGame() {
        document.getElementById('menu-layer').style.display = 'none';
        document.getElementById('ui-layer').style.display = 'flex';
        this.canvas.style.display = 'block';
        document.getElementById('touch-controls').style.display = '';

        this.coinsCollectedThisRun = 0; // 每次開始新遊戲時歸零
        this.loadLevel(this.currentLevel);
        this.state = 'PLAYING';
        if (typeof AudioObj !== 'undefined') AudioObj.playBGM();
    },

    // 處理覆蓋層點擊
    handleOverlayClick() {
        document.getElementById('overlay').classList.add('hidden');

        if (this.state === 'GAMEOVER') {
            this.showMainMenu();
        } else if (this.state === 'LEVELCLEAR') {
            this.currentLevel++;

            if (this.currentLevel > this.saveData.maxUnlockedLevel && this.currentLevel <= this.maxLevel) {
                this.saveData = SaveSystem.save({ maxUnlockedLevel: this.currentLevel });
            }

            if (this.currentLevel > this.maxLevel) {
                // [BUG FIX] 全破後保留存檔進度，不重置 maxUnlockedLevel
                this.showOverlay('恭喜通關全破！', `感謝您的遊玩！<br>最終分數：${this.score}`, '回主畫面');
                this.state = 'ALLCLEAR';
            } else {
                this.loadLevel(this.currentLevel);
                this.state = 'PLAYING';
            }
        } else if (this.state === 'ALLCLEAR') {
            this.showMainMenu();
        }
    },

    // 顯示覆蓋層
    showOverlay(title, desc, btnText) {
        document.getElementById('overlay-title').innerText = title;
        document.getElementById('overlay-desc').innerHTML = desc;
        document.getElementById('overlay-btn').innerText = btnText;
        document.getElementById('overlay').classList.remove('hidden');
    },

    // 載入關卡
    loadLevel(levelNumber) {
        const world = Math.ceil(levelNumber / 5);
        const stg = levelNumber % 5 === 0 ? 5 : levelNumber % 5;
        document.getElementById('level-display').innerText = `WORLD ${world}-${stg}`;

        // [BUG FIX] class/const 宣告不會成為 window 的屬性
        // 因此 window.LevelGenerator 永遠是 undefined，改用 typeof 檢查
        if (typeof LevelGenerator !== 'undefined') {
            const levelData = LevelGenerator.generate(levelNumber, this.canvas.width, this.canvas.height);
            this.platforms = levelData.platforms;
            this.enemies = levelData.enemies;
            this.items = levelData.items;
            this.traps = levelData.traps;
            this.flag = levelData.flag;
            this.boss = levelData.boss;

            // [BUG FIX] window.Player 也是同樣問題，這裡是主角消失的主因
            this.player = new Player(levelData.playerStart.x, levelData.playerStart.y);
            this.camera.x = 0;
            this.camera.maxMapWidth = levelData.mapWidth;
        }

        this.particles = [];
        this.updateUI();
    },

    updateUI() {
        document.getElementById('score-display').innerText = `SCORE: ${this.score}`;
        document.getElementById('coin-display').innerText = `🪙 ${this.coins}`;
        document.getElementById('lives-display').innerText = `❤️ ${this.lives}`;
    },

    // 玩家死亡處理
    playerDie() {
        if (this.state !== 'PLAYING') return;

        this.state = 'DEAD_ANIMATION';
        if (typeof AudioObj !== 'undefined') AudioObj.playSound('die');

        // [BUG FIX] 加入經典死亡動畫：先向上彈跳，再掉出畫面底部
        this.player.vy = -10;  // 向上彈跳
        this.player.vx = 0;    // 停止水平移動

        this.lives--;
        this.updateUI();

        setTimeout(() => {
            if (this.lives > 0) {
                this.loadLevel(this.currentLevel);
                this.state = 'PLAYING';
            } else {
                if (typeof AudioObj !== 'undefined') AudioObj.stopBGM();
                this.state = 'GAMEOVER';
                this.showOverlay('GAME OVER', `遊戲結束<br>最終分數：${this.score}`, '回到主選單');
            }
        }, 1500);
    },

    // [BUG FIX] 加入狀態守衛
    levelClear() {
        if (this.state !== 'PLAYING') return;

        this.state = 'LEVELCLEAR_ANIMATION';
        if (typeof AudioObj !== 'undefined') AudioObj.playSound('clear');

        this.score += Math.floor(this.lives * 500 + 1000);
        // [BUG FIX] 使用 coinsCollectedThisRun 來正確計算本局收集的金幣總數
        this.saveData = SaveSystem.save({
            totalScore: Math.max(this.score, this.saveData.totalScore),
            totalCoins: this.saveData.totalCoins + this.coinsCollectedThisRun
        });
        this.updateUI();

        setTimeout(() => {
            this.showOverlay('WORLD CLEAR!', '準備挑戰下一關', 'NEXT LEVEL');
            this.state = 'LEVELCLEAR';
        }, 2000);
    },

    loop(timestamp) {
        this.deltaTime = timestamp - this.lastTime;
        // 防止頁面失去焦點後 deltaTime 過大
        if (this.deltaTime > 100) this.deltaTime = 16;
        this.lastTime = timestamp;

        this.update();
        this.draw();

        Input.reset();
        this.reqAnimation = requestAnimationFrame((ts) => this.loop(ts));
    },

    // ==========================================
    // 遊戲迴圈與更新邏輯 (Game Loop & Update)
    // ==========================================
    // 每一個畫面影格 (Frame) 都會呼叫此函式來處理所有的物理與狀態變化
    update() {
        // [BUG FIX] 死亡動畫狀態：只更新玩家的重力讓角色彈跳後掉落
        if (this.state === 'DEAD_ANIMATION') {
            if (this.player) {
                this.player.vy += Physics.GRAVITY;
                this.player.y += this.player.vy;
            }
            return;
        }

        // 只有在遊玩狀態 (PLAYING) 才進行物件物理更新
        if (this.state !== 'PLAYING') return;
        if (!this.player) return;

        // 1. 處理玩家物理與控制
        this.updatePlayer();

        // 2. 處理平台 (地形) 邏輯與碰撞
        this.updatePlatforms();

        // 3. 處理收集品 (金幣)
        this.updateItems();

        // 4. 處理敵人 (包含 Boss) 動態與碰撞
        this.updateEnemies();
        this.updateBoss();

        // 5. 處理陷阱與地形傷害
        this.updateTraps();

        // 6. 處理過關判定
        this.checkLevelClear();

        // 7. 更新攝影機位置 (讓畫面跟著玩家走)
        this.camera.update(this.player);

        // 8. 邊界死亡判定 (玩家掉出畫面下方)
        if (this.player.y > this.canvas.height + 100) {
            this.playerDie();
        }
    },

    // --- 子更新函式 ---

    // 處理玩家物理與控制
    updatePlayer() {
        // [BUG FIX] 先處理輸入（含跳躍），再施加物理
        // 原本的順序是 applyPhysics → player.update()，這會導致：
        //   1. 重力讓玩家陷入地板 → 2. 跳躍設定 vy=-14 → 3. 碰撞解析把 vy 歸零
        // 修正為：
        //   1. 跳躍設定 vy=-14 → 2. 重力微調 vy=-13.4 → 3. 玩家向上移動，不觸發碰撞
        this.player.update();
        if (Physics) Physics.applyPhysics(this.player);
    },

    // 處理平台 (地形) 邏輯與碰撞
    updatePlatforms() {
        // [BUG FIX] onGround 的重置必須在碰撞偵測「之前」執行，而不是在 updatePlayer 中
        // 因為 player.update() 需要讀取「上一幀」的 onGround 來決定是否能跳躍
        this.player.onGround = false;

        // 先清除已經被標記為刪除 (markedForDeletion) 的平台 (例如被破壞的磚塊)
        this.platforms = this.platforms.filter(p => !p.markedForDeletion);
        
        // 更新所有平台狀態 (例如浮動平台移動或是落石掉落)
        this.platforms.forEach(p => { if (p.update) p.update(); });

        // 玩家與各個平台的碰撞偵測 (AABB 碰撞)
        for (const p of this.platforms) {
            const colDir = Physics.checkCollision(this.player, p);
            if (!colDir) continue;

            // 如果該平台是岩漿，碰到直接觸發死亡
            if (p.type === 'lava') {
                this.playerDie();
                return; // 立即中斷後續邏輯
            }

            // 判斷碰撞方向來決定玩家行為
            if (colDir === 'bottom') {
                // 玩家從上方踩在平台上
                this.player.onGround = true;
                this.player.vy = 0; // 清除向下掉落的速度 (重力歸零)
                
                // 踩到掉落平台觸發掉落機制
                if (p.type === 'falling') p.isFalling = true;

                // 踩到冰面：放大摩擦力 (因為原本在 entities 的 update 有摩擦減速 0.8)
                // 這裡我們反向操作讓滑行距離變長
                if (p.type === 'ice' && !Input.keys.left && !Input.keys.right && !this.player.isDashing) {
                    this.player.vx /= 0.8;  // 還原一般摩擦力
                    this.player.vx *= p.friction; // 施加更小的冰面摩擦力 (例如 0.98)
                }
            } else if (colDir === 'top') {
                // 玩家頭頂撞到平台下方
                this.player.vy = 0;
                // 若為破壞磚塊，觸發擊破邏輯
                if (p.type === 'breakable') p.breakBlock();
            } else {
                // 玩家從左側或右側撞到牆壁
                this.player.vx = 0;
            }
        }
    },

    // 處理道具更新與收集
    updateItems() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            
            // 處理道具自身的浮動動畫
            if (item.update) item.update(); 
            
            // 偵測玩家是否吃到道具
            // [BUG FIX] 改用 isOverlapping 避免 checkCollision 的位移副作用
            if (Physics.isOverlapping(this.player, item)) {
                this.items.splice(i, 1); // 吃到後從陣列中刪除
                
                // 金幣系統運算 (每 100 幣加 1 命)
                this.coins += 1;
                this.coinsCollectedThisRun += 1; // [BUG FIX] 追蹤實際收集的金幣數
                if (this.coins >= 100) {
                    this.coins -= 100;
                    this.lives += 1;
                    if (typeof AudioObj !== 'undefined') AudioObj.playSound('clear');
                } else {
                    if (typeof AudioObj !== 'undefined') AudioObj.playSound('coin');
                }
                
                this.score += 100;
                this.updateUI(); // 更新顯示分數
                
                // 產生吃到金幣的粒子特效
                if (typeof ParticleSystem !== 'undefined') ParticleSystem.emit(item.x, item.y, '#f1c40f', 'coin', 5);
            }
        }
    },

    // 處理一般敵人更新與碰撞
    updateEnemies() {
        // 從後往前跑迴圈，這是為了解決在迴圈中透過 splice 刪除陣列元素時，造成索引錯亂的問題
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // 更新敵人本身的邏輯 (移動、重力等)
            if (enemy.update) enemy.update();

            // 處理地面敵人與平台的碰撞 (讓敵人在平台上走動)
            if (enemy.type !== 'fly') {
                for (const p of this.platforms) {
                    const dir = Physics.checkCollision(enemy, p);
                    if (dir === 'bottom') { 
                        enemy.vy = 0; // 站在平台上 
                    } else if (dir === 'left' || dir === 'right') { 
                        enemy.vx *= -1; // 撞牆反彈轉向 
                    }
                }
            }

            // 如果敵人掉落出畫面底端則刪除
            if (enemy.y > this.canvas.height + 200) {
                this.enemies.splice(i, 1);
                continue;
            }

            // 玩家與敵人的碰撞偵測
            const pDir = Physics.checkCollision(this.player, enemy);
            if (pDir) {
                if (this.player.isDashing || this.player.invulnerable) {
                    // 如果玩家正在衝刺或處於無敵狀態：直接消滅敵人
                    this.enemies.splice(i, 1);
                    if (typeof ParticleSystem !== 'undefined') ParticleSystem.emit(enemy.x + 16, enemy.y + 16, enemy.color, 'explode', 15);
                    this.score += 200;
                    this.updateUI();
                    if (typeof AudioObj !== 'undefined') AudioObj.playSound('stomp');
                } else if (pDir === 'bottom' && this.player.vy > 0) {
                    // 如果碰撞方向為 bottom 且玩家正在掉落狀態(vy > 0)，表示「踩踏」擊殺
                    this.enemies.splice(i, 1);
                    this.player.vy = this.player.jumpForce * 0.6; // 踩到後給予一個向上彈跳的力
                    if (typeof ParticleSystem !== 'undefined') ParticleSystem.emit(enemy.x + 16, enemy.y + 16, enemy.color, 'explode', 15);
                    this.score += 200;
                    this.updateUI();
                    if (typeof AudioObj !== 'undefined') AudioObj.playSound('stomp');
                } else {
                    // 只要不是上述條件，代表玩家遭到敵人攻擊
                    this.playerDie();
                    return; // 終止後續判斷
                }
            }
        }
    },

    // 處理魔王更新與碰撞
    updateBoss() {
        if (!this.boss) return;

        if (this.boss.markedForDeletion) {
            // [BUG FIX] Boss 死亡後，移除右側高牆讓玩家能走到終點旗子
            this.platforms = this.platforms.filter(p => {
                // 移除 x >= 1400 且高度從 0 開始的高牆（Boss 競技場邊界）
                const isRightWall = (p.x >= 1400 && p.y === 0 && p.height >= 500);
                return !isRightWall;
            });
            this.boss = null; // 清除已死的 Boss 物件
        } else {
            // [BUG FIX] 在碰撞偵測之前歸零 onGround（對應 Bug1 的修正）
            this.boss.onGround = false;
            this.boss.update();

            // 處理 Boss 與平台的碰撞
            for (const p of this.platforms) {
                const dir = Physics.checkCollision(this.boss, p);
                if (dir === 'bottom') {
                    this.boss.vy = 0;
                    this.boss.onGround = true; // 落地後設定 onGround 讓 Boss 可以正常跳躍
                } else if (dir === 'left' || dir === 'right') {
                    this.boss.vx *= -1;
                }
            }

            // 處理玩家與 Boss 的碰撞
            const bDir = Physics.checkCollision(this.player, this.boss);
            if (bDir) {
                if (this.player.isDashing || this.player.invulnerable) {
                    // 衝刺或無敵：將玩家彈開，但不對 Boss 造成傷害 (防止連續無敵攻擊)
                    this.player.vx = this.player.x < this.boss.x ? -10 : 10;
                } else if (bDir === 'bottom' && this.player.vy > 0) {
                    // 從上方踩頭判定為造成傷害
                    this.boss.takeDamage();
                    this.player.vy = this.player.jumpForce; // 踩完彈起
                } else {
                    this.playerDie(); // 被 Boss 碰到直接死
                    return;
                }
            }
        }
    },

    // 處理尖刺陷阱等固定傷害位置
    updateTraps() {
        for (const trap of this.traps) {
            // 直接檢查是否有碰到
            // [BUG FIX] 改用 isOverlapping 避免玩家被陷阱推開
            if (Physics.isOverlapping(this.player, trap)) {
                // 如果沒有處於無敵狀態與衝刺狀態，則判定死亡
                // (有些遊戲或許會讓衝刺也無效，這裡保留衝刺過刺客的可能性)
                if (!this.player.invulnerable && !this.player.isDashing) {
                    this.playerDie();
                    return;
                }
            }
        }
    },

    // 過關旗幟判定
    checkLevelClear() {
        if (this.flag && Physics.checkCollision(this.player, this.flag)) {
            // 在 Boss 關卡中，如果 Boss 尚未被刪除，玩家無法過關
            if (this.currentLevel % 10 === 0 && this.boss && !this.boss.markedForDeletion) {
                // 阻擋玩家前進，強制停在旗幟前
                this.player.x = this.flag.x - this.player.width - 1;
                this.player.vx = 0;
            } else {
                // 順利過關
                this.levelClear();
            }
        }
    },

    draw() {
        if (this.state === 'MAIN_MENU' || this.state === 'LEVEL_SELECT') return;

        if (typeof RenderSystem !== 'undefined') {
            RenderSystem.render(this.ctx, this);
        } else {
            // 備用渲染
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);
            this.platforms.forEach(p => { if (p.draw) p.draw(this.ctx); });
            this.traps.forEach(t => { if (t.draw) t.draw(this.ctx); });
            if (this.flag && this.flag.draw) this.flag.draw(this.ctx);
            if (this.player && this.player.draw) this.player.draw(this.ctx);
            if (typeof ParticleSystem !== 'undefined') ParticleSystem.updateAndDraw(this.ctx);
            this.ctx.restore();
        }
    }
};

window.onload = () => { Game.init(); };
