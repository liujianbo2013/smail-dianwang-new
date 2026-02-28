//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 经济系统 ---

/**
 * 更新游戏经济系统（收入、支出、金钱结算）
 * 每隔固定时间结算一次：收入=房屋/工厂/商业收益 - 电厂维护费
 */
function updateEconomy() {
    // 判断是否达到经济结算的时间间隔
    if (gameTime - lastIncomeGameTime > CONFIG.economyTickRate) {
        // 初始收入 = 基础补贴
        let income = CONFIG.baseSubsidy;

        // 遍历所有房屋类建筑，统计供电正常的建筑带来的收益
        houses.forEach(h => {
            // 只有通电的建筑才会产生收益
            if (h.powered) {
                // 默认收益为普通住宅收益
                let val = CONFIG.incomePerHouse;
                // 工厂类型，替换为工厂收益
                if (h.type === 'factory') val = CONFIG.incomePerFactory;
                // 商业类型，替换为商业收益
                if (h.type === 'commercial') val = CONFIG.incomePerComm;
                // 累加到总收益
                income += val;
            }
        });

        // 初始化总维护费
        let upkeep = 0;
        // 遍历所有发电站，计算每小时/每周期维护费用
        sources.forEach(s => {
            // 核电站维护费更高，普通电厂使用基础维护费
            upkeep += (s.variant === 'nuclear' ? CONFIG.nuclearUpkeep : CONFIG.upkeepPerPlant);
        });

        // 净收入 = 总收益 - 总维护费
        income -= upkeep;
        // 保存当前净收入（用于UI显示）
        currentNetIncome = income;
        // 把净收入加到玩家金钱中
        money += currentNetIncome;
        // 更新最后一次结算时间，避免重复计算
        lastIncomeGameTime = gameTime;
    }
}

/**
 * 电池充放电逻辑
 * 根据电网负载压力自动控制：电网紧张→放电，电网宽松→充电，否则闲置
 */
function updateBatteryLogic() {
    // 标记电网是否处于高负载紧张状态（需要电池放电）
    let gridStressed = false;
    // 标记电网是否处于低负载宽松状态（可以给电池充电）
    let gridRelaxed = true;

    // 遍历所有发电站，判断电网负载状态
    sources.forEach(s => {
        // 发电站发热 或 负载超过容量95% → 电网极度紧张
        if (s.heat > 0 || s.load > s.capacity * 0.95) {
            gridStressed = true;
            gridRelaxed = false;
        }
        // 负载超过容量80% → 电网中等压力，不适合充电
        else if (s.load > s.capacity * 0.8) {
            gridRelaxed = false;
        }
    });

    // 遍历所有电池，执行充放电控制
    batteries.forEach(b => {
        // 电池未通电 → 直接闲置，不工作
        if (!b.powered) {
            b.targetLoad = 0;
            b.currentOp = 'idle';
            return;
        }

        // 条件1：电网紧张 + 电池有电量 → 放电供电
        if (gridStressed && b.energy > 0) {
            b.currentOp = 'discharge'; // 状态：放电
            b.targetLoad = -CONFIG.batteryDischargeRate; // 负负载表示向外供电
            // 按时间比例扣除电池电量
            b.energy -= (CONFIG.batteryDischargeRate * 0.05 * timeScale);
            // 防止电量低于0
            if (b.energy < 0) b.energy = 0;
            // 随机生成放电特效粒子（增强视觉效果）
            if (Math.random() < 0.1 * timeScale) {
                particles.push({ x: b.x, y: b.y, vx: 0, vy: -2, life: 0.4, decay: 0.05, color: '#ffff00', size: 2 });
            }
        }
        // 条件2：电网宽松 + 电池未满 → 充电储能
        else if (gridRelaxed && b.energy < b.maxEnergy) {
            b.currentOp = 'charge'; // 状态：充电
            b.targetLoad = CONFIG.batteryChargeRate; // 正负载表示消耗电网电量
            // 按时间比例增加电池电量
            b.energy += (CONFIG.batteryChargeRate * 0.05 * timeScale);
            // 防止电量超过最大值
            if (b.energy > b.maxEnergy) b.energy = b.maxEnergy;
        }
        // 条件3：其他情况 → 电池闲置
        else {
            b.currentOp = 'idle';
            b.targetLoad = 0;
        }
    });
}

/**
 * 建筑自动生成逻辑
 * 根据总人口数量，依次解锁住宅、工厂、商业建筑，并按不同速率生成
 */
function updateSpawning() {
    // 计算当前总设施数量 = 房屋 + 电线杆 + 电池（用于解锁高级建筑）
    const totalPop = houses.length + pylons.length + batteries.length;

    // 默认住宅生成速率
    let currentHouseSpawnRate = CONFIG.spawnRate;
    // 达到商业解锁人口 → 降低住宅生成速率
    if (totalPop >= CONFIG.commUnlockPop) currentHouseSpawnRate = 12000;
    // 达到工厂解锁人口 → 降低住宅生成速率
    else if (totalPop >= CONFIG.factoryUnlockPop) currentHouseSpawnRate = 10000;

    // 1. 自动生成普通住宅
    if (gameTime - lastSpawnGameTime > currentHouseSpawnRate) {
        spawnEntity('house');
        lastSpawnGameTime = gameTime;
    }

    // 2. 满足人口条件后，自动生成工厂
    if (totalPop >= CONFIG.factoryUnlockPop && gameTime - lastFactorySpawnTime > CONFIG.factorySpawnRate) {
        spawnEntity('factory');
        lastFactorySpawnTime = gameTime;
    }

    // 3. 满足人口条件后，自动生成商业建筑
    if (totalPop >= CONFIG.commUnlockPop && gameTime - lastCommSpawnTime > CONFIG.commSpawnRate) {
        spawnEntity('commercial');
        lastCommSpawnTime = gameTime;
    }
}

/**
 * 动态负载更新逻辑
 * 商业建筑用电负载会随时间正弦波动，模拟白天/夜晚用电变化
 */
function updateDynamicLoad() {
    // 遍历所有商业建筑，设置动态用电负载
    houses.forEach(h => {
        if (h.type === 'commercial') {
            // 生成0~1之间的正弦波动值（随时间平滑变化，每个建筑相位不同避免同步波动）
            const sineVal = (Math.sin((gameTime * 0.001) + h.phase) + 1) / 2;
            // 商业负载 = 基础负载 + 波动值*(峰值负载-基础负载)
            h.currentLoad = CONFIG.commBaseLoad + (sineVal * (CONFIG.commPeakLoad - CONFIG.commBaseLoad));
        }
    });
}