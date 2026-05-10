import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 路由切换时自动滚动到顶部
 * 解决 SPA 路由切换后保持上一个页面滚动位置的问题
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // 禁用浏览器的自动滚动恢复，完全由应用控制
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 强制滚动到顶部
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
