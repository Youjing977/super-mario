/**
 * 基礎實體類別 (Base Entity Class)
 * 這是遊戲中所有動態與靜態物件的「父類別 (Super Class)」。
 * 它定義了所有物件共有的屬性（座標、大小、速度等）與方法（更新邏輯、繪圖）。
 * 透過「繼承 (Inheritance)」機制，Player、Enemy 等類別都能重複使用這些程式碼。
 */
class Entity {
    constructor(x, y, width, height) {
        this.x = x;             // X 座標 (左上角)
        this.y = y;             // Y 座標 (左上角)
        this.width = width;     // 寬度
        this.height = height;   // 高度
        this.vx = 0;            // X 軸速度 (Velocity X)
        this.vy = 0;            // Y 軸速度 (Velocity Y)
        this.isStatic = false;  // 是否為靜態物體 (靜態物體不受重力影響)
        this.markedForDeletion = false; // 標記是否需要在下一幀被刪除 (垃圾回收機制)
    }

    // 更新邏輯 (由子類別也就是繼承的類別去覆寫/實作)
    update() { }
    
    // 繪製畫面 (由子類別去覆寫/實作)
    draw(ctx) { }
}

/**
 * 玩家類別 (Player Class)
 * 繼承自 Entity，代表玩家控制的角色。
 */
class Player extends Entity {
    constructor(x, y) {
        // 使用 super() 呼叫父類別 (Entity) 的 constructor 來初始化基本屬性
        super(x, y, 32, 32); // 玩家大小固定為 32x32

        // --- 玩家專屬屬性 ---
        this.baseSpeed = 5;      // 基礎移動速度
        this.speed = this.baseSpeed;
        this.jumpForce = -14;    // 跳躍力量 (向上的初速度，因此是負值)
        this.onGround = false;   // 是否站在地面上
        this.color = '#e74c3c';  // 主題色：紅色

        // 二段跳機制
        this.maxJumps = 2;       // 最大可跳躍次數
        this.jumpCount = 0;      // 目前已跳躍次數

        // 衝刺機制 (Dash)
        this.canDash = true;     // 標記在這次騰空過程中是否還能衝刺
        this.isDashing = false;  // 目前是否正在衝刺狀態
        this.dashSpeed = 12;     // 衝刺時的速度
        this.dashDuration = 15;  // 衝刺持續時間 (幀數)
        this.dashTimer = 0;      // 衝刺計時器
        this.dashCooldown = 60;  // 衝刺冷卻時間 (幀數)
        this.dashCooldownTimer = 0;
        this.facing = 1;         // 角色面向方向：1代表右, -1代表左

        // 跳躍按鍵防呆：防止長按空白鍵觸發連續跳躍
        this.jumpHold = false;

        // 無敵狀態與時間 (受傷後或特殊狀態下)
        this.invulnerable = false;
        this.invulnerableTimer = 0;
    }

    /**
     * 更新玩家每幀的狀態、處理控制器輸入
     */
    update() {
        // --- 衝刺冷卻更新 ---
        if (this.dashCooldownTimer > 0) this.dashCooldownTimer--;
        
        // 落地時重置「衝刺權」與「跳躍次數」
        if (this.onGround) {
            this.canDash = true; 
            this.jumpCount = 0;
        }

        // --- 狀態檢查：是否正在衝刺 ---
        if (this.isDashing) {
            this.dashTimer--;
            this.vx = this.dashSpeed * this.facing; // 以固定速度同方向衝刺
            this.vy = 0; // 衝刺時不受重力影響 (在空中衝刺能保持平飛)

            // 產生殘影粒子特效 (每2幀產生一個)
            if (this.dashTimer % 2 === 0) {
                ParticleSystem.emit(this.x, this.y, 'rgba(52, 152, 219, 0.5)', 'dash');
            }

            // 衝刺結束
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.speed = this.baseSpeed; // 恢復一般速度
            }
        }
        else {
            // --- 左右移動邏輯 ---
            if (Input.keys.left) {
                this.vx = -this.speed;
                this.facing = -1;
            } else if (Input.keys.right) {
                this.vx = this.speed;
                this.facing = 1;
            } else {
                // 沒有按左右鍵時，施加摩擦力減速 (模擬滑行停下)
                this.vx *= 0.8;
                if (Math.abs(this.vx) < 0.1) this.vx = 0; // 去除微小的小數點浮動
            }

            // --- 衝刺啟動邏輯 ---
            // 條件：必須按下衝刺鍵、有衝刺權 (在空中只能衝一次)、且冷卻時間結束
            if (Input.keys.dash && this.canDash && this.dashCooldownTimer <= 0) {
                this.isDashing = true;
                this.canDash = false; // 消耗當次衝刺權，直到下次落地才能恢復
                this.dashTimer = this.dashDuration;
                this.dashCooldownTimer = this.dashCooldown;
                if (typeof AudioObj !== 'undefined') AudioObj.playSound('dash');
            }

            // --- 跳躍機制 (支援二段跳) ---
            // 防止長按空白鍵變成機關槍連跳，我們使用 this.jumpHold 來防呆
            if (Input.keys.jump && !this.jumpHold) {
                if (this.jumpCount < this.maxJumps) {
                    this.vy = this.jumpForce; // 給予向上初速度
                    this.jumpCount++;
                    this.onGround = false;

                    // 粒子發射 (如果在地上就是揚塵，在空中就是白雲)
                    if (this.jumpCount === 1) {
                        ParticleSystem.emit(this.x + this.width / 2, this.y + this.height, '#ccc', 'jump', 10);
                    } else {
                        ParticleSystem.emit(this.x + this.width / 2, this.y + this.height, '#fff', 'jump', 15);
                    }

                    if (typeof AudioObj !== 'undefined') AudioObj.playSound('jump');
                }
                this.jumpHold = true; // 標記為按住不放
            } else if (!Input.keys.jump) {
                this.jumpHold = false; // 玩家鬆開按鍵，重置標記
            }
        }

        // --- 無敵計時更新 ---
        if (this.invulnerable) {
            this.invulnerableTimer -= Game.deltaTime;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }
    }

    /**
     * 繪製玩家到畫布上
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        // 如果處於無敵狀態，做閃爍效果 (利用時間差加上模數運算 % 來切換顯示/隱藏)
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) return;

        // 畫出身體
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 畫眼睛 (簡單的風格化)
        ctx.fillStyle = 'white';
        // 根據移動方向決定眼睛位置
        const eyeOffsetX = this.vx < 0 ? 4 : 20;
        ctx.fillRect(this.x + eyeOffsetX, this.y + 8, 8, 8);
        
        ctx.fillStyle = 'black'; // 畫眼珠
        ctx.fillRect(this.x + eyeOffsetX + (this.vx < 0 ? 0 : 4), this.y + 10, 4, 4);
    }
}

// --- 平台類別 (擴充冰、岩漿、破壞磚塊) ---
class Platform extends Entity {
    constructor(x, y, width, height, type = 'normal', properties = {}) {
        super(x, y, width, height);
        this.type = type; // normal, moving, falling, ice, lava, breakable
        this.isStatic = true;
        this.color = '#8e44ad';
        this.props = properties;

        if (this.type === 'moving') {
            this.startX = x;
            this.moveRange = properties.range || 100;
            this.moveSpeed = properties.speed || 1.5;
            this.direction = 1;
            this.color = '#2980b9';
        } else if (this.type === 'falling') {
            this.isFalling = false;
            this.fallTimer = 0;
            this.fallDelay = 30;
            this.color = '#f39c12';
        } else if (this.type === 'ice') {
            this.color = '#74b9ff'; // 淺藍色冰面
            this.friction = 0.98; // 滑動摩擦力
        } else if (this.type === 'lava') {
            this.color = '#d35400'; // 岩漿
            this.isDeadly = true; // 碰到即死
        } else if (this.type === 'breakable') {
            this.color = '#cf6a32'; // 磚塊色
            this.isBreakable = true;
        }
    }

    update() {
        if (this.type === 'moving') {
            this.x += this.moveSpeed * this.direction;
            if (Math.abs(this.x - this.startX) > this.moveRange) {
                this.direction *= -1;
            }
            if (Game.player && Physics.checkCollision(Game.player, this) === 'bottom') {
                Game.player.x += this.moveSpeed * this.direction;
            }
        } else if (this.type === 'falling') {
            if (this.isFalling) {
                this.fallTimer++;
                if (this.fallTimer > this.fallDelay) {
                    this.isStatic = false;
                    this.color = '#c0392b';
                    if (Physics) Physics.applyPhysics(this);
                }
                if (this.y > (Game.canvas ? Game.canvas.height + 200 : 800)) {
                    this.markedForDeletion = true;
                }
            }
        } else if (this.type === 'lava') {
            // 岩漿表面動畫 (微微浮動或單純顏色閃爍)
            if (Math.floor(Date.now() / 200) % 2 === 0) {
                this.color = '#e67e22';
            } else {
                this.color = '#d35400';
            }
        }
    }

    breakBlock() {
        if (this.isBreakable) {
            this.markedForDeletion = true;
            if (typeof AudioObj !== 'undefined') AudioObj.playSound('break');
            ParticleSystem.emit(this.x + this.width / 2, this.y + this.height / 2, this.color, 'explode', 8);
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        let drawX = this.x;
        let drawY = this.y;
        if (this.type === 'falling' && this.isFalling && this.fallTimer < this.fallDelay) {
            drawX += (Math.random() - 0.5) * 4;
        }

        ctx.fillRect(drawX, drawY, this.width, this.height);

        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.strokeRect(drawX, drawY, this.width, this.height);

        // 磚塊紋理
        if (this.type === 'breakable') {
            ctx.beginPath();
            ctx.moveTo(drawX, drawY + this.height / 2);
            ctx.lineTo(drawX + this.width, drawY + this.height / 2);
            ctx.moveTo(drawX + this.width / 2, drawY);
            ctx.lineTo(drawX + this.width / 2, drawY + this.height);
            ctx.stroke();
        }
    }
}

// --- 敵人類別 (擴展飛行、巡邏) ---
class Enemy extends Entity {
    constructor(x, y, type = 'walk', props = {}) {
        super(x, y, 32, 32);
        this.type = type; // walk, fly, patrol
        this.vx = typeof props.vx === 'number' ? props.vx : -1.5;
        this.color = '#27ae60';

        if (this.type === 'fly') {
            this.isStatic = true; // 不受重力
            this.startY = y;
            this.flyTimer = 0;
            this.color = '#9b59b6'; // 紫色
        } else if (this.type === 'patrol') {
            this.startX = x;
            this.patrolRange = props.range || 100;
            this.color = '#c0392b'; // 紅色
        }
    }

    update() {
        if (this.type === 'fly') {
            this.flyTimer += 0.05;
            this.y = this.startY + Math.sin(this.flyTimer) * 50;
            this.x += this.vx;
        } else {
            if (Physics) Physics.applyPhysics(this);

            if (this.type === 'patrol') {
                if (Math.abs(this.x - this.startX) > this.patrolRange) {
                    this.vx *= -1;
                }
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        if (this.type === 'fly') {
            // 畫翅膀
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x - 10, this.y + 5, 10, 10);
            ctx.fillRect(this.x + this.width, this.y + 5, 10, 10);
        }

        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 4, this.y + 8, 8, 8);
        ctx.fillRect(this.x + 20, this.y + 8, 8, 8);
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + (this.vx < 0 ? 4 : 8), this.y + 10, 4, 4);
        ctx.fillRect(this.x + (this.vx < 0 ? 20 : 24), this.y + 10, 4, 4);
    }
}

// --- 道具(金幣) ---
class Item extends Entity {
    constructor(x, y) {
        super(x + 8, y + 8, 16, 16); // 置中 16x16
        this.isStatic = true;
        this.startY = this.y;
        this.timer = 0;
    }

    update() {
        this.timer += 0.1;
        this.y = this.startY + Math.sin(this.timer) * 5; // 上下浮動特效
    }

    draw(ctx) {
        ctx.fillStyle = '#f1c40f'; // 黃色
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// --- 陷阱(尖刺) ---
class Trap extends Entity {
    constructor(x, y, width) {
        super(x, y, width, 20); // 固定高度 20
        this.isStatic = true;
    }

    draw(ctx) {
        ctx.fillStyle = '#7f8c8d'; // 灰色
        // 畫一排尖刺
        const spikeWidth = 20;
        const numSpikes = Math.floor(this.width / spikeWidth);
        for (let i = 0; i < numSpikes; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x + i * spikeWidth, this.y + this.height);
            ctx.lineTo(this.x + i * spikeWidth + spikeWidth / 2, this.y);
            ctx.lineTo(this.x + i * spikeWidth + spikeWidth, this.y + this.height);
            ctx.fill();
        }
    }
}

// --- 終點旗子 ---
class Flag extends Entity {
    constructor(x, y) {
        super(x, y, 40, 200); // 高高的一根旗杆
        this.isStatic = true;
    }

    draw(ctx) {
        // 旗杆
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(this.x, this.y, 8, this.height);

        // 旗子本身
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.moveTo(this.x + 8, this.y + 10);
        ctx.lineTo(this.x + 40, this.y + 30);
        ctx.lineTo(this.x + 8, this.y + 50);
        ctx.fill();
    }
}
