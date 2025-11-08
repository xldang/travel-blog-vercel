// 轻量级倒计时组件 - 本地实现，无外部依赖
const COUNTDOWN_CONFIG = {
    reminderThresholds: {
        '火车': 1,
        '飞机': 2,
        '自驾': 1,
        '客车': 1,
        '步行游览': 1,
        '住宿': 1,
        '默认': 1
    },
    updateInterval: 10000 // 10秒更新一次
};

// 获取北京时间（基于本地时间+8小时偏移）
function getBeijingTime() {
    const now = new Date();
    // 本地时间转换为北京时间（本地时区+8）
    const beijingTime = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);
    return beijingTime;
}

// 格式化倒计时显示
function formatCountdownDisplay(startDateTime, transportMethod = '默认') {
    const now = getBeijingTime();
    const targetDateTime = new Date(startDateTime);
    const diff = targetDateTime - now;
    
    if (diff <= 0) {
        return { text: '<i class="fas fa-check-circle me-1"></i>已出行', urgent: false };
    }
    
    const threshold = COUNTDOWN_CONFIG.reminderThresholds[transportMethod] || 1;
    const thresholdMs = threshold * 60 * 60 * 1000;
    
    // 精确计算
    let timeLeft = Math.max(0, diff);
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    timeLeft -= days * (1000 * 60 * 60 * 24);
    
    const remainingHours = Math.floor(timeLeft / (1000 * 60 * 60));
    timeLeft -= remainingHours * (1000 * 60 * 60);
    
    const remainingMinutes = Math.floor(timeLeft / (1000 * 60));
    
    let timeText = '';
    if (days > 0) {
        timeText = `${days}天${remainingHours}小时${remainingMinutes}分钟`;
    } else if (remainingHours > 0) {
        timeText = `${remainingHours}小时${remainingMinutes}分钟`;
    } else if (remainingMinutes > 0) {
        timeText = `${remainingMinutes}分钟`;
    } else {
        timeText = '即将开始';
    }
    
    return {
        text: `<i class="fas fa-clock me-1"></i>还有 ${timeText}`,
        urgent: diff <= thresholdMs
    };
}

// 更新所有倒计时
function updateAllCountdowns() {
    const countdownElements = document.querySelectorAll('.countdown-timer');
    
    countdownElements.forEach(element => {
        const startDateTimeStr = element.dataset.startDatetime;
        const transport = element.dataset.transport || '默认';
        
        if (!startDateTimeStr) return;
        
        const result = formatCountdownDisplay(startDateTimeStr, transport);
        
        element.style.display = 'inline-block';
        element.innerHTML = result.text;
        
        if (result.urgent) {
            element.classList.add('urgent');
        } else {
            element.classList.remove('urgent');
        }
    });
}

// 初始化倒计时
document.addEventListener('DOMContentLoaded', function() {
    updateAllCountdowns();
    
    // 定期更新
    setInterval(updateAllCountdowns, COUNTDOWN_CONFIG.updateInterval);
});

// 暴露给全局使用
window.formatCountdown = function(startDateTime, transportMethod = '默认') {
    return formatCountdownDisplay(startDateTime, transportMethod);
};

// 兼容旧接口
window.getBeijingTime = getBeijingTime;