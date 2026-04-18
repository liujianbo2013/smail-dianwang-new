//此文件已添加详细的中文注释，编辑时请注意添加注释！
// --- 游戏常量与配置 ---
const CONFIG = {
    // ==================== 基础经济与人口配置 ====================
    // 初始资金
    initialMoney: 200,
    // 基础补贴（无电力时的低保收入）
    baseSubsidy: 25,
    // 单个居民房每秒产生的收益
    incomePerHouse: 1,

    // ==================== 工厂建筑配置（固定刷新间隔） ====================
    // 解锁工厂所需的人口数量
    factoryUnlockPop: 30,
    // 工厂自动刷新间隔（毫秒）= 1分30秒
    factorySpawnRate: 90000,
    // 单个工厂的基础电力负载
    factoryLoad: 5,
    // 单个工厂每秒产生的收益
    incomePerFactory: 8,

    // ==================== 商业建筑配置（固定刷新间隔） ====================
    // 解锁商业建筑所需的人口数量
    commUnlockPop: 60,
    // 商业建筑自动刷新间隔（毫秒）= 45秒（工厂间隔的一半）
    commSpawnRate: 45000,
    // 商业建筑基础电力负载
    commBaseLoad: 2,
    // 商业建筑峰值电力负载（用电高峰期）
    commPeakLoad: 3,
    // 单个商业建筑每秒产生的收益
    incomePerComm: 5,

    // ==================== 电池系统配置 ====================
    // 购买电池的价格
    costBattery: 800,
    // 电池最大储电量
    batteryCapacity: 500,
    // 电池充电速率（单位/秒）
    batteryChargeRate: 4.0,
    // 电池放电速率（单位/秒）
    batteryDischargeRate: 6.0,

    // ==================== 发电厂维护与经济刷新 ====================
    // 单个火力发电厂每秒维护费用
    upkeepPerPlant: 10,
    // 经济系统刷新间隔（毫秒）= 1秒
    economyTickRate: 1000,
    // 建筑拆除退款比例（10%）
    refundRate: 0.1,

    // ==================== 电力设施建造价格 ====================
    // 单个电线杆建造价格
    costPylon: 10,
    // 火力发电厂建造价格
    costPlant: 1500,

    // ==================== 核电站配置 ====================
    // 核电站建造价格
    costNuclear: 6000,
    // 核电站电力输出容量
    nuclearCapacity: 60,
    // 核电站每秒维护费用
    nuclearUpkeep: 50,

    // ==================== 电线系统配置 ====================
    // 电线每单位长度造价
    costWirePerUnit: 0.1,
    // 电线升级价格倍率（升级费用=基础价×该值）
    costUpgradeMult: 6.0,
    // 基础电线承载负载上限
    baseWireLoad: 5,
    // 升级后电线承载负载上限
    upgradedWireLoad: 15,

    // ==================== 建造与物理限制 ====================
    // 电线最大允许长度
    maxWireLength: 300,
    // 建筑自动吸附对齐距离
    snapDistance: 40,
    // 建筑之间最小间距（防止重叠）
    minEntityDist: 60,

    // ==================== 火力发电厂运行参数 ====================
    // 火力发电厂电力输出容量
    plantCapacity: 15,
    // 发电厂过热速度（负载过高时升温速率）
    overheatSpeed: 0.05,
    // 发电厂最大热量（超过则过载停机）
    maxHeat: 100,

    // ==================== 镜头与视图控制 ====================
    // 游戏初始镜头缩放比例
    initialScale: 1.2,
    // 镜头最小缩放限制
    minScale: 0.1,
    // 镜头最大缩放限制
    maxScale: 3.0,
    // 视野自动扩展速度
    viewExpansionRate: 0.003,

    // ==================== 居民建筑刷新配置 ====================
    // 居民房初始自动刷新间隔（毫秒）
    spawnRate: 8000,
    // 居民房最大耐心值（断电后等待供电的时间）
    houseMaxPatience: 3500,
    // 最大愤怒房屋数量（硬核模式：超过1个直接游戏失败）
    maxAngryHouses: 1,

    // ==================== 游戏UI颜色配置 ====================
    colors: {
        // 主背景色
        bg: '#020205',
        // 网格线颜色
        grid: '#0d0d1a',
        // 电力连通高亮色
        powerOn: '#00ffff',
        // 电力断开颜色
        powerOff: '#333344',
        // 发电厂标识色
        powerSource: '#ffffff',
        // 核电站标识色
        nuclearSource: '#00ff66',
        // 居民房愤怒（断电超时）颜色
        houseAngry: '#ff2a2a',
        // 居民房正常供电颜色
        houseHappy: '#00ffaa',
        // 居民房未通电颜色
        houseOff: '#004433',

        // 工厂基础颜色
        factory: '#ff8800',
        // 工厂正常供电颜色
        factoryHappy: '#ffe600',
        // 工厂未通电颜色
        factoryOff: '#442200',

        // 商业建筑基础颜色
        comm: '#0088ff',
        // 商业建筑正常供电颜色
        commHappy: '#00ccff',
        // 商业建筑未通电颜色
        commOff: '#002244',

        // 电池基础颜色
        battery: '#00ff00',
        // 电池放电状态颜色
        batteryDraining: '#ffaa00',
        // 基础电线颜色
        wire: '#1a1a26',
        // 升级电线颜色
        wireUpgraded: '#d000ff',
        // 升级电线发光效果
        wireUpgradedGlow: '#e055ff',
        // 电线过载警告色
        wireOverload: '#ffaa00',
        // 电线危险（即将熔断）色
        wireDanger: '#ff0000',
        // 拖拽电线时有效路线颜色
        dragLineValid: '#00ffff',
        // 拖拽电线时无效路线颜色
        dragLineInvalid: '#ff3333',
        // 删除模式高亮颜色
        deleteHighlight: '#ff3333',
        // 升级模式高亮颜色
        upgradeHighlight: '#d000ff',
        // 核电站高亮颜色
        nuclearHighlight: '#00ff66',
        // 发电厂过载警告颜色
        plantOverload: '#ff0000',
        // 退款文字颜色
        refundText: '#00ff88'
    }
};