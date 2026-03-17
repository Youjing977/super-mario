// 粒子特效物件設計
class Particle {
    constructor(x, y, color, type) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type; // 'jump', 'dash', 'coin', 'explode'
        this.size = Math.random() * 4 + 2;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;

        if (type === 'explode') {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        } else if (type === 'coin') {
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = -Math.random() * 5 - 2;
            this.decay = 0.05;
        } else if (type === 'dash') {
            // 衝刺殘影：不移動，單純隨時間淡出
            this.size = 32; // 與玩家同高
            this.vx = 0;
            this.vy = 0;
            this.decay = 0.1;
        } else {
            // 跳躍揚塵
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = -Math.random() * 2;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // 除了衝刺殘影，其他粒子可能受微弱重力
        if (this.type === 'explode' || this.type === 'coin') {
            this.vy += 0.2;
        }

        this.life -= this.decay;
        return this.life <= 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;

        if (this.type === 'dash') {
            // 畫一個方塊殘影
            ctx.fillRect(this.x, this.y, 32, 32);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// 全域特效管理
const ParticleSystem = {
    emit(x, y, color, type, amount) {
        if (!Game.particles) Game.particles = [];
        // 衝刺殘影通常只產生一個
        if (type === 'dash') amount = 1;

        for (let i = 0; i < amount; i++) {
            Game.particles.push(new Particle(x, y, color, type));
        }
    },

    updateAndDraw(ctx) {
        if (!Game.particles) return;
        for (let i = Game.particles.length - 1; i >= 0; i--) {
            const p = Game.particles[i];
            if (p.update()) {
                Game.particles.splice(i, 1);
            } else {
                p.draw(ctx);
            }
        }
    }
};
