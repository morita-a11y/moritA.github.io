/* =========================================================
   Learning ページ - 簡易認証スクリプト
   - SHA-256 ハッシュでパスワードを検証
   - sessionStorage で認証状態を保持
   - ⚠️ クライアントサイド認証のため、セキュリティは限定的
   ========================================================= */

/**
 * 認証情報のSHA-256ハッシュ
 * デフォルト: ユーザー名 "admin" / パスワード "morita2026"
 *
 * ハッシュを変更するには、ブラウザのコンソールで以下を実行:
 *   await sha256('yourUsername:yourPassword')
 * 出力されたハッシュ値を AUTH_HASH に設定してください。
 */
const AUTH_HASH = '5f2a942ab0640f4e5fc01aeb3a498fe22e047bfee50bfab33bce71a6b3930cb8';

/**
 * SHA-256 ハッシュを計算
 * @param {string} message - ハッシュ化する文字列
 * @returns {Promise<string>} ハッシュ値 (16進数文字列)
 */
async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * ページ読み込み時に認証状態をチェック
 */
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

/**
 * 認証状態の確認
 * sessionStorageに認証済みフラグがあればコンテンツを表示
 */
function checkAuth() {
  const isAuthenticated = sessionStorage.getItem('learning_auth') === 'true';

  const authOverlay = document.getElementById('authOverlay');
  const content = document.getElementById('learningContent');

  if (isAuthenticated) {
    // 認証済み → コンテンツ表示
    if (authOverlay) authOverlay.style.display = 'none';
    if (content) content.style.display = 'block';
  } else {
    // 未認証 → ログインフォーム表示
    if (authOverlay) authOverlay.style.display = 'flex';
    if (content) content.style.display = 'none';
  }
}

/**
 * ログイン処理
 * @param {Event} event - フォーム送信イベント
 * @returns {boolean} false (フォーム送信を防止)
 */
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('authUser').value.trim();
  const password = document.getElementById('authPass').value;
  const errorEl  = document.getElementById('authError');

  // 入力検証
  if (!username || !password) {
    errorEl.textContent = 'ユーザー名とパスワードを入力してください。';
    errorEl.style.display = 'block';
    return false;
  }

  // ハッシュを計算して比較
  const inputHash = await sha256(`${username}:${password}`);

  if (inputHash === AUTH_HASH) {
    // 認証成功
    sessionStorage.setItem('learning_auth', 'true');
    checkAuth();
  } else {
    // 認証失敗
    errorEl.textContent = 'ユーザー名またはパスワードが正しくありません。';
    errorEl.style.display = 'block';

    // パスワードフィールドをクリア
    document.getElementById('authPass').value = '';

    // エラーメッセージのアニメーション
    errorEl.style.animation = 'none';
    errorEl.offsetHeight; // リフロー
    errorEl.style.animation = 'shake 0.4s ease';
  }

  return false;
}

/**
 * ログアウト処理
 */
function handleLogout() {
  sessionStorage.removeItem('learning_auth');
  checkAuth();

  // フォームをリセット
  const form = document.getElementById('authForm');
  if (form) form.reset();

  const errorEl = document.getElementById('authError');
  if (errorEl) errorEl.style.display = 'none';
}

/* シェイクアニメーション用CSS注入 */
(function injectShakeAnimation() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25%      { transform: translateX(-8px); }
      50%      { transform: translateX(8px); }
      75%      { transform: translateX(-4px); }
    }
  `;
  document.head.appendChild(style);
})();
