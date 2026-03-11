/* =========================================================
   LoL API - Riot Games API 連携スクリプト
   - サモナー情報取得
   - ランク情報取得
   - 試合履歴取得
   - Chart.jsでグラフ表示
   ========================================================= */

/**
 * リージョンごとのAPI URLマッピング
 */
const REGION_MAP = {
  jp1:  { platform: 'jp1.api.riotgames.com',  routing: 'asia.api.riotgames.com' },
  kr:   { platform: 'kr.api.riotgames.com',   routing: 'asia.api.riotgames.com' },
  na1:  { platform: 'na1.api.riotgames.com',  routing: 'americas.api.riotgames.com' },
  euw1: { platform: 'euw1.api.riotgames.com', routing: 'europe.api.riotgames.com' },
  eun1: { platform: 'eun1.api.riotgames.com', routing: 'europe.api.riotgames.com' },
};

/**
 * ランク表示用のマッピング
 */
const TIER_ORDER = [
  'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
  'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'
];

const RANK_MAP = { 'IV': 0, 'III': 1, 'II': 2, 'I': 3 };

/**
 * Data Dragon バージョン（チャンピオン画像用）
 */
let ddragonVersion = '14.5.1';
let championData = {};

/**
 * 初期化: Data Dragon の最新バージョンとチャンピオンデータを取得
 */
async function initDDragon() {
  try {
    const verRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await verRes.json();
    ddragonVersion = versions[0];

    const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/ja_JP/champion.json`);
    const champJson = await champRes.json();
    championData = champJson.data;
  } catch (e) {
    console.warn('Data Dragon の初期化に失敗:', e);
  }
}

// ページ読み込み時に初期化
initDDragon();

/**
 * チャンピオンIDから名前と画像URLを取得
 * @param {number} championId
 * @returns {{ name: string, icon: string }}
 */
function getChampionInfo(championId) {
  for (const [key, val] of Object.entries(championData)) {
    if (parseInt(val.key) === championId) {
      return {
        name: val.name,
        icon: `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${key}.png`
      };
    }
  }
  return { name: `Champion ${championId}`, icon: '' };
}

/**
 * Riot APIへのリクエストを行う汎用関数
 * @param {string} url - 完全なAPIエンドポイントURL
 * @param {string} apiKey - Riot API キー
 * @returns {Promise<object>} APIレスポンス
 */
async function riotFetch(url, apiKey) {
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': apiKey }
  });
  if (!res.ok) {
    const status = res.status;
    if (status === 403) throw new Error('APIキーが無効または期限切れです。');
    if (status === 404) throw new Error('プレイヤーが見つかりません。');
    if (status === 429) throw new Error('レート制限に達しました。少し待ってから再試行してください。');
    throw new Error(`API エラー (${status})`);
  }
  return res.json();
}

/**
 * メイン検索関数 - サモナー統計を取得して表示
 */
async function searchSummoner() {
  const apiKey    = document.getElementById('apiKey').value.trim();
  const gameName  = document.getElementById('gameName').value.trim();
  const tagLine   = document.getElementById('tagLine').value.trim();
  const regionKey = document.getElementById('regionSelect').value;

  // バリデーション
  if (!apiKey) return showError('APIキーを入力してください。');
  if (!gameName) return showError('ゲーム名を入力してください。');
  if (!tagLine) return showError('タグを入力してください。');

  const region = REGION_MAP[regionKey];
  if (!region) return showError('無効なリージョンです。');

  // UI状態をリセット
  hideError();
  document.getElementById('statsArea').style.display = 'none';
  document.getElementById('statsLoading').style.display = 'flex';

  try {
    // 1. Riot ID でアカウントを取得
    const account = await riotFetch(
      `https://${region.routing}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      apiKey
    );

    // 2. PUUIDでサモナー情報を取得
    const summoner = await riotFetch(
      `https://${region.platform}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
      apiKey
    );

    // 3. ランク情報を取得
    const leagues = await riotFetch(
      `https://${region.platform}/lol/league/v4/entries/by-summoner/${summoner.id}`,
      apiKey
    );

    // 4. 最近の試合IDを取得 (直近10試合)
    const matchIds = await riotFetch(
      `https://${region.routing}/lol/match/v5/matches/by-puuid/${account.puuid}/ids?count=10`,
      apiKey
    );

    // 5. 各試合の詳細を取得
    const matches = [];
    for (const matchId of matchIds.slice(0, 10)) {
      try {
        const match = await riotFetch(
          `https://${region.routing}/lol/match/v5/matches/${matchId}`,
          apiKey
        );
        matches.push(match);
      } catch (e) {
        console.warn(`試合 ${matchId} の取得失敗:`, e);
      }
    }

    // 6. 結果を表示
    displayStats(account, summoner, leagues, matches);

  } catch (err) {
    showError(err.message);
  } finally {
    document.getElementById('statsLoading').style.display = 'none';
  }
}

/**
 * 統計データを画面に表示
 */
function displayStats(account, summoner, leagues, matches) {
  const statsArea = document.getElementById('statsArea');
  statsArea.style.display = 'block';

  // --- サモナー情報 ---
  document.getElementById('summonerIcon').src =
    `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${summoner.profileIconId}.png`;
  document.getElementById('summonerName').textContent =
    `${account.gameName}#${account.tagLine}`;
  document.getElementById('summonerLevel').textContent =
    `Level ${summoner.summonerLevel}`;

  // --- ランク情報 ---
  const soloQ = leagues.find(l => l.queueType === 'RANKED_SOLO_5x5');
  const flexQ = leagues.find(l => l.queueType === 'RANKED_FLEX_SR');

  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = '';

  if (soloQ) {
    const winRate = ((soloQ.wins / (soloQ.wins + soloQ.losses)) * 100).toFixed(1);
    addStatCard(statsGrid, `${soloQ.tier} ${soloQ.rank}`, 'ソロ/デュオ ランク');
    addStatCard(statsGrid, `${winRate}%`, `勝率 (${soloQ.wins}W ${soloQ.losses}L)`);
    addStatCard(statsGrid, `${soloQ.leaguePoints} LP`, 'League Points');
  } else {
    addStatCard(statsGrid, 'Unranked', 'ソロ/デュオ ランク');
  }

  // --- KDA計算 (直近の試合から) ---
  let totalKills = 0, totalDeaths = 0, totalAssists = 0;
  const puuid = account.puuid;

  matches.forEach(match => {
    const participant = match.info.participants.find(p => p.puuid === puuid);
    if (participant) {
      totalKills   += participant.kills;
      totalDeaths  += participant.deaths;
      totalAssists += participant.assists;
    }
  });

  const avgKDA = totalDeaths > 0
    ? ((totalKills + totalAssists) / totalDeaths).toFixed(2)
    : 'Perfect';
  addStatCard(statsGrid, avgKDA, `KDA (直近${matches.length}試合)`);

  // --- 勝率グラフ (Chart.js) ---
  renderWinrateChart(matches, puuid);

  // --- 得意チャンピオン ---
  renderTopChampions(matches, puuid);

  // --- 最近の試合 ---
  renderRecentMatches(matches, puuid);
}

/**
 * 統計カードを追加するヘルパー
 */
function addStatCard(container, value, label) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  card.innerHTML = `
    <div class="stat-value">${value}</div>
    <div class="stat-label">${label}</div>
  `;
  container.appendChild(card);
}

/**
 * Chart.jsで勝率推移を描画
 */
let winrateChartInstance = null;

function renderWinrateChart(matches, puuid) {
  const canvas = document.getElementById('winrateChart');
  if (!canvas) return;

  // 既存のチャートがあれば破棄
  if (winrateChartInstance) {
    winrateChartInstance.destroy();
  }

  // 試合ごとの累計勝率を計算
  let wins = 0;
  const labels = [];
  const data = [];

  // 古い順にソート
  const sorted = [...matches].reverse();
  sorted.forEach((match, i) => {
    const participant = match.info.participants.find(p => p.puuid === puuid);
    if (participant && participant.win) wins++;
    const rate = ((wins / (i + 1)) * 100).toFixed(1);
    labels.push(`Game ${i + 1}`);
    data.push(parseFloat(rate));
  });

  winrateChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '勝率 (%)',
        data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: '#e2e8f0', font: { family: 'Inter' } }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { color: '#8b94a6', callback: v => v + '%' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: { color: '#8b94a6' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

/**
 * 得意チャンピオンを表示
 */
function renderTopChampions(matches, puuid) {
  const container = document.getElementById('topChampions');
  container.innerHTML = '';

  // チャンピオンごとのプレイ回数を集計
  const champCount = {};
  matches.forEach(match => {
    const participant = match.info.participants.find(p => p.puuid === puuid);
    if (!participant) return;
    const id = participant.championId;
    if (!champCount[id]) champCount[id] = { plays: 0, wins: 0 };
    champCount[id].plays++;
    if (participant.win) champCount[id].wins++;
  });

  // プレイ回数順にソートして上位5件
  const top = Object.entries(champCount)
    .sort((a, b) => b[1].plays - a[1].plays)
    .slice(0, 5);

  top.forEach(([champId, stats]) => {
    const info = getChampionInfo(parseInt(champId));
    const wr = ((stats.wins / stats.plays) * 100).toFixed(0);
    const item = document.createElement('div');
    item.className = 'champion-item';
    item.innerHTML = `
      <img src="${info.icon}" alt="${info.name}" onerror="this.style.display='none'">
      <div>
        <strong>${info.name}</strong><br>
        <span style="color:var(--text-secondary);font-size:0.8rem;">
          ${stats.plays}回 / 勝率 ${wr}%
        </span>
      </div>
    `;
    container.appendChild(item);
  });

  if (top.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">データがありません</p>';
  }
}

/**
 * 最近の試合一覧を表示
 */
function renderRecentMatches(matches, puuid) {
  const container = document.getElementById('recentMatches');
  container.innerHTML = '';

  matches.forEach(match => {
    const participant = match.info.participants.find(p => p.puuid === puuid);
    if (!participant) return;

    const isWin = participant.win;
    const champInfo = getChampionInfo(participant.championId);
    const kda = `${participant.kills}/${participant.deaths}/${participant.assists}`;
    const duration = Math.floor(match.info.gameDuration / 60);

    const item = document.createElement('div');
    item.className = `match-item ${isWin ? 'win' : 'loss'}`;
    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${champInfo.icon}" alt="${champInfo.name}" style="width:36px;height:36px;border-radius:50%;" onerror="this.style.display='none'">
        <div>
          <strong>${champInfo.name}</strong>
          <span style="color:var(--text-secondary);margin-left:12px;">${kda}</span>
        </div>
      </div>
      <div style="text-align:right;">
        <span class="match-result ${isWin ? 'win' : 'loss'}">${isWin ? '勝利' : '敗北'}</span>
        <div style="color:var(--text-muted);font-size:0.8rem;">${duration}分</div>
      </div>
    `;
    container.appendChild(item);
  });

  if (matches.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">試合データがありません</p>';
  }
}

/**
 * エラーメッセージを表示
 */
function showError(msg) {
  const el = document.getElementById('statsError');
  if (el) {
    el.textContent = '⚠️ ' + msg;
    el.style.display = 'block';
  }
}

/**
 * エラーメッセージを非表示
 */
function hideError() {
  const el = document.getElementById('statsError');
  if (el) el.style.display = 'none';
}
