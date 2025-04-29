/**
 * 词汇情境学习工具 - 页面初始化脚本
 * 处理按钮绑定和事件初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('词汇工具页面初始化...');
    
    // 绑定格式化按钮
    const formatButton = document.getElementById('formatButton');
    if (formatButton) {
        console.log("绑定格式化按钮事件");
        formatButton.addEventListener('click', function() {
            if (typeof WordProcessor !== 'undefined' && WordProcessor.formatText) {
                WordProcessor.formatText();
            } else {
                console.error('WordProcessor未定义或缺少formatText方法');
            }
        });
    }
    
    // 绑定生成按钮
    const generateButton = document.getElementById('generateButton');
    if (generateButton) {
        console.log("绑定生成按钮事件");
        generateButton.addEventListener('click', function() {
            if (typeof WordProcessor !== 'undefined' && WordProcessor.generateNarrative) {
                WordProcessor.generateNarrative();
            } else {
                console.error('WordProcessor未定义或缺少generateNarrative方法');
            }
        });
    }
    
    // 绑定下载按钮
    const downloadStandardButton = document.getElementById('downloadStandardButton');
    if (downloadStandardButton) {
        console.log("绑定标准下载按钮事件");
        downloadStandardButton.addEventListener('click', function() {
            if (typeof ImageExporter !== 'undefined' && ImageExporter.downloadStandardImage) {
                ImageExporter.downloadStandardImage();
            } else {
                console.error('ImageExporter未定义或缺少downloadStandardImage方法');
            }
        });
    }
    
    const downloadTransparentButton = document.getElementById('downloadTransparentButton');
    if (downloadTransparentButton) {
        console.log("绑定透明下载按钮事件");
        downloadTransparentButton.addEventListener('click', function() {
            if (typeof ImageExporter !== 'undefined' && ImageExporter.downloadTransparentHighQuality) {
                ImageExporter.downloadTransparentHighQuality();
            } else {
                console.error('ImageExporter未定义或缺少downloadTransparentHighQuality方法');
            }
        });
    }
    
    // 绑定打包下载按钮
    const downloadZipButton = document.getElementById('downloadZipButton');
    if (downloadZipButton) {
        console.log("绑定打包下载按钮事件");
        downloadZipButton.addEventListener('click', function() {
            if (typeof ImageExporter !== 'undefined' && ImageExporter.downloadAllAsZip) {
                ImageExporter.downloadAllAsZip();
            } else {
                console.error('ImageExporter未定义或缺少downloadAllAsZip方法');
            }
        });
    }
    
    // 绑定PDF导出按钮
    const exportPdfButton = document.getElementById('exportPdfButton');
    if (exportPdfButton) {
        console.log("绑定PDF导出按钮事件");
        exportPdfButton.addEventListener('click', function() {
            if (typeof ImageExporter !== 'undefined' && ImageExporter.exportToPDF) {
                ImageExporter.exportToPDF();
            } else {
                console.error('ImageExporter未定义或缺少exportToPDF方法');
            }
        });
    }
    
    // 绑定主题切换按钮
    const lightThemeButton = document.getElementById('light-theme');
    const darkThemeButton = document.getElementById('dark-theme');
    
    if (lightThemeButton && darkThemeButton) {
        console.log("绑定主题切换按钮事件");
        
        lightThemeButton.addEventListener('click', function() {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('preferred-theme', 'light');
            
            lightThemeButton.classList.add('active');
            darkThemeButton.classList.remove('active');
        });
        
        darkThemeButton.addEventListener('click', function() {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('preferred-theme', 'dark');
            
            darkThemeButton.classList.add('active');
            lightThemeButton.classList.remove('active');
        });
        
        // 初始化主题
        const savedTheme = localStorage.getItem('preferred-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        if (savedTheme === 'dark') {
            darkThemeButton.classList.add('active');
            lightThemeButton.classList.remove('active');
        } else {
            lightThemeButton.classList.add('active');
            darkThemeButton.classList.remove('active');
        }
    }
    
    // 绑定重置按钮
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        console.log("绑定重置按钮事件");
        resetButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirm('确定要重置所有内容吗？这将清空当前编辑的所有内容。')) {
                document.getElementById('narrativeInput').innerHTML = '在这里输入内容，例如：**人工智能(AI)**正在**改变(transform)**我们的**生活(life)**方式。';
                document.getElementById('wordListInput').value = '🔥 重点高频词汇\nlife（生活）/laɪf/\ntransform（改变）/trænsˈfɔːrm/\n\n⭐ 中频词汇\nAI（人工智能）/ˌeɪ ˈaɪ/';
                
                document.getElementById('narrativeOutput').innerHTML = '';
                document.getElementById('wordListOutput').innerHTML = '';
                
                // 禁用下载按钮
                document.querySelectorAll('.download-buttons button').forEach(button => {
                    button.disabled = true;
                });
                
                UIManager.showSuccessMessage('已重置所有内容', 1500);
            }
        });
    }
    
    console.log('词汇工具页面初始化完成');
}); 