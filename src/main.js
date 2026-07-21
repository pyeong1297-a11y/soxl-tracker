// LocalStorage Key
const STORAGE_KEY = 'infinity_buying_v4_state';

// Initial default state
const defaultState = {
  symbol: 'SOXL',
  splitCount: 30,
  totalCapital: 6000,
  avgPrice: 194.6026,
  sharesHeld: 19,
  explicitT: null,
  explicitCash: null
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
const elTicketSellTPrice = document.getElementById('ticket-sell-t-price');
const elTicketSellTQty = document.getElementById('ticket-sell-t-qty');

const elScenBuyT = document.getElementById('scen-buy-t');
const elScenBuyQty = document.getElementById('scen-buy-qty');
const elScenBuyCash = document.getElementById('scen-buy-cash');
const elScenSellT = document.getElementById('scen-sell-t');
const elScenSellQty = document.getElementById('scen-sell-qty');
const elScenSellCash = document.getElementById('scen-sell-cash');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  calculate();
});

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
  elAvgPrice.value = state.avgPrice || 194.6026;
  elSharesHeld.value = state.sharesHeld !== undefined ? state.sharesHeld : 19;
  elCashLeft.value = (state.explicitCash !== null && state.explicitCash !== undefined) ? state.explicitCash : '';
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
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

  const targetProfitPct = (symbol === 'TQQQ') ? 1.15 : 1.20;
  const targetSellPrice = avgPrice * targetProfitPct;
  const sellTQty = Math.max(0, shares - sellQQty);

  currentCalcResult = {
    T, cashRemaining, buyQty, sellQQty, sellTQty,
    locBuyPrice, locSellQPrice, targetSellPrice, buyTotalCost,
    baseConst, coef, N, avgPrice, shares, capital
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
    elTicketSellTPrice.innerText = '-';
    elTicketSellTQty.innerText = '0주';
  } else {
    elTicketBuyBadge.innerText = '📥 LOC 매수';
    elTicketBuyPrice.innerText = `$${locBuyPrice.toFixed(2)}`;
    elTicketBuySub.innerText = '이하 체결';
    elTicketBuyQty.innerText = `${buyQty}주`;
    elTicketBuyCost.innerText = `$${buyTotalCost.toFixed(2)}`;
    elTicketSellQPrice.innerText = `$${locSellQPrice.toFixed(2)}`;
    elTicketSellQQty.innerText = `${sellQQty}주`;
    elTicketSellTPrice.innerText = `$${targetSellPrice.toFixed(2)}`;
    elTicketSellTQty.innerText = `${sellTQty}주`;
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

// ====== 1-CLICK EXECUTION HANDLERS (WITH ACTUAL EXECUTED PRICE PROMPT) ======

// 📥 매수 체결 반영 (실제 체결가/종가 입력 지원)
function applyBuyExecution() {
  const r = currentCalcResult;

  if (r.shares === 0) {
    // First day big buy
    const defaultPrice = r.avgPrice > 0 ? r.avgPrice : 190.00;
    const inputStr = prompt(`📥 [1일차 큰수매수 체결]\n오늘 실제 체결가(종가)를 입력하세요:`, defaultPrice.toFixed(2));
    if (inputStr === null) return; // User cancelled
    
    const actualPrice = parseFloat(inputStr);
    if (isNaN(actualPrice) || actualPrice <= 0) {
      showToast('올바른 가격을 입력해주세요.');
      return;
    }

    const firstDayBudget = r.capital / r.N;
    const firstDayQty = Math.floor(firstDayBudget / actualPrice);
    if (firstDayQty <= 0) {
      showToast('예산 부족으로 매수 불가합니다.');
      return;
    }

    const totalCost = firstDayQty * actualPrice;
    const newShares = firstDayQty;
    const newCash = r.capital - totalCost;

    state.explicitT = 1;
    state.explicitCash = newCash;
    state.sharesHeld = newShares;
    state.avgPrice = actualPrice;

    elSharesHeld.value = newShares;
    elAvgPrice.value = actualPrice.toFixed(4);
    elCashLeft.value = newCash.toFixed(2);
    calculate();
    showToast(`📥 1일차 매수 완료! ${newShares}주 ($${actualPrice.toFixed(2)}), T=1, 잔금=$${newCash.toFixed(0)}`);
    return;
  }

  if (r.buyQty <= 0) {
    showToast('매수 가능한 수량이 0주입니다.');
    return;
  }

  // Ask for ACTUAL executed price (defaults to locBuyPrice)
  const defaultPrice = r.locBuyPrice;
  const inputStr = prompt(
    `📥 [매수 체결 반영]\n` +
    `오늘 실제 체결가(종가)를 입력하세요.\n` +
    `(LOC 매수 한도가 $${r.locBuyPrice.toFixed(2)} 이하였으며, 종가가 더 낮았다면 그 가격을 입력하세요):`,
    defaultPrice.toFixed(2)
  );

  if (inputStr === null) return; // User cancelled

  const actualPrice = parseFloat(inputStr);
  if (isNaN(actualPrice) || actualPrice <= 0) {
    showToast('올바른 체결가를 입력해주세요.');
    return;
  }

  const actualTotalCost = r.buyQty * actualPrice;
  const newShares = r.shares + r.buyQty;
  const newCash = Math.max(0, r.cashRemaining - actualTotalCost);
  const newT = Math.min(r.N, r.T + 1);

  // New Weighted Avg Price: (old_shares * old_avg + new_shares * actual_price) / total_shares
  const newAvgPrice = ((r.shares * r.avgPrice) + (r.buyQty * actualPrice)) / newShares;

  state.explicitT = newT;
  state.explicitCash = newCash;
  state.sharesHeld = newShares;
  state.avgPrice = parseFloat(newAvgPrice.toFixed(4));

  elSharesHeld.value = newShares;
  elAvgPrice.value = newAvgPrice.toFixed(4);
  elCashLeft.value = newCash.toFixed(2);
  calculate();

  showToast(`📥 체결 반영! ${r.buyQty}주 매수 ($${actualPrice.toFixed(2)}), 평단가 $${newAvgPrice.toFixed(2)}, T=${newT.toFixed(2)}`);
}

// 📤 쿼터매도 체결 반영 (실제 체결가/종가 입력 지원)
function applySellExecution() {
  const r = currentCalcResult;
  if (r.sellQQty <= 0) {
    showToast('매도할 쿼터 수량이 없습니다.');
    return;
  }

  // Ask for ACTUAL executed price (defaults to locSellQPrice)
  const defaultPrice = r.locSellQPrice;
  const inputStr = prompt(
    `📤 [쿼터매도 체결 반영]\n` +
    `오늘 실제 체결가(종가)를 입력하세요.\n` +
    `(LOC 쿼터매도 조건은 $${r.locSellQPrice.toFixed(2)} 이상이었으며, 종가가 더 높았다면 그 가격을 입력하세요):`,
    defaultPrice.toFixed(2)
  );

  if (inputStr === null) return; // User cancelled

  const actualPrice = parseFloat(inputStr);
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
  calculate();

  const plText = realizedPL >= 0 ? `+$${realizedPL.toFixed(0)} 이익` : `-$${Math.abs(realizedPL).toFixed(0)} 손실`;
  showToast(`📤 쿼터매도 체결 반영! ${r.sellQQty}주 매도 ($${actualPrice.toFixed(2)}), T=${newT.toFixed(2)}, 잔금 $${newCash.toFixed(0)} (${plText})`);
}

// 🎯 지정가 익절 (실제 체결가 입력 지원)
function applyTargetSellExecution() {
  const r = currentCalcResult;
  if (r.shares <= 0) {
    showToast('현재 보유 주식이 없습니다.');
    return;
  }

  const defaultPrice = r.targetSellPrice;
  const inputStr = prompt(
    `🎯 [+20% 지정가 익절 체결]\n` +
    `오늘 실제 체결된 지정가/종가를 입력하세요:`,
    defaultPrice.toFixed(2)
  );

  if (inputStr === null) return;

  const actualPrice = parseFloat(inputStr);
  if (isNaN(actualPrice) || actualPrice <= 0) {
    showToast('올바른 가격을 입력해주세요.');
    return;
  }

  const sellRevenue = r.shares * actualPrice;
  const newTotalCapital = Math.round(r.cashRemaining + sellRevenue);
  const profit = newTotalCapital - r.capital;
  const profitPct = ((profit / r.capital) * 100).toFixed(1);

  if (confirm(
    `🎉 지정가 익절 체결 정산!\n\n` +
    `매도 총액: ${r.shares}주 × $${actualPrice.toFixed(2)} = $${sellRevenue.toFixed(0)}\n` +
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

    calculate();
    showToast(`🎉 축하합니다! 원금 $${newTotalCapital.toLocaleString()} (${profit >= 0 ? '+' : ''}${profitPct}%) 새 사이클 시작!`);
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
