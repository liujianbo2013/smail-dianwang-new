//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 输入处理函数集合 ---
/**
 * 获取鼠标/触摸点在Canvas画布上的相对坐标
 * @param {Event} event - 鼠标/触摸事件对象
 * @return {Object} 返回包含x,y的画布坐标
 */
function getCanvasCoordinates(event) {
    // 获取Canvas元素在页面中的位置和尺寸
    const rect = canvas.getBoundingClientRect();
    // 判断是触摸事件还是鼠标事件，获取客户端X坐标
    let clientX = event.touches ? event.touches[0].clientX : event.clientX;
    // 判断是触摸事件还是鼠标事件，获取客户端Y坐标
    let clientY = event.touches ? event.touches[0].clientY : event.clientY;
    // 计算并返回相对于Canvas左上角的坐标
    return { x: clientX - rect.left, y: clientY - rect.top };
}

/**
 * 计算双指触摸的两点之间距离（用于缩放）
 * @param {TouchEvent} e - 触摸事件对象
 * @return {number} 两点间的直线距离
 */
function getTouchDistance(e) {
    // 不足两根手指，返回0
    if (e.touches.length < 2) return 0;
    // 计算两个触摸点的X轴差值
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    // 计算两个触摸点的Y轴差值
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    // 勾股定理计算直线距离
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 处理触摸开始事件
 * @param {TouchEvent} e - 触摸事件对象
 */
function handleTouchStart(e) {
    // 双指触摸：启动缩放模式
    if (e.touches.length === 2) {
        isZooming = true; // 标记正在缩放
        touchStartDist = getTouchDistance(e); // 记录初始双指距离
        e.preventDefault(); // 阻止浏览器默认行为（如页面滚动）
    } 
    // 单指触摸：处理拖拽/拉线/平移逻辑
    else if (e.touches.length === 1) {
        const touch = e.touches[0];
        lastTouchX = touch.clientX; // 记录触摸起始X坐标
        lastTouchY = touch.clientY; // 记录触摸起始Y坐标

        // 计算触摸点在Canvas上的坐标
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // 转换为游戏世界坐标，检测是否点击到实体
        const worldPos = toWorld(x, y);
        const entity = getEntityAt(worldPos.x, worldPos.y);

        // 未点击到实体：延迟100毫秒判断是否启动画布平移（避免和点击冲突）
        if (!entity) {
            setTimeout(() => {
                if (!input.isDown && !dragStartNode) {
                    isPanning = true; // 启动平移模式
                }
            }, 100);
        }
    }
}

/**
 * 处理触摸移动事件
 * @param {TouchEvent} e - 触摸事件对象
 */
function handleTouchMove(e) {
    // 双指缩放逻辑
    if (isZooming && e.touches.length === 2) {
        const dist = getTouchDistance(e); // 获取当前双指距离
        const scaleFactor = dist / touchStartDist; // 计算缩放比例
        // 限制缩放范围在最小/最大缩放值之间
        currentScale = Math.max(CONFIG.minScale, Math.min(CONFIG.maxScale, currentScale * scaleFactor));
        touchStartDist = dist; // 更新初始距离，实现连续缩放
        e.preventDefault();
    } 
    // 单指平移逻辑（未按下、未拉线时）
    else if (isPanning && e.touches.length === 1 && !input.isDown) {
        const touch = e.touches[0];
        const dx = touch.clientX - lastTouchX; // 计算X轴移动偏移量
        const dy = touch.clientY - lastTouchY; // 计算Y轴移动偏移量
        viewOffsetX += dx; // 更新画布X偏移
        viewOffsetY += dy; // 更新画布Y偏移
        lastTouchX = touch.clientX; // 更新上一次触摸坐标
        lastTouchY = touch.clientY;
        e.preventDefault();
    }
}

/**
 * 处理触摸结束事件
 * @param {TouchEvent} e - 触摸事件对象
 */
function handleTouchEnd(e) {
    // 所有手指离开屏幕：关闭缩放和平移
    if (e.touches.length === 0) {
        isZooming = false;
        isPanning = false;
    }
}

/**
 * 处理鼠标滚轮事件（画布缩放）
 * @param {WheelEvent} e - 滚轮事件对象
 */
function handleWheel(e) {
    e.preventDefault(); // 阻止页面滚动
    // 滚轮向下：缩小(0.9)，向上：放大(1.1)
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    // 限制缩放值在配置范围内
    currentScale = Math.max(CONFIG.minScale, Math.min(CONFIG.maxScale, currentScale * delta));
}

/**
 * 处理键盘按下事件
 * @param {KeyboardEvent} e - 键盘事件对象
 */
function handleKeyDown(e) {
    // Shift键：开启高压线模式
    if (e.key === 'Shift') {
        isHighVoltageMode = true;
        if (dragStartNode) {
            setSystemMsg("高压线模式", "highlight");
        }
    } 
    // F11：切换全屏
    else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    } 
    // Ctrl/Cmd + F：切换全屏
    else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleFullscreen();
    }
}

/**
 * 处理键盘松开事件
 * @param {KeyboardEvent} e - 键盘事件对象
 */
function handleKeyUp(e) {
    // 松开Shift：关闭高压线模式
    if (e.key === 'Shift') {
        isHighVoltageMode = false;
        if (dragStartNode) {
            clearSystemMsg();
        }
    }
}

/**
 * 处理鼠标左键点击
 * @param {number} mouseX - 画布X坐标
 * @param {number} mouseY - 画布Y坐标
 */
function handleLeftClick(mouseX, mouseY) {
    // 游戏结束或正在平移时，不响应点击
    if (gameOver || isPanning) return;
    // 转换为游戏世界坐标
    const wPos = toWorld(mouseX, mouseY);
    input.worldX = wPos.x;
    input.worldY = wPos.y;

    // 处于建筑放置模式：直接放置建筑
    if (placementMode) {
        placeBuildingAt(input.worldX, input.worldY, placementMode);
        return;
    }

    // Shift+左键：升级电线为高压线
    if (isHighVoltageMode) {
        const clickedLink = getLinkAt(input.worldX, input.worldY);
        // 检测到未升级的电线
        if (clickedLink && !clickedLink.upgraded) {
            // 计算电线长度和升级费用
            const dist = Math.hypot(clickedLink.from.x - clickedLink.to.x, clickedLink.from.y - clickedLink.to.y);
            const cost = Math.floor(dist * CONFIG.costWirePerUnit * CONFIG.costUpgradeMult);
            // 资金足够：执行升级
            if (money >= cost) {
                money -= cost;
                clickedLink.upgraded = true;
                clickedLink.maxLoad = CONFIG.upgradedWireLoad;
                // 创建升级特效
                createExplosion((clickedLink.from.x + clickedLink.to.x)/2, (clickedLink.from.y - clickedLink.to.y)/2, CONFIG.colors.wireUpgraded, 15);
                setSystemMsg(`电线已升级 (-$${cost})`, "success", true);
                updatePowerGrid(); // 更新电网状态
            } 
            // 资金不足
            else {
                createShockwave(input.worldX, input.worldY, '#ff3333');
                setSystemMsg("资金不足", "warning", true);
            }
            return;
        }
    }

    // 点击到实体：开始拉线连接
    const hovered = getEntityAt(input.worldX, input.worldY, 30);
    if (hovered) {
        input.isDown = true; // 标记鼠标按下
        dragStartNode = hovered; // 记录拉线起点实体
        snapTarget = null; // 清空吸附目标
    }
}

/**
 * 处理鼠标右键点击
 * @param {number} mouseX - 画布X坐标
 * @param {number} mouseY - 画布Y坐标
 */
function handleRightClick(mouseX, mouseY) {
    if (gameOver) return;

    // 处于建筑放置模式：右键取消放置
    if (placementMode) {
        exitPlacementMode();
        return;
    }

    // 转换为世界坐标，执行拆除操作
    const wPos = toWorld(mouseX, mouseY);

    // 优先拆除实体（电塔/电池）
    const entity = getEntityAt(wPos.x, wPos.y, 30);
    if (entity && (entity.type === 'pylon' || entity.type === 'battery')) {
        deleteEntity(entity);
        createExplosion(entity.x, entity.y, '#ffaa00', 15);
        return;
    }

    // 其次拆除电线
    const link = getLinkAt(wPos.x, wPos.y);
    if (link) {
        deleteLink(link);
        createExplosion((link.from.x + link.to.x)/2, (link.from.y + link.to.y)/2, '#ffaa00', 10);
    }
}

/**
 * 处理鼠标/触摸移动事件
 * @param {number} mouseX - 画布X坐标
 * @param {number} mouseY - 画布Y坐标
 */
function handleInputMove(mouseX, mouseY) {
    // 更新输入坐标
    input.x = mouseX; 
    input.y = mouseY;
    const wPos = toWorld(mouseX, mouseY);
    input.worldX = wPos.x; 
    input.worldY = wPos.y;

    // 建筑放置模式：显示放置状态和费用提示
    if (placementMode) {
        const isValid = isPositionClear(input.worldX, input.worldY, 60); // 检测位置是否可用
        let cost = 0;
        let buildingName = '';
        // 根据建筑类型设置费用和名称
        if (placementMode === 'plant') { cost = CONFIG.costPlant; buildingName = '电厂'; }
        else if (placementMode === 'nuclear') { cost = CONFIG.costNuclear; buildingName = '核电站'; }
        else if (placementMode === 'battery') { cost = CONFIG.costBattery; buildingName = '电池'; }

        // 显示对应状态提示
        if (!isValid) {
            setSystemMsg(`此处无法放置${buildingName}`, "warning");
        } else if (money < cost) {
            setSystemMsg(`资金不足 (需要$${cost})`, "warning");
        } else {
            setSystemMsg(`左键放置${buildingName} ($${cost})`, "highlight");
        }
        return;
    }

    // 拉线模式（鼠标按下+有起点）
    if (input.isDown && dragStartNode) {
        // 检测是否吸附到其他实体
        const entity = getEntityAt(input.worldX, input.worldY, CONFIG.snapDistance);
        snapTarget = (entity && entity !== dragStartNode) ? entity : null;
        // 未吸附：检测位置是否可新建电塔
        validBuildPos = !snapTarget ? isPositionClear(input.worldX, input.worldY, CONFIG.minEntityDist) : true;

        // 获取目标点坐标（吸附优先）
        const targetX = snapTarget ? snapTarget.x : input.worldX;
        const targetY = snapTarget ? snapTarget.y : input.worldY;
        // 检测线路是否交叉
        isIntersecting = checkIntersection(dragStartNode, {x: targetX, y: targetY});

        // 计算拉线长度
        const dist = Math.hypot(targetX - dragStartNode.x, targetY - dragStartNode.y);
        const isValidLen = dist <= CONFIG.maxWireLength && dist > 10; // 长度是否合法

        // 长度合法：显示费用和状态
        if (isValidLen) {
            const isHV = isHighVoltageMode;
            const costMult = isHV ? CONFIG.costUpgradeMult : 1;
            const wireCost = Math.floor(dist * CONFIG.costWirePerUnit * costMult);
            let estCost = wireCost + (!snapTarget && validBuildPos ? CONFIG.costPylon : 0);
            let label = (!snapTarget && validBuildPos) ? "建造电塔" : "连接";
            if (isHV) label = "高压" + label;

            // 根据状态显示提示
            if (isIntersecting) setSystemMsg("错误: 线路交叉", "warning");
            else if (money < estCost) setSystemMsg(`成本: $${estCost} (资金不足)`, "warning");
            else setSystemMsg(`${label} 成本: $${estCost}`, "highlight");
        } else {
            setSystemMsg("距离无效", "warning");
        }
    } 
    // 普通悬停：显示操作提示
    else {
        hoveredEntity = getEntityAt(input.worldX, input.worldY, 30);
        hoveredLink = !hoveredEntity ? getLinkAt(input.worldX, input.worldY) : null;

        // 悬停在实体上
        if (hoveredEntity) {
            if (hoveredEntity.type === 'pylon' || hoveredEntity.type === 'battery') {
                setSystemMsg("右键拆除", "normal");
            } else {
                setSystemMsg("左键拖动建造电线", "normal");
            }
        } 
        // 悬停在电线上
        else if (hoveredLink) {
            if (isHighVoltageMode) {
                if (hoveredLink.upgraded) {
                    setSystemMsg("已是高压线", "normal");
                } else {
                    // 计算升级费用并提示
                    const dist = Math.hypot(hoveredLink.from.x - hoveredLink.to.x, hoveredLink.from.y - hoveredLink.to.y);
                    const cost = Math.floor(dist * CONFIG.costWirePerUnit * CONFIG.costUpgradeMult);
                    setSystemMsg(`Shift+左键升级 ($${cost})`, "highlight");
                }
            } else {
                setSystemMsg("右键删除电线", "warning");
            }
        } 
        // 无悬停目标
        else {
            clearSystemMsg();
        }
    }
}

/**
 * 处理鼠标/触摸松开事件（结束拉线）
 */
function handleInputEnd() {
    // 正在拉线且有起点
    if (input.isDown && dragStartNode) {
        // 获取目标点（吸附优先）
        const targetPos = snapTarget ? snapTarget : { x: input.worldX, y: input.worldY };
        // 计算拉线长度
        const dist = Math.hypot(targetPos.x - dragStartNode.x, targetPos.y - dragStartNode.y);
        const isValidLength = dist <= CONFIG.maxWireLength && dist > 10;

        // 长度合法且无交叉
        if (isValidLength && !isIntersecting) {
            const isHV = isHighVoltageMode;
            const costMult = isHV ? CONFIG.costUpgradeMult : 1;
            const wireCost = Math.floor(dist * CONFIG.costWirePerUnit * costMult);

            // 吸附到实体：直接连接
            if (snapTarget) {
                if (money >= wireCost) 
                    tryConnect(dragStartNode, snapTarget, wireCost, isHV);
                else { 
                    createShockwave(input.worldX, input.worldY, '#ff3333'); 
                    setSystemMsg("资金不足", "warning", true); 
                }
            } 
            // 未吸附：新建电塔并连接
            else if (validBuildPos) {
                const totalCost = wireCost + CONFIG.costPylon;
                if (money >= totalCost) 
                    tryBuildPylon(input.worldX, input.worldY, dragStartNode, totalCost, isHV);
                else { 
                    createShockwave(input.worldX, input.worldY, '#ff3333'); 
                    setSystemMsg("资金不足", "warning", true); 
                }
            } 
            // 位置不可用
            else { 
                createShockwave(input.worldX, input.worldY, '#ff0000'); 
                setSystemMsg("位置错误", "warning", true); 
            }
        } 
        // 长度不合法
        else { 
            createShockwave(input.worldX, input.worldY, '#ff0000'); 
            setSystemMsg("长度错误", "warning", true); 
        }
    }
    // 重置所有拉线相关状态
    input.isDown = false; 
    dragStartNode = null; 
    snapTarget = null; 
    isIntersecting = false;
    clearSystemMsg();
}

/**
 * 初始化所有输入事件监听
 */
function initInputListeners() {
    // 鼠标按下事件
    canvas.addEventListener('mousedown', e => {
        const c = getCanvasCoordinates(e);
        if (e.button === 0) handleLeftClick(c.x, c.y); // 左键
        else if (e.button === 2) handleRightClick(c.x, c.y); // 右键
    });

    // 鼠标移动事件
    canvas.addEventListener('mousemove', e => {
        const c = getCanvasCoordinates(e);
        handleInputMove(c.x, c.y);
    });

    // 鼠标松开事件
    canvas.addEventListener('mouseup', e => {
        if (e.button === 0) handleInputEnd(); // 左键松开
    });

    // 触摸开始事件（关闭被动模式，允许阻止默认行为）
    canvas.addEventListener('touchstart', e => {
        handleTouchStart(e);
        // 单指且未缩放：模拟左键点击
        if (e.touches.length === 1 && !isZooming) {
            const c = getCanvasCoordinates(e);
            handleLeftClick(c.x, c.y);
        }
    }, {passive: false});

    // 触摸移动事件
    canvas.addEventListener('touchmove', e => {
        handleTouchMove(e);
        // 单指且未操作：模拟鼠标移动
        if (e.touches.length === 1 && !isZooming && !isPanning) {
            const c = getCanvasCoordinates(e);
            handleInputMove(c.x, c.y);
        }
    }, {passive: false});

    // 触摸结束事件
    canvas.addEventListener('touchend', e => {
        handleTouchEnd(e);
        // 无操作时结束输入
        if (!isZooming && !isPanning) {
            handleInputEnd();
        }
    });

    // 滚轮缩放事件
    canvas.addEventListener('wheel', handleWheel, {passive: false});
    // 键盘事件
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // 窗口大小变化事件
    window.addEventListener('resize', resize);
}