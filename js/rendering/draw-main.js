//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 主绘制函数 ---

/**
 * 主绘制函数：负责整个游戏画面的渲染
 * 绘制顺序：背景 -> 网格 -> 电线发光 -> 电线本体 -> 拖拽线 -> 建筑预览 -> 实体发光 -> 实体本体 -> 粒子
 */
function draw() {
    // 设置图层混合模式为正常覆盖
    ctx.globalCompositeOperation = 'source-over';
    // 填充画布背景色
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, width, height);

    // 保存画布初始状态，用于后续坐标变换
    ctx.save();
    // 平移画布，实现镜头偏移效果
    ctx.translate(cx + viewOffsetX, cy + viewOffsetY);
    // 缩放画布，实现镜头缩放效果
    ctx.scale(currentScale, currentScale);

    // ===================== 1. 绘制背景网格 =====================
    drawGrid();

    // ===================== 2. 绘制电线发光效果（发光层） =====================
    drawWireGlow();

    // ===================== 3. 绘制电线本体（核心层） =====================
    drawWires();

    // ===================== 4. 绘制拖拽电线预览线 =====================
    drawDragPreview();

    // ===================== 5. 绘制建筑放置预览 =====================
    drawBuildingPreview();

    // ===================== 6. 绘制实体发光效果（发光层） =====================
    drawEntityGlow();

    // ===================== 7. 绘制实体本体（核心层） =====================
    drawEntities();

    // ===================== 绘制粒子效果 =====================
    drawParticles();

    // 恢复画布默认状态
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // 请求下一帧渲染，形成循环
    requestAnimationFrame(renderLoop);
}

/**
 * 绘制背景网格
 */
function drawGrid() {
    ctx.strokeStyle = CONFIG.colors.grid;  // 网格线条颜色
    ctx.lineWidth = 1;                     // 网格线条宽度
    ctx.globalAlpha = 0.3;                  // 网格透明度
    ctx.beginPath();                       // 开始绘制路径
    const gridSz = 50;                     // 网格单个格子大小

    // 计算可视区域内网格的起始和结束坐标，避免绘制屏幕外网格
    const startX = Math.floor(viewBounds.minX / gridSz) * gridSz;
    const endX = Math.ceil(viewBounds.maxX / gridSz) * gridSz;
    const startY = Math.floor(viewBounds.minY / gridSz) * gridSz;
    const endY = Math.ceil(viewBounds.maxY / gridSz) * gridSz;

    // 绘制竖直线条
    for(let x=startX; x<=endX; x+=gridSz) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    // 绘制水平线条
    for(let y=startY; y<=endY; y+=gridSz) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    ctx.stroke();       // 执行绘制
    ctx.globalAlpha = 1;// 恢复透明度为完全不透明
}

/**
 * 绘制拖拽电线预览线
 */
function drawDragPreview() {
    if (input.isDown && dragStartNode) {
        // 拖拽终点坐标（支持吸附）
        let targetX = input.worldX;
        let targetY = input.worldY;
        let isSnap = false;
        // 吸附到目标节点
        if (snapTarget) {
            targetX = snapTarget.x;
            targetY = snapTarget.y;
            isSnap = true;
        }
        // 计算拖拽长度
        const dist = Math.hypot(targetX - dragStartNode.x, targetY - dragStartNode.y);
        // 判断长度是否合法（大于10且小于最大长度）
        const isValidLen = dist <= CONFIG.maxWireLength && dist > 10;

        // 高压模式费用翻倍
        const isHV = isHighVoltageMode;
        const costMult = isHV ? CONFIG.costUpgradeMult : 1;
        const wireCost = Math.floor(dist * CONFIG.costWirePerUnit * costMult);

        // 计算总费用（电线+可能的塔）
        let estCost = wireCost + (!snapTarget && validBuildPos ? CONFIG.costPylon : 0);
        const canAfford = money >= estCost;
        // 判断是否可放置
        const isGood = isValidLen && (isSnap || validBuildPos) && !isIntersecting && canAfford;
        // 根据状态设置颜色：合法=青色/升级色，非法=红色
        const lineColor = isGood ? (isHV ? CONFIG.colors.upgradeHighlight : CONFIG.colors.dragLineValid) : CONFIG.colors.dragLineInvalid;

        // 绘制拖拽虚线/实线
        ctx.beginPath();
        ctx.moveTo(dragStartNode.x, dragStartNode.y);
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.setLineDash(isSnap ? [] : [15, 15]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 吸附成功且合法：绘制白色圆圈标记
        if (isSnap && isGood) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 30, 0, Math.PI*2);
            ctx.stroke();
        }

        // 绘制最大长度限制圈（动态虚线）
        ctx.beginPath();
        ctx.arc(dragStartNode.x, dragStartNode.y, CONFIG.maxWireLength, 0, Math.PI*2);
        ctx.strokeStyle = isGood ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 50, 50, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = -Date.now() / 20;
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

/**
 * 绘制建筑放置预览
 */
function drawBuildingPreview() {
    if (placementMode && input.worldX !== undefined) {
        // 判断位置是否可放置（无遮挡）
        const isValid = isPositionClear(input.worldX, input.worldX, 60);
        let cost = 0;
        // 根据建筑类型设置费用
        if (placementMode === 'plant') cost = CONFIG.costPlant;
        else if (placementMode === 'nuclear') cost = CONFIG.costNuclear;
        else if (placementMode === 'battery') cost = CONFIG.costBattery;

        // 判断金钱是否足够
        const canAfford = money >= cost;
        const isGood = isValid && canAfford;

        ctx.globalAlpha = 0.6;
        // 电池建筑：矩形预览
        if (placementMode === 'battery') {
             ctx.fillStyle = isGood ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
             ctx.fillRect(input.worldX - 15, input.worldY - 10, 30, 20);
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 2;
             ctx.strokeRect(input.worldX - 15, input.worldY - 10, 30, 20);
        }
        // 其他建筑：圆形预览
        else {
            ctx.beginPath();
            ctx.arc(input.worldX, input.worldY, 25, 0, Math.PI*2);
            ctx.fillStyle = isGood ? (placementMode === 'nuclear' ? 'rgba(0, 255, 100, 0.5)' : 'rgba(0, 255, 0, 0.5)') : 'rgba(255, 0, 0, 0.5)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 绘制建筑范围提示圈
        ctx.strokeStyle = isGood ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(input.worldX, input.worldY, 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.globalAlpha = 1;
    }
}

/**
 * 绘制粒子效果
 */
function drawParticles() {
    ctx.globalCompositeOperation = 'lighter';
    particles.forEach(p => {
        // 不在可视区域跳过
        if (!isInView(p.x, p.y, p.size * 2 + 60)) return;
        // 冲击波：绘制圆环
        if (p.type === 'shockwave') {
             ctx.strokeStyle = p.color;
             ctx.lineWidth = 3;
             ctx.globalAlpha = p.life;
             ctx.beginPath();
             ctx.arc(p.x, p.y, (1.0 - p.life) * 60, 0, Math.PI*2);
             ctx.stroke();
        }
        // 普通粒子：绘制圆点
        else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI*2);
            ctx.fill();
        }
    });
    ctx.globalAlpha = 1;
}