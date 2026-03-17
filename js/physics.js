// 物理與碰撞處理模組
// 這是一個簡單的 2D 物理引擎實作，處理重力與矩形碰撞偵測
const Physics = {
    // 遊戲物理常數設定
    GRAVITY: 0.6,          // 重力加速度：每幀增加向下的速度
    MAX_FALL_SPEED: 12,    // 終端速度 (Terminal Velocity)：物體落下的最大速度，防止穿模

    /**
     * AABB (Axis-Aligned Bounding Box) 碰撞偵測演算法
     * 檢查兩個矩形是否發生碰撞，並判斷碰撞發生的方向。
     * 
     * @param {Object} rect1 - 通常是主動移動的物件 (如 Player)
     * @param {Object} rect2 - 通常是被撞擊的物件 (如 Platform)
     * @returns {String|null} - 回傳 'top', 'bottom', 'left', 'right' 代表 rect1 撞上 rect2 的哪一側，沒有碰撞則回傳 null
     */
    checkCollision(rect1, rect2) {
        // 先進行基本的 AABB 交集檢查 (快速排除沒有重疊的狀況)
        // 條件：rect1的左側小於rect2的右側 AND rect1的右側大於rect2的左側 AND (Y軸同理)
        if (rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y) {

            // 若有重疊，進一步計算各自的中心點座標
            const r1CenterX = rect1.x + rect1.width / 2;
            const r1CenterY = rect1.y + rect1.height / 2;
            const r2CenterX = rect2.x + rect2.width / 2;
            const r2CenterY = rect2.y + rect2.height / 2;

            // 計算兩個中心點之間的向量距離 (vx, vy)
            const vx = r1CenterX - r2CenterX;
            const vy = r1CenterY - r2CenterY;
            
            // 計算兩個矩形寬度與高度的一半之和 (這代表它們中心點允許的最小距離)
            const halfWidths = (rect1.width / 2) + (rect2.width / 2);
            const halfHeights = (rect1.height / 2) + (rect2.height / 2);

            let colDir = null;

            // 再次確認 AABB 交集 (這一步主要是為了後續算出重疊深度)
            if (Math.abs(vx) < halfWidths && Math.abs(vy) < halfHeights) {
                // 計算 X 軸與 Y 軸的重疊深度 (Overlap)
                // 數值越小代表該方向剛剛才觸碰到，我們會以這個方向作為主要的碰撞方向
                const oX = halfWidths - Math.abs(vx);
                const oY = halfHeights - Math.abs(vy);

                // 取重疊較小的那一邊作為碰撞基礎，並修正 rect1 的位置
                if (oX >= oY) {
                    // Y 軸方向重疊較小，代表是上下方向的碰撞
                    if (vy > 0) {
                        colDir = 'top'; // rect1 的中心在 rect2 中心下方，即 rect1 由下往上撞 (撞到頭)
                        rect1.y += oY;  // 將 rect1 往下推，解除重疊
                    } else {
                        colDir = 'bottom'; // rect1 的中心在 rect2 中心上方，即 rect1 從上面踩上去
                        rect1.y -= oY;     // 將 rect1 往上推，維持在平台上
                    }
                } else {
                    // X 軸方向重疊較小，代表是左右方向的碰撞
                    if (vx > 0) {
                        colDir = 'left'; // rect1 在右側，代表撞到左邊的牆
                        rect1.x += oX;   // 往右推
                    } else {
                        colDir = 'right'; // rect1 在左側，代表撞到右邊的牆
                        rect1.x -= oX;    // 往左推
                    }
                }
            }
            return colDir;
        }
        return null;
    },

    /**
     * 純粹的 AABB 重疊判斷（不帶位移修正）
     * 用於道具收集、陷阱觸碰等不需要推開實體的場景。
     * 
     * [BUG FIX] 原本使用 checkCollision 來判斷道具碰撞，
     * 但 checkCollision 會修改 rect1 的座標（推開重疊），
     * 導致玩家被金幣「彈開」的奇怪手感。
     * 
     * @param {Object} rect1 - 第一個矩形
     * @param {Object} rect2 - 第二個矩形
     * @returns {boolean} - 是否有重疊
     */
    isOverlapping(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    },

    /**
     * 處理重力與速度整合 (Euler Integration 歐拉積分法)
     * @param {Object} entity - 遊戲實體物件
     */
    applyPhysics(entity) {
        if (!entity.isStatic) { // 只有非靜態物體才受重力影響
            // 施加重力：每幀增加 Y 軸向下的速度
            entity.vy += this.GRAVITY;
            
            // 限制最大下落速度 (防止穿越地形的 Bug)
            if (entity.vy > this.MAX_FALL_SPEED) {
                entity.vy = this.MAX_FALL_SPEED;
            }

            // 更新實際座標位置
            entity.x += entity.vx;
            entity.y += entity.vy;
        }
    }
};

// 攝影機物件，用於跟隨玩家捲動畫面
class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.x = 0;
        this.y = 0;
        this.width = canvasWidth;
        this.height = canvasHeight;
        // 地圖最大寬度 (依關卡設定動態更新)
        this.maxMapWidth = canvasWidth;
    }

    // 跟隨目標物件 (通常是玩家)
    update(target) {
        // 設定攝影機左邊界為：目標物件置中，且最多不可超出地圖右邊緣或左邊緣
        // 但由於是卷軸遊戲，通常不允許向左回捲太遠 (可視需求設計，這裡做基本的雙向緩動跟隨)
        const targetX = target.x - (this.width / 2) + (target.width / 2);

        // 攝影機位置加上緩動效果
        this.x += (targetX - this.x) * 0.1;

        // 邊界限制
        if (this.x < 0) this.x = 0;
        if (this.x > this.maxMapWidth - this.width) {
            this.x = this.maxMapWidth - this.width;
        }

        // y 軸暫時固定，除非需要垂直捲動。為簡單起見，y=0。
        this.y = 0;
    }
}
