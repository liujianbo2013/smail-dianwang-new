
//此文件已添加详细的中文注释，编辑时请注意添加注释！
// ==================== 电网系统核心逻辑 ====================
// 功能：实现电力节点（电源、电塔、电池、房屋）的连接、电力传输、负载计算、建造/删除、碰撞检测等完整电网逻辑

// ==================== 工具函数 ====================

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

// ==================== 电网核心更新逻辑 ====================
/**
 * 更新整个电网状态：通电状态、电线激活状态、电力负载计算
 * @param {boolean} silent 是否静默更新（静默时不播放通电特效）
 */
function updatePowerGrid(silent = false) {
    // 1. 重置所有电网状态 ======================================
    // 保存上一帧通电的房屋，用于对比播放通电动画
    const prevPowered = new Set();
    // 重置所有电塔、房屋、电池的通电状态为断电
    pylons.forEach(p => { if(p.powered) prevPowered.add(p); p.powered = false; });
    houses.forEach(h => { if(h.powered) prevPowered.add(h); h.powered = false; });
    batteries.forEach(b => { if(b.powered) prevPowered.add(b); b.powered = false; });
    // 重置所有电线的激活状态和负载
    links.forEach(l => { l.active = false; l.load = 0; });
    // 重置所有电源的输出负载
    sources.forEach(s => s.load = 0);

    // 2. 广度优先搜索(BFS)遍历电网，标记通电节点和激活电线 ==========
    let queue = [];          // BFS队列
    let visited = new Map(); // 记录已访问节点：节点 -> {深度, 父级电线}

    // 所有电源作为电力源头，加入遍历队列
    sources.forEach(s => {
        queue.push({ node: s, depth: 0, sourceRoot: s });
        visited.set(s, { depth: 0, parentLink: null });
    });

    // BFS循环遍历整个电网
    while (queue.length > 0) {
        let currentObj = queue.shift();
        let u = currentObj.node; // 当前节点

        // 遍历所有电线，查找当前节点连接的相邻节点
        for (let link of links) {
            // 判断电线另一端的节点v
            let v = (link.from === u) ? link.to : (link.to === u ? link.from : null);
            if (v) {
                // 节点未被访问过：标记为通电、激活电线、加入队列
                if (!visited.has(v)) {
                    visited.set(v, { depth: currentObj.depth + 1, parentLink: link });
                    link.active = true;   // 激活电线
                    v.powered = true;     // 节点通电
                    queue.push({ node: v, depth: currentObj.depth + 1 });
                } 
                // 节点已访问但不是通过当前电线到达：激活电线（形成回路）
                else if (visited.get(v).parentLink !== link) {
                    link.active = true;
                }
            }
        }
    }

    // 3. 反向计算电力负载（从用电端到电源端累加）==================
    // 按节点深度从大到小排序（用电端优先计算）
    let nodesByDepth = Array.from(visited.keys()).sort((a, b) => visited.get(b).depth - visited.get(a).depth);
    
    for (let node of nodesByDepth) {
        // 电源本身不消耗电力，跳过
        if (node.type === 'source') continue;
        
        // 获取给该节点供电的父级电线
        const feedLink = visited.get(node).parentLink;
        if (feedLink) {
            // 根据节点类型定义基础负载
            let nodeLoad = 0;
            if (node.type === 'house') nodeLoad = 1;                          // 民房负载
            else if (node.type === 'factory') nodeLoad = CONFIG.factoryLoad; // 工厂负载
            else if (node.type === 'commercial') nodeLoad = node.currentLoad || CONFIG.commBaseLoad; // 商业负载
            else if (node.type === 'battery') nodeLoad = node.targetLoad || 0; // 电池充放电负载

            // 总负载 = 自身负载 + 子节点累计负载
            let totalLoad = nodeLoad + (node.accumulatedLoad || 0);

            // 负载累加到供电电线上
            feedLink.load += totalLoad;
            
            // 找到父节点，继续向上传递负载
            let parentNode = (feedLink.from === node) ? feedLink.to : feedLink.from;
            if (parentNode.type === 'source') {
                // 父节点是电源，直接累加到电源总输出负载
                parentNode.load += totalLoad;
            } else {
                // 父节点是普通节点，暂存累计负载，等待向上传递
                parentNode.accumulatedLoad = (parentNode.accumulatedLoad || 0) + totalLoad;
            }
        }
        // 清空当前节点的临时累计负载
        node.accumulatedLoad = 0;
    }

    // 4. 非静默模式：给刚通电的建筑播放特效 ======================
    if (!silent) {
        houses.forEach(h => {
            // 检测到房屋从未通电变为通电，播放特效
            if (h.powered && !prevPowered.has(h)) {
                let col = CONFIG.colors.houseHappy;
                if(h.type === 'factory') col = CONFIG.colors.factoryHappy;
                if(h.type === 'commercial') col = CONFIG.colors.commHappy;
                // 创建通电爆炸特效
                createExplosion(h.x, h.y, col, h.type === 'house' ? 8 : 15);
            }
        });
    }
}

// ==================== 电线/电塔 建造操作 ====================
/**
 * 尝试连接两个电力节点（建造电线）
 * @param {object} nodeA 节点A
 * @param {object} nodeB 节点B
 * @param {number} cost 建造花费
 * @param {boolean} isHV 是否为高压电线
 */
function tryConnect(nodeA, nodeB, cost, isHV = false) {
    // 检测是否已经存在连接，避免重复连线
    if (links.some(l => (l.from === nodeA && l.to === nodeB) || (l.from === nodeB && l.to === nodeA))) {
        setSystemMsg("已经连接", "warning", true);
        return;
    }
    // 扣除建造费用
    money -= cost;
    // 根据是否高压，设置电线最大负载
    const maxLoad = isHV ? CONFIG.upgradedWireLoad : CONFIG.baseWireLoad;
    // 添加新电线到列表
    links.push({
        from: nodeA, to: nodeB,
        active: false,    // 是否激活通电
        load: 0,         // 当前负载
        heat: 0,         // 发热值
        spawnProgress: 0,// 生成动画进度
        maxLoad: maxLoad,// 最大承载负载
        upgraded: isHV   // 是否高压电线
    });
    // 高压电线播放升级特效
    if (isHV) {
         createExplosion((nodeA.x + nodeB.x)/2, (nodeA.y + nodeB.y)/2, CONFIG.colors.wireUpgraded, 15);
    }
    // 更新电网状态
    updatePowerGrid();
    setSystemMsg(`已连接 (-$${cost})`, "normal", true);
}

/**
 * 建造电塔并自动连接到父节点
 * @param {number} x 坐标X
 * @param {number} y 坐标Y
 * @param {object} parentNode 父连接节点
 * @param {number} cost 建造花费
 * @param {boolean} isHV 是否使用高压连接
 */
function tryBuildPylon(x, y, parentNode, cost, isHV = false) {
    // 扣除建造费用
    money -= cost;
    // 创建新电塔对象
    const newPylon = { 
        x: x, y: y, 
        type: 'pylon',  // 类型：电塔
        powered: false,// 初始断电
        id: Math.random(),// 唯一ID
        spawnScale: 0  // 生成动画缩放
    };
    pylons.push(newPylon);
    
    // 创建连接父节点和新电塔的电线
    const maxLoad = isHV ? CONFIG.upgradedWireLoad : CONFIG.baseWireLoad;
    links.push({
        from: parentNode, to: newPylon,
        active: false, load: 0, heat: 0, spawnProgress: 0,
        maxLoad: maxLoad, upgraded: isHV
    });
    // 播放建造特效
    createExplosion(x, y, isHV ? CONFIG.colors.wireUpgraded : CONFIG.colors.powerOn, 10);
    // 更新电网
    updatePowerGrid();
    setSystemMsg(`已建造 (-$${cost})`, "normal", true);
}

// ==================== 删除操作 ====================
/**
 * 删除实体（电塔/电池），并返还部分费用
 * @param {object} entity 要删除的实体
 */
function deleteEntity(entity) {
    let refundTotal = 0;
    // 找到所有与该实体连接的电线
    const connectedLinks = links.filter(l => l.from === entity || l.to === entity);
    
    // 计算所有连接电线的返还费用
    connectedLinks.forEach(l => {
        const dist = Math.hypot(l.from.x - l.to.x, l.from.y - l.to.y);
        const costMult = l.upgraded ? CONFIG.costUpgradeMult : 1;
        refundTotal += Math.floor(Math.floor(dist * CONFIG.costWirePerUnit * costMult) * CONFIG.refundRate);
    });

    // 根据实体类型，计算实体本身的返还费用并从数组中移除
    if (entity.type === 'pylon') {
        refundTotal += Math.floor(CONFIG.costPylon * CONFIG.refundRate);
        pylons = pylons.filter(p => p !== entity);
    } else if (entity.type === 'battery') {
        refundTotal += Math.floor(CONFIG.costBattery * CONFIG.refundRate);
        batteries = batteries.filter(b => b !== entity);
    }

    // 删除所有关联的电线
    links = links.filter(l => l.from !== entity && l.to !== entity);
    // 增加返还金额
    money += refundTotal;
    // 更新电网
    updatePowerGrid();
    setSystemMsg(`返还 +$${refundTotal}`, "success", true);
}

/**
 * 删除单根电线，并返还部分费用
 * @param {object} link 要删除的电线
 */
function deleteLink(link) {
    // 计算电线长度和返还金额
    const dist = Math.hypot(link.from.x - link.to.x, link.from.y - link.to.y);
    const costMult = link.upgraded ? CONFIG.costUpgradeMult : 1;
    const refund = Math.floor(Math.floor(dist * CONFIG.costWirePerUnit * costMult) * CONFIG.refundRate);
    
    // 增加返还金额，删除电线
    money += refund;
    links = links.filter(l => l !== link);
    
    // 更新电网
    updatePowerGrid();
    setSystemMsg(`返还 +$${refund}`, "success", true);
}