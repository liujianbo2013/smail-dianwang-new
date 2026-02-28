//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 粒子特效系统 ---

/**
 * 创建爆炸粒子效果
 * @param {number} x - 爆炸中心X坐标
 * @param {number} y - 爆炸中心Y坐标
 * @param {string} color - 粒子颜色
 * @param {number} count - 生成粒子数量
 */
function createExplosion(x, y, color, count) {
    // 判断坐标是否在可视区域内，不在则直接返回，不渲染
    if (!isInView(x, y, 100)) return;
    // 循环生成指定数量的爆炸粒子
    for(let i=0; i<count; i++) {
        particles.push({
            x: x,                    // 粒子初始X坐标
            y: y,                    // 粒子初始Y坐标
            vx: (Math.random() - 0.5) * 6,  // X轴随机运动速度
            vy: (Math.random() - 0.5) * 6,  // Y轴随机运动速度
            life: 1.0,               // 粒子生命值（1为完全存活）
            decay: 0.02 + Math.random() * 0.03,  // 生命值衰减速度
            color: color,            // 粒子颜色
            size: 1 + Math.random() * 3  // 粒子随机大小
        });
    }
}

/**
 * 创建冲击波粒子效果
 * @param {number} x - 冲击波中心X坐标
 * @param {number} y - 冲击波中心Y坐标
 * @param {string} color - 冲击波颜色
 */
function createShockwave(x, y, color) {
    // 判断坐标是否在可视区域内，不在则直接返回
    if (!isInView(x, y, 100)) return;
    // 生成单个冲击波粒子
    particles.push({
        x: x,
        y: y,
        vx: 0,          // 冲击波无移动速度
        vy: 0,
        life: 1.0,      // 初始生命值
        decay: 0.05,    // 衰减速度
        color: color,
        size: 0,        // 初始大小为0
        type: 'shockwave'  // 标记粒子类型为冲击波
    });
}