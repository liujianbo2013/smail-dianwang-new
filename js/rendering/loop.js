//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 渲染循环入口 ---

/**
 * 渲染循环入口
 * 先更新数据，再绘制画面
 * @param {number} timestamp - 时间戳
 */
function renderLoop(timestamp) {
    update(timestamp);  // 更新游戏逻辑、物理、状态
    draw();            // 渲染所有画面
}