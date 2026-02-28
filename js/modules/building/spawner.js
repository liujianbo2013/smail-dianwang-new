//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 实体生成系统 ---

/**
 * 随机生成地图实体（居民楼/工厂/商业区）
 * @param {string|null} forcedType - 强制指定生成类型，为空则默认生成居民楼
 * 功能：随机寻找合法位置→生成对应实体→添加到游戏数组→播放提示与特效
 */
function spawnEntity(forcedType = null) {
    let attempts = 0;                // 生成位置尝试次数
    const maxAttempts = 100;         // 最大尝试次数
    let currentMinDist = CONFIG.minEntityDist + 10; // 实体最小间距（初始值）
    let x, y;                        // 实体坐标
    // 计算当前视野范围内的世界尺寸
    const worldViewW = width / currentScale;
    const worldViewH = height / currentScale;

    // 循环寻找合法生成位置
    do {
        attempts++;
        // 尝试超过50次仍未找到，降低间距要求，提高生成成功率
        if (attempts > 50) currentMinDist = CONFIG.minEntityDist * 0.7;
        // 随机生成视野内的坐标
        x = (Math.random() - 0.5) * worldViewW;
        y = (Math.random() - 0.5) * worldViewH;
        // 位置不满足间距要求，重新生成
        if (!isPositionClear(x, y, currentMinDist)) continue;
        // 距离中心过近，重新生成
        if (Math.hypot(x, y) < 150) continue;

        // 检测是否与电线碰撞
        let hitWire = false;
        for (let l of links) {
            if (distToSegment({x, y}, l.from, l.to) < 20) {
                hitWire = true;
                break;
            }
        }
        // 与电线重叠，重新生成
        if (hitWire) continue;
        // 找到合法位置，退出循环
        break;
    } while (attempts < maxAttempts);

    // 达到最大尝试次数仍未找到位置，终止生成
    if (attempts >= maxAttempts) return;

    // 确定实体类型：优先使用强制类型，默认居民楼
    let type = forcedType || 'house';

    // 将生成的实体添加到房屋数组（统一管理渲染与逻辑）
    houses.push({
        x: x, y: y,                       // 坐标
        type: type,                        // 类型
        powered: false,                    // 是否通电
        patience: CONFIG.houseMaxPatience, // 耐心值（断电后计时）
        id: Math.random(),                 // 唯一ID
        spawnScale: 0,                     // 生成动画缩放
        load: type === 'factory' ? CONFIG.factoryLoad : 1, // 基础耗电量
        currentLoad: type === 'commercial' ? CONFIG.commBaseLoad : 1, // 当前耗电量
        phase: Math.random() * Math.PI * 2 // 动画相位（随机旋转/呼吸效果）
    });

    // 根据实体类型显示不同提示与特效
    if (type === 'factory') {
        setSystemMsg("警告: 检测到工业区", "warning", true);
        createShockwave(x, y, CONFIG.colors.factory);
    } else if (type === 'commercial') {
        setSystemMsg("新商业区", "normal", true);
        createShockwave(x, y, CONFIG.colors.comm);
    }

    // 累计实体生成总数
    totalSpawns++;
}