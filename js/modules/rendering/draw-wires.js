//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 电线绘制系统 ---

/**
 * 绘制电线发光效果（发光层）
 */
function drawWireGlow() {
    ctx.globalCompositeOperation = 'lighter';  // 混合模式：叠加发光
    // 遍历所有电线
    links.forEach(l => {
        // 电线不在可视区域则跳过
        if (!isLinkInView(l)) return;
        // 获取电线最大负载值
        const limit = l.maxLoad || CONFIG.baseWireLoad;

        // 处理鼠标悬停的电线高亮
        if (l === hoveredLink) {
            // 高压模式且未升级：显示升级高亮
            if (isHighVoltageMode && !l.upgraded) {
                ctx.strokeStyle = CONFIG.colors.upgradeHighlight;
                ctx.lineWidth = 12;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(l.from.x, l.from.y);
                ctx.lineTo(l.to.x, l.to.y);
                ctx.stroke();
            }
            // 非高压模式：显示删除高亮
            else if (!isHighVoltageMode) {
                ctx.strokeStyle = CONFIG.colors.deleteHighlight;
                ctx.lineWidth = 12;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(l.from.x, l.from.y);
                ctx.lineTo(l.to.x, l.to.y);
                ctx.stroke();
            }
        }
        // 处理激活状态的电线
        else if (l.active) {
            // 计算负载比例（不超过1）
            const loadRatio = Math.min(1.0, l.load / limit);

            // 已升级电线：固定发光颜色
            if (l.upgraded) {
                ctx.strokeStyle = CONFIG.colors.wireUpgradedGlow;
            }
            // 未升级电线：根据负载比例变色（蓝→红）
            else {
                const hue = 180 - (loadRatio * 180);
                ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
            }

            // 有负载或已升级的电线才绘制发光
            if (loadRatio > 0 || l.upgraded) {
                // 电线粗细：基础值+负载加成+正弦波动动画
                let thickness = 6 + loadRatio * 6 + Math.sin(Date.now()/200)*2;
                // 升级电线额外加粗
                if (l.upgraded) thickness += 4;

                ctx.lineWidth = thickness;
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.moveTo(l.from.x, l.from.y);
                ctx.lineTo(l.to.x, l.to.y);
                ctx.stroke();
            }
        }
    });
}

/**
 * 绘制电线本体（核心层）
 */
function drawWires() {
    ctx.globalCompositeOperation = 'source-over';  // 恢复正常混合模式
    ctx.globalAlpha = 1.0;                         // 恢复完全不透明
    links.forEach(l => {
        if (!isLinkInView(l)) return;
        const limit = l.maxLoad || CONFIG.baseWireLoad;

        // 电线终点坐标（支持生成动画）
        let endX = l.to.x;
        let endY = l.to.y;
        // 电线生成过程中，终点随进度变化
        if (l.spawnProgress < 1) {
            endX = l.from.x + (l.to.x - l.from.x) * l.spawnProgress;
            endY = l.from.y + (l.to.y - l.from.y) * l.spawnProgress;
        }
        ctx.beginPath();
        // 初始化电线样式参数
        let hue = 180;
        let lineWidth = 2;
        let jitter = 0;  // 电流抖动幅度

        // 悬停电线样式处理
        if (l === hoveredLink) {
            if (isHighVoltageMode && !l.upgraded) {
                ctx.strokeStyle = '#fff';
                lineWidth = 3;
            } else if (!isHighVoltageMode) {
                ctx.strokeStyle = '#ff6666';
                lineWidth = 3;
            } else {
                ctx.strokeStyle = l.upgraded ? CONFIG.colors.wireUpgraded : CONFIG.colors.wire;
                lineWidth = l.upgraded ? 4 : 2;
            }
        }
        // 非悬停电线样式
        else {
            if (l.active) {
                const loadRatio = Math.min(1.0, l.load / limit);

                // 已升级电线
                if (l.upgraded) {
                    ctx.strokeStyle = CONFIG.colors.wireUpgraded;
                    lineWidth = 4;
                    // 过载时闪烁白色+抖动
                    if (l.load > limit) {
                        if (Math.floor(Date.now() / 100) % 2 === 0) ctx.strokeStyle = '#fff';
                        jitter = 3;
                    }
                }
                // 未升级电线
                else {
                    hue = 180 - (loadRatio * 180);
                    // 过载：红/黄闪烁+加粗+抖动
                    if (l.load > limit) {
                        hue = 0;
                        if (Math.floor(Date.now() / 100) % 2 === 0) hue = 60;
                        lineWidth = 3;
                        jitter = 3;
                    }
                    // 高负载：轻微加粗+抖动
                    else if (loadRatio > 0.8) {
                        lineWidth = 2.5;
                        jitter = 1;
                    }
                    ctx.strokeStyle = `hsl(${hue}, 100%, 75%)`;
                }
            }
            // 未激活电线
            else {
                ctx.strokeStyle = l.upgraded ? '#5500aa' : CONFIG.colors.wire;
                if (l.upgraded) lineWidth = 3;
            }
            // 热量越高，抖动越剧烈，颜色变红
            if (l.heat > 0) {
                jitter += (l.heat / CONFIG.maxHeat) * 5;
                if (l.heat > CONFIG.maxHeat * 0.5) ctx.strokeStyle = '#ff9999';
            }
        }

        // 绘制电线线条
        ctx.lineWidth = lineWidth;
        ctx.moveTo(l.from.x, l.from.y);
        // 有抖动效果时，绘制折线模拟电流波动
        if (jitter > 0) {
            const dist = Math.hypot(l.from.x - endX, l.from.y - endY);
            const steps = Math.max(1, Math.floor(dist / 40));
            for(let i=1; i<steps; i++) {
                const t = i / steps;
                const lx = l.from.x + (endX - l.from.x) * t;
                const ly = l.from.y + (endY - l.from.y) * t;
                ctx.lineTo(lx + (Math.random()-0.5)*jitter, ly + (Math.random()-0.5)*jitter);
            }
        }
        ctx.lineTo(endX, endY);
        ctx.stroke();
    });
}