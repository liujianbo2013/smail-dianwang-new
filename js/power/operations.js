//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 电线/电塔 建造与删除操作 ---

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