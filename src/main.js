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

// Main calculation logic (quantstack.app V4.0 exact specification)
function calculate() {
  // Read values
  const symbol = elSymbol.value;
  const N = parseFloat(elSplitCount.value) || 30;
  const capital = parseFloat(elTotalCapital.value) || 6000;
  const avgPrice = parseFloat(elAvgPrice.value) || 194.6026;
  const shares = parseFloat(elSharesHeld.value) || 0;
  const customCashVal = elCashLeft.value.trim();

  // Save current input to state
  state = {
    symbol,
    splitCount: N,
    totalCapital: capital,
    avgPrice,
    sharesHeld: shares,
    customCash: customCashVal
  };
  saveState();

  // Calculate spent & cash
  const spentAmount = shares * avgPrice;
  let cashRemaining = capital - spentAmount;
  
  if (customCashVal !== '') {
    const parsedCustomCash = parseFloat(customCashVal);
    if (!isNaN(parsedCustomCash)) {
      cashRemaining = parsedCustomCash;
    }
  }

  if (cashRemaining < 0) cashRemaining = 0;

  // Calculate T (회차)
  // T = N * (Capital - Cash) / Capital
  let T = (spentAmount / capital) * N;
  if (customCashVal !== '') {
    T = ((capital - cashRemaining) / capital) * N;
  }

  if (T < 0) T = 0;
  if (T > N) T = N;

  const halfN = N / 2;
  const isReverseMode = T >= (N - 1); // Reverse mode triggers when T >= N - 1 (e.g. T > 29 for 30 splits)
  const isSecondHalf = T >= halfN;

  // Calculate Star % (별%)
  // quantstack.app formula:
  // SOXL:  20분할=(20 - 2T)%,  30분할=(20 - 4/3T)%,  40분할=(20 - 1T)%
  // TQQQ:  20분할=(15 - 1.5T)%, 30분할=(15 - 1T)%,   40분할=(15 - 0.75T)%
  let baseConst = 20;
  let coef = 40 / N;

  if (symbol === 'TQQQ') {
    baseConst = 15;
    coef = 30 / N;
  }

  const starPct = baseConst - (coef * T);
  
  // Star Point (별지점) = 평단가 * (1 + 별%/100)
  const starPoint = avgPrice * (1 + (starPct / 100));

  // 1-Period Buy Budget (1회 매수금) = 잔금 / (분할수 - T)
  let buyBudget = (N - T) > 0 ? (cashRemaining / (N - T)) : 0;
  if (buyBudget < 0) buyBudget = 0;

  // LOC Buy Price = 별지점 - $0.01 (quantstack.app rule for overlap prevention)
  const locBuyPrice = Math.max(0.01, starPoint - 0.01);

  // Buy Quantity
  const buyQty = locBuyPrice > 0 ? Math.floor(buyBudget / locBuyPrice) : 0;
  const buyTotalCost = buyQty * locBuyPrice;

  // LOC Quarter Sell Price & Qty
  // quantstack.app rule: LOC Quarter Sell at 별지점, Qty = 1/4 of total held shares
  const locSellQPrice = starPoint;
  const sellQQty = Math.floor(shares / 4);

  // Target Limit Sell Price (+20% for SOXL, +15% for TQQQ)
  const targetProfitPct = (symbol === 'TQQQ') ? 1.15 : 1.20;
  const targetSellPrice = avgPrice * targetProfitPct;
  const sellTQty = Math.max(0, shares - sellQQty);

  // --- Update UI Displays ---

  // Mode badge
  if (isReverseMode) {
    elModeBadge.innerText = '🔴 리버스모드';
    elModeBadge.className = 'badge badge-warning';
  } else {
    elModeBadge.innerText = '🟢 일반모드';
    elModeBadge.className = 'badge';
  }

  // Metric 1: T
  elDispTVal.innerText = T.toFixed(2);
  if (isReverseMode) {
    elDispPhase.innerText = `소진 (T > ${(N - 1).toFixed(0)})`;
  } else if (isSecondHalf) {
    elDispPhase.innerText = `후반전 (T ≥ ${halfN.toFixed(0)})`;
  } else {
    elDispPhase.innerText = `전반전 (T < ${halfN.toFixed(0)})`;
  }

  // Metric 2: 1회 매수 예산
  elDispBuyBudget.innerText = `$${buyBudget.toFixed(2)}`;
  if (buyQty >= 1) {
    elDispBuyShares.innerText = `약 ${buyQty}주 매수 가능`;
  } else {
    elDispBuyShares.innerText = `0주 (예산 부족)`;
  }

  // Metric 3: 별%
  elDispStarPct.innerText = `${starPct >= 0 ? '+' : ''}${starPct.toFixed(2)}%`;
  if (starPct < 0) {
    elDispStarStatus.innerText = '별지점 < 평단가';
  } else if (starPct === 0) {
    elDispStarStatus.innerText = '별지점 = 평단가';
  } else {
    elDispStarStatus.innerText = '별지점 > 평단가';
  }

  // Smart Warning Check
  if (buyQty === 0 && buyBudget > 0) {
    elWarningBanner.style.display = 'flex';
    elWarningText.innerHTML = `⚠️ 1회 매수 예산(<strong>$${buyBudget.toFixed(2)}</strong>)이 LOC 매수가(<strong>$${locBuyPrice.toFixed(2)}</strong>)보다 작아서 <strong>0주</strong> 매수 체결됩니다.<br/>💡 추천: 20분할 전환 또는 원금을 늘리는 것을 고려해보세요.`;
  } else {
    elWarningBanner.style.display = 'none';
  }

  // Ticket: LOC Buy
  elTicketBuyPrice.innerText = `$${locBuyPrice.toFixed(2)}`;
  elTicketBuyQty.innerText = `${buyQty}주`;
  elTicketBuyCost.innerText = `$${buyTotalCost.toFixed(2)}`;

  // Ticket: LOC Quarter Sell
  elTicketSellQPrice.innerText = `$${locSellQPrice.toFixed(2)}`;
  elTicketSellQQty.innerText = `${sellQQty}주`;

  // Ticket: Limit Target Sell
  elTicketSellTPrice.innerText = `$${targetSellPrice.toFixed(2)}`;
  elTicketSellTQty.innerText = `${sellTQty}주`;

  // --- Scenario Predictions ---

  // Scenario 1: Buy Executed (+1 buyQty)
  const nextBuyT = Math.min(N, T + 1);
  const nextBuyQty = shares + buyQty;
  const nextBuyCash = Math.max(0, cashRemaining - buyTotalCost);
  const nextBuyStarPct = baseConst - (coef * nextBuyT);

  elScenBuyT.innerText = nextBuyT.toFixed(2);
  elScenBuyQty.innerText = `${nextBuyQty}주`;
  elScenBuyCash.innerText = `$${nextBuyCash.toFixed(0)}`;
  elScenBuyStar.innerText = `${nextBuyStarPct >= 0 ? '+' : ''}${nextBuyStarPct.toFixed(2)}%`;

  // Scenario 2: Quarter Sell Executed (-sellQQty)
  const nextSellT = T * 0.75;
  const nextSellQty = Math.max(0, shares - sellQQty);
  const recoveredCash = sellQQty * locSellQPrice;
  const nextSellStarPct = baseConst - (coef * nextSellT);

  elScenSellT.innerText = nextSellT.toFixed(2);
  elScenSellQty.innerText = `${nextSellQty}주`;
  elScenSellCash.innerText = `+$${recoveredCash.toFixed(0)} 회복`;
  elScenSellStar.innerText = `${nextSellStarPct >= 0 ? '+' : ''}${nextSellStarPct.toFixed(2)}%`;
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

// Copy All Orders Text
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

// Toast notification helper
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}
