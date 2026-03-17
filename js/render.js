// 獨立的渲染層：負責處理視差滾動背景、多世界色彩主題與實體繪圖分層
const RenderSystem = {
    // 定義 6 大世界的背景色彩與元素配置
    worlds: {
        1: { name: '草原', skyLeft: '#87CEEB', skyRight: '#1E90FF', groundColor: '#27ae60' }, // 1-5
        2: { name: '沙漠', skyLeft: '#F4A460', skyRight: '#D2691E', groundColor: '#e67e22' }, // 6-10
        3: { name: '冰雪', skyLeft: '#E0FFFF', skyRight: '#ADD8E6', groundColor: '#bdc3c7' }, // 11-15
        4: { name: '森林', skyLeft: '#2E8B57', skyRight: '#006400', groundColor: '#2E4053' }, // 16-20
        5: { name: '火山', skyLeft: '#8B0000', skyRight: '#000000', groundColor: '#7B241C' }, // 21-25
        6: { name: '城堡', skyLeft: '#2F4F4F', skyRight: '#000000', groundColor: '#17202A' }  // 26-30
    },

    // 繪製漸層天空底圖 (最底層，不動)
    drawSky(ctx, width, height, worldNum) {
        const wIndex = Math.ceil(worldNum / 5);
        const theme = this.worlds[wIndex] || this.worlds[1];

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, theme.skyLeft);
        gradient.addColorStop(1, theme.skyRight);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 可加一些靜態星星或雲朵 (根據世界)
        if (wIndex === 3 || wIndex === 5 || wIndex === 6) {
            // 冰雪、火山、城堡有星星/火星
            ctx.fillStyle = wIndex === 5 ? 'rgba(255,100,0,0.5)' : 'rgba(255,255,255,0.5)';
            for (let i = 0; i < 50; i++) {
                // 為了效能這裡用偽隨機，實際上應在 loadLevel 時產生
                ctx.fillRect((i * 137) % width, (i * 211) % (height / 2), 2, 2);
            }
        }
    },

    // 繪製視差滾動的遠景 (群山、沙丘、森林)
    drawParallax(ctx, cameraX, canvasWidth, canvasHeight, worldNum) {
        const wIndex = Math.ceil(worldNum / 5);
        const theme = this.worlds[wIndex] || this.worlds[1];

        // 遠景 1 (移動極慢 0.1)
        const bg1X = -(cameraX * 0.1) % canvasWidth;
        this.drawMountains(ctx, bg1X, canvasHeight, canvasWidth, theme.groundColor, 0.4, 200);
        this.drawMountains(ctx, bg1X + canvasWidth, canvasHeight, canvasWidth, theme.groundColor, 0.4, 200);

        // 遠景 2 (移動稍快 0.3)
        const bg2X = -(cameraX * 0.3) % canvasWidth;
        this.drawMountains(ctx, bg2X, canvasHeight, canvasWidth, theme.groundColor, 0.7, 100);
        this.drawMountains(ctx, bg2X + canvasWidth, canvasHeight, canvasWidth, theme.groundColor, 0.7, 100);
    },

    // 繪製簡單的幾何山脈
    drawMountains(ctx, offsetX, bottomY, width, color, alpha, heightVar) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(offsetX, bottomY);
        ctx.lineTo(offsetX, bottomY - heightVar * 0.5);
        ctx.lineTo(offsetX + width * 0.25, bottomY - heightVar);
        ctx.lineTo(offsetX + width * 0.5, bottomY - heightVar * 0.3);
        ctx.lineTo(offsetX + width * 0.75, bottomY - heightVar * 0.8);
        ctx.lineTo(offsetX + width, bottomY - heightVar * 0.4);
        ctx.lineTo(offsetX + width, bottomY);
        ctx.fill();
        ctx.restore();
    },

    // 繪製遊戲主畫面 (結合所有元件)
    render(ctx, game) {
        const cw = game.canvas.width;
        const ch = game.canvas.height;

        // 1. 靜態天空
        this.drawSky(ctx, cw, ch, game.currentLevel);

        // 2. 視差遠景
        this.drawParallax(ctx, game.camera.x, cw, ch, game.currentLevel);

        // 3. 遊戲實體層 (受攝影機偏移影響)
        ctx.save();
        ctx.translate(-game.camera.x, -game.camera.y);

        // 繪製平台
        game.platforms.forEach(p => { if (p.draw) p.draw(ctx); });

        // 繪製陷阱 (位在平台後或上)
        game.traps.forEach(t => { if (t.draw) t.draw(ctx); });

        // 繪製道具
        game.items.forEach(i => { if (i.draw) i.draw(ctx); });

        // 繪製終點旗子
        if (game.flag && game.flag.draw) game.flag.draw(ctx);

        // 繪製敵人
        game.enemies.forEach(e => { if (e.draw) e.draw(ctx); });

        // 繪製 Boss (若存在)
        if (game.boss && !game.boss.markedForDeletion) {
            game.boss.draw(ctx);
        }

        // 繪製玩家
        if (game.player && game.player.draw) game.player.draw(ctx);

        // 繪製粒子特效 (通常在最頂層)
        ParticleSystem.updateAndDraw(ctx);

        ctx.restore();
    }
};
