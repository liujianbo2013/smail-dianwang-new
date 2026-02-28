//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 实体绘制系统 ---

/**
 * 绘制实体发光效果（发光层）
 */
function drawEntityGlow() {
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
}

/**
 * 绘制实体本体（核心层）
 */
function drawEntities() {
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
}