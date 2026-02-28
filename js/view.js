// ==================== 视图控制函数 ====================
/**
 * 放大画布视图
 * 每次将当前缩放比例乘以1.2倍，且不超过配置的最大缩放限制
 */
function zoomIn() {
    // 缩放比例 = 取最小值(当前缩放*1.2, 最大缩放值)，防止过度放大
    currentScale = Math.min(currentScale * 1.2, CONFIG.maxScale);
    // 显示操作提示文字
    showHelpTip("放大视图");
}

/**
 * 缩小画布视图
 * 每次将当前缩放比例除以1.2倍，且不低于配置的最小缩放限制
 */
function zoomOut() {
    // 缩放比例 = 取最大值(当前缩放/1.2, 最小缩放值)，防止过度缩小
    currentScale = Math.max(currentScale / 1.2, CONFIG.minScale);
    // 显示操作提示文字
    showHelpTip("缩小视图");
}

/**
 * 重置视图为初始状态
 * 恢复默认缩放比例，清空视图偏移量（回到画布中心）
 */
function resetView() {
    // 恢复初始缩放比例
    currentScale = CONFIG.initialScale;
    // 清空X轴偏移
    viewOffsetX = 0;
    // 清空Y轴偏移
    viewOffsetY = 0;
    // 显示操作提示文字
    showHelpTip("视图已重置");
}

/**
 * 屏幕坐标 转换为 世界坐标（核心坐标转换函数）
 * 用于将鼠标/触摸的屏幕位置，转换成画布内部的实际逻辑坐标
 * @param {number} screenX - 屏幕X坐标
 * @param {number} screenY - 屏幕Y坐标
 * @returns {object} 转换后的世界坐标{x,y}
 */
function toWorld(screenX, screenY) {
    return {
        // 世界X = (屏幕X - 画布中心X - 视图X偏移) / 当前缩放比例
        x: (screenX - cx - viewOffsetX) / currentScale,
        // 世界Y = (屏幕Y - 画布中心Y - 视图Y偏移) / 当前缩放比例
        y: (screenY - cy - viewOffsetY) / currentScale
    };
}

// ==================== 视图裁剪辅助函数 ====================
/**
 * 更新可视区域边界
 * 计算当前屏幕能看到的画布逻辑范围，用于优化渲染（只渲染可见区域内的元素）
 */
function updateViewBounds() {
    // 可视区域外边距（预留100像素，防止边缘元素被截断）
    const margin = 100;
    // 可视区域最小X = 屏幕左上角转换后的X坐标 - 边距
    viewBounds.minX = (0 - cx - viewOffsetX) / currentScale - margin;
    // 可视区域最大X = 屏幕右下角转换后的X坐标 + 边距
    viewBounds.maxX = (width - cx - viewOffsetX) / currentScale + margin;
    // 可视区域最小Y = 屏幕左上角转换后的Y坐标 - 边距
    viewBounds.minY = (0 - cy - viewOffsetY) / currentScale - margin;
    // 可视区域最大Y = 屏幕右下角转换后的Y坐标 + 边距
    viewBounds.maxY = (height - cy - viewOffsetY) / currentScale + margin;
}

/**
 * 判断一个点/圆形元素是否在可视区域内
 * 用于优化渲染：只绘制可见元素，提升性能
 * @param {number} x - 元素中心X坐标
 * @param {number} y - 元素中心Y坐标
 * @param {number} radius - 元素半径（默认为0，即纯点）
 * @returns {boolean} true=在可视区内，false=不可见
 */
function isInView(x, y, radius = 0) {
    return x + radius > viewBounds.minX &&
           x - radius < viewBounds.maxX &&
           y + radius > viewBounds.minY &&
           y - radius < viewBounds.maxY;
}

/**
 * 判断一条连线是否在可视区域内
 * 连线是两个点之间的线段，判断线段是否与可视区域相交
 * @param {object} l - 连线对象（包含from和to两个端点）
 * @returns {boolean} true=连线可见，false=连线不可见
 */
function isLinkInView(l) {
    // 计算连线两端的最小/最大X、Y坐标
    const minX = Math.min(l.from.x, l.to.x);
    const maxX = Math.max(l.from.x, l.to.x);
    const minY = Math.min(l.from.y, l.to.y);
    const maxY = Math.max(l.from.y, l.to.y);
    
    // 判断线段是否与可视区域重叠
    return maxX > viewBounds.minX &&
           minX < viewBounds.maxX &&
           maxY > viewBounds.minY &&
           minY < viewBounds.maxY;
}

// ==================== 画布尺寸调整函数 ====================
/**
 * 重置画布尺寸
 * 跟随容器大小自适应，重新计算画布宽高和中心点
 * 常用于窗口缩放、全屏切换时调用
 */
function resize() {
    // 获取容器元素的实际显示尺寸
    const rect = container.getBoundingClientRect();
    // 更新全局画布宽度
    width = rect.width;
    // 更新全局画布高度
    height = rect.height;
    // 设置canvas标签的实际宽高（与容器同步）
    canvas.width = width;
    canvas.height = height;
    // 重新计算画布中心点X坐标
    cx = width / 2;
    // 重新计算画布中心点Y坐标
    cy = height / 2;
}

// ==================== 全屏控制函数 ====================
/**
 * 切换全屏/退出全屏（统一入口函数）
 * 检测当前状态，自动执行进入或退出操作
 */
function toggleFullscreen() {
    // 判断当前是否处于全屏状态（兼容所有浏览器）
    if (!document.fullscreenElement && !document.webkitFullscreenElement &&
        !document.mozFullScreenElement && !document.msFullscreenElement) {
        // 非全屏 → 进入全屏
        enterFullscreen();
    } else {
        // 全屏 → 退出全屏
        exitFullscreen();
    }
}

/**
 * 进入全屏模式
 * 兼容所有主流浏览器的全屏API（标准+前缀版本）
 */
function enterFullscreen() {
    // 获取整个页面元素
    const elem = document.documentElement;
    // 标准API
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } 
    // Chrome/Safari/Edge 兼容
    else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } 
    // Firefox 兼容
    else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } 
    // IE/旧版Edge 兼容
    else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

/**
 * 退出全屏模式
 * 兼容所有主流浏览器的退出全屏API
 */
function exitFullscreen() {
    // 标准API
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } 
    // Chrome/Safari/Edge 兼容
    else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } 
    // Firefox 兼容
    else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } 
    // IE/旧版Edge 兼容
    else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

/**
 * 更新全屏按钮显示状态
 * 根据当前是否全屏，切换按钮图标、提示文字和样式
 */
function updateFullscreenButton() {
    // 获取全屏按钮DOM
    const btn = document.getElementById('fullscreen-btn');
    // 当前是全屏状态
    if (isFullscreen) {
        // 按钮图标：退出全屏
        btn.innerHTML = '◱';
        // 鼠标悬浮提示
        btn.title = '退出全屏';
        // 添加激活样式
        btn.classList.add('active');
    } 
    // 当前是非全屏状态
    else {
        // 按钮图标：进入全屏
        btn.innerHTML = '⛶';
        // 鼠标悬浮提示
        btn.title = '全屏';
        // 移除激活样式
        btn.classList.remove('active');
    }
}

/**
 * 全屏状态改变时的处理函数
 * 当用户手动按ESC、点击按钮切换全屏时触发
 */
function handleFullscreenChange() {
    // 更新全局全屏状态（兼容所有浏览器）
    isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement ||
                             document.mozFullScreenElement || document.msFullscreenElement);
    // 更新按钮UI
    updateFullscreenButton();
    // 重新调整画布尺寸
    resize();
    // 显示对应提示文字
    if (isFullscreen) {
        showHelpTip("已进入全屏模式 (按 ESC 退出)");
    } else {
        showHelpTip("已退出全屏模式");
    }
}

/**
 * 初始化全屏事件监听
 * 绑定所有浏览器的全屏状态变更事件
 */
function initFullscreenListeners() {
    // 标准事件
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Chrome/Safari/Edge 兼容事件
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    // Firefox 兼容事件
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    // IE/旧版Edge 兼容事件
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}