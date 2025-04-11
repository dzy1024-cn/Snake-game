// 获取Canvas和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏配置
const gridSize = 20;
const tileCountWidth = canvas.width / gridSize;
const tileCountHeight = canvas.height / gridSize;

// 游戏状态
let snake = [];
let direction = { x: 0, y: 0 };
let aiSnake = [];
let aiDirection = { x: 0, y: 0 };
let food = {};
let score = 0;
let gameInterval;
let aiGameInterval;
let difficulty = 'medium';
let gameRunning = false;
let gamePaused = false;
let waitingForInput = false;
let startTime;
let timerInterval;
let level = 1;
const levelThresholds = [20, 50, 100, 200, 300];
let hasShield = false;
let shieldActiveUntilNextFood = false;
let aiHasShield = false;
let aiSpeedBoost = false;
let aiEnabled = false; // AI蛇开关状态

// 新增元素
let portals = []; // 传送门
let bombs = []; // 炸弹
let obstacles = []; // 障碍物
let rainbowFoodCount = 0; // 彩虹食物计数
let bombDodgeCount = 0; // 炸弹躲避计数

// 难度级别设置
const difficultyLevels = {
    easy: 200,
    medium: 100,
    hard: 50
};

// 成就系统
const achievements = {
    firstEat: false,
    score10: false,
    score50: false,
    score100: false,
    timeSurvived30: false,
    timeSurvived60: false,
    timeSurvived120: false,
    rainbowMaster: false, // 吃到10个彩虹食物
    bombDodger: false // 成功躲避10个炸弹
};

// 历史最高分
let highScore = localStorage.getItem('snakeGameHighScore') ? parseInt(localStorage.getItem('snakeGameHighScore')) : 0;

// 排行榜
let leaderboard = localStorage.getItem('snakeGameLeaderboard') ? JSON.parse(localStorage.getItem('snakeGameLeaderboard')) : [];

// 初始化游戏
function initGame() {
    // 初始化主角蛇
    snake = [{ x: tileCountWidth / 2, y: tileCountHeight / 2 }];
    direction = { x: 0, y: 0 };
    
    // 根据开关状态初始化AI蛇
    if (aiEnabled) {
        initAISnake();
    }
    
    // 初始化传送门
    portals = generatePortals();
    
    // 初始化炸弹
    bombs = generateBombs();
    
    // 初始化障碍物
    obstacles = generateObstacles();
    
    food = generateFood();
    score = 0;
    gameRunning = true;
    gamePaused = false;
    waitingForInput = true;
    level = 1;
    hasShield = false;
    shieldActiveUntilNextFood = false;
    aiHasShield = false;
    aiSpeedBoost = false;
    rainbowFoodCount = 0;
    bombDodgeCount = 0;

    document.getElementById('score').innerText = score;
    document.getElementById('timer').innerText = '0';
    document.getElementById('level').innerText = level;
    document.getElementById('highScore').innerText = highScore;

    // 清除之前的定时器
    if (gameInterval) clearInterval(gameInterval);
    if (aiGameInterval) clearInterval(aiGameInterval);
    if (timerInterval) clearInterval(timerInterval);

    startTime = Date.now();

    // 显示游戏界面
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';

    // 等待玩家输入方向键
    document.getElementById('pause').innerText = '暂停';

    // 启动游戏循环
    gameInterval = setInterval(gameLoop, difficultyLevels[difficulty]);
    
    // 如果AI蛇启用，启动AI蛇的独立游戏循环
    if (aiEnabled) {
        aiGameInterval = setInterval(aiGameLoop, difficultyLevels[difficulty] + 50);
    }
}

// 初始化AI蛇
function initAISnake() {
    aiSnake = [{ x: tileCountWidth / 2 + 3, y: tileCountHeight / 2 + 3 }];
    aiDirection = { x: 0, y: 0 };
}

// 生成传送门
function generatePortals() {
    const portal1 = {
        x: Math.floor(Math.random() * tileCountWidth),
        y: Math.floor(Math.random() * tileCountHeight)
    };
    const portal2 = {
        x: Math.floor(Math.random() * tileCountWidth),
        y: Math.floor(Math.random() * tileCountHeight)
    };
    return [portal1, portal2];
}

// 生成炸弹
function generateBombs() {
    const bombCount = 5; // 初始炸弹数量
    const bombs = [];
    for (let i = 0; i < bombCount; i++) {
        let validPosition = false;
        let bomb;
        while (!validPosition) {
            bomb = {
                x: Math.floor(Math.random() * tileCountWidth),
                y: Math.floor(Math.random() * tileCountHeight),
                active: true
            };
            validPosition = true;
            // 检查炸弹是否生成在蛇或AI蛇身上
            if (snake.some(segment => segment.x === bomb.x && segment.y === bomb.y) ||
                (aiEnabled && aiSnake.some(segment => segment.x === bomb.x && segment.y === bomb.y))) {
                validPosition = false;
            }
        }
        bombs.push(bomb);
    }
    return bombs;
}

// 生成障碍物
function generateObstacles() {
    const obstacleCount = 10; // 初始障碍物数量
    const obstacles = [];
    for (let i = 0; i < obstacleCount; i++) {
        let validPosition = false;
        let obstacle;
        while (!validPosition) {
            obstacle = {
                x: Math.floor(Math.random() * tileCountWidth),
                y: Math.floor(Math.random() * tileCountHeight)
            };
            validPosition = true;
            // 检查障碍物是否生成在蛇或AI蛇身上
            if (snake.some(segment => segment.x === obstacle.x && segment.y === obstacle.y) ||
                (aiEnabled && aiSnake.some(segment => segment.x === obstacle.x && segment.y === obstacle.y))) {
                validPosition = false;
            }
        }
        obstacles.push(obstacle);
    }
    return obstacles;
}

// 生成食物
function generateFood() {
    let newFood;
    let overlapping;

    do {
        overlapping = false;
        newFood = {
            x: Math.floor(Math.random() * tileCountWidth),
            y: Math.floor(Math.random() * tileCountHeight)
        };

        // 检查食物是否生成在蛇或AI蛇身上
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                overlapping = true;
                break;
            }
        }
        
        if (aiEnabled) {
            for (let segment of aiSnake) {
                if (segment.x === newFood.x && segment.y === newFood.y) {
                    overlapping = true;
                    break;
                }
            }
        }
        
        // 检查食物是否生成在障碍物上
        for (let obstacle of obstacles) {
            if (obstacle.x === newFood.x && obstacle.y === newFood.y) {
                overlapping = true;
                break;
            }
        }
        
        // 检查食物是否生成在传送门上
        for (let portal of portals) {
            if (portal.x === newFood.x && portal.y === newFood.y) {
                overlapping = true;
                break;
            }
        }
        
        // 检查食物是否生成在炸弹上
        for (let bomb of bombs) {
            if (bomb.x === newFood.x && bomb.y === newFood.y && bomb.active) {
                overlapping = true;
                break;
            }
        }
        
        // 检查食物是否生成在蛇头附近
        const head = snake[0];
        if (Math.abs(newFood.x - head.x) <= 1 && Math.abs(newFood.y - head.y) <= 1) {
            overlapping = true;
        }
    } while (overlapping);

    // 有一定概率生成特殊食物
    if (Math.random() < 0.1) {
        newFood.type = 'speed';
    } else if (Math.random() < 0.15) {
        newFood.type = 'long';
    } else if (Math.random() < 0.2) {
        newFood.type = 'shield';
    } else if (Math.random() < 0.05) {
        newFood.type = 'poison'; // 毒药食物
    } else if (Math.random() < 0.05) {
        newFood.type = 'rainbow'; // 彩虹食物
    } else {
        newFood.type = 'normal';
    }

    return newFood;
}

// 游戏主循环
function gameLoop() {
    if (!gamePaused) {
        update();
        draw();
    }
}

// AI蛇的独立游戏循环
function aiGameLoop() {
    if (!gamePaused && aiEnabled) {
        updateAISnake();
    }
}

// 更新游戏状态
function update() {
    if (waitingForInput) {
        if (direction.x !== 0 || direction.y !== 0) {
            waitingForInput = false;
            startTime = Date.now() - (Date.now() - startTime);
        } else {
            return;
        }
    }

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    let deathReason = '';
    let gameOver = false;

    // 检查碰撞 - 主角蛇撞墙
    if (head.x < 0 || head.x >= tileCountWidth || head.y < 0 || head.y >= tileCountHeight) {
        deathReason = '你撞到了墙壁!';
        gameOver = true;
    } 
    // 检查碰撞 - 主角蛇撞到自己
    else if (snake.some((segment, index) => index !== 0 && segment.x === head.x && segment.y === head.y)) {
        deathReason = '你撞到了自己!';
        gameOver = true;
    }
    // 检查碰撞 - 主角蛇撞到AI蛇
    else if (aiEnabled && aiSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        if (!hasShield && !shieldActiveUntilNextFood) {
            deathReason = '你撞到了AI蛇!';
            gameOver = true;
        } else {
            // 护盾生效，穿墙
            if (head.x < 0) head.x = tileCountWidth - 1;
            else if (head.x >= tileCountWidth) head.x = 0;
            if (head.y < 0) head.y = tileCountHeight - 1;
            else if (head.y >= tileCountHeight) head.y = 0;
        }
    }
    // 检查碰撞 - 主角蛇撞到炸弹
    else if (bombs.some(bomb => bomb.x === head.x && bomb.y === head.y && bomb.active)) {
        if (!hasShield && !shieldActiveUntilNextFood) {
            deathReason = '你撞到了炸弹!';
            gameOver = true;
        } else {
            // 护盾生效，炸弹失效
            bombs.forEach(bomb => {
                if (bomb.x === head.x && bomb.y === head.y) {
                    bomb.active = false;
                    bombDodgeCount++;
                    if (bombDodgeCount >= 10 && !achievements.bombDodger) {
                        achievements.bombDodger = true;
                        showAchievement('炸弹躲避者！', '成功躲避10个炸弹！');
                    }
                }
            });
        }
    }
    // 检查碰撞 - 主角蛇撞到障碍物
    else if (obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y)) {
        deathReason = '你撞到了障碍物!';
        gameOver = true;
    }

    if (gameOver) {
        endGame(deathReason);
        return;
    }

    // 传送门逻辑
    if (portals.some(portal => portal.x === head.x && portal.y === head.y)) {
        const otherPortal = portals.find(p => p.x !== head.x || p.y !== head.y);
        head.x = otherPortal.x;
        head.y = otherPortal.y;
    }

    // 移动蛇
    snake.unshift(head);

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        // 检查是否需要取消护盾
        if (shieldActiveUntilNextFood) {
            shieldActiveUntilNextFood = false;
            showAchievement('护盾失效', '护盾效果已消失');
        }
        
        score++;
        document.getElementById('score').innerText = score;
        
        if (score >= levelThresholds[level - 1] && level < levelThresholds.length) {
            level++;
            difficultyLevels[difficulty] -= 10;
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, difficultyLevels[difficulty]);
            document.getElementById('level').innerText = level;
            showAchievement('恭喜！', `你已升级到第${level}关！游戏速度将加快！`);
        }
        
        if (food.type === 'speed') {
            showAchievement('速度提升！', '蛇的速度将加快一段时间');
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, difficultyLevels[difficulty] - 30);
            setTimeout(() => {
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, difficultyLevels[difficulty]);
            }, 10000);
        } else if (food.type === 'long') {
            for (let i = 0; i < 3; i++) {
                snake.push({ ...snake[snake.length - 1] });
            }
            showAchievement('长段食物！', '蛇将变长更多段');
        } else if (food.type === 'shield') {
            showAchievement('护盾激活！', '可以穿墙和穿过身体直到吃到下一个食物！');
            shieldActiveUntilNextFood = true;
        } else if (food.type === 'poison') {
            // 毒药食物：缩短蛇身
            if (snake.length > 1) {
                snake.pop();
                showAchievement('毒药食物！', '蛇缩短了一段！');
            }
        } else if (food.type === 'rainbow') {
            // 彩虹食物：随机效果
            const effects = ['speed', 'long', 'shield', 'poison'];
            const randomEffect = effects[Math.floor(Math.random() * effects.length)];
            
            if (randomEffect === 'speed') {
                showAchievement('彩虹食物 - 速度提升！', '蛇的速度将加快一段时间');
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, difficultyLevels[difficulty] - 30);
                setTimeout(() => {
                    clearInterval(gameInterval);
                    gameInterval = setInterval(gameLoop, difficultyLevels[difficulty]);
                }, 10000);
            } else if (randomEffect === 'long') {
                for (let i = 0; i < 3; i++) {
                    snake.push({ ...snake[snake.length - 1] });
                }
                showAchievement('彩虹食物 - 长段食物！', '蛇将变长更多段');
            } else if (randomEffect === 'shield') {
                showAchievement('彩虹食物 - 护盾激活！', '可以穿墙和穿过身体直到吃到下一个食物！');
                shieldActiveUntilNextFood = true;
            } else if (randomEffect === 'poison') {
                if (snake.length > 1) {
                    snake.pop();
                    showAchievement('彩虹食物 - 毒药效果！', '蛇缩短了一段！');
                }
            }
            
            rainbowFoodCount++;
            if (rainbowFoodCount >= 10 && !achievements.rainbowMaster) {
                achievements.rainbowMaster = true;
                showAchievement('彩虹大师！', '成功吃到10个彩虹食物！');
            }
        }
        
        food = generateFood();
        
        if (!achievements.firstEat && score > 0) {
            achievements.firstEat = true;
            showAchievement('初尝果实！', '吃下第一份食物！');
        }
        if (!achievements.score10 && score >= 10) {
            achievements.score10 = true;
            showAchievement('小有成就！', '得分达到10分！');
        }
        if (!achievements.score50 && score >= 50) {
            achievements.score50 = true;
            showAchievement('技艺高超！', '得分达到50分！');
        }
        if (!achievements.score100 && score >= 100) {
            achievements.score100 = true;
            showAchievement('贪吃大师！', '得分达到100分！');
        }
    } else {
        snake.pop();
    }

    updateTimer();
}

// AI蛇的移动逻辑
function updateAISnake() {
    if (!aiEnabled || aiSnake.length === 0) return;

    // 如果AI蛇还没有选择方向，随机选择一个
    if (aiDirection.x === 0 && aiDirection.y === 0) {
        const directions = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];
        aiDirection = directions[Math.floor(Math.random() * directions.length)];
    }

    // 计算AI蛇头部的新位置
    const aiHead = { x: aiSnake[0].x + aiDirection.x, y: aiSnake[0].y + aiDirection.y };

    // 检查AI蛇是否吃到食物
    if (aiHead.x === food.x && aiHead.y === food.y) {
        // 吃到食物，增加AI蛇的长度
        aiSnake.unshift(aiHead);
        // 应用食物效果
        applyFoodEffectToAI();
        food = generateFood(); // 生成新食物
    } else {
        // 没吃到食物，正常移动
        aiSnake.unshift(aiHead);
        aiSnake.pop();
    }

    // 简单的AI逻辑：优先朝食物方向移动，但有一定概率随机移动
    const foodXDiff = food.x - aiSnake[0].x;
    const foodYDiff = food.y - aiSnake[0].y;

    // 有一定概率随机改变方向
    if (Math.random() < 0.3) {
        const directions = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];
        aiDirection = directions[Math.floor(Math.random() * directions.length)];
    } else {
        if (Math.abs(foodXDiff) > Math.abs(foodYDiff)) {
            aiDirection = foodXDiff > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        } else {
            aiDirection = foodYDiff > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
        }
    }

    // 避免撞墙
    if (aiHead.x < 0 || aiHead.x >= tileCountWidth || aiHead.y < 0 || aiHead.y >= tileCountHeight) {
        aiDirection = { x: Math.random() > 0.5 ? 1 : -1, y: Math.random() > 0.5 ? 1 : -1 };
    }

    // 避免撞到主角蛇
    if (snake.some(segment => segment.x === aiHead.x && segment.y === aiHead.y)) {
        aiDirection = { x: Math.random() > 0.5 ? 1 : -1, y: Math.random() > 0.5 ? 1 : -1 };
    }

    // 避免撞到障碍物
    if (obstacles.some(obstacle => obstacle.x === aiHead.x && obstacle.y === aiHead.y)) {
        aiDirection = { x: Math.random() > 0.5 ? 1 : -1, y: Math.random() > 0.5 ? 1 : -1 };
    }

    // 避免撞到炸弹
    if (bombs.some(bomb => bomb.x === aiHead.x && bomb.y === aiHead.y && bomb.active)) {
        aiDirection = { x: Math.random() > 0.5 ? 1 : -1, y: Math.random() > 0.5 ? 1 : -1 };
    }
}

// 应用食物效果到AI蛇
function applyFoodEffectToAI() {
    if (food.type === 'speed') {
        // AI蛇速度提升
        aiSpeedBoost = true;
        clearInterval(aiGameInterval);
        aiGameInterval = setInterval(aiGameLoop, difficultyLevels[difficulty] - 30);
        setTimeout(() => {
            aiSpeedBoost = false;
            clearInterval(aiGameInterval);
            aiGameInterval = setInterval(aiGameLoop, difficultyLevels[difficulty] + 50);
        }, 10000);
    } else if (food.type === 'long') {
        // AI蛇变长
        for (let i = 0; i < 3; i++) {
            aiSnake.push({ ...aiSnake[aiSnake.length - 1] });
        }
    } else if (food.type === 'shield') {
        // AI蛇获得护盾
        aiHasShield = true;
        setTimeout(() => {
            aiHasShield = false;
        }, 10000);
    } else if (food.type === 'poison') {
        // AI蛇缩短
        if (aiSnake.length > 1) {
            aiSnake.pop();
        }
    } else if (food.type === 'rainbow') {
        // AI蛇随机效果
        const effects = ['speed', 'long', 'shield', 'poison'];
        const randomEffect = effects[Math.floor(Math.random() * effects.length)];
        
        if (randomEffect === 'speed') {
            aiSpeedBoost = true;
            clearInterval(aiGameInterval);
            aiGameInterval = setInterval(aiGameLoop, difficultyLevels[difficulty] - 30);
            setTimeout(() => {
                aiSpeedBoost = false;
                clearInterval(aiGameInterval);
                aiGameInterval = setInterval(aiGameLoop, difficultyLevels[difficulty] + 50);
            }, 10000);
        } else if (randomEffect === 'long') {
            for (let i = 0; i < 3; i++) {
                aiSnake.push({ ...aiSnake[aiSnake.length - 1] });
            }
        } else if (randomEffect === 'shield') {
            aiHasShield = true;
            setTimeout(() => {
                aiHasShield = false;
            }, 10000);
        } else if (randomEffect === 'poison') {
            if (aiSnake.length > 1) {
                aiSnake.pop();
            }
        }
    }
}

// 绘制游戏画面
function draw() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景网格
    ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#222' : '#f5f7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格线
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#444' : '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < tileCountHeight; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    for (let i = 0; i < tileCountWidth; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
    }

    // 绘制障碍物
    ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#888' : '#555';
    obstacles.forEach(obstacle => {
        ctx.beginPath();
        ctx.rect(
            obstacle.x * gridSize,
            obstacle.y * gridSize,
            gridSize,
            gridSize
        );
        ctx.fill();
    });

    // 绘制传送门
    ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#74b9ff' : '#0984e3';
    portals.forEach(portal => {
        ctx.beginPath();
        ctx.arc(
            portal.x * gridSize + gridSize/2,
            portal.y * gridSize + gridSize/2,
            gridSize/2 - 1,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // 传送门光效
        ctx.save();
        ctx.strokeStyle = 'rgba(13, 171, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
            portal.x * gridSize + gridSize/2,
            portal.y * gridSize + gridSize/2,
            gridSize/2 + 3,
            0,
            Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
    });

    // 绘制炸弹
    bombs.forEach(bomb => {
        if (bomb.active) {
            ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#ff4757' : '#ff6b6b';
            ctx.beginPath();
            ctx.arc(
                bomb.x * gridSize + gridSize/2,
                bomb.y * gridSize + gridSize/2,
                gridSize/2 - 1,
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // 炸弹引线
            ctx.strokeStyle = '#ffeb3b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bomb.x * gridSize + gridSize/2, bomb.y * gridSize + gridSize/4);
            ctx.lineTo(bomb.x * gridSize + gridSize/2, bomb.y * gridSize + gridSize/2);
            ctx.stroke();
        }
    });

    // 绘制AI蛇
    if (aiEnabled) {
        const aiSnakeColor = document.body.classList.contains('dark-mode') ? '#ff6b6b' : '#ff9f43';
        aiSnake.forEach((segment, index) => {
            if (index === 0) {
                // AI蛇头
                ctx.fillStyle = aiSnakeColor;
                ctx.beginPath();
                ctx.arc(
                    segment.x * gridSize + gridSize/2,
                    segment.y * gridSize + gridSize/2,
                    gridSize/2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();

                // AI蛇眼
                ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#ffffff' : '#20232a';
                ctx.beginPath();
                ctx.arc(
                    segment.x * gridSize + gridSize/3,
                    segment.y * gridSize + gridSize/3,
                    2,
                    0,
                    Math.PI * 2
                );
                ctx.arc(
                    segment.x * gridSize + gridSize*2/3,
                    segment.y * gridSize + gridSize/3,
                    2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            } else {
                // AI蛇身
                ctx.fillStyle = aiSnakeColor;
                ctx.beginPath();
                ctx.arc(
                    segment.x * gridSize + gridSize/2,
                    segment.y * gridSize + gridSize/2,
                    gridSize/2 - 1,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }

            // 护盾特效
            if (aiHasShield) {
                ctx.save();
                ctx.strokeStyle = '#4ecdc4';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(
                    segment.x * gridSize + gridSize/2,
                    segment.y * gridSize + gridSize/2,
                    gridSize/2 + 3,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    // 绘制主角蛇
    const snakeColor = document.body.classList.contains('dark-mode') ? '#ffffff' : '#4ecdc4';
    const snakeHeadColor = '#ff6b6b';
    const snakeEyeColor = document.body.classList.contains('dark-mode') ? '#000000' : '#ffffff';

    snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头
            ctx.fillStyle = snakeHeadColor;
            ctx.beginPath();
            ctx.arc(
                segment.x * gridSize + gridSize/2,
                segment.y * gridSize + gridSize/2,
                gridSize/2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // 蛇眼
            ctx.fillStyle = snakeEyeColor;
            ctx.beginPath();
            ctx.arc(
                segment.x * gridSize + gridSize/3,
                segment.y * gridSize + gridSize/3,
                2,
                0,
                Math.PI * 2
            );
            ctx.arc(
                segment.x * gridSize + gridSize*2/3,
                segment.y * gridSize + gridSize/3,
                2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            // 蛇身
            ctx.fillStyle = snakeColor;
            ctx.beginPath();
            ctx.arc(
                segment.x * gridSize + gridSize/2,
                segment.y * gridSize + gridSize/2,
                gridSize/2 - 1,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // 护盾特效
        if (shieldActiveUntilNextFood) {
            ctx.save();
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(
                segment.x * gridSize + gridSize/2,
                segment.y * gridSize + gridSize/2,
                gridSize/2 + 3,
                0,
                Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();
        }
    });

    // 绘制食物
    const drawFoodWithEffect = () => {
        // 加速食物
        if (food.type === 'speed') {
            // 闪电脉冲背景
            ctx.save();
            ctx.fillStyle = 'rgba(255, 235, 59, 0.2)';
            ctx.beginPath();
            ctx.arc(
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2,
                gridSize/2 + Math.sin(Date.now()/150)*5,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.restore();

            // 食物本体
            ctx.fillStyle = '#ff9f43';
            ctx.beginPath();
            ctx.arc(
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2,
                gridSize/2 - 2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // 闪电图标
            ctx.save();
            ctx.translate(
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2
            );
            ctx.rotate(Math.sin(Date.now()/300) * 0.2);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', 0, 0);
            ctx.restore();
        } 
        // 长段食物
        else if (food.type === 'long') {
            // 脉动效果
            const pulse = Math.sin(Date.now()/200) * 2;
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2,
                gridSize/2 - 2 + pulse,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // 伸长图标
            ctx.save();
            ctx.translate(
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2
            );
            ctx.scale(1 + pulse/10, 1);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↔', 0, 0);
            ctx.restore();
        }
        // 护盾食物
        else if (food.type === 'shield') {
            // 多层护盾效果
            ctx.save();
            for (let i = 0; i < 3; i++) {
                ctx.strokeStyle = `rgba(78, 205, 196, ${0.7 - i*0.2})`;
                ctx.lineWidth = 2 - i*0.5;
                ctx.beginPath();
                ctx.arc(
                    food.x * gridSize + gridSize/2,
                    food.y * gridSize + gridSize/2,
                    gridSize/2 - 2 + Math.sin(Date.now()/300 + i)*5,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
            }
            ctx.restore();

            // 食物本体
            ctx.fillStyle = '#4ecdc4';
            ctx.beginPath();
            ctx.arc(
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2,
                gridSize/2 - 3,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // 护盾图标
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛡️', 
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2
            );
        }
        // 毒药食物
        else if (food.type === 'poison') {
            // 毒药效果
            ctx.save();
            ctx.fillStyle = '#00b894';
            ctx.beginPath();
            ctx.arc(
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2,
                gridSize/2 - 2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // 毒药图标
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☠', 
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2
            );
            ctx.restore();
        }
        // 彩虹食物
        else if (food.type === 'rainbow') {
            // 彩虹效果
            ctx.save();
            ctx.fillStyle = 'rgba(124, 58, 183, 0.7)';
            ctx.beginPath();
            ctx.arc(
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2,
                gridSize/2 - 2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // 彩虹图标
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌈', 
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2
            );
            ctx.restore();
        }
        // 普通食物
        else {
            // 旋转光点
            ctx.save();
            ctx.translate(
                food.x * gridSize + gridSize/2,
                food.y * gridSize + gridSize/2
            );
            ctx.rotate(Date.now()/500);
            
            // 食物本体
            ctx.fillStyle = '#ff9f43';
            ctx.beginPath();
            ctx.arc(0, 0, gridSize/2 - 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 光点
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            for (let i = 0; i < 3; i++) {
                ctx.rotate(Math.PI*2/3);
                ctx.beginPath();
                ctx.arc(6, 0, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    };

    drawFoodWithEffect();
}

// 结束游戏
function endGame(reason) {
    clearInterval(gameInterval);
    if (aiEnabled) {
        clearInterval(aiGameInterval);
    }
    gameRunning = false;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeGameHighScore', highScore);
        document.getElementById('highScore').innerText = highScore;
    }

    const playerName = prompt('恭喜！你获得了进入排行榜的资格！请输入你的名字：', '匿名玩家');
    if (playerName !== null) {
        updateLeaderboard(score, playerName);
    }

    if (confirm('游戏结束！是否重新开始？')) {
        initGame();
    } else {
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'flex';
    }
}

// 更新计时器
function updateTimer() {
    if (!gamePaused) {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('timer').innerText = elapsedSeconds;

        if (!achievements.timeSurvived30 && elapsedSeconds >= 30) {
            achievements.timeSurvived30 = true;
            showAchievement('坚持就是胜利！', '存活时间达到30秒！');
        }
        if (!achievements.timeSurvived60 && elapsedSeconds >= 60) {
            achievements.timeSurvived60 = true;
            showAchievement('顽强生存！', '存活时间达到60秒！');
        }
        if (!achievements.timeSurvived120 && elapsedSeconds >= 120) {
            achievements.timeSurvived120 = true;
            showAchievement('生存专家！', '存活时间达到120秒！');
        }
    }
}

// 显示难度提示
function showDifficultyHint(difficulty) {
    let hintMessage;
    switch(difficulty) {
        case 'easy':
            hintMessage = '难度已更改为: 简单\n移动速度较慢，适合新手玩家';
            break;
        case 'medium':
            hintMessage = '难度已更改为: 中等\n移动速度适中，挑战性适中';
            break;
        case 'hard':
            hintMessage = '难度已更改为: 困难\n移动速度很快，需要高超的技巧';
            break;
    }
    alert(hintMessage);
}

// 更新排行榜
function updateLeaderboard(score, name = '匿名玩家') {
    leaderboard.push({ score, name, date: new Date().toISOString() });
    leaderboard.sort((a, b) => b.score - a.score);
    if (leaderboard.length > 10) {
        leaderboard.length = 10;
    }
    localStorage.setItem('snakeGameLeaderboard', JSON.stringify(leaderboard));
}

// 显示成就提示
function showAchievement(title, description) {
    const toast = document.getElementById('achievementToast');
    const icon = toast.querySelector('.achievement-icon');
    const titleElement = toast.querySelector('.achievement-title');
    const descriptionElement = toast.querySelector('.achievement-description');
    
    const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
    icon.style.backgroundColor = randomColor;
    
    titleElement.innerText = title;
    descriptionElement.innerText = description;
    
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 5000);
}

// 更新时间显示
function updateTimeDisplay() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecond: 3
    });
    document.getElementById('currentTime').textContent = timeString;
}

// 更新主题按钮文本
function updateThemeText() {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.innerText = document.body.classList.contains('dark-mode') 
        ? '切换为浅色模式' 
        : '切换为深色模式';
}

// 暂停功能
function togglePause() {
    gamePaused = !gamePaused;
    document.getElementById('pause').innerText = gamePaused ? '继续' : '暂停';
    
    if (gamePaused) {
        document.getElementById('pauseOverlay').style.display = 'flex';
    } else {
        document.getElementById('pauseOverlay').style.display = 'none';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 加载保存的主题
    const savedTheme = localStorage.getItem('themePreference');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeText();

    // 更新时间显示
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);

    // 启动画面
    document.getElementById('splashScreen').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('splashScreen').classList.add('fadeOut');
        setTimeout(() => {
            document.getElementById('splashScreen').style.display = 'none';
        }, 500);
    }, 2000);
});

// 事件监听
document.getElementById('startBtn').addEventListener('click', initGame);

document.querySelectorAll('.difficulty-btn').forEach(button => {
    button.addEventListener('click', () => {
        difficulty = button.getAttribute('data-difficulty');
        showDifficultyHint(difficulty);
    });
});

document.getElementById('pause').addEventListener('click', togglePause);

// AI蛇开关
document.getElementById('aiToggle').addEventListener('change', (e) => {
    aiEnabled = e.target.checked;
});

// 键盘控制
document.addEventListener('keydown', e => {
    if (!gameRunning) return;

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
            if (direction.y !== 1) direction = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 's':
            if (direction.y !== -1) direction = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
        case 'a':
            if (direction.x !== 1) direction = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'd':
            if (direction.x !== -1) direction = { x: 1, y: 0 };
            break;
        case ' ':
            e.preventDefault();
            togglePause();
            break;
    }
});

// 方向按键控制
document.getElementById('upBtn').addEventListener('click', () => {
    if (direction.y !== 1) direction = { x: 0, y: -1 };
});

document.getElementById('downBtn').addEventListener('click', () => {
    if (direction.y !== -1) direction = { x: 0, y: 1 };
});

document.getElementById('leftBtn').addEventListener('click', () => {
    if (direction.x !== 1) direction = { x: -1, y: 0 };
});

document.getElementById('rightBtn').addEventListener('click', () => {
    if (direction.x !== -1) direction = { x: 1, y: 0 };
});

// 主题切换
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    updateThemeText();
    localStorage.setItem('themePreference', 
        document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    
    // 强制重绘
    if (gameRunning) {
        draw();
    }
});

// 设置菜单
document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('pauseOverlay').style.display = 'none';
    document.getElementById('settingsMenu').style.display = 'flex';
});

document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsMenu').style.display = 'none';
    document.getElementById('pauseOverlay').style.display = 'flex';
});

document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('settingsMenu').style.display = 'none';
    document.getElementById('pauseOverlay').style.display = 'none';
    if (confirm('确定要重新开始游戏吗？')) {
        initGame();
    }
});

document.getElementById('resumeBtn').addEventListener('click', togglePause);

// 难度设置变更
document.getElementById('difficultySelect').addEventListener('change', (e) => {
    difficulty = e.target.value;
    showDifficultyHint(difficulty);
});

// 音效控制
let soundEnabled = true;
document.getElementById('soundToggle').addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
});
