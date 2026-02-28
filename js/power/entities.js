//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 电力实体检测工具函数 ---

/**
 * 获取指定坐标范围内的电力实体（电源/电塔/电池/房屋）
 * @param {number} worldX - 世界坐标X
 * @param {number} worldY - 世界坐标Y
 * @param {number} radius - 检测半径，默认30像素
 * @return {object|null} 找到的实体对象，无则返回null
 */
function getEntityAt(worldX, worldY, radius = 30) {
    // 依次检测是否在电源、电塔、电池、房屋的范围内，按优先级返回第一个匹配的实体
    for (let s of sources) if (Math.hypot(worldX - s.x, worldY - s.y) < radius) return s;
    for (let p of pylons) if (Math.hypot(worldX - p.x, worldY - p.y) < radius) return p;
    for (let b of batteries) if (Math.hypot(worldX - b.x, worldY - b.y) < radius) return b;
    for (let h of houses) if (Math.hypot(worldX - h.x, worldY - h.y) < radius) return h;
    // 范围内无任何实体
    return null;
}

/**
 * 获取指定坐标附近的电线连线
 * @param {number} x - 检测坐标X
 * @param {number} y - 检测坐标Y
 * @param {number} tolerance - 容差（距离电线多近算选中），默认15像素
 * @return {object|null} 找到的电线对象，无则返回null
 */
function getLinkAt(x, y, tolerance = 15) {
    const p = {x, y};
    // 遍历所有电线，计算点到线段的距离，小于容差则视为选中该电线
    for (let l of links) {
        if (distToSegment(p, l.from, l.to) < tolerance) return l;
    }
    return null;
}

/**
 * 计算点到线段的最短距离（核心几何算法，用于电线点击检测）
 * @param {object} p - 目标点 {x,y}
 * @param {object} v - 线段起点 {x,y}
 * @param {object} w - 线段终点 {x,y}
 * @return {number} 点到线段的最短距离
 */
function distToSegment(p, v, w) {
    // 计算线段长度的平方
    const l2 = (w.x - v.x)**2 + (w.y - v.y)**2;
    // 线段长度为0（两点重合），直接返回点到点距离
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);

    // 计算投影点t（限制在0~1之间，保证在线段上）
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    // 计算点到投影点的距离并返回
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

/**
 * 检测指定位置是否可以放置实体（无其他实体占用）
 * @param {number} worldX - 坐标X
 * @param {number} worldY - 坐标Y
 * @param {number} buffer - 安全间距
 * @return {boolean} 位置可用返回true，不可用返回false
 */
function isPositionClear(worldX, worldY, buffer) {
    // 检测与所有已有实体的距离，小于安全间距则位置不可用
    for (let s of sources) if (Math.hypot(worldX - s.x, worldY - s.y) < buffer) return false;
    for (let p of pylons) if (Math.hypot(worldX - p.x, worldY - p.y) < buffer) return false;
    for (let b of batteries) if (Math.hypot(worldX - b.x, worldY - b.y) < buffer) return false;
    for (let h of houses) if (Math.hypot(worldX - h.x, worldY - h.y) < buffer) return false;
    // 无冲突，位置可用
    return true;
}

/**
 * 计算两条线段是否相交（核心几何算法，用于禁止电线交叉）
 * @param {object} p1 线段1起点
 * @param {object} p2 线段1终点
 * @param {object} p3 线段2起点
 * @param {object} p4 线段2终点
 * @return {boolean|object} 相交返回true，平行/不相交返回false
 */
function getLineIntersection(p1, p2, p3, p4) {
    // 计算行列式，判断线段是否平行
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
    if (det === 0) return false;

    // 计算交点参数lambda和gamma
    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;

    // 参数都在0~1之间，说明两条线段真正相交
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}

/**
 * 检测新电线是否与已有电线交叉（除自身连接外）
 * @param {object} startPos 新电线起点
 * @param {object} endPos 新电线终点
 * @return {boolean} 交叉返回true，不交叉返回false
 */
function checkIntersection(startPos, endPos) {
    for (let l of links) {
        // 跳过与当前拖拽节点已有的连接，避免误判
        if (l.from === dragStartNode || l.to === dragStartNode || l.from === snapTarget || l.to === snapTarget) continue;
        // 检测到交叉，返回true
        if (getLineIntersection(startPos, endPos, l.from, l.to)) return true;
    }
    // 无交叉
    return false;
}