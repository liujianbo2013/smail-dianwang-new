//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 电网系统核心逻辑 ---

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