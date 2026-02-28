// ------------------------------
// 游戏主入口文件（程序启动的唯一入口）
// ------------------------------

// 依次加载游戏所有核心模块脚本（按依赖顺序加载）
// 配置文件：游戏常量、参数、基础设置
loadScript('js/config.js');
// 状态管理：游戏数据、运行状态、全局变量
loadScript('js/state.js');
// 视图控制：画面渲染、相机、画布相关
loadScript('js/view.js');
// 输入处理：鼠标、键盘、触摸事件监听
loadScript('js/input.js');
// 电力系统：游戏内电力生产、消耗、电网逻辑
loadScript('js/power/entities.js');  // 电力实体检测工具函数
loadScript('js/power/grid.js');       // 电网系统核心逻辑
loadScript('js/power/operations.js'); // 电线/电塔 建造与删除操作
// 建筑系统：建筑数据、放置、升级、拆除逻辑
loadScript('js/building/placement.js');  // 建筑放置模式管理
loadScript('js/building/spawner.js');    // 实体生成系统
// 经济系统：金币、资源产出、消耗、结算
loadScript('js/economy.js');
// 界面交互：按钮、面板、弹窗、菜单操作
loadScript('js/ui.js');
// 回放系统：游戏录像、回放、进度控制
loadScript('js/replay.js');
// 渲染引擎：画面绘制、图层、特效渲染
loadScript('js/rendering/effects.js');      // 粒子特效系统
loadScript('js/rendering/loop.js');         // 渲染循环入口
loadScript('js/rendering/draw-main.js');    // 主绘制函数
loadScript('js/rendering/draw-wires.js');   // 电线绘制系统
loadScript('js/rendering/draw-entities.js');// 实体绘制系统
// 逻辑更新：游戏帧更新、物理、逻辑运算
loadScript('js/update.js');

// ------------------------------
// 脚本加载工具函数
// ------------------------------
/**
 * 动态加载JS脚本文件
 * 并设置为同步加载（保证执行顺序，避免依赖错误）
 * @param {string} src - 脚本文件的路径
 */
function loadScript(src) {
    // 创建一个script标签
    const script = document.createElement('script');
    // 设置脚本路径
    script.src = src;
    // 关闭异步加载，确保脚本按书写顺序依次执行
    script.async = false;
    // 将脚本标签添加到页面头部，开始加载
    document.head.appendChild(script);
}

// ------------------------------
// 页面加载完成后：初始化游戏
// ------------------------------
/**
 * 浏览器页面完全加载完毕后执行
 * 所有资源、脚本加载完成，开始初始化游戏
 */
window.addEventListener('load', function() {
    // 初始化DOM元素（获取画布、按钮、面板等页面元素）
    initDOM();
    // 初始化全屏模式监听（监听全屏切换事件）
    initFullscreenListeners();
    // 初始化输入设备监听（鼠标、键盘、触摸）
    initInputListeners();
    // 初始化回放功能监听（播放、暂停、快进等）
    initReplayListeners();

    // 执行一次窗口大小适配，调整游戏画面尺寸
    resize();
    // 重启/初始化游戏（重置数据、开始新游戏）
    restartGame();
    // 绑定建筑按钮点击事件（选择建筑、放置建筑）
    setupBuildingButtons();
    // 更新全屏按钮显示状态（根据当前是否全屏切换图标）
    updateFullscreenButton();
    // 启动游戏渲染循环（开始持续绘制画面）
    requestAnimationFrame(renderLoop);

    // 延迟1秒后，显示新手操作提示，持续5秒自动消失
    setTimeout(() => {
        showHelpTip("点击建筑按钮放置，左键连线，右键拆除", 5000);
    }, 1000);
});