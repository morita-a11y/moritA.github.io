/* =========================================================
   チームバランサー
   - 最大10人のプレイヤーを入力
   - ランクをMMR値に変換
   - 合計MMR差が最小になる2チームに分割
   ========================================================= */

/**
 * ランクをMMR数値に変換するマッピング
 * 各ティアを400ずつ、各ディビジョンを100ずつ加算
 */
const RANK_TO_MMR = {
  'IRON IV':         400,  'IRON III':         500,
  'IRON II':         600,  'IRON I':           700,
  'BRONZE IV':       800,  'BRONZE III':       900,
  'BRONZE II':      1000,  'BRONZE I':        1100,
  'SILVER IV':      1200,  'SILVER III':      1300,
  'SILVER II':      1400,  'SILVER I':        1500,
  'GOLD IV':        1600,  'GOLD III':        1700,
  'GOLD II':        1800,  'GOLD I':          1900,
  'PLATINUM IV':    2000,  'PLATINUM III':    2100,
  'PLATINUM II':    2200,  'PLATINUM I':      2300,
  'EMERALD IV':     2400,  'EMERALD III':     2500,
  'EMERALD II':     2600,  'EMERALD I':       2700,
  'DIAMOND IV':     2800,  'DIAMOND III':     2900,
  'DIAMOND II':     3000,  'DIAMOND I':       3100,
  'MASTER':         3200,
  'GRANDMASTER':    3400,
  'CHALLENGER':     3600,
};

/**
 * ランクの選択肢リスト
 */
const RANK_OPTIONS = [
  'IRON IV', 'IRON III', 'IRON II', 'IRON I',
  'BRONZE IV', 'BRONZE III', 'BRONZE II', 'BRONZE I',
  'SILVER IV', 'SILVER III', 'SILVER II', 'SILVER I',
  'GOLD IV', 'GOLD III', 'GOLD II', 'GOLD I',
  'PLATINUM IV', 'PLATINUM III', 'PLATINUM II', 'PLATINUM I',
  'EMERALD IV', 'EMERALD III', 'EMERALD II', 'EMERALD I',
  'DIAMOND IV', 'DIAMOND III', 'DIAMOND II', 'DIAMOND I',
  'MASTER', 'GRANDMASTER', 'CHALLENGER',
];

/**
 * 初期化: 入力フォームを10人分生成
 */
document.addEventListener('DOMContentLoaded', () => {
  generateBalancerInputs();
});

/**
 * プレイヤー入力フォームを生成
 */
function generateBalancerInputs() {
  const container = document.getElementById('balancerInputs');
  if (!container) return;

  container.innerHTML = '';

  for (let i = 1; i <= 10; i++) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap;';

    row.innerHTML = `
      <span style="width:32px;font-weight:600;color:var(--text-secondary);font-size:0.85rem;">
        #${i}
      </span>
      <input type="text" id="player${i}" placeholder="プレイヤー名"
        style="flex:1;min-width:160px;padding:10px 14px;font-size:0.85rem;">
      <select id="rank${i}" style="width:200px;padding:10px 14px;font-size:0.85rem;">
        <option value="">ランクを選択</option>
        ${RANK_OPTIONS.map(r => `<option value="${r}">${r}</option>`).join('')}
      </select>
    `;

    container.appendChild(row);
  }
}

/**
 * チーム分けを実行
 * - 入力されたプレイヤーのランクからMMRを計算
 * - 合計MMR差が最小になる組み合わせを探索
 */
function balanceTeams() {
  // プレイヤーデータを収集
  const players = [];
  for (let i = 1; i <= 10; i++) {
    const name = document.getElementById(`player${i}`).value.trim();
    const rank = document.getElementById(`rank${i}`).value;

    if (name && rank) {
      players.push({
        name,
        rank,
        mmr: RANK_TO_MMR[rank] || 1200
      });
    }
  }

  // 最低2人は必要
  if (players.length < 2) {
    alert('少なくとも2人以上のプレイヤーを入力してください。');
    return;
  }

  // 偶数でなくても動作する（端数は片方のチームに入る）
  const teamSize = Math.floor(players.length / 2);

  // 全組み合わせを探索して最適なチーム分けを見つける
  let bestDiff = Infinity;
  let bestTeamA = [];

  const totalMMR = players.reduce((sum, p) => sum + p.mmr, 0);

  // 組み合わせ列挙関数
  function combinations(arr, size, start = 0, current = []) {
    if (current.length === size) {
      const sumA = current.reduce((sum, idx) => sum + players[idx].mmr, 0);
      const sumB = totalMMR - sumA;
      const diff = Math.abs(sumA - sumB);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestTeamA = [...current];
      }
      return;
    }

    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      combinations(arr, size, i + 1, current);
      current.pop();
    }
  }

  // インデックスの配列を使って組み合わせ探索
  const indices = players.map((_, i) => i);
  combinations(indices, teamSize);

  // 結果を表示
  const teamASet = new Set(bestTeamA);
  const teamA = players.filter((_, i) => teamASet.has(i));
  const teamB = players.filter((_, i) => !teamASet.has(i));

  displayTeamResult(teamA, teamB);
}

/**
 * チーム結果を画面に描画
 * @param {Array} teamA
 * @param {Array} teamB
 */
function displayTeamResult(teamA, teamB) {
  const resultDiv = document.getElementById('teamResult');
  resultDiv.style.display = 'block';

  // Team A
  const teamAList = document.getElementById('teamAList');
  teamAList.innerHTML = '';
  teamA.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${p.name}</strong> <span style="color:var(--text-secondary);margin-left:8px;">${p.rank} (${p.mmr})</span>`;
    teamAList.appendChild(li);
  });

  // Team B
  const teamBList = document.getElementById('teamBList');
  teamBList.innerHTML = '';
  teamB.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${p.name}</strong> <span style="color:var(--text-secondary);margin-left:8px;">${p.rank} (${p.mmr})</span>`;
    teamBList.appendChild(li);
  });

  // MMR合計
  const mmrA = teamA.reduce((sum, p) => sum + p.mmr, 0);
  const mmrB = teamB.reduce((sum, p) => sum + p.mmr, 0);

  document.getElementById('teamAMmr').textContent = mmrA;
  document.getElementById('teamBMmr').textContent = mmrB;
  document.getElementById('mmrDiff').textContent =
    `MMR差: ${Math.abs(mmrA - mmrB)} (${((Math.abs(mmrA - mmrB) / Math.max(mmrA, mmrB, 1)) * 100).toFixed(1)}%)`;

  // 結果エリアまでスクロール
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * バランサーをリセット
 */
function resetBalancer() {
  for (let i = 1; i <= 10; i++) {
    const nameInput = document.getElementById(`player${i}`);
    const rankSelect = document.getElementById(`rank${i}`);
    if (nameInput) nameInput.value = '';
    if (rankSelect) rankSelect.value = '';
  }
  document.getElementById('teamResult').style.display = 'none';
}
