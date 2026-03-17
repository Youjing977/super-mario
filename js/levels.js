// 進階版關卡產生器 (支援6大世界與Boss關)
const LevelGenerator = {
    generate(levelNum, canvasWidth, canvasHeight) {
        const platforms = [];
        const enemies = [];
        const items = [];
        const traps = [];
        let flag = null;
        let boss = null;

        const playerStart = { x: 50, y: 350 };
        const worldIndex = Math.ceil(levelNum / 5); // 1~6
        const isBossLevel = levelNum % 10 === 0;

        // 地圖長度隨關卡微增，Boss 關特別短 (競技場型)
        let mapWidth = isBossLevel ? 800 : 2000 + ((levelNum % 5) * 300);

        // 難度參數
        let gapProbability = 0.1 + (worldIndex * 0.05); // 深坑機率
        let trapProbability = 0.05 + (worldIndex * 0.05); // 陷阱機率
        let enemyRate = 0.2 + (worldIndex * 0.1); // 敵人機率

        // 主題地形池
        let pTypes = ['normal', 'breakable'];
        if (worldIndex >= 2) pTypes.push('moving'); // 砂漠起有移動平台
        if (worldIndex >= 3) pTypes.push('ice'); // 冰雪世界有冰
        if (worldIndex >= 4) pTypes.push('falling'); // 森林起有掉落平台
        if (worldIndex >= 5) pTypes.push('lava'); // 火山起有岩漿

        // 起點安全區
        platforms.push(new Platform(0, 450, 400, 200, 'normal'));
        let currentX = 400;

        if (isBossLevel) {
            // --- Boss 關卡配置 ---
            // 單一長平臺競技場
            platforms.push(new Platform(400, 450, 1000, 200, worldIndex === 6 ? 'lava' : 'normal'));
            // 兩側高牆防逃跑
            platforms.push(new Platform(0, 0, 50, 600, 'normal'));
            platforms.push(new Platform(1400, 0, 50, 600, 'normal'));

            // 產生 Boss 實體 
            // type 1: 10關 (草原王), type 2: 20關 (森林王), type 3: 30關 (城堡王/火山龍)
            const bType = levelNum <= 10 ? 1 : levelNum <= 20 ? 2 : 3;
            boss = new Boss(1200, 350, bType);

            // 終點藏在 Boss 後面
            platforms.push(new Platform(1450, 450, 400, 200, 'normal'));
            flag = new Flag(1600, 250);
            mapWidth = 1800; // 更新地圖寬度

        } else {
            // --- 一般關卡程序化生成 ---
            while (currentX < mapWidth - 400) {

                // 1. 深坑或連續岩漿
                if (Math.random() < gapProbability) {
                    let gapSize = 80 + Math.random() * 60;

                    if (worldIndex >= 5 && Math.random() < 0.5) {
                        // 填入岩漿替代深坑
                        platforms.push(new Platform(currentX, 550, gapSize, 100, 'lava'));
                    }

                    currentX += gapSize;
                    if (currentX > mapWidth - 400) break;
                }

                // 2. 決定平台寬度與類型
                let pWidth = 150 + Math.random() * 200;
                let pickType = pTypes[Math.floor(Math.random() * pTypes.length)];

                // 限制某些極端地形的出現長度
                if (pickType === 'falling' || pickType === 'lava') pWidth = Math.min(pWidth, 200);

                // y起伏 (避免落差過大)
                let py = 450 - (Math.random() * 120);

                let plat = new Platform(currentX, py, pWidth, 200, pickType, {
                    range: 100 + Math.random() * 50,
                    speed: 1 + (worldIndex * 0.2)
                });
                platforms.push(plat);

                // 3. 平台上放置物件
                let topY = py - 32;

                // 金幣組
                if (Math.random() > 0.4) {
                    items.push(new Item(currentX + pWidth / 2, topY - 60));
                    if (Math.random() > 0.5) items.push(new Item(currentX + pWidth / 2 + 30, topY - 60));
                }

                // 陷阱 (尖刺)
                if ((pickType === 'normal' || pickType === 'ice') && pWidth > 150 && Math.random() < trapProbability) {
                    traps.push(new Trap(currentX + pWidth / 2 - 20, py - 20, 40));
                }
                // 敵人
                else if (Math.random() < enemyRate) {
                    let eType = 'walk';
                    if (worldIndex >= 2 && Math.random() < 0.3) eType = 'fly'; // 沙漠後開始有飛怪
                    if (worldIndex >= 4 && Math.random() < 0.4) eType = 'patrol'; // 森林後開始有巡邏怪

                    let eX = currentX + pWidth - 50;
                    let eY = eType === 'fly' ? topY - 80 : topY;
                    enemies.push(new Enemy(eX, eY, eType, { range: pWidth / 2 }));
                }

                // 空中磚塊或額外落腳點
                if (pWidth > 250 && Math.random() > 0.5) {
                    platforms.push(new Platform(currentX + 50, py - 120, 100, 30, 'breakable'));
                    items.push(new Item(currentX + 90, py - 160));
                }

                currentX += pWidth;
            }

            // 終點安全區
            platforms.push(new Platform(currentX, 450, 400, 200, 'normal'));
            flag = new Flag(currentX + 200, 250);
            mapWidth = currentX + 400;
        }

        return {
            playerStart,
            platforms,
            enemies,
            items,
            traps,
            flag,
            boss,
            mapWidth
        };
    }
};
