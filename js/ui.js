//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- UI系统 ---

/**
 * 设置系统提示消息
 * @param {string} text - 提示文本内容
 * @param {string} type - 消息类型，默认normal（普通）
 * @param {boolean} isEvent - 是否为事件级消息（高优先级），默认false
 */
function setSystemMsg(text, type = "normal", isEvent = false) {
    // 如果是事件级消息（高优先级，如重要提示）
    if (isEvent) {
        // 赋值消息文本、类型、优先级为2（最高），设置事件计时器120帧
        msgState.text = text; msgState.type = type; msgState.priority = 2; msgState.eventTimer = 120;
    } 
    // 如果当前消息优先级低于2，允许覆盖普通消息
    else if (msgState.priority < 2) {
        // 赋值消息文本、类型、优先级为1（普通）
        msgState.text = text; msgState.type = type; msgState.priority = 1;
    }
}

/**
 * 清空系统提示消息
 * @param {boolean} force - 是否强制清空，默认false
 */
function clearSystemMsg(force = false) {
    // 强制清空 或 当前消息不是最高优先级时，重置为默认就绪提示
    if (force || msgState.priority < 2) {
        // 重置消息状态：文本、类型、优先级归0
        msgState.text = "系统就绪 - 点击建筑按钮放置"; msgState.type = "normal"; msgState.priority = 0;
    }
}

/**
 * 更新系统提示UI的显示状态
 * 负责倒计时高优先级消息、渲染消息样式、控制警报遮罩显示
 */
function updateSystemUI() {
    // 如果是高优先级事件消息，执行倒计时
    if (msgState.priority === 2) {
        msgState.eventTimer--;
        // 计时结束，重置优先级并显示默认就绪消息
        if (msgState.eventTimer <= 0) { msgState.priority = 0; setSystemMsg("系统就绪 - 点击建筑按钮放置", "normal"); }
    }

    // 组合消息文本和类型，用于判断是否需要重新渲染
    const combinedState = msgState.text + msgState.type;
    // 状态发生变化时，才更新DOM，避免重复渲染
    if (combinedState !== lastRenderedMsg) {
        // 更新提示文本
        sysMsgEl.innerText = msgState.text;
        // 清空原有样式类
        sysMsgEl.className = "";
        // 非普通类型消息，添加对应样式类
        if (msgState.type !== "normal") sysMsgEl.classList.add(msgState.type);
        // 记录当前已渲染的状态
        lastRenderedMsg = combinedState;
    }

    // 危急状态处理：显示/隐藏警报遮罩
    if (isCriticalState) {
        // 未激活则添加激活样式
        if (!alarmOverlay.classList.contains('active')) alarmOverlay.classList.add('active');
    } else {
        // 已激活则移除激活样式
        if (alarmOverlay.classList.contains('active')) alarmOverlay.classList.remove('active');
    }
}

/**
 * 更新游戏核心数据UI
 * 包括金钱、收入、电力覆盖率、建筑规模
 */
function updateUI() {
    // 更新金钱显示，向下取整
    moneyEl.innerText = '$' + Math.floor(money);
    // 判断收入正负，设置正负号
    let sign = currentNetIncome >= 0 ? '+' : '';
    // 更新每秒净收入文本
    incomeEl.innerText = `${sign}$${currentNetIncome}/s`;
    // 收入为正显示绿色，为负显示红色
    incomeEl.style.color = currentNetIncome >= 0 ? '#00ffaa' : '#ff3333';

    // 计算电力供应数据
    const total = houses.length; // 总房屋数量
    const powered = houses.filter(h => h.powered).length; // 正常供电的房屋数量
    const pct = total === 0 ? 100 : Math.floor((powered/total)*100); // 供电覆盖率百分比

    // 更新覆盖率显示
    coverageEl.innerText = pct + '%';
    // 覆盖率低于50%显示红色，否则显示青色
    coverageEl.style.color = pct < 50 ? '#ff3333' : '#00ffff';

    // 更新建筑总规模（房屋总数）显示
    scaleEl.innerText = `${total}`;
}

/**
 * 显示帮助提示气泡
 * @param {string} text - 提示内容
 * @param {number} duration - 显示时长，默认2000毫秒
 */
function showHelpTip(text, duration = 2000) {
    // 设置提示文本
    helpTip.textContent = text;
    // 显示提示框
    helpTip.classList.add('show');
    // 定时隐藏提示框
    setTimeout(() => helpTip.classList.remove('show'), duration);
}

/**
 * 设置游戏时间流速
 * @param {number} scale - 流速倍数（0=暂停，0.5=慢速，1=正常，2=倍速）
 */
function setTimeScale(scale) {
    // 赋值全局时间流速
    timeScale = scale;
    // 清空所有速度按钮的激活状态
    speedBtns.forEach(btn => btn.classList.remove('active'));

    // 根据流速匹配对应按钮并激活
    if (scale === 0) speedBtns[0].classList.add('active');
    else if (scale === 0.5) speedBtns[1].classList.add('active');
    else if (scale === 1.0) speedBtns[2].classList.add('active');
    else if (scale === 2.0) speedBtns[3].classList.add('active');

    // 显示流速提示
    showHelpTip(`速度: ${scale === 0 ? '暂停' : scale + 'x'}`);
}

/**
 * 触发游戏结束
 * @param {string} reason - 游戏结束的原因
 */
function triggerGameOver(reason) {
    // 标记游戏结束状态
    gameOver = true;
    // 拍摄游戏快照（用于回放）
    takeSnapshot();
    // 设置结束原因文本
    gameOverReason.innerText = reason;
    // 创建红色爆炸特效
    createExplosion(0, 0, '#ff0000', 50);

    // 设置回放滑块最大值
    replaySlider.max = Math.max(0, gameHistory.length - 1);
    // 重置回放滑块到起始位置
    replaySlider.value = 0;
    // 渲染第一帧回放画面
    renderReplayFrame(0);

    // 显示游戏结束界面
    gameOverScreen.classList.add('active');
}

/**
 * 重新开始游戏
 * 重置所有游戏数据、建筑、状态，初始化游戏场景
 */
function restartGame() {
    // 重置核心游戏状态
    gameOver = false; // 关闭游戏结束标记
    money = CONFIG.initialMoney; // 重置初始金钱
    currentNetIncome = 0; // 重置净收入

    // 清空所有建筑、实体、特效数组
    sources = []; pylons = []; houses = []; batteries = []; links = []; particles = [];

    // 重置游戏统计数据
    totalSpawns = 0; // 总生成数
    currentScale = CONFIG.initialScale; // 初始规模
    CONFIG.maxAngryHouses = 5; // 最大愤怒房屋数量
    gameTime = 0; // 游戏时间

    // 重置视角偏移
    viewOffsetX = 0; viewOffsetY = 0;
    // 重置放置模式
    placementMode = null;

    // 重置各类计时器
    lastSpawnGameTime = 0;
    lastFactorySpawnTime = 0;
    lastCommSpawnTime = 0;
    lastIncomeGameTime = 0;

    // 清空游戏回放记录
    gameHistory = [];
    lastSnapshotTime = 0;

    // 关闭危急状态
    isCriticalState = false;
    // 隐藏游戏结束界面
    gameOverScreen.classList.remove('active');

    // 重置所有建筑按钮的选中状态
    document.querySelectorAll('.building-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 生成初始核心发电站（地图中心）
    sources.push({
        x: 0, y: 0, radius: 25, type: 'source', id: Math.random(),
        load: 0, heat: 0, capacity: CONFIG.plantCapacity,
        spawnScale: 0, displayLoad: 0, rotation: 0, variant: 'standard'
    });

    // 计算初始净收入
    currentNetIncome = CONFIG.baseSubsidy - (sources.length * CONFIG.upkeepPerPlant);
    // 生成第一栋房屋
    spawnEntity('house');
    // 更新电网状态和UI
    updatePowerGrid(true); updateUI();
    // 拍摄初始游戏快照
    takeSnapshot();
    // 显示系统重启成功提示（高优先级）
    setSystemMsg("系统已重启 - 点击建筑按钮放置", "success", true);
}