// LocalStorage Keys
const STORAGE_KEY = 'infinity_buying_v4_state_v4';
const USER_KEY_STORAGE = 'infinity_buying_user_id';

let currentUserId = '';
let cloudSaveTimer = null;

// Initial default state
const defaultState = {
  symbol: 'SOXL',
  splitCount: 30,
  totalCapital: 6000,
  avgPrice: 191.2848,
  sharesHeld: 21,
  targetProfitPct: 20,
  explicitT: 20.4875,
  explicitCash: 1983.0206,
  pendingModal: null
};

let state = { ...defaultState };
let currentCalcResult = {};

// DOM Elements
const elSymbol = document.getElementById('symbol');
const elSplitCount = document.getElementById('split-count');
const elTotalCapital = document.getElementById('total-capital');
const elAvgPrice = document.getElementById('avg-price');
const elSharesHeld = document.getElementById('shares-held');
const elCashLeft = document.getElementById('cash-left');
const elTargetProfitPct = document.getElementById('target-profit-pct');

const elSyncUserId = document.getElementById('sync-user-id');
const elSyncStatus = document.getElementById('sync-status');

const elDispTVal = document.getElementById('disp-t-val');
const elDispPhase = document.getElementById('disp-phase');
const elDispBuyBudget = document.getElementById('disp-buy-budget');
const elDispBuyShares = document.getElementById('disp-buy-shares');
const elDispStarPct = document.getElementById('disp-star-pct');
const elDispStarStatus = document.getElementById('disp-star-status');
const elWarningBanner = document.getElementById('warning-banner');
const elWarningText = document.getElementById('warning-text');
const elModeBadge = document.getElementById('mode-badge');

const elTicketBuyBadge = document.getElementById('ticket-buy-badge');
const elTicketBuyPrice = document.getElementById('ticket-buy-price');
const elTicketBuySub = document.getElementById('ticket-buy-sub');
const elTicketBuyQty = document.getElementById('ticket-buy-qty');
const elTicketBuyCost = document.getElementById('ticket-buy-cost');
const elTicketSellQPrice = document.getElementById('ticket-sell-q-price');
const elTicketSellQQty = document.getElementById('ticket-sell-q-qty');
const elTicketSellQSub = document.getElementById('ticket-sell-q-sub');
const elTicketSellTBadge = document.getElementById('ticket-sell-t-badge');
const elTicketSellTPrice = document.getElementById('ticket-sell-t-price');
const elTicketSellTQty = document.getElementById('ticket-sell-t-qty');
const elTicketSellTSub = document.getElementById('ticket-sell-t-sub');
const elBtnApplyTargetText = document.getElementById('btn-apply-target-text');

const elScenBuyT = document.getElementById('scen-buy-t');
const elScenBuyQty = document.getElementById('scen-buy-qty');
const elScenBuyCash = document.getElementById('scen-buy-cash');
const elScenSellT = document.getElementById('scen-sell-t');
const elScenSellQty = document.getElementById('scen-sell-qty');
const elScenSellCash = document.getElementById('scen-sell-cash');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initSyncUser();
  loadSavedState();
  calculate();
  restorePendingModal();
  initViewportFix();
  await loadStateFromCloud(currentUserId);
});

function initSyncUser() {
  const urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id');

  if (!id) {
    id = localStorage.getItem(USER_KEY_STORAGE);
  }

  if (!id) {
    id = 'usr_' + Math.random().toString(36).substring(2, 8);
  }

  currentUserId = id.trim().toLowerCase();
  localStorage.setItem(USER_KEY_STORAGE, currentUserId);

  if (elSyncUserId) {
    elSyncUserId.value = currentUserId;
  }

  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + currentUserId;
  window.history.replaceState({ path: newUrl }, '', newUrl);
}

async function loadStateFromCloud(userId) {
  if (!userId) return;
  if (elSyncStatus) {
    elSyncStatus.innerText = '🔄 불러오는 중...';
    elSyncStatus.style.borderColor = 'rgba(96, 165, 250, 0.3)';
    elSyncStatus.style.color = '#60a5fa';
  }

  try {
    const res = await fetch(`/api/state?id=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        state = { ...defaultState, ...data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        loadSavedState();
        calculate();
        if (elSyncStatus) {
          elSyncStatus.innerText = '🟢 DB 동기화됨';
          elSyncStatus.style.borderColor = 'rgba(52, 211, 153, 0.3)';
          elSyncStatus.style.color = '#34d399';
        }
        return;
      }
    }
    await saveStateToCloud(userId, state);
    if (elSyncStatus) {
      elSyncStatus.innerText = '🟢 DB 연동 완료';
      elSyncStatus.style.borderColor = 'rgba(52, 211, 153, 0.3)';
      elSyncStatus.style.color = '#34d399';
    }
  } catch (err) {
    console.warn('Cloud sync load failed:', err);
    if (elSyncStatus) {
      elSyncStatus.innerText = '💾 로컬 저장';
      elSyncStatus.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      elSyncStatus.style.color = '#fbbf24';
    }
  }
}

async function saveStateToCloud(userId, stateData) {
  if (!userId) return;
  try {
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, data: stateData })
    });
    if (elSyncStatus) {
      elSyncStatus.innerText = '🟢 DB 동기화됨';
      elSyncStatus.style.borderColor = 'rgba(52, 211, 153, 0.3)';
      elSyncStatus.style.color = '#34d399';
    }
  } catch (err) {
    console.warn('Cloud save failed:', err);
  }
}

function changeUserId(newId) {
  const cleanId = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanId) {
    showToast('올바른 키를 입력해주세요.');
    if (elSyncUserId) elSyncUserId.value = currentUserId;
    return;
  }

  currentUserId = cleanId;
  localStorage.setItem(USER_KEY_STORAGE, currentUserId);
  if (elSyncUserId) elSyncUserId.value = currentUserId;

  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + currentUserId;
  window.history.replaceState({ path: newUrl }, '', newUrl);

  showToast(`전용 키가 '${currentUserId}'로 변경되었습니다.`);
  loadStateFromCloud(currentUserId);
}

function copyPersonalLink() {
  const link = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + currentUserId;
  navigator.clipboard.writeText(link).then(() => {
    showToast('🔗 내 전용 동기화 링크가 복사되었습니다!');
  }).catch(() => {
    showToast(`링크: ${link}`);
  });
}

// Mobile keyboard handling — modal centered by default, moves to top when keyboard opens
function initViewportFix() {
  const modal = document.getElementById('custom-modal');
  const input1 = document.getElementById('modal-input-1');
  const input2 = document.getElementById('modal-input-2');

  function onInputFocus() {
    modal.classList.add('keyboard-up');
  }

  function onInputBlur() {
    setTimeout(() => {
      const active = document.activeElement;
      if (active !== input1 && active !== input2) {
        modal.classList.remove('keyboard-up');
      }
    }, 100);
  }

  input1.addEventListener('focus', onInputFocus);
  input2.addEventListener('focus', onInputFocus);
  input1.addEventListener('blur', onInputBlur);
  input2.addEventListener('blur', onInputBlur);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && modal.classList.contains('show')) {
      if (document.activeElement === input1 || document.activeElement === input2) {
        document.activeElement.blur();
      }
      modal.classList.remove('keyboard-up');
      modal.style.top = '';
      modal.style.height = '';
    }
  });
}

function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...defaultState, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  elSymbol.value = state.symbol || 'SOXL';
  elSplitCount.value = state.splitCount || 30;
  elTotalCapital.value = state.totalCapital || 6000;
  elAvgPrice.value = state.avgPrice || 191.2848;
  elSharesHeld.value = state.sharesHeld !== undefined ? state.sharesHeld : 21;
  if (elTargetProfitPct) elTargetProfitPct.value = state.targetProfitPct || 20;
  elCashLeft.value = (state.explicitCash !== null && state.explicitCash !== undefined) ? state.explicitCash : '';
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }

  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  if (elSyncStatus) {
    elSyncStatus.innerText = '⏳ 저장 중...';
    elSyncStatus.style.borderColor = 'rgba(96, 165, 250, 0.3)';
    elSyncStatus.style.color = '#60a5fa';
  }
  cloudSaveTimer = setTimeout(() => {
    saveStateToCloud(currentUserId, state);
  }, 400);
}

function onCashInput() {
  const val = elCashLeft.value.trim();
  if (val === '') {
    state.explicitCash = null;
    state.explicitT = null;
  } else {
    state.explicitCash = parseFloat(val);
    state.explicitT = null;
  }
  calculate();
}

function resetDefaults() {
  if (confirm('모든 입력값을 기본값으로 초기화하시겠습니까?')) {
    state = { ...defaultState };
    localStorage.removeItem(STORAGE_KEY);
    loadSavedState();
    calculate();
  }
}

// ====== CORE CALCULATION ======
function calculate() {
  const symbol = elSymbol.value;
  const N = parseFloat(elSplitCount.value) || 30;
  const capital = parseFloat(elTotalCapital.value) || 6000;
  const avgPrice = parseFloat(elAvgPrice.value) || 0;
  const shares = parseFloat(elSharesHeld.value) || 0;

  state.symbol = symbol;
  state.splitCount = N;
  state.totalCapital = capital;
  state.avgPrice = avgPrice;
  state.sharesHeld = shares;

  const isFirstDayNewCycle = (shares === 0);

  // T Calculation
  let T;
  if (state.explicitT !== null && state.explicitT !== undefined) {
    T = state.explicitT;
  } else {
    const spentAmount = shares * avgPrice;
    T = capital > 0 ? (spentAmount / capital) * N : 0;
  }
  if (T < 0) T = 0;
  if (T > N) T = N;
  if (isFirstDayNewCycle) T = 0;

  // Cash Calculation
  let cashRemaining;
  if (state.explicitCash !== null && state.explicitCash !== undefined) {
    cashRemaining = state.explicitCash;
  } else {
    cashRemaining = capital - (shares * avgPrice);
  }
  if (cashRemaining < 0) cashRemaining = 0;

  const halfN = N / 2;
  const isReverseMode = T >= (N - 1);
  const isSecondHalf = T >= halfN;

  // Star %
  let baseConst = 20;
  let coef = 40 / N;
  if (symbol === 'TQQQ') {
    baseConst = 15;
    coef = 30 / N;
  }

  const starPct = baseConst - (coef * T);
  const starPoint = avgPrice * (1 + (starPct / 100));

  // 1-Period Buy Budget
  let buyBudget = (N - T) > 0 ? (cashRemaining / (N - T)) : 0;
  if (buyBudget < 0) buyBudget = 0;

  const locBuyPrice = Math.max(0.01, starPoint - 0.01);
  const buyQty = locBuyPrice > 0 ? Math.floor(buyBudget / locBuyPrice) : 0;
  const buyTotalCost = buyQty * locBuyPrice;

  const locSellQPrice = starPoint;
  const sellQQty = Math.floor(shares / 4);

  const targetProfitPctVal = parseFloat(elTargetProfitPct ? elTargetProfitPct.value : (state.targetProfitPct || 20)) || 20;
  state.targetProfitPct = targetProfitPctVal;

  const targetProfitMultiplier = 1 + (targetProfitPctVal / 100);
  const targetSellPrice = avgPrice * targetProfitMultiplier;
  const sellTQty = Math.max(0, shares - sellQQty);

  currentCalcResult = {
    T, cashRemaining, buyQty, sellQQty, sellTQty,
    locBuyPrice, locSellQPrice, targetSellPrice, buyTotalCost,
    baseConst, coef, N, avgPrice, shares, capital, targetProfitPctVal
  };

  saveState();

  // UI UPDATES
  if (isFirstDayNewCycle) {
    elModeBadge.innerText = '✨ 새 사이클 (T=0)';
    elModeBadge.className = 'badge';
  } else if (isReverseMode) {
    elModeBadge.innerText = '🔴 리버스모드';
    elModeBadge.className = 'badge badge-warning';
  } else {
    elModeBadge.innerText = '🟢 일반모드';
    elModeBadge.className = 'badge';
  }

  elDispTVal.innerText = T.toFixed(2);
  if (isFirstDayNewCycle) {
    elDispPhase.innerText = '1일차 큰수 매수 대기';
  } else if (isReverseMode) {
    elDispPhase.innerText = `소진 (T > ${(N - 1).toFixed(0)})`;
  } else if (isSecondHalf) {
    elDispPhase.innerText = `후반전 (T ≥ ${halfN.toFixed(0)})`;
  } else {
    elDispPhase.innerText = `전반전 (T < ${halfN.toFixed(0)})`;
  }

  elDispBuyBudget.innerText = `$${buyBudget.toFixed(2)}`;
  elDispBuyShares.innerText = buyQty >= 1 ? `약 ${buyQty}주 매수 가능` : '0주 (예산 부족)';

  elDispStarPct.innerText = `${starPct >= 0 ? '+' : ''}${starPct.toFixed(2)}%`;
  elDispStarStatus.innerText = starPct < 0 ? '별지점 < 평단가' : starPct === 0 ? '별지점 = 평단가' : '별지점 > 평단가';

  if (buyQty === 0 && buyBudget > 0 && !isFirstDayNewCycle) {
    elWarningBanner.style.display = 'flex';
    elWarningText.innerHTML = `⚠️ 1회 매수 예산(<strong>$${buyBudget.toFixed(2)}</strong>)이 LOC 매수가(<strong>$${locBuyPrice.toFixed(2)}</strong>)보다 작아서 <strong>0주</strong> 매수됩니다.<br/>💡 20분할 전환 또는 원금 증액을 고려해보세요.`;
  } else {
    elWarningBanner.style.display = 'none';
  }

  if (isFirstDayNewCycle) {
    elTicketBuyBadge.innerText = '📥 1일차 큰수매수';
    const bigNumPrice = avgPrice > 0 ? avgPrice * 1.12 : 0;
    const firstDayBudget = capital / N;
    const firstDayQty = avgPrice > 0 ? Math.floor(firstDayBudget / avgPrice) : 0;
    elTicketBuyPrice.innerText = avgPrice > 0 ? `$${bigNumPrice.toFixed(2)}` : '평단가 미입력';
    elTicketBuySub.innerText = '전일종가 +12% (큰수매수)';
    elTicketBuyQty.innerText = `${firstDayQty}주`;
    elTicketBuyCost.innerText = `$${(firstDayQty * (avgPrice || 0)).toFixed(2)}`;
    elTicketSellQPrice.innerText = '-';
    elTicketSellQQty.innerText = '0주';
    if (elTicketSellQSub) elTicketSellQSub.innerText = '';
    elTicketSellTPrice.innerText = '-';
    elTicketSellTQty.innerText = '0주';
    if (elTicketSellTSub) elTicketSellTSub.innerText = '';
  } else {
    elTicketBuyBadge.innerText = '📥 LOC 매수';
    elTicketBuyPrice.innerText = `$${locBuyPrice.toFixed(2)}`;
    elTicketBuySub.innerText = '이하 체결';
    elTicketBuyQty.innerText = `${buyQty}주`;
    elTicketBuyCost.innerText = `$${buyTotalCost.toFixed(2)}`;
    elTicketSellQPrice.innerText = `$${locSellQPrice.toFixed(2)}`;
    elTicketSellQQty.innerText = `${sellQQty}주`;
    if (elTicketSellQSub) elTicketSellQSub.innerText = `(보유 ${shares}주 중 ${sellQQty}주)`;
    if (elTicketSellTBadge) elTicketSellTBadge.innerText = `🎯 지정가 매도 (+${targetProfitPctVal}%)`;
    elTicketSellTPrice.innerText = `$${targetSellPrice.toFixed(2)}`;
    elTicketSellTQty.innerText = `${sellTQty}주`;
    if (elTicketSellTSub) elTicketSellTSub.innerText = `(보유 ${shares}주 중 ${sellTQty}주)`;
    if (elBtnApplyTargetText) elBtnApplyTargetText.innerText = `🎯 +${targetProfitPctVal}% 지정가 익절 체결 (수익금 복리합산 & T=0 새 사이클 시작)`;
  }

  const nextBuyT = Math.min(N, T + 1);
  const nextBuyCash = Math.max(0, cashRemaining - buyTotalCost);
  elScenBuyT.innerText = nextBuyT.toFixed(2);
  elScenBuyQty.innerText = `${shares + buyQty}주`;
  elScenBuyCash.innerText = `$${nextBuyCash.toFixed(0)}`;

  const nextSellT = T * 0.75;
  const sellProceeds = sellQQty * locSellQPrice;
  elScenSellT.innerText = nextSellT.toFixed(2);
  elScenSellQty.innerText = `${Math.max(0, shares - sellQQty)}주`;
  elScenSellCash.innerText = `+$${sellProceeds.toFixed(0)} 회복`;
}

// ====== 1-CLICK EXECUTION HANDLERS (WITH CUSTOM MODAL DIALOG) ======

// Custom Modal Controls
function openModal(type, isRestoring = false) {
  const r = currentCalcResult;
  const modal = document.getElementById('custom-modal');
  const title = document.getElementById('modal-title');
  const desc = document.getElementById('modal-desc');
  const label1 = document.getElementById('modal-label-1');
  const input1 = document.getElementById('modal-input-1');
  const label2 = document.getElementById('modal-label-2');
  const input2 = document.getElementById('modal-input-2');
  const group2 = document.getElementById('modal-input-group-2');

  if (!isRestoring) {
    state.pendingModal = {
      type: type,
      input1: '',
      input2: ''
    };
    saveState();
  }

  // Reset fields
  input1.value = '';
  input2.value = '';
  group2.style.display = 'none';

  if (type === 'buy') {
    title.innerText = '📥 매수 체결 반영';
    if (r.shares === 0) {
      const firstDayBudget = r.capital / r.N;
      const orderedQty = r.avgPrice > 0 ? Math.floor(firstDayBudget / r.avgPrice) : 0;
      desc.innerText = `[1일차 큰수매수 체결]\n주문 수량: ${orderedQty}주 (주문표 기준)\n오늘 실제 체결가(종가)를 입력하세요.`;
      const defaultPrice = r.avgPrice > 0 ? r.avgPrice : 190.00;
      input1.value = defaultPrice.toFixed(2);
    } else {
      desc.innerText = `오늘 실제 체결가(종가)를 입력하세요.\n(LOC 매수 한도가 $${r.locBuyPrice.toFixed(2)} 이하였으며, 종가가 더 낮았다면 그 가격을 입력하세요.)`;
      input1.value = r.locBuyPrice.toFixed(2);
    }
    label1.innerText = '실제 체결가 ($)';
  } 
  else if (type === 'sell') {
    title.innerText = '📤 쿼터매도 체결 반영';
    desc.innerText = `오늘 실제 체결가(종가)를 입력하세요.\n(LOC 쿼터매도 조건은 $${r.locSellQPrice.toFixed(2)} 이상이었으며, 종가가 더 높았다면 그 가격을 입력하세요.)`;
    label1.innerText = '실제 체결가 ($)';
    input1.value = r.locSellQPrice.toFixed(2);
  }
  else if (type === 'target') {
    title.innerText = '🎯 지정가 익절 체결 반영';
    desc.innerText = `지정가 매도(+${r.targetProfitPctVal || 20}%) 및 LOC 쿼터매도 체결 결과를 입력하세요.`;
    
    label1.innerText = `지정가 매도 (+${r.targetProfitPctVal || 20}%) 체결가 ($) [수량: ${r.sellTQty}주]`;
    input1.value = r.targetSellPrice.toFixed(2);
    
    group2.style.display = 'flex';
    label2.innerText = `LOC 쿼터매도 체결가 ($) [수량: ${r.sellQQty}주] (미체결 시 0)`;
    input2.value = '0';
  }
  else if (type === 'both') {
    title.innerText = '🔄 매수 + 쿼터매도 동시 체결';
    desc.innerText = `오늘 실제 종가(=체결가)를 입력하세요.\n\n처리 순서: ① 쿼터매도 ${r.sellQQty}주 → ② 매수 ${r.buyQty}주\n(원래 보유수량 ${r.shares}주 기준 1/4 = ${r.sellQQty}주 매도 후 매수)`;
    label1.innerText = '실제 종가 ($)';
    input1.value = r.locSellQPrice.toFixed(2);
  }

  if (!isRestoring) {
    state.pendingModal.input1 = input1.value;
    state.pendingModal.input2 = input2.value;
    saveState();
  }

  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('custom-modal');
  modal.classList.remove('show');
  document.body.style.overflow = '';
  state.pendingModal = null;
  saveState();
}

function saveModalInputs() {
  if (state.pendingModal) {
    state.pendingModal.input1 = document.getElementById('modal-input-1').value;
    state.pendingModal.input2 = document.getElementById('modal-input-2').value;
    saveState();
  }
}

function restorePendingModal() {
  if (!state.pendingModal || !state.pendingModal.type) return;
  
  const type = state.pendingModal.type;
  const savedInput1 = state.pendingModal.input1;
  const savedInput2 = state.pendingModal.input2;

  openModal(type, true);

  if (savedInput1 !== undefined && savedInput1 !== '') {
    document.getElementById('modal-input-1').value = savedInput1;
  }
  if (savedInput2 !== undefined && savedInput2 !== '') {
    document.getElementById('modal-input-2').value = savedInput2;
  }

  state.pendingModal = {
    type: type,
    input1: document.getElementById('modal-input-1').value,
    input2: document.getElementById('modal-input-2').value
  };
  saveState();
}

function handleModalSubmit() {
  if (!state.pendingModal || !state.pendingModal.type) return;

  const type = state.pendingModal.type;
  const val1 = parseFloat(document.getElementById('modal-input-1').value);
  const val2 = parseFloat(document.getElementById('modal-input-2').value);

  if (type === 'buy') {
    submitBuy(val1);
  } else if (type === 'sell') {
    submitSell(val1);
  } else if (type === 'target') {
    submitTarget(val1, val2);
  } else if (type === 'both') {
    submitBoth(val1);
  }
}

// 📥 매수 체결 반영 버튼 클릭시 호출
function applyBuyExecution() {
  const r = currentCalcResult;
  if (r.shares > 0 && r.buyQty <= 0) {
    showToast('매수 가능한 수량이 0주입니다.');
    return;
  }
  openModal('buy');
}

function submitBuy(actualPrice) {
  const r = currentCalcResult;
  if (isNaN(actualPrice) || actualPrice <= 0) {
    showToast('올바른 가격을 입력해주세요.');
    return;
  }

  if (r.shares === 0) {
    // First day big buy
    const firstDayBudget = r.capital / r.N;
    const orderedQty = r.avgPrice > 0 ? Math.floor(firstDayBudget / r.avgPrice) : 0;
    if (orderedQty <= 0) {
      showToast('평단가(전일종가)를 먼저 입력해주세요.');
      return;
    }

    const totalCost = orderedQty * actualPrice;
    const newCash = r.capital - totalCost;

    state.explicitT = 1;
    state.explicitCash = newCash;
    state.sharesHeld = orderedQty;
    state.avgPrice = actualPrice;

    elSharesHeld.value = orderedQty;
    elAvgPrice.value = actualPrice.toFixed(4);
    elCashLeft.value = newCash.toFixed(2);
    
    showToast(`📥 1일차 매수 완료! ${orderedQty}주 ($${actualPrice.toFixed(2)}), T=1, 잔금=$${newCash.toFixed(0)}`);
  } else {
    const actualTotalCost = r.buyQty * actualPrice;
    const newShares = r.shares + r.buyQty;
    const newCash = Math.max(0, r.cashRemaining - actualTotalCost);
    const newT = Math.min(r.N, r.T + 1);

    // New Weighted Avg Price
    const newAvgPrice = ((r.shares * r.avgPrice) + (r.buyQty * actualPrice)) / newShares;

    state.explicitT = newT;
    state.explicitCash = newCash;
    state.sharesHeld = newShares;
    state.avgPrice = parseFloat(newAvgPrice.toFixed(4));

    elSharesHeld.value = newShares;
    elAvgPrice.value = newAvgPrice.toFixed(4);
    elCashLeft.value = newCash.toFixed(2);

    showToast(`📥 체결 반영! ${r.buyQty}주 매수 ($${actualPrice.toFixed(2)}), 평단가 $${newAvgPrice.toFixed(2)}, T=${newT.toFixed(2)}`);
  }

  closeModal();
  calculate();
}

// 📤 쿼터매도 체결 반영 버튼 클릭시 호출
function applySellExecution() {
  const r = currentCalcResult;
  if (r.sellQQty <= 0) {
    showToast('매도할 쿼터 수량이 없습니다.');
    return;
  }
  openModal('sell');
}

function submitSell(actualPrice) {
  const r = currentCalcResult;
  if (isNaN(actualPrice) || actualPrice <= 0) {
    showToast('올바른 체결가를 입력해주세요.');
    return;
  }

  const newShares = Math.max(0, r.shares - r.sellQQty);
  const sellProceeds = r.sellQQty * actualPrice;
  const newCash = r.cashRemaining + sellProceeds;
  const newT = r.T * 0.75;

  const costBasis = r.sellQQty * r.avgPrice;
  const realizedPL = sellProceeds - costBasis;

  state.explicitT = newT;
  state.explicitCash = newCash;
  state.sharesHeld = newShares;

  elSharesHeld.value = newShares;
  elCashLeft.value = newCash.toFixed(2);

  const plText = realizedPL >= 0 ? `+$${realizedPL.toFixed(0)} 이익` : `-$${Math.abs(realizedPL).toFixed(0)} 손실`;
  showToast(`📤 쿼터매도 체결 반영! ${r.sellQQty}주 매도 ($${actualPrice.toFixed(2)}), T=${newT.toFixed(2)}, 잔금 $${newCash.toFixed(0)} (${plText})`);

  closeModal();
  calculate();
}

// 🎯 지정가 익절 버튼 클릭시 호출
function applyTargetSellExecution() {
  const r = currentCalcResult;
  if (r.shares <= 0) {
    showToast('현재 보유 주식이 없습니다.');
    return;
  }
  openModal('target');
}

function submitTarget(targetPrice, quarterPrice) {
  const r = currentCalcResult;

  if (isNaN(targetPrice) || targetPrice <= 0) {
    showToast('올바른 지정가 매도 가격을 입력해주세요.');
    return;
  }

  let quarterRevenue = 0;
  if (r.sellQQty > 0 && !isNaN(quarterPrice) && quarterPrice > 0) {
    quarterRevenue = r.sellQQty * quarterPrice;
  }

  const targetRevenue = r.sellTQty * targetPrice;
  const totalSold = quarterRevenue > 0 ? r.shares : r.sellTQty;
  const totalRevenue = targetRevenue + quarterRevenue;
  const remainingShares = r.shares - totalSold;
  const newTotalCapital = Math.round(r.cashRemaining + totalRevenue);
  const profit = newTotalCapital - r.capital;
  const profitPct = ((profit / r.capital) * 100).toFixed(1);

  let detailText = `지정가: ${r.sellTQty}주 × $${targetPrice.toFixed(2)} = $${targetRevenue.toFixed(0)}`;
  if (quarterRevenue > 0) {
    detailText += `\nLOC 쿼터: ${r.sellQQty}주 × $${(quarterRevenue / r.sellQQty).toFixed(2)} = $${quarterRevenue.toFixed(0)}`;
  } else if (r.sellQQty > 0) {
    detailText += `\nLOC 쿼터: ${r.sellQQty}주 미체결 (${remainingShares}주 잔류)`;
  }

  if (remainingShares > 0) {
    if (confirm(
      `⚠️ 부분 익절 정산\n\n` +
      `${detailText}\n` +
      `보유 잔금: $${r.cashRemaining.toFixed(0)}\n` +
      `────────────────\n` +
      `잔여 ${remainingShares}주는 다음날 별도 처리 필요\n` +
      `(지금은 매도된 ${r.sellTQty}주만 반영합니다)\n\n` +
      `반영하시겠습니까?`
    )) {
      const newShares = remainingShares;
      const newCash = r.cashRemaining + targetRevenue;
      const soldRatio = r.sellTQty / r.shares;
      const newT = r.T * (1 - soldRatio);

      state.explicitT = newT;
      state.explicitCash = newCash;
      state.sharesHeld = newShares;

      elSharesHeld.value = newShares;
      elCashLeft.value = newCash.toFixed(2);

      showToast(`⚠️ 부분 익절! ${r.sellTQty}주 매도, ${remainingShares}주 잔류, 잔금 $${newCash.toFixed(0)}`);
      closeModal();
      calculate();
    }
  } else {
    if (confirm(
      `🎉 지정가 익절 전량 체결!\n\n` +
      `${detailText}\n` +
      `보유 잔금: $${r.cashRemaining.toFixed(0)}\n` +
      `────────────────\n` +
      `새 복리 원금: $${newTotalCapital.toLocaleString()} (${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}, ${profit >= 0 ? '+' : ''}${profitPct}%)\n\n` +
      `이 정산금액으로 새 사이클(T=0)을 시작하시겠습니까?`
    )) {
      state.totalCapital = newTotalCapital;
      state.sharesHeld = 0;
      state.avgPrice = 0;
      state.explicitT = 0;
      state.explicitCash = newTotalCapital;

      elTotalCapital.value = newTotalCapital;
      elSharesHeld.value = 0;
      elAvgPrice.value = '';
      elCashLeft.value = '';
      state.explicitCash = null;

      showToast(`🎉 축하합니다! 원금 $${newTotalCapital.toLocaleString()} (${profit >= 0 ? '+' : ''}${profitPct}%) 새 사이클 시작!`);
      closeModal();
      calculate();
    }
  }
}

// 🔄 매수 + 쿼터매도 동시 체결 반영 (같은 종가) 버튼 클릭시 호출
function applyBothExecution() {
  const r = currentCalcResult;
  if (r.shares === 0) {
    showToast('새 사이클에서는 동시 체결이 없습니다.');
    return;
  }
  if (r.buyQty <= 0 && r.sellQQty <= 0) {
    showToast('매수/매도 가능한 수량이 없습니다.');
    return;
  }
  openModal('both');
}

function submitBoth(closingPrice) {
  const r = currentCalcResult;
  if (isNaN(closingPrice) || closingPrice <= 0) {
    showToast('올바른 종가를 입력해주세요.');
    return;
  }

  const originalShares = r.shares;
  const originalAvg = r.avgPrice;
  const sellQQty = Math.floor(originalShares / 4);
  const sellProceeds = sellQQty * closingPrice;
  const sharesAfterSell = originalShares - sellQQty;
  const cashAfterSell = r.cashRemaining + sellProceeds;
  const tAfterSell = r.T * 0.75;

  const sellCostBasis = sellQQty * originalAvg;
  const sellPL = sellProceeds - sellCostBasis;

  const buyQty = r.buyQty;
  let finalShares = sharesAfterSell;
  let finalCash = cashAfterSell;
  let finalAvg = originalAvg;
  let finalT = tAfterSell;

  if (buyQty > 0) {
    const buyCost = buyQty * closingPrice;
    finalShares = sharesAfterSell + buyQty;
    finalCash = cashAfterSell - buyCost;
    finalAvg = ((sharesAfterSell * originalAvg) + (buyQty * closingPrice)) / finalShares;
    finalT = tAfterSell + 1;
  }

  const totalPL = sellPL;
  const plText = totalPL >= 0 ? `+$${totalPL.toFixed(0)}` : `-$${Math.abs(totalPL).toFixed(0)}`;

  if (confirm(
    `🔄 동시 체결 정산 확인\n\n` +
    `종가: $${closingPrice.toFixed(2)}\n` +
    `────────────────\n` +
    `① 쿼터매도: ${sellQQty}주 × $${closingPrice.toFixed(2)} = $${sellProceeds.toFixed(0)} (${plText})\n` +
    `② 매수: ${buyQty}주 × $${closingPrice.toFixed(2)} = $${(buyQty * closingPrice).toFixed(0)}\n` +
    `────────────────\n` +
    `결과: ${finalShares}주, 평단 $${finalAvg.toFixed(4)}, 잔금 $${finalCash.toFixed(0)}, T=${finalT.toFixed(2)}\n\n` +
    `이대로 반영하시겠습니까?`
  )) {
    state.explicitT = finalT;
    state.explicitCash = finalCash;
    state.sharesHeld = finalShares;
    state.avgPrice = parseFloat(finalAvg.toFixed(4));

    elSharesHeld.value = finalShares;
    elAvgPrice.value = finalAvg.toFixed(4);
    elCashLeft.value = finalCash.toFixed(2);

    showToast(`🔄 동시 체결 완료! ${finalShares}주, T=${finalT.toFixed(2)}, 잔금 $${finalCash.toFixed(0)} (쿼터매도 ${plText})`);
    closeModal();
    calculate();
  }
}

// UTILITIES
function copyText(text) {
  if (!text || text === '-') return;
  const cleanText = text.replace('$', '').trim();
  navigator.clipboard.writeText(cleanText).then(() => {
    showToast(`$${cleanText} 복사 완료!`);
  }).catch(() => {
    showToast(`복사 완료: ${cleanText}`);
  });
}

function copyAllOrders() {
  const symbol = elSymbol.value;
  const buyP = elTicketBuyPrice.innerText;
  const buyQ = elTicketBuyQty.innerText;
  const sellQP = elTicketSellQPrice.innerText;
  const sellQQ = elTicketSellQQty.innerText;
  const sellTP = elTicketSellTPrice.innerText;
  const sellTQ = elTicketSellTQty.innerText;

  const fullText = `[${symbol} 무한매수법 V4 오늘의 주문]\n- LOC 매수: ${buyP} (${buyQ})\n- LOC 쿼터매도: ${sellQP} (${sellQQ})\n- 지정가 매도: ${sellTP} (${sellTQ})`;

  navigator.clipboard.writeText(fullText).then(() => {
    showToast('전체 주문표 텍스트가 복사되었습니다!');
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
