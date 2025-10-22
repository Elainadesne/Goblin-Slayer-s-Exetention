/**
 * 测试重新加载功能
 * 在浏览器控制台运行此脚本来测试重新加载
 */

console.log('=== 测试重新加载功能 ===');

// 1. 检查当前版本
console.log('1. 检查 script.js 版本');
if (window.gsStatusBarEarlyLogs) {
    const versionLog = window.gsStatusBarEarlyLogs.find(log => log.message.includes('版本'));
    console.log('版本信息:', versionLog ? versionLog.message : '未找到');
} else {
    console.log('早期日志未找到');
}

// 2. 检查应用实例
console.log('\n2. 检查应用实例');
console.log('gsStatusBarApp 存在:', !!window.gsStatusBarApp);
console.log('reinitialize 方法存在:', !!window.gsStatusBarApp?.reinitialize);

// 3. 模拟错误面板
console.log('\n3. 模拟触发错误面板');
console.log('运行以下代码来模拟 MVU 超时错误:');
console.log(`
// 复制并运行这段代码
const error = new Error('测试：Mvu 模块加载超时');
const logs = window.gsStatusBarEarlyLogs || [];
const showErrorPanel = function(title, error, logs) {
    // ... 错误面板代码 ...
};
// 注意：实际的 showErrorPanel 函数在 script.js 的闭包中，无法直接调用
`);

// 4. 测试右键菜单重新加载
console.log('\n4. 测试右键菜单重新加载');
if (window.gsStatusBarApp && window.gsStatusBarApp.uiController) {
    console.log('可以测试右键菜单的重新加载功能');
    console.log('右键点击悬浮按钮 → 选择"重新加载数据"');
} else {
    console.log('应用未完全初始化');
}

console.log('\n=== 测试完成 ===');
