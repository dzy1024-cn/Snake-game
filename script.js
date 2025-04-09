// 主题切换功能
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// 检查用户偏好或系统设置
function checkThemePreference() {
    // 检查用户是否已经保存了主题偏好
    const savedTheme = localStorage.getItem('preferredTheme');
    if (savedTheme) {
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerText = '切换为浅色模式';
        } else {
            document.body.classList.remove('dark-mode');
            document.getElementById('themeToggle').innerText = '切换为深色模式';
        }
    } else {
        // 如果没有保存偏好，则根据系统设置
        const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDarkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerText = '切换为浅色模式';
        }
    }
}

// 切换主题
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        document.getElementById('themeToggle').innerText = '切换为浅色模式';
        localStorage.setItem('preferredTheme', 'dark');
    } else {
        document.getElementById('themeToggle').innerText = '切换为深色模式';
        localStorage.setItem('preferredTheme', 'light');
    }
}

// 页面加载时检查主题偏好
window.addEventListener('DOMContentLoaded', checkThemePreference);
