//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 建筑管理系统 ---

/**
 * 进入建筑放置模式
 * @param {string} type - 建筑类型(plant电厂/nuclear核电站/battery电池)
 * 功能：激活对应建筑按钮样式、设置当前放置模式、显示操作提示信息
 */
function enterPlacementMode(type) {
    // 设置当前放置模式为指定建筑类型
    placementMode = type;
    // 遍历所有建筑按钮，重置激活状态
    document.querySelectorAll('.building-btn').forEach(btn => {
        // 匹配当前类型的按钮添加激活样式，其余按钮移除激活样式
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 根据建筑类型，定义建筑名称和建造成本
    let buildingName = '';
    let cost = 0;
    if (type === 'plant') { 
        buildingName = '电厂'; 
        cost = CONFIG.costPlant; 
    }
    else if (type === 'nuclear') { 
        buildingName = '核电站'; 
        cost = CONFIG.costNuclear; 
    }
    else if (type === 'battery') { 
        buildingName = '电池'; 
        cost = CONFIG.costBattery; 
    }

    // 显示系统提示：左键放置，右键取消
    setSystemMsg(`放置${buildingName}模式 - 左键确认，右键取消`, "highlight");
    // 显示辅助提示：建筑名称+建造价格
    showHelpTip(`点击地图放置${buildingName} ($${cost})`);
}

/**
 * 退出建筑放置模式
 * 功能：重置放置模式、清除按钮激活状态、恢复默认操作提示
 */
function exitPlacementMode() {
    // 清空当前放置模式
    placementMode = null;
    // 移除所有建筑按钮的激活样式
    document.querySelectorAll('.building-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // 清空系统提示信息
    clearSystemMsg();
    // 显示默认提示：切换回电线模式
    showHelpTip("已切换到电线模式");
}

/**
 * 初始化建筑按钮点击事件
 * 功能：为所有建筑按钮绑定触屏/点击事件，触发对应建筑放置模式
 */
function setupBuildingButtons() {
    // 获取所有建筑按钮元素
    const buildingBtns = document.querySelectorAll('.building-btn');

    // 为每个按钮绑定触屏开始事件（兼容移动端）
    buildingBtns.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            // 阻止触屏默认行为
            e.preventDefault();
            // 获取按钮绑定的建筑类型
            const type = btn.getAttribute('data-type');
            // 进入对应建筑的放置模式
            enterPlacementMode(type);
        });
    });
}

/**
 * 在地图指定位置放置建筑
 * @param {number} worldX - 世界坐标X
 * @param {number} worldY - 世界坐标Y
 * @param {string} type - 建筑类型
 * 功能：校验位置合法性→校验资金→扣除资金→生成建筑→播放特效→更新电网
 */
function placeBuildingAt(worldX, worldY, type) {
    // 第一步：判断目标位置是否可用（60为碰撞检测半径）
    if (!isPositionClear(worldX, worldY, 60)) {
        // 位置无效：播放红色冲击波特效
        createShockwave(worldX, worldY, '#ff3333');
        // 显示警告提示
        setSystemMsg("位置无效", "warning", true);
        return;
    }

    // 根据建筑类型获取建造成本
    let cost = 0;
    if (type === 'plant') cost = CONFIG.costPlant;
    else if (type === 'nuclear') cost = CONFIG.costNuclear;
    else if (type === 'battery') cost = CONFIG.costBattery;

    // 第二步：判断玩家资金是否足够建造
    if (money < cost) {
        // 资金不足：播放红色冲击波特效
        createShockwave(worldX, worldY, '#ff3333');
        // 显示警告提示
        setSystemMsg("资金不足", "warning", true);
        return;
    }

    // 资金充足：扣除对应建造成本
    money -= cost;

    // 第三步：生成对应类型的建筑实体
    // 放置 电厂 / 核电站
    if (type === 'plant' || type === 'nuclear') {
        const isNuc = type === 'nuclear';
        // 将发电建筑添加到电源数组
        sources.push({
            x: worldX, y: worldY,           // 坐标
            radius: 25, type: 'source', id: Math.random(), // 基础属性
            load: 0, heat: 0,               // 负载、热量
            capacity: isNuc ? CONFIG.nuclearCapacity : CONFIG.plantCapacity, // 发电量
            spawnScale: 0, displayLoad: 0, rotation: 0, // 动画、显示、旋转参数
            variant: isNuc ? 'nuclear' : 'standard'     // 外观类型
        });
        // 显示建造成功提示
        setSystemMsg(`${isNuc ? '核电站' : '电厂'}已建造 (-$${cost})`, "success", true);
        // 播放建造成功爆炸特效
        createExplosion(worldX, worldY, isNuc ? '#00ff66' : '#fff', 20);
    } 
    // 放置 电池储能设备
    else if (type === 'battery') {
        // 将电池添加到电池数组
        batteries.push({
            x: worldX, y: worldY,               // 坐标
            type: 'battery', id: Math.random(), // 基础属性
            energy: 0, maxEnergy: CONFIG.batteryCapacity, // 当前电量、最大容量
            spawnScale: 0, powered: false, currentOp: 'idle', // 动画、供电、状态
            targetLoad: 0
        });
        // 显示建造成功提示
        setSystemMsg(`电池已建造 (-$${cost})`, "success", true);
        // 播放建造成功爆炸特效
        createExplosion(worldX, worldY, '#00ff00', 15);
    }

    // 建筑放置完成：更新整个电网系统
    updatePowerGrid();

    // 若仍处于放置模式，延迟100ms刷新提示，支持连续放置
    if (placementMode) {
        setTimeout(() => {
            if (placementMode) {
                let buildingName = '';
                if (placementMode === 'plant') buildingName = '电厂';
                else if (placementMode === 'nuclear') buildingName = '核电站';
                else if (placementMode === 'battery') buildingName = '电池';
                setSystemMsg(`继续放置${buildingName} - 右键退出`, "highlight");
            }
        }, 100);
    }
}

/**
 * 随机生成地图实体（居民楼/工厂/商业区）
 * @param {string|null} forcedType - 强制指定生成类型，为空则默认生成居民楼
 * 功能：随机寻找合法位置→生成对应实体→添加到游戏数组→播放提示与特效
 */
function spawnEntity(forcedType = null) {
    let attempts = 0;                // 生成位置尝试次数
    const maxAttempts = 100;         // 最大尝试次数
    let currentMinDist = CONFIG.minEntityDist + 10; // 实体最小间距（初始值）
    let x, y;                        // 实体坐标
    // 计算当前视野范围内的世界尺寸
    const worldViewW = width / currentScale;
    const worldViewH = height / currentScale;

    // 循环寻找合法生成位置
    do {
        attempts++;
        // 尝试超过50次仍未找到，降低间距要求，提高生成成功率
        if (attempts > 50) currentMinDist = CONFIG.minEntityDist * 0.7;
        // 随机生成视野内的坐标
        x = (Math.random() - 0.5) * worldViewW;
        y = (Math.random() - 0.5) * worldViewH;
        // 位置不满足间距要求，重新生成
        if (!isPositionClear(x, y, currentMinDist)) continue;
        // 距离中心过近，重新生成
        if (Math.hypot(x, y) < 150) continue;
        
        // 检测是否与电线碰撞
        let hitWire = false;
        for (let l of links) {
            if (distToSegment({x, y}, l.from, l.to) < 20) { 
                hitWire = true; 
                break; 
            }
        }
        // 与电线重叠，重新生成
        if (hitWire) continue;
        // 找到合法位置，退出循环
        break;
    } while (attempts < maxAttempts);

    // 达到最大尝试次数仍未找到位置，终止生成
    if (attempts >= maxAttempts) return;

    // 确定实体类型：优先使用强制类型，默认居民楼
    let type = forcedType || 'house';

    // 将生成的实体添加到房屋数组（统一管理渲染与逻辑）
    houses.push({
        x: x, y: y,                       // 坐标
        type: type,                        // 类型
        powered: false,                    // 是否通电
        patience: CONFIG.houseMaxPatience, // 耐心值（断电后计时）
        id: Math.random(),                 // 唯一ID
        spawnScale: 0,                     // 生成动画缩放
        load: type === 'factory' ? CONFIG.factoryLoad : 1, // 基础耗电量
        currentLoad: type === 'commercial' ? CONFIG.commBaseLoad : 1, // 当前耗电量
        phase: Math.random() * Math.PI * 2 // 动画相位（随机旋转/呼吸效果）
    });

    // 根据实体类型显示不同提示与特效
    if (type === 'factory') {
        setSystemMsg("警告: 检测到工业区", "warning", true);
        createShockwave(x, y, CONFIG.colors.factory);
    } else if (type === 'commercial') {
        setSystemMsg("新商业区", "normal", true);
        createShockwave(x, y, CONFIG.colors.comm);
    }

    // 累计实体生成总数
    totalSpawns++;
}