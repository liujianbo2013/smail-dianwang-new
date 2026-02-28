//此文件已添加详细的中文注释，编辑时请注意添加注释！
// 回放系统核心代码

// 生成当前游戏画面的快照数据（用于回放）
function takeSnapshot() {
    // 初始化一帧回放数据结构，包含实体、连线、缩放比例
    const frame = {
        entities: [],  // 存储所有实体数据（电源、建筑、电池等）
        links: [],     // 存储所有连线数据
        scale: currentScale  // 记录当前画面的缩放比例
    };

    // 合并所有实体数组：电源、塔台、房屋、电池
    const allEntities = [...sources, ...pylons, ...houses, ...batteries];
    // 遍历所有实体，生成精简的快照数据
    allEntities.forEach(e => {
        // 定义颜色编码：0=未通电 1=通电 2=紧急 3=电源 4=工厂 5=商业 6=电池 7=核电
        let colorCode = 0;
        if (e.variant === 'nuclear') colorCode = 7;        // 核电实体标记为7
        else if (e.type === 'source') colorCode = 3;      // 电源实体标记为3
        else if (e.type === 'factory') colorCode = 4;     // 工厂实体标记为4
        else if (e.type === 'commercial') colorCode = 5;  // 商业建筑标记为5
        else if (e.type === 'battery') colorCode = 6;      // 电池实体标记为6
        else if (e.isCritical) colorCode = 2;              // 关键建筑标记为2
        else if (e.powered) colorCode = 1;                 // 已通电建筑标记为1
        else colorCode = 0;                                // 未通电建筑标记为0

        // 将实体数据存入帧数据（坐标取整、类型取首字母、颜色编码）
        frame.entities.push({
            x: Math.round(e.x),    // 实体X坐标（取整优化存储）
            y: Math.round(e.y),    // 实体Y坐标（取整优化存储）
            t: e.type.charAt(0),   // 实体类型首字母（s=电源 h=房屋 f=工厂等）
            c: colorCode           // 颜色编码
        });
    });

    // 遍历所有连线，生成快照数据
    links.forEach(l => {
        frame.links.push({
            x1: Math.round(l.from.x),  // 连线起点X坐标
            y1: Math.round(l.from.y),  // 连线起点Y坐标
            x2: Math.round(l.to.x),    // 连线终点X坐标
            y2: Math.round(l.to.y),    // 连线终点Y坐标
            u: l.upgraded ? 1 : 0      // 是否升级（1=是 0=否）
        });
    });

    // 将这一帧数据存入回放历史数组
    gameHistory.push(frame);
}

// 渲染指定索引的回放帧（绘制到回放画布）
function renderReplayFrame(frameIndex) {
    // 无回放数据时直接返回
    if (gameHistory.length === 0) return;
    // 限制索引在有效范围内（防止越界）
    const idx = Math.min(Math.max(0, frameIndex), gameHistory.length - 1);
    // 获取对应帧的数据
    const frame = gameHistory[idx];

    // 获取回放画布上下文、宽高
    const rctx = replayCtx;
    const rw = replayCanvas.width;
    const rh = replayCanvas.height;

    // 清空回放画布（填充黑色背景）
    rctx.fillStyle = '#000';
    rctx.fillRect(0, 0, rw, rh);

    // 计算缩略图缩放比例（适配回放画布，缩小20%避免溢出）
    const thumbScale = (rw / width) * frame.scale * 0.8;

    // 保存画布初始状态
    rctx.save();
    // 将画布原点移到中心（居中绘制）
    rctx.translate(rw/2, rh/2);
    // 应用缩放
    rctx.scale(thumbScale, thumbScale);

    // ———— 绘制连线 ————
    // 设置连线宽度（根据原始缩放适配）
    rctx.lineWidth = 10 / frame.scale;
    frame.links.forEach(l => {
        rctx.beginPath();
        rctx.moveTo(l.x1, l.y1);  // 移动到连线起点
        rctx.lineTo(l.x2, l.y2);  // 绘制到连线终点
        rctx.strokeStyle = l.u ? '#d000ff' : '#334455';  // 升级连线紫色，普通连线深灰蓝
        rctx.stroke();  // 绘制连线
    });

    // ———— 绘制实体 ————
    frame.entities.forEach(e => {
        let color = '#333';    // 默认颜色
        let size = 20 / frame.scale;  // 默认实体大小（适配缩放）

        // 根据颜色编码匹配颜色和大小
        if (e.c === 7) { color = '#00ff66'; size *= 1.8; }       // 核电：青绿色+放大1.8倍
        else if (e.c === 3) { color = '#fff'; size *= 1.5; }     // 电源：白色+放大1.5倍
        else if (e.c === 4) { color = '#ff8800'; size *= 1.2; }  // 工厂：橙色+放大1.2倍
        else if (e.c === 5) { color = '#0088ff'; size *= 1.2; }  // 商业：蓝色+放大1.2倍
        else if (e.c === 6) { color = '#00ff00'; size *= 1.0; }  // 电池：绿色+正常大小
        else if (e.c === 2) color = '#ff0000';                   // 紧急状态：红色
        else if (e.c === 1) color = '#00ffaa';                   // 已通电：青蓝色
        else if (e.c === 0) {                                    // 未通电：按建筑类型区分暗色
            if (e.t === 'h') color = '#004433';  // 未通电房屋
            if (e.t === 'f') color = '#442200';  // 未通电工厂
            if (e.t === 'c') color = '#002244';  // 未通电商业
        }

        // 设置填充颜色
        rctx.fillStyle = color;

        // 根据实体类型绘制不同形状
        if (e.t === 's' || e.t === 'h') {
            // 电源/房屋：绘制圆形
            rctx.beginPath();
            rctx.arc(e.x, e.y, size, 0, Math.PI*2);
            rctx.fill();
        } else if (e.t === 'p') {
            // 塔台：绘制小圆形（尺寸减半）
            rctx.beginPath();
            rctx.arc(e.x, e.y, size*0.5, 0, Math.PI*2);
            rctx.fill();
        } else {
            // 其他实体（工厂/商业/电池）：绘制正方形
            rctx.fillRect(e.x - size, e.y - size, size*2, size*2);
        }
    });

    // 恢复画布初始状态（结束绘制）
    rctx.restore();
}

// 初始化回放滑块监听事件
function initReplayListeners() {
    // 滑块值改变时，实时渲染对应帧的回放画面
    replaySlider.addEventListener('input', function() {
        renderReplayFrame(parseInt(this.value));
    });
}