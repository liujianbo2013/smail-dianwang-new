//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 游戏主循环更新系统 ---
/**
 * 游戏主更新函数，每帧执行一次，驱动整个游戏逻辑运行
 * @param {number} timestamp - 当前时间戳，由浏览器 requestAnimationFrame 自动传入
 */
function update(timestamp) {
    // 初始化上一帧时间，首次执行时赋值
    if (!lastTime) lastTime = timestamp;
    // 计算两帧之间的时间差（增量时间），并乘以时间缩放系数（控制游戏快慢）
    const dt = (timestamp - lastTime) * timeScale;
    // 更新上一帧时间为当前时间戳
    lastTime = timestamp;
    // 累计游戏总运行时间
    gameTime += dt;

    // 更新游戏可视区域边界（适配屏幕/相机范围）
    updateViewBounds();

    // 动态缩放逻辑：当当前缩放比例大于最小缩放限制时，逐步拉远视角
    if (currentScale > CONFIG.minScale) {
        // 计算当前世界的实际宽度（屏幕宽度 / 缩放比例）
        const currentWorldWidth = width / currentScale;
        // 按配置的视角扩展速度，逐步增大世界宽度
        const newWorldWidth = currentWorldWidth + (CONFIG.viewExpansionRate * dt);
        // 重新计算缩放比例
        currentScale = width / newWorldWidth;
        // 限制最小缩放比例，防止过度拉远
        if (currentScale < CONFIG.minScale) currentScale = CONFIG.minScale;
    }

    // 游戏结束状态：终止所有后续逻辑更新
    if (gameOver) return;

    // 游戏回放系统：每1000ms（1秒）自动保存一次游戏状态快照
    if (gameTime - lastSnapshotTime > 1000) {
        takeSnapshot();
        lastSnapshotTime = gameTime;
    }

    // 动态加载逻辑：加载/卸载地图上的游戏元素
    updateDynamicLoad();

    // 电池控制逻辑：充放电、电量管理、电池状态更新
    updateBatteryLogic();

    // 经济系统更新：资金、收益、消耗等经济数值计算
    updateEconomy();

    // 生成逻辑：刷新生成发电机、电线杆、房屋、电池等游戏物体
    updateSpawning();

    // 动画与物理参数：计算物体动画速度（适配帧率与时间缩放）
    const animSpeed = 0.05 * timeScale * (60/16);
    // 遍历所有可生成实体：发电机、电线杆、房屋、电池
    [sources, pylons, houses, batteries].forEach(arr => {
        arr.forEach(e => {
            // 生成动画：物体未完全生成时，逐步放大到正常大小
            if (e.spawnScale < 1) {
                e.spawnScale += (1 - e.spawnScale) * 0.1;
                // 防止浮点误差，接近1时直接设为1
                if (e.spawnScale > 0.99) e.spawnScale = 1;
            }
        });
    });

    // 电线连接动画更新
    links.forEach(l => {
        // 未完全生成时，逐步完成生成动画
        if (l.spawnProgress < 1) {
            l.spawnProgress += 0.1;
            if (l.spawnProgress > 1) l.spawnProgress = 1;
        }
    });

    // 重置游戏紧急状态标记（每帧重新判断）
    isCriticalState = false;

    // ==================== 发电机（电源）更新逻辑 ====================
    sources.forEach(s => {
        // 负载平滑过渡：避免数值突变，让显示负载缓慢接近真实负载
        s.displayLoad = (s.displayLoad || 0) + (s.load - (s.displayLoad || 0)) * 0.1;
        // 发电机旋转动画：负载越高，旋转速度越快
        s.rotation = (s.rotation || 0) + (0.01 + (s.displayLoad / s.capacity) * 0.05) * timeScale;

        // 过载发热逻辑：负载超过容量时，快速升温
        if (s.load > s.capacity) {
            s.heat += CONFIG.overheatSpeed * 2 * timeScale;
            // 过载时随机生成红色粒子特效
            if (timeScale > 0 && Math.random() < 0.1) {
                particles.push({ 
                    x: s.x, y: s.y, vx: 0, vy: -2, 
                    life: 0.6, decay: 0.05, 
                    color: '#ff0000', size: 2 
                });
            }
        } else if (s.heat > 0) {
            // 正常工作时，温度缓慢下降
            s.heat -= 0.5 * timeScale;
        }

        // 温度超过80度，标记游戏进入紧急状态
        if (s.heat > 80) isCriticalState = true;

        // 温度达到上限，触发游戏结束：发电机熔毁
        if (s.heat >= CONFIG.maxHeat) {
            triggerGameOver("发电机核心熔毁。");
        }
    });

    // ==================== 电线（线路）更新逻辑 ====================
    // 存储本帧损坏的电线
    let brokenLinks = [];
    links.forEach(l => {
        // 获取电线最大负载限制，无自定义值则使用基础配置
        const limit = l.maxLoad || CONFIG.baseWireLoad;
        // 仅更新激活状态的电线
        if (l.active) {
            // 线路过载时升温
            if (l.load > limit) {
                l.heat += CONFIG.overheatSpeed * timeScale;
            } else if (l.heat > 0) {
                // 正常工作时降温
                l.heat -= 0.2 * timeScale;
            }

            // 温度达到上限，电线损坏
            if (l.heat >= CONFIG.maxHeat) {
                brokenLinks.push(l);
                // 在电线中点生成爆炸、冲击波特效
                createExplosion((l.from.x+l.to.x)/2, (l.from.y+l.to.y)/2, '#ff5500', 20);
                createShockwave((l.from.x+l.to.x)/2, (l.from.y+l.to.y)/2, '#ff0000');
                // 弹出系统警告提示
                setSystemMsg("警告: 线路故障", "warning", true);
            }
        } else {
            // 未激活的电线温度归零
            l.heat = 0;
        }
    });

    // 移除损坏的电线，并重新计算电网供电状态
    if (brokenLinks.length > 0) {
        links = links.filter(l => !brokenLinks.includes(l));
        updatePowerGrid();
    }

    // ==================== 房屋（用户）更新逻辑 ====================
    // 倒序遍历，防止删除元素时数组索引错乱
    for (let i = houses.length - 1; i >= 0; i--) {
        let h = houses[i];
        // 房屋状态标记：警告、紧急
        let alert = false;
        let critical = false;

        // 正常供电：耐心值缓慢恢复
        if (h.powered) {
            if (h.patience < CONFIG.houseMaxPatience) {
                h.patience += 15 * timeScale;
            }
        } else {
            // 断电：耐心值持续下降
            h.patience -= 1 * timeScale;
            // 耐心值低于40%：触发警告状态
            if (h.patience < CONFIG.houseMaxPatience * 0.4) alert = true;
            // 耐心值低于30%：触发紧急状态，标记游戏全局紧急
            if (h.patience < CONFIG.houseMaxPatience * 0.3) {
                critical = true;
                isCriticalState = true;
            }
        }

        // 耐心值耗尽：房屋废弃/破产
        if (h.patience <= 0) {
            h.dead = true;
            // 根据房屋类型设置爆炸颜色
            let col = CONFIG.colors.houseAngry;
            if(h.type === 'factory') col = CONFIG.colors.factory;
            if(h.type === 'commercial') col = CONFIG.colors.comm;

            // 生成爆炸特效
            createExplosion(h.x, h.y, col, 20);

            // 根据类型生成游戏结束提示
            let msg = "居民离开";
            if(h.type === 'factory') msg = "工业崩溃";
            if(h.type === 'commercial') msg = "商业破产";

            triggerGameOver(`${msg} - 关键故障`);
            // 触发游戏结束后直接退出循环
            return;
        }

        // 同步房屋状态到对象属性
        h.isAlert = alert;
        h.isCritical = critical;
    }

    // 移除已废弃的房屋，并重新计算电网
    if (houses.some(h => h.dead)) {
        houses = houses.filter(h => !h.dead);
        updatePowerGrid();
    }

    // ==================== 粒子特效更新逻辑 ====================
    // 倒序遍历，防止删除粒子时索引错乱
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        // 更新粒子位置（物理运动）
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;
        // 减少粒子生命周期
        p.life -= p.decay * timeScale;
        // 生命周期结束，移除粒子
        if (p.life <= 0) particles.splice(i, 1);
    }

    // 更新主界面UI显示
    updateUI();
    // 更新系统状态UI（警告、紧急状态等）
    updateSystemUI();
}