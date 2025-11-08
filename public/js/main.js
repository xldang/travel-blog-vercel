document.addEventListener('DOMContentLoaded', function() {
    // 初始化工具提示
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // 初始化弹出框
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // 自动隐藏警告消息
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // 图片预览功能
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(function(input) {
        input.addEventListener('change', function(event) {
            const files = event.target.files;
            const previewContainer = document.getElementById('imagePreview');
            
            if (previewContainer) {
                previewContainer.innerHTML = '';
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type.startsWith('image/')) {
                        const img = document.createElement('img');
                        img.className = 'img-thumbnail me-2 mb-2';
                        img.style.maxHeight = '100px';
                        img.src = URL.createObjectURL(file);
                        previewContainer.appendChild(img);
                    }
                }
            }
        });
    });

    // 表单验证
    const forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // 平滑滚动
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(function(link) {
        link.addEventListener('click', function(event) {
            const targetId = link.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                event.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 响应式导航栏处理
    const navbarCollapse = document.querySelector('.navbar-collapse');
    if (navbarCollapse) {
        navbarCollapse.addEventListener('show.bs.collapse', function() {
            document.body.style.overflow = 'hidden';
        });
        
        navbarCollapse.addEventListener('hide.bs.collapse', function() {
            document.body.style.overflow = '';
        });
    }

    // 加载动画
    const loader = document.querySelector('.page-loader');
    if (loader) {
        window.addEventListener('load', function() {
            loader.style.opacity = '0';
            setTimeout(function() {
                loader.style.display = 'none';
            }, 300);
        });
    }
});