'use strict';

(function () {
    const parentWin = window.parent;

    function areApisReady() {
        const st = parentWin?.SillyTavern;
        return !!(
            st &&
            parentWin.TavernHelper &&
            parentWin.jQuery &&
            st.getContext &&
            st.getContext().eventSource
        );
    }

    const apiReadyInterval = setInterval(() => {
        if (areApisReady()) {
            clearInterval(apiReadyInterval);
            console.log('[GS StatusBar] Core APIs are ready. Initializing main application...');
            import('./app.js')
                .then(({ StatusBarApp }) => {
                    const app = new StatusBarApp();
                    // 将应用实例暴露到全局，方便测试和调试
                    parentWin.gsStatusBarApp = app;
                    console.log('[GS StatusBar] Application instance exposed as window.gsStatusBarApp');
                })
                .catch(error => {
                    console.error('[GS StatusBar] Failed to load or instantiate app.js.', error);
                });
        }
    }, 250);
})();
