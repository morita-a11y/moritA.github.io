/* =========================================================
   MoritA Personal Hub - メインスクリプト
   - ナビゲーション制御
   - スクロールアニメーション
   - 汎用ユーティリティ
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ---------- モバイルナビゲーション トグル ----------
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    // リンクをクリックしたらメニューを閉じる
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  // ---------- ナビゲーションバー スクロール時のシャドウ ----------
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  // ---------- フェードインアニメーション (Intersection Observer) ----------
  const fadeElements = document.querySelectorAll('.fade-in');
  if (fadeElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeElements.forEach(el => observer.observe(el));
  }

  // ---------- タブ切り替え ----------
  const tabBtns = document.querySelectorAll('.tab-btn');
  if (tabBtns.length > 0) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabGroup = btn.closest('.tabs')?.parentElement;
        if (!tabGroup) return;

        // すべてのタブボタンからactiveを外す
        tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // すべてのタブコンテンツを非表示
        const target = btn.dataset.tab;
        tabGroup.querySelectorAll('.tab-content').forEach(content => {
          content.classList.toggle('active', content.id === target);
        });
      });
    });
  }

  // ---------- アクティブなナビリンクのハイライト ----------
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    // パスの末尾を正規化して比較
    if (href && currentPath.endsWith(href.replace(/^\.\.\//, '').replace(/^\//, ''))) {
      link.classList.add('active');
    }
  });
});

/**
 * ユーティリティ: HTML要素を簡単に作成
 * @param {string} tag - タグ名
 * @param {object} attrs - 属性
 * @param {string|HTMLElement|Array} children - 子要素
 * @returns {HTMLElement}
 */
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'className') el.className = val;
    else if (key === 'innerHTML') el.innerHTML = val;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
    else el.setAttribute(key, val);
  });
  if (typeof children === 'string') {
    el.textContent = children;
  } else if (children instanceof HTMLElement) {
    el.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child instanceof HTMLElement) el.appendChild(child);
    });
  }
  return el;
}

/**
 * ユーティリティ: 数値をフォーマット
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  return new Intl.NumberFormat('ja-JP').format(num);
}
