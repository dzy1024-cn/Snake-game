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
let food = {};
let score = 0;
let gameInterval;
let difficulty = 'medium';
let gameRunning = false;
let gamePaused = false;
let waitingForInput = false;
let startTime;
let timerInterval;
let level = 1;
const levelThresholds = [20, 50, 100, 200, 300];
let hasShield = false;
let shieldActiveUntilNextFood = false; // 新增：护盾持续到下一个食物

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
    timeSurvived120: false
};

// 历史最高分
let highScore = localStorage.getItem('snakeGameHighScore') ? parseInt(localStorage.getItem('snakeGameHighScore')) : 0;

// 排行榜
let leaderboard = localStorage.getItem('snakeGameLeaderboard') ? JSON.parse(localStorage.getItem('snakeGameLeaderboard')) : [];

// 初始化游戏
function initGame() {
    snake = [{ x: tileCountWidth / 2, y: tileCountHeight / 2 }];
    direction = { x: 0, y: 0 };
    food = generateFood();
    score = 0;
    gameRunning = true;
    gamePaused = false;
    waitingForInput = true;
    level = 1;
    hasShield = false;
    shieldActiveUntilNextFood = false; // 重置护盾状态

    document.getElementById('score').innerText = score;
    document.getElementById('timer').innerText = '0';
    document.getElementById('level').innerText = level;
    document.getElementById('highScore').innerText = highScore;

    // 清除之前的定时器
    if (gameInterval) clearInterval(gameInterval);
    if (timerInterval) clearInterval(timerInterval);

    startTime = Date.now();

    // 显示游戏界面
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';

    // 等待玩家输入方向键
    document.getElementById('pause').innerText = '暂停';

    // 启动游戏循环
    gameInterval = setInterval(gameLoop, difficultyLevels[difficulty]);
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

        // 检查食物是否生成在蛇身上
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
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

    // 检查碰撞 - 修改后的护盾逻辑
    if (head.x < 0 || head.x >= tileCountWidth || head.y < 0 || head.y >= tileCountHeight) {
        if (!hasShield && !shieldActiveUntilNextFood) {
            deathReason = '你撞到了墙壁!';
            gameOver = true;
        } else {
            // 护盾生效，穿墙
            if (head.x < 0) head.x = tileCountWidth - 1;
            else if (head.x >= tileCountWidth) head.x = 0;
            if (head.y < 0) head.y = tileCountHeight - 1;
            else if (head.y >= tileCountHeight) head.y = 0;
        }
    } else if (snake.some((segment, index) => index !== 0 && segment.x === head.x && segment.y === head.y)) {
        if (!hasShield && !shieldActiveUntilNextFood) {
            deathReason = '你撞到了自己!';
            gameOver = true;
        }
        // 有护盾时允许穿过自己身体
    }

    if (gameOver) {
        endGame(deathReason);
        return;
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

// 绘制游戏画面
function draw() {
    // 绘制背景网格
    ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#222' : '#f5f7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格线
    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#444' : '#e0e0e0';
    ctx.lineWidth = 0.5;

    // 水平线
    for (let i = 0; i < tileCountHeight; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    // 垂直线
    for (let i = 0; i < tileCountWidth; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
    }

    // 绘制蛇
    const snakeColor = document.body.classList.contains('dark-mode') ? '#ffffff' : '#4ecdc4';
    const snakeHeadColor = '#ff6b6b';
    const snakeEyeColor = document.body.classList.contains('dark-mode') ? '#000000' : '#ffffff';

    snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头
            ctx.fillStyle = snakeHeadColor;
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);

            // 蛇眼
            ctx.fillStyle = snakeEyeColor;
            ctx.fillRect(segment.x * gridSize + 4, segment.y * gridSize + 4, 4, 4);
            ctx.fillRect(segment.x * gridSize + gridSize - 8, segment.y * gridSize + 4, 4, 4);
        } else {
            // 蛇身
            ctx.fillStyle = snakeColor;
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
        }

        // 护盾视觉效果
        if (shieldActiveUntilNextFood) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                segment.x * gridSize - 2,
                segment.y * gridSize - 2,
                gridSize + 4,
                gridSize + 4
            );
            ctx.restore();
        }
    });

    // 绘制食物
    if (food.type === 'speed') {
        ctx.fillStyle = '#ff9f43';
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2);
    } else if (food.type === 'long') {
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↔', food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2);
    } else if (food.type === 'shield') {
        // 护盾食物带脉冲效果
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // 脉冲动画
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 + Math.sin(Date.now()/200)*3,
            0,
            Math.PI * 2
        );
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2);
    } else {
        ctx.fillStyle = '#ff9f43';
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}


// 结束游戏
function endGame(reason) {
    clearInterval(gameInterval);
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
