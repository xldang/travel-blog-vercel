// 智能导航栏滚动效果
(function() {
    'use strict';
    
    let lastScrollTop = 0;
    let isScrolling = false;
    const navbar = document.querySelector('.navbar.fixed-top');
    const scrollThreshold = 100; // 最小滚动距离触发隐藏
    
    function handleScroll() {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 防止负值和微小抖动
        if (Math.abs(currentScrollTop - lastScrollTop) <= 5) {
            return;
        }
        
        if (currentScrollTop > lastScrollTop && currentScrollTop > scrollThreshold) {
            // 向下滚动 - 隐藏导航栏
            navbar.style.transform = 'translateY(-100%)';
            navbar.style.transition = 'transform 0.3s ease-in-out';
        } else {
            // 向上滚动 - 显示导航栏
            navbar.style.transform = 'translateY(0)';
            navbar.style.transition = 'transform 0.3s ease-in-out';
        }
        
        lastScrollTop = currentScrollTop;
    }
    
    // 节流滚动事件
    function throttleScroll() {
        if (!isScrolling) {
            window.requestAnimationFrame(function() {
                handleScroll();
                isScrolling = false;
            });
            isScrolling = true;
        }
    }
    
    // 页面顶部时始终显示导航栏
    function handleScrollToTop() {
        if (window.pageYOffset <= 0) {
            navbar.style.transform = 'translateY(0)';
        }
    }
    
    // 初始化
    function init() {
        if (!navbar) return;
        
        // 添加必要的CSS样式
        navbar.style.position = 'fixed';
        navbar.style.top = '0';
        navbar.style.left = '0';
        navbar.style.right = '0';
        navbar.style.zIndex = '1030';
        navbar.style.transition = 'transform 0.3s ease-in-out';
        
        // 监听滚动事件
        window.addEventListener('scroll', throttleScroll, { passive: true });
        window.addEventListener('scroll', handleScrollToTop, { passive: true });
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();