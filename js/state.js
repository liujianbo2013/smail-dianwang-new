//此文件已添加详细的中文注释，编辑时请注意添加注释！
// ==================== 画布与上下文 ====================
// 主画布、画布容器、主画布2D绘图上下文
let canvas, container, ctx;
// 系统消息元素、警报遮罩层、操作提示文本
let sysMsgEl, alarmOverlay, helpTip;

// ==================== 回放画布与UI ====================
// 回放专用画布、回放绘图上下文、回放进度条
let replayCanvas, replayCtx, replaySlider;

// ==================== 游戏UI元素 ====================
// 金钱显示、收益显示、覆盖率显示、缩放比例显示
let moneyEl, incomeEl, coverageEl, scaleEl;
// 游戏结束界面、游戏结束原因文本、速度调节按钮组
let gameOverScreen, gameOverReason, speedBtns;

// ==================== 核心游戏状态 ====================
// 画布宽度、画布高度
let width, height;
// 画布中心点坐标
let cx, cy;
// 视角偏移量（控制地图平移）
let viewOffsetX = 0, viewOffsetY = 0;
// 上一帧渲染时间（用于计算帧间隔）
let lastTime = 0;
// 游戏是否结束
let gameOver = false;
// 当前玩家金钱（初始值读取配置）
let money = CONFIG.initialMoney;
// 当前每秒净收益
let currentNetIncome = 0;
// 游戏时间流速（倍速）
let timeScale = 1.0;
// 游戏总运行时间
let gameTime = 0;

// ==================== 输入状态 ====================
// 鼠标/触摸输入对象：屏幕坐标、世界坐标、左键按下、右键按下
let input = { x: 0, y: 0, worldX: 0, worldY: 0, isDown: false, isRightDown: false };
// 拖拽开始时选中的节点
let dragStartNode = null;
// 吸附目标对象
let snapTarget = null;
// 建筑放置位置是否合法
let validBuildPos = true;
// 是否发生碰撞/相交
let isIntersecting = false;
// 鼠标悬停的线路
let hoveredLink = null;
// 鼠标悬停的实体（建筑/设施）
let hoveredEntity = null;
// 当前地图缩放比例（初始值读取配置）
let currentScale = CONFIG.initialScale;
// 总生成实体数量
let totalSpawns = 0;
// 是否处于紧急/临界状态
let isCriticalState = false;
// 是否开启高压模式（通过Shift键触发）
let isHighVoltageMode = false;

// ==================== 建筑放置相关 ====================
// 当前放置模式：空/种植/核电/电池
let placementMode = null;
// 拖拽的建筑类型（兼容旧版拖拽逻辑）
let draggedType = null;
// 拖拽预览对象
let dragPreview = null;

// ==================== 触摸手势支持 ====================
// 双指触摸初始距离（用于缩放）
let touchStartDist = 0;
// 上一次触摸坐标
let lastTouchX = 0, lastTouchY = 0;
// 是否正在平移地图
let isPanning = false;
// 是否正在缩放地图
let isZooming = false;

// ==================== 游戏实体列表 ====================
// 电源/发电设施
let sources = [];
// 电线杆/输电塔
let pylons = [];
// 房屋/用户建筑
let houses = [];
// 电池/储能设施
let batteries = [];
// 粒子特效
let particles = [];
// 电力连接线路
let links = [];

// ==================== 时间控制 ====================
// 上一次生成实体的游戏时间
let lastSpawnGameTime = 0;
// 上一次生成工厂的时间
let lastFactorySpawnTime = 0;
// 上一次生成通信建筑的时间
let lastCommSpawnTime = 0;
// 上一次收益结算的游戏时间
let lastIncomeGameTime = 0;

// ==================== 消息系统 ====================
// 系统消息状态：文本、类型、优先级、计时器
let msgState = { text: "系统就绪 - 拖拽建筑到地图上", type: "normal", priority: 0, eventTimer: 0 };
// 上一次渲染的消息文本（用于去重）
let lastRenderedMsg = "";

// ==================== 视锥裁剪 ====================
// 可视区域边界（优化渲染，只渲染可见区域内容）
let viewBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

// ==================== 全屏状态 ====================
let isFullscreen = false;

// ==================== 回放系统 ====================
// 游戏历史记录快照
let gameHistory = [];
// 上一次保存快照的游戏时间
let lastSnapshotTime = 0;

// ==================== 初始化DOM元素引用 ====================
function initDOM() {
    // 获取主画布、容器、绘图上下文
    canvas = document.getElementById('gameCanvas');
    container = document.getElementById('game-container');
    ctx = canvas.getContext('2d', { alpha: false });
    
    // 获取系统提示、警报遮罩、帮助提示元素
    sysMsgEl = document.getElementById('system-msg');
    alarmOverlay = document.getElementById('alarm-overlay');
    helpTip = document.getElementById('help-tip');

    // 获取回放画布、上下文、进度条
    replayCanvas = document.getElementById('replayCanvas');
    replayCtx = replayCanvas.getContext('2d');
    replaySlider = document.getElementById('replay-slider');

    // 获取游戏数据显示UI
    moneyEl = document.getElementById('money-display');
    incomeEl = document.getElementById('income-display');
    coverageEl = document.getElementById('coverage-display');
    scaleEl = document.getElementById('scale-display');
    
    // 获取游戏结束界面
    gameOverScreen = document.getElementById('game-over');
    gameOverReason = document.getElementById('game-over-reason');
    
    // 获取所有速度调节按钮
    speedBtns = document.querySelectorAll('.speed-btn');

    // 禁止画布右键弹出浏览器默认菜单
    canvas.addEventListener('contextmenu', e => e.preventDefault());
}