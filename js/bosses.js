// Boss 實體設計
class Boss extends Entity {
    constructor(x, y, type) {
        super(x, y, 96, 96); // 巨大化三倍
        this.bossType = type; // 1: 草原大王, 2: 冰雪巨怪, 3: 火山巨龍
        this.isStatic = false; // 不是靜態物件，受重力影響

        this.hp = 3;
        if (type === 2) this.hp = 5;
        if (type === 3) this.hp = 8;
        this.maxHp = this.hp;

        this.color = type === 1 ? '#d35400' : type === 2 ? '#3498db' : '#8e44ad';

        // [BUG FIX] 初始狀態改為 move，不然 Boss 永不會行動
        this.state = 'move';
        this.timer = 0;
        this.onGround = false; // 指示是否在地面，用於跳躍判斷
        this.vx = type === 3 ? -2 : -1.5; // 火山龍較快

        this.projectiles = [];
    }

    update() {
        // Boss 受重力影響
        if (Physics) Physics.applyPhysics(this);
        // [BUG FIX] onGround 的重置已移至 main.js 的 updateBoss() 中
        // 在碰撞偵測 "之前" 歸零，這樣碰撞偵測設定的 true 才不會被覆蓋

        this.timer++;

        if (this.state === 'hurt') {
            this.vx = 0;
            if (this.timer > 30) {
                this.state = 'move';
                this.timer = 0;
                this.vx = this.bossType === 3 ? -2.5 : -1.5;
            }
            return;
        }

        if (this.state === 'move') {
            // [BUG FIX] 草原王跳躍改用 onGround 判斷，而非 vy === 0
            if (this.bossType === 1 && this.timer > 120 && this.onGround) {
                this.vy = -12;
                this.timer = 0;
            }
            if (this.bossType === 2 && this.timer > 180) {
                this.vx *= -1;
                this.timer = 0;
            }
            if (this.bossType === 3) {
                if (Game.player) {
                    this.vx = this.x > Game.player.x ? -2.5 : 2.5;
                }
            }
        }
    }

    takeDamage() {
        this.hp--;
        this.state = 'hurt';
        this.timer = 0;
        ParticleSystem.emit(this.x + this.width / 2, this.y + this.height / 2, '#ecf0f1', 'explode', 20);
        if (typeof AudioObj !== 'undefined') AudioObj.playSound('stomp');

        if (this.hp <= 0) {
            this.markedForDeletion = true;
            Game.score += 5000;
            Game.updateUI();
        }
    }

    draw(ctx) {
        if (this.state === 'hurt' && Math.floor(Date.now() / 100) % 2 === 0) return;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 畫生氣的眼睛
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 10, this.y + 20, 20, 20);
        ctx.fillRect(this.x + 60, this.y + 20, 20, 20);

        ctx.fillStyle = 'black';
        ctx.beginPath();
        // 怒眉毛
        ctx.moveTo(this.x, this.y + 10);
        ctx.lineTo(this.x + 35, this.y + 25);
        ctx.moveTo(this.x + 90, this.y + 10);
        ctx.lineTo(this.x + 55, this.y + 25);
        ctx.stroke();

        ctx.fillRect(this.x + (this.vx < 0 ? 10 : 20), this.y + 25, 10, 10);
        ctx.fillRect(this.x + (this.vx < 0 ? 60 : 70), this.y + 25, 10, 10);

        // 畫血條
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 20, this.width, 10);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, this.y - 20, this.width * (this.hp / this.maxHp), 10);
    }
}
