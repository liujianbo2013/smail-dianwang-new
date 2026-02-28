//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 渲染系统 ---

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

    // ===================== 2. 绘制电线发光效果（发光层） =====================
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

    // ===================== 3. 绘制电线本体（核心层） =====================
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

    // ===================== 4. 绘制拖拽电线预览线 =====================
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

    // ===================== 5. 绘制建筑放置预览 =====================
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

    // ===================== 6. 绘制实体发光效果（发光层） =====================
    ctx.globalCompositeOperation = 'lighter';

    // 绘制电源发光
    sources.forEach(s => {
        if (!isInView(s.x, s.y, 50)) return;
        const scale = s.spawnScale || 1;
        ctx.save(); 
        ctx.translate(s.x, s.y); 
        ctx.scale(scale, scale);
        // 负载越高，颜色越偏红
        const loadPct = s.load / s.capacity;
        const hue = s.variant === 'nuclear' ? 120 : Math.max(0, 50 - (loadPct * 50));
        ctx.fillStyle = `hsl(${hue}, 100%, 30%)`;
        // 呼吸灯效果
        const breathe = 1 + Math.sin(Date.now() / 1000) * 0.05 * loadPct;
        ctx.beginPath(); 
        ctx.arc(0, 0, 32 * breathe, 0, Math.PI*2); 
        ctx.fill();
        ctx.restore();
    });

    // 绘制房屋/工厂/商业建筑发光
    ctx.fillStyle = 'rgba(0, 255, 170, 0.3)';
    houses.forEach(h => {
        if (!h.powered || !isInView(h.x, h.y, 30)) return;
        const scale = h.spawnScale || 1;
        ctx.save(); 
        ctx.translate(h.x, h.y); 
        ctx.scale(scale, scale);

        // 工厂：矩形发光
        if (h.type === 'factory') {
            ctx.fillStyle = h.powered ? 'rgba(255, 136, 0, 0.4)' : 'rgba(50, 20, 0, 0.4)';
            ctx.beginPath(); 
            ctx.rect(-20, -20, 40, 40); 
            ctx.fill();
        } 
        // 商业：六边形发光
        else if (h.type === 'commercial') {
            ctx.fillStyle = h.powered ? 'rgba(0, 136, 255, 0.4)' : 'rgba(0, 20, 50, 0.4)';
            ctx.beginPath();
            for(let i=0; i<6; i++) { 
                const a = i*Math.PI/3; 
                ctx.lineTo(Math.cos(a)*25, Math.sin(a)*25); 
            }
            ctx.fill();
        } 
        // 居民：圆形发光
        else {
            ctx.beginPath(); 
            ctx.arc(0, 0, 24, 0, Math.PI*2); 
            ctx.fill();
        }
        ctx.restore();
    });

    // ===================== 7. 绘制实体本体（核心层） =====================
    ctx.globalCompositeOperation = 'source-over';

    // 绘制电池
    batteries.forEach(b => {
        if (!isInView(b.x, b.y, 30)) return;
        const scale = b.spawnScale || 1;
        ctx.save(); 
        ctx.translate(b.x, b.y); 
        ctx.scale(scale, scale);

        // 设置电池颜色：通电/放电/悬停
        let color = b.powered ? CONFIG.colors.battery : CONFIG.colors.powerOff;
        if (b.currentOp === 'discharge') color = CONFIG.colors.batteryDraining;
        if (hoveredEntity === b) color = CONFIG.colors.deleteHighlight;

        // 绘制电池外壳
        ctx.fillStyle = '#222';
        ctx.fillRect(-15, -10, 30, 20);
        ctx.strokeStyle = color; 
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -10, 30, 20);

        // 绘制电量条
        const pct = b.energy / b.maxEnergy;
        ctx.fillStyle = color;
        ctx.fillRect(-12, -7, 24 * pct, 14);

        // 充电/放电标记
        if (b.currentOp === 'charge') {
            ctx.fillStyle = '#fff'; 
            ctx.font = '10px monospace'; 
            ctx.fillText("+", -4, 4);
        } else if (b.currentOp === 'discharge') {
            ctx.fillStyle = '#000'; 
            ctx.font = '10px monospace'; 
            ctx.fillText("-", -4, 4);
        }

        ctx.restore();
    });

    // 绘制电源（发电厂/核电）
    sources.forEach(s => {
        if (!isInView(s.x, s.y, 50)) return;
        const scale = s.spawnScale || 1;
        ctx.save(); 
        ctx.translate(s.x, s.y); 
        ctx.scale(scale, scale);

        const loadPct = Math.min(1, s.displayLoad / s.capacity);
        const isNuc = s.variant === 'nuclear';
        const hue = isNuc ? 120 : Math.max(0, 50 - (loadPct * 50));

        // 过热/过载：绘制红色警告圈
        if (s.heat > 80 || loadPct > 0.95) {
            ctx.save();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            let r = 35 + (Date.now() % 1000) / 20;
            ctx.arc(0, 0, r, 0, Math.PI*2);
            ctx.stroke();
            ctx.restore();
        }

        // 绘制外部旋转光环
        ctx.save();
        ctx.rotate(s.rotation * 0.5);
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.5)`;
        ctx.lineWidth = 2;
        const ringSize = 35;
        // 核电：三环+外圈
        if (isNuc) {
            for(let i=0; i<3; i++) {
                const ang = i * (Math.PI*2/3);
                ctx.beginPath(); 
                ctx.arc(Math.cos(ang)*ringSize, Math.sin(ang)*ringSize, 5, 0, Math.PI*2); 
                ctx.stroke();
            }
            ctx.beginPath(); 
            ctx.arc(0, 0, ringSize, 0, Math.PI*2); 
            ctx.stroke();
        } 
        // 普通电厂：两段圆弧
        else {
            ctx.beginPath();
            ctx.arc(0, 0, ringSize, 0, Math.PI * 0.4); 
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, ringSize, Math.PI, Math.PI * 1.4); 
            ctx.stroke();
        }
        ctx.restore();

        // 绘制电源主体
        ctx.fillStyle = '#150a00';
        ctx.beginPath(); 
        ctx.arc(0, 0, 28, 0, Math.PI*2); 
        ctx.fill();
        ctx.strokeStyle = isNuc ? '#0f0' : '#421'; 
        ctx.lineWidth = 2; 
        ctx.stroke();

        // 绘制负载进度条
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.PI * 2 * loadPct);
        ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.arc(0, 0, 22, startAngle, endAngle);
        ctx.stroke();

        // 绘制中心核心
        ctx.save();
        ctx.rotate(-s.rotation);
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;

        // 核电核心
        if (isNuc) {
            ctx.beginPath();
            for(let i=0; i<3; i++) {
                const a = i * (Math.PI*2/3);
                ctx.moveTo(0,0);
                ctx.arc(0,0, 15, a, a + 1);
                ctx.lineTo(0,0);
            }
            ctx.fill();
        } 
        // 普通电厂核心
        else {
            const coreSize = 10 + (loadPct * 5);
            ctx.beginPath();
            for(let i=0; i<6; i++) {
                const ang = (Math.PI/3) * i;
                ctx.lineTo(Math.cos(ang)*coreSize, Math.sin(ang)*coreSize);
            }
            ctx.fill();
        }
        ctx.restore();

        // 绘制热量条
        if (s.heat > 0) {
            ctx.fillStyle = '#330000';
            ctx.fillRect(-20, -45, 40, 6);
            ctx.fillStyle = s.heat > 80 ? '#fff' : '#ff0000';
            ctx.fillRect(-20, -45, 40 * (s.heat/CONFIG.maxHeat), 6);
        }

        ctx.restore();
    });

    // 绘制电线杆
    pylons.forEach(p => {
        if (!isInView(p.x, p.y, 15)) return;
        const scale = p.spawnScale || 1;
        ctx.save(); 
        ctx.translate(p.x, p.y); 
        ctx.scale(scale, scale);
        // 通电/断电/悬停颜色
        let color = p.powered ? CONFIG.colors.powerOn : CONFIG.colors.powerOff;
        if (p === hoveredEntity) color = CONFIG.colors.deleteHighlight;
        ctx.fillStyle = color;
        ctx.beginPath(); 
        ctx.arc(0, 0, 10, 0, Math.PI*2); 
        ctx.fill();
        // 中心白色方块
        ctx.fillStyle = '#fff'; 
        ctx.beginPath(); 
        ctx.rect(-3, -3, 6, 6); 
        ctx.fill();
        ctx.restore();
    });

    // 绘制房屋（居民/工厂/商业）
    houses.forEach(h => {
        if (!isInView(h.x, h.y, 30)) return;
        const scale = h.spawnScale || 1;
        ctx.save(); 
        ctx.translate(h.x, h.y); 
        ctx.scale(scale, scale);

        // 工厂：矩形
        if (h.type === 'factory') {
            let color = h.powered ? CONFIG.colors.factoryHappy : CONFIG.colors.factoryOff;
            if (h.isCritical) color = CONFIG.colors.houseAngry;

            // 危急状态：红色边框
            if (h.isCritical) { 
                ctx.strokeStyle = '#ff0000'; 
                ctx.lineWidth = 2; 
                ctx.strokeRect(-25, -25, 50, 50); 
            }
            // 警报状态：轻微抖动
            if (h.isAlert) { 
                const t = Date.now(); 
                ctx.translate(Math.sin(t/20)*2, Math.cos(t/15)*2); 
            }

            ctx.fillStyle = color; 
            ctx.fillRect(-15, -15, 30, 30);
            ctx.strokeStyle = '#000'; 
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.moveTo(-15, -15); 
            ctx.lineTo(15, 15); 
            ctx.stroke();
            ctx.beginPath(); 
            ctx.moveTo(15, -15); 
            ctx.lineTo(-15, 15); 
            ctx.stroke();

        } 
        // 商业：六边形
        else if (h.type === 'commercial') {
            let color = h.powered ? CONFIG.colors.commHappy : CONFIG.colors.commOff;
            if (h.isCritical) color = CONFIG.colors.houseAngry;

            if (h.isCritical) { 
                ctx.strokeStyle = '#ff0000'; 
                ctx.lineWidth = 2; 
                ctx.beginPath(); 
                ctx.arc(0,0,30,0,Math.PI*2); 
                ctx.stroke(); 
            }

            ctx.fillStyle = color;
            ctx.beginPath();
            for(let i=0; i<6; i++) { 
                const a = i*Math.PI/3; 
                ctx.lineTo(Math.cos(a)*18, Math.sin(a)*18); 
            }
            ctx.closePath(); 
            ctx.fill();

            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; 
            ctx.lineWidth = 2;
            ctx.stroke();

            // 通电时显示负载条
            if (h.powered) {
                const loadPct = ((h.currentLoad || CONFIG.commBaseLoad) - CONFIG.commBaseLoad) / (CONFIG.commPeakLoad - CONFIG.commBaseLoad);
                const barHeight = 24;
                ctx.fillStyle = '#001133'; 
                ctx.fillRect(24, -12, 6, barHeight);
                ctx.fillStyle = '#00ffff';
                // 高负载闪烁
                if (loadPct > 0.8 && Math.floor(Date.now()/100)%2===0) ctx.fillStyle = '#fff';
                const fillH = barHeight * Math.max(0.1, loadPct);
                ctx.fillRect(24, 12 - fillH, 6, fillH);
                ctx.strokeStyle = '#0088ff'; 
                ctx.lineWidth = 1; 
                ctx.strokeRect(24, -12, 6, barHeight);
            }

        } 
        // 居民：六边形
        else {
            let color = h.powered ? CONFIG.colors.houseHappy : CONFIG.colors.houseOff;
            if (h.isCritical) color = CONFIG.colors.houseAngry;
            if (h.isCritical) { 
                ctx.strokeStyle = '#ff0000'; 
                ctx.lineWidth = 2; 
                ctx.beginPath(); 
                ctx.arc(0, 0, 25, 0, Math.PI*2); 
                ctx.stroke(); 
            }
            // 警报状态：个性化抖动
            if (h.isAlert) { 
                const t = Date.now(); 
                ctx.translate(Math.sin(t/20 + h.id*10)*2, Math.cos(t/15 + h.id*10)*2); 
            }
            ctx.fillStyle = color;
            ctx.beginPath(); 
            for (let i=0; i<6; i++) { 
                const ang=(Math.PI*2*i)/6; 
                ctx.lineTo(Math.cos(ang)*15, Math.sin(ang)*15); 
            } 
            ctx.closePath(); 
            ctx.fill();
            // 中心黑色
            ctx.fillStyle = '#000'; 
            ctx.beginPath(); 
            for (let i=0; i<6; i++) { 
                const ang=(Math.PI*2*i)/6; 
                ctx.lineTo(Math.cos(ang)*8, Math.sin(ang)*8); 
            } 
            ctx.fill();
        }

        // 断电时绘制耐心倒计时环
        if (!h.powered) {
            ctx.strokeStyle = h.isCritical ? '#ff0000' : (h.isAlert ? '#ff5500' : '#888');
            ctx.lineWidth = 4;
            ctx.beginPath();
            const endAngle = (h.patience / CONFIG.houseMaxPatience) * Math.PI * 2 - Math.PI/2;
            ctx.arc(0, 0, 20, -Math.PI/2, endAngle); 
            ctx.stroke();
        }
        ctx.restore();
    });

    // ===================== 绘制粒子效果 =====================
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
    // 恢复画布默认状态
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // 请求下一帧渲染，形成循环
    requestAnimationFrame(renderLoop);
}

/**
 * 渲染循环入口
 * 先更新数据，再绘制画面
 * @param {number} timestamp - 时间戳
 */
function renderLoop(timestamp) {
    update(timestamp);  // 更新游戏逻辑、物理、状态
    draw();            // 渲染所有画面
}