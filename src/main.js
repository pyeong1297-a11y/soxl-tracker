// LocalStorage Key
const STORAGE_KEY = 'infinity_buying_v4_state';

// Initial default state
const defaultState = {
  symbol: 'SOXL',
  splitCount: 30,
  totalCapital: 6000,
  avgPrice: 194.6026,
  sharesHeld: 19,
  customCash: ''
};

// State container
let state = { ...defaultState };

// Computed state cache for execution
let currentCalcResult = {
  buyQty: 0,
  sellQQty: 0,
  locBuyPrice: 0,
  locSellQPrice: 0
};

// DOM Elements
const elSymbol = document.getElementById('symbol');
const elSplitCount = document.getElementById('split-count');
const elTotalCapital = document.getElementById('total-capital');
const elAvgPrice = document.getElementById('avg-price');
const elSharesHeld = document.getElementById('shares-held');
const elCashLeft = document.getElementById('cash-left');

// Metric displays
const elDispTVal = document.getElementById('disp-t-val');
const elDispPhase = document.getElementById('disp-phase');
const elDispBuyBudget = document.getElementById('disp-buy-budget');
const elDispBuyShares = document.getElementById('disp-buy-shares');
const elDispStarPct = document.getElementById('disp-star-pct');
const elDispStarStatus = document.getElementById('disp-star-status');
const elWarningBanner = document.getElementById('warning-banner');
const elWarningText = document.getElementById('warning-text');
const elModeBadge = document.getElementById('mode-badge');

// Ticket Displays
const elTicketBuyPrice = document.getElementById('ticket-buy-price');
const elTicketBuyQty = document.getElementById('ticket-buy-qty');
const elTicketBuyCost = document.getElementById('ticket-buy-cost');

const elTicketSellQPrice = document.getElementById('ticket-sell-q-price');
const elTicketSellQQty = document.getElementById('ticket-sell-q-qty');

const elTicketSellTPrice = document.getElementById('ticket-sell-t-price');
const elTicketSellTQty = document.getElementById('ticket-sell-t-qty');

// Scenario Displays
const elScenBuyT = document.getElementById('scen-buy-t');
const elScenBuyQty = document.getElementById('scen-buy-qty');
const elScenBuyCash = document.getElementById('scen-buy-cash');
const elScenBuyStar = document.getElementById('scen-buy-star');

const elScenSellT = document.getElementById('scen-sell-t');
const elScenSellQty = document.getElementById('scen-sell-qty');
const elScenSellCash = document.getElementById('scen-sell-cash');
const elScenSellStar = document.getElementById('scen-sell-star');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  calculate();
});

// Load state from localStorage
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

  // Populate inputs
  elSymbol.value = state.symbol || 'SOXL';
  elSplitCount.value = state.splitCount || 30;
  elTotalCapital.value = state.totalCapital || 6000;
  elAvgPrice.value = state.avgPrice || 194.6026;
  elSharesHeld.value = state.sharesHeld || 19;
  elCashLeft.value = state.customCash || '';
}

// Save state to localStorage
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

// Handle manual cash input
function onCashInput() {
  calculate();
}

// Reset defaults
function resetDefaults() {
  if (confirm('모든 입력값을 기본값으로 초기화하시겠습니까?')) {
    state = { ...defaultState };
    localStorage.removeItem(STORAGE_KEY);
    loadSavedState();
    calculate();
  }
}

// Main calculation logic
function calculate() {
  const symbol = elSymbol.value;
  const N = parseFloat(elSplitCount.value) || 30;
  const capital = parseFloat(elTotalCapital.value) || 6000;
  const avgPrice = parseFloat(elAvgPrice.value) || 194.6026;
  const shares = parseFloat(elSharesHeld.value) || 0;
  const customCashVal = elCashLeft.value.trim();

  state = {
    symbol,
    splitCount: N,
    totalCapital: capital,
    avgPrice,
    sharesHeld: shares,
    customCash: customCashVal
  };
  saveState();

  const spentAmount = shares * avgPrice;
  let cashRemaining = capital - spentAmount;
  
  if (customCashVal !== '') {
    const parsedCustomCash = parseFloat(customCashVal);
    if (!isNaN(parsedCustomCash)) {
      cashRemaining = parsedCustomCash;
    }
  }

  if (cashRemaining < 0) cashRemaining = 0;

  // T Calculation
  let T = (spentAmount / capital) * N;
  if (customCashVal !== '') {
    T = ((capital - cashRemaining) / capital) * N;
  }

  if (T < 0) T = 0;
  if (T > N) T = N;

  const halfN = N / 2;
  const isReverseMode = T >= (N - 1);
  const isSecondHalf = T >= halfN;

  // Star % Calculation
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

  const targetProfitPct = (symbol === 'TQQQ') ? 1.15 : 1.20;
  const targetSellPrice = avgPrice * targetProfitPct;
  const sellTQty = Math.max(0, shares - sellQQty);

  // Cache for execution apply
  currentCalcResult = {
    buyQty,
    sellQQty,
    locBuyPrice,
    locSellQPrice,
    buyTotalCost
  };

  // UI Updates
  if (isReverseMode) {
    elModeBadge.innerText = '🔴 리버스모드';
    elModeBadge.className = 'badge badge-warning';
  } else {
    elModeBadge.innerText = '🟢 일반모드';
    elModeBadge.className = 'badge';
  }

  elDispTVal.innerText = T.toFixed(2);
  if (isReverseMode) {
    elDispPhase.innerText = `소진 (T > ${(N - 1).toFixed(0)})`;
  } else if (isSecondHalf) {
    elDispPhase.innerText = `후반전 (T ≥ ${halfN.toFixed(0)})`;
  } else {
    elDispPhase.innerText = `전반전 (T < ${halfN.toFixed(0)})`;
  }

  elDispBuyBudget.innerText = `$${buyBudget.toFixed(2)}`;
  if (buyQty >= 1) {
    elDispBuyShares.innerText = `약 ${buyQty}주 매수 가능`;
  } else {
    elDispBuyShares.innerText = `0주 (예산 부족)`;
  }

  elDispStarPct.innerText = `${starPct >= 0 ? '+' : ''}${starPct.toFixed(2)}%`;
  if (starPct < 0) {
    elDispStarStatus.innerText = '별지점 < 평단가';
  } else if (starPct === 0) {
    elDispStarStatus.innerText = '별지점 = 평단가';
  } else {
    elDispStarStatus.innerText = '별지점 > 평단가';
  }

  if (buyQty === 0 && buyBudget > 0) {
    elWarningBanner.style.display = 'flex';
    elWarningText.innerHTML = `⚠️ 1회 매수 예산(<strong>$${buyBudget.toFixed(2)}</strong>)이 LOC 매수가(<strong>$${locBuyPrice.toFixed(2)}</strong>)보다 작아서 <strong>0주</strong> 매수 체결됩니다.<br/>💡 추천: 20분할 전환 또는 원금을 늘리는 것을 고려해보세요.`;
  } else {
    elWarningBanner.style.display = 'none';
  }

  elTicketBuyPrice.innerText = `$${locBuyPrice.toFixed(2)}`;
  elTicketBuyQty.innerText = `${buyQty}주`;
  elTicketBuyCost.innerText = `$${buyTotalCost.toFixed(2)}`;

  elTicketSellQPrice.innerText = `$${locSellQPrice.toFixed(2)}`;
  elTicketSellQQty.innerText = `${sellQQty}주`;

  elTicketSellTPrice.innerText = `$${targetSellPrice.toFixed(2)}`;
  elTicketSellTQty.innerText = `${sellTQty}주`;

  // Scenario 1: Buy Executed
  const nextBuyT = Math.min(N, T + 1);
  const nextBuyQty = shares + buyQty;
  const nextBuyCash = Math.max(0, cashRemaining - buyTotalCost);
  const nextBuyStarPct = baseConst - (coef * nextBuyT);

  elScenBuyT.innerText = nextBuyT.toFixed(2);
  elScenBuyQty.innerText = `${nextBuyQty}주`;
  elScenBuyCash.innerText = `$${nextBuyCash.toFixed(0)}`;
  elScenBuyStar.innerText = `${nextBuyStarPct >= 0 ? '+' : ''}${nextBuyStarPct.toFixed(2)}%`;

  // Scenario 2: Quarter Sell Executed
  const nextSellT = T * 0.75;
  const nextSellQty = Math.max(0, shares - sellQQty);
  const recoveredCash = sellQQty * locSellQPrice;
  const nextSellStarPct = baseConst - (coef * nextSellT);

  elScenSellT.innerText = nextSellT.toFixed(2);
  elScenSellQty.innerText = `${nextSellQty}주`;
  elScenSellCash.innerText = `+$${recoveredCash.toFixed(0)} 회복`;
  elScenSellStar.innerText = `${nextSellStarPct >= 0 ? '+' : ''}${nextSellStarPct.toFixed(2)}%`;
}

// 1-Click Execution Apply Handlers
function applyBuyExecution() {
  if (currentCalcResult.buyQty <= 0) {
    showToast('매수 가능한 수량이 0주입니다.');
    return;
  }
  const oldShares = parseFloat(elSharesHeld.value) || 0;
  const newShares = oldShares + currentCalcResult.buyQty;
  
  elSharesHeld.value = newShares;
  calculate();
  showToast(`📥 매수 체결 완료! 보유수량: ${newShares}주로 갱신되었습니다.`);
}

function applySellExecution() {
  if (currentCalcResult.sellQQty <= 0) {
    showToast('매도할 쿼터 수량이 없습니다.');
    return;
  }
  const oldShares = parseFloat(elSharesHeld.value) || 0;
  const newShares = Math.max(0, oldShares - currentCalcResult.sellQQty);
  
  elSharesHeld.value = newShares;
  calculate();
  showToast(`📤 쿼터매도 완료! 보유수량: ${newShares}주로 갱신되었습니다.`);
}

// Copy to Clipboard
function copyText(text) {
  if (!text) return;
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
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
