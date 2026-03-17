// 存檔系統模組
const SaveSystem = {
    SAVE_KEY: 'mario_style_save_data',

    // 預設存檔格式
    defaultData: {
        maxUnlockedLevel: 1,  // 最高解鎖關卡 (1~30)
        totalScore: 0,        // 歷史最高總分
        totalCoins: 0,        // 累計收集金幣
        lives: 3              // 剩餘生命 (若想做到離開保留生命，選配)
    },

    // 讀取進度
    load() {
        try {
            const dataStr = localStorage.getItem(this.SAVE_KEY);
            if (dataStr) {
                return JSON.parse(dataStr);
            }
        } catch (e) {
            console.error("無法讀取存檔", e);
        }
        // [BUG FIX] 回傳淺拷貝，避免直接修改到原始預設值物件
        return { ...this.defaultData };
    },

    // 儲存進度 (合併資料)
    save(dataToMerge) {
        const currentData = this.load();
        const newData = { ...currentData, ...dataToMerge };
        try {
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(newData));
        } catch (e) {
            console.error("無法寫入存檔", e);
        }
        return newData;
    },

    // 重置存檔
    reset() {
        try {
            localStorage.removeItem(this.SAVE_KEY);
        } catch (e) {
            console.error("無法刪除存檔", e);
        }
        // [BUG FIX] 同樣回傳淺拷貝
        return { ...this.defaultData };
    }
};
