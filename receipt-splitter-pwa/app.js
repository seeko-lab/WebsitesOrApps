const STORAGE_KEY = "split-studio-state-v1";
const CENTS = 100;

const icons = {
  receipt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-3-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v5l3 2"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 16V4M8 8l4-4 4 4"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l2-3h4l2 3h4v11H4Z"/><circle cx="12" cy="13" r="4"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>'
};

const defaultState = () => ({
  tab: "scan",
  step: "start",
  toast: "",
  modal: null,
  draft: null,
  bills: []
});

let state = loadState();
const app = document.getElementById("app");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultState(), ...saved, toast: "", modal: null } : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState() {
  const clean = { ...state, toast: "", modal: null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date());
}

function newBill() {
  const personA = uid("person");
  const personB = uid("person");
  return {
    id: uid("bill"),
    title: `Receipt ${todayLabel()}`,
    merchant: "",
    date: new Date().toISOString().slice(0, 10),
    currency: "EGP",
    printedTotal: 0,
    service: 0,
    tip: 0,
    tax: 0,
    discount: 0,
    splitMode: "even",
    extrasMode: "proportional",
    people: [
      { id: personA, name: "Person 1" },
      { id: personB, name: "Person 2" }
    ],
    items: [
      { id: uid("item"), name: "Main item", qty: 1, unit: 12000 },
      { id: uid("item"), name: "Shared item", qty: 1, unit: 8000 }
    ],
    assignments: {},
    preview: "",
    finalizedAt: "",
    updatedAt: Date.now(),
    edited: false
  };
}

function centsFromInput(value) {
  const normalized = String(value || "")
    .replace(/[^\d.,-]/g, "")
    .replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * CENTS);
}

function qtyFromInput(value) {
  const n = Number(String(value || "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 1000) / 1000;
}

function formatMoney(cents, currency = "EGP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format((cents || 0) / CENTS);
}

function inputMoney(cents) {
  return ((cents || 0) / CENTS).toFixed(2);
}

function billMath(bill) {
  const items = bill.items.reduce((sum, item) => sum + Math.round(item.qty * item.unit), 0);
  const extras = (bill.service || 0) + (bill.tip || 0) + (bill.tax || 0) - (bill.discount || 0);
  const calculated = items + extras;
  const grand = bill.printedTotal > 0 ? bill.printedTotal : calculated;
  return { items, extras, calculated, grand, diff: grand - calculated };
}

function allocate(amount, weights) {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (amount === 0 || total === 0) return weights.map(() => 0);
  const sign = amount < 0 ? -1 : 1;
  const absAmount = Math.abs(amount);
  const shares = weights.map((weight, index) => {
    const raw = (absAmount * Math.max(0, weight)) / total;
    return { index, floor: Math.floor(raw), rem: raw - Math.floor(raw) };
  });
  let used = shares.reduce((sum, share) => sum + share.floor, 0);
  shares
    .slice()
    .sort((a, b) => b.rem - a.rem || a.index - b.index)
    .slice(0, absAmount - used)
    .forEach((share) => {
      shares[share.index].floor += 1;
      used += 1;
    });
  return shares.map((share) => share.floor * sign);
}

function splitBill(bill) {
  const math = billMath(bill);
  const people = bill.people.length ? bill.people : [{ id: "solo", name: "Person 1" }];
  if (bill.splitMode === "even") {
    const totals = allocate(math.grand, people.map(() => 1));
    const itemParts = allocate(math.items, people.map(() => 1));
    const extraParts = totals.map((total, index) => total - itemParts[index]);
    return people.map((person, index) => ({
      person,
      itemTotal: itemParts[index],
      extras: extraParts[index],
      total: totals[index],
      assigned: []
    }));
  }

  const rows = people.map((person) => ({ person, itemTotal: 0, extras: 0, total: 0, assigned: [] }));
  const unassigned = { person: { id: "unassigned", name: "Unassigned" }, itemTotal: 0, extras: 0, total: 0, assigned: [] };
  bill.items.forEach((item) => {
    const assignedQty = people.reduce((sum, person) => sum + getAssigned(bill, item.id, person.id), 0);
    const weights = people.map((person) => getAssigned(bill, item.id, person.id)).concat(Math.max(0, item.qty - assignedQty));
    const parts = allocate(Math.round(item.qty * item.unit), weights);
    people.forEach((person, index) => {
      if (weights[index] > 0) {
        rows[index].itemTotal += parts[index];
        rows[index].assigned.push(`${item.name} x ${weights[index]}`);
      }
    });
    if (weights[weights.length - 1] > 0) {
      unassigned.itemTotal += parts[parts.length - 1];
      unassigned.assigned.push(`${item.name} x ${weights[weights.length - 1]}`);
    }
  });
  const rowsWithUnassigned = rows.concat(unassigned);
  let extraWeights = bill.extrasMode === "even"
    ? rowsWithUnassigned.map((row) => row.itemTotal > 0 ? 1 : 0)
    : rowsWithUnassigned.map((row) => row.itemTotal);
  if (!extraWeights.some(Boolean)) extraWeights = rowsWithUnassigned.map((row) => row.person.id === "unassigned" ? 0 : 1);
  const extraParts = allocate(math.grand - math.items, extraWeights);
  rowsWithUnassigned.forEach((row, index) => {
    row.extras = extraParts[index];
    row.total = row.itemTotal + row.extras;
  });
  return rowsWithUnassigned.filter((row) => row.total !== 0 || row.person.id !== "unassigned" || row.assigned.length);
}

function getAssigned(bill, itemId, personId) {
  return qtyFromInput(bill.assignments?.[itemId]?.[personId] || 0);
}

function setAssigned(bill, itemId, personId, qty) {
  bill.assignments[itemId] ||= {};
  bill.assignments[itemId][personId] = Math.max(0, qtyFromInput(qty));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function render() {
  app.innerHTML = `
    ${renderTopbar()}
    ${state.tab === "scan" ? renderScan() : ""}
    ${state.tab === "history" ? renderHistory() : ""}
    ${state.tab === "settings" ? renderSettings() : ""}
    ${renderNav()}
    ${state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : ""}
    ${state.modal ? renderModal() : ""}
  `;
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <div class="mark">${icons.receipt}</div>
        <div>
          <h1>Split Studio</h1>
          <p>Local receipt splitting</p>
        </div>
      </div>
      ${state.step !== "start" && state.tab === "scan" ? `<button class="icon-btn" data-action="confirm-discard" aria-label="Close draft">${icons.trash}</button>` : ""}
    </header>
  `;
}

function renderScan() {
  if (!state.draft || state.step === "start") {
    const art = document.getElementById("receipt-art").innerHTML;
    return `
      <section class="hero">
        ${art}
        <div class="hero-copy">
          <h2>Split a bill cleanly.</h2>
          <p>Make a polished receipt, split it evenly or by item, then share the exact totals. Everything stays in this browser.</p>
          <div class="actions">
            <button class="btn" data-action="new-bill">${icons.plus} New bill</button>
            <label class="btn secondary" for="imageInput">${icons.camera} Attach receipt image</label>
            <input id="imageInput" class="hidden" type="file" accept="image/*,application/pdf" data-action="image-input" />
          </div>
        </div>
      </section>
      ${state.draft ? `<section class="section"><div class="section-head"><div><h2>Resume draft</h2><p class="subtle">${escapeHtml(state.draft.title)}</p></div><button class="btn secondary" data-action="resume">Resume</button></div></section>` : ""}
    `;
  }
  if (state.step === "edit") return renderEdit(state.draft);
  if (state.step === "split") return renderSplit(state.draft);
  return renderSummary(state.draft);
}

function renderEdit(bill) {
  const math = billMath(bill);
  const ok = Math.abs(math.diff) <= 1;
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>Review bill</h2>
          <p class="subtle">Edit the receipt like a studio sheet. The total check updates live.</p>
        </div>
      </div>
      <div class="grid">
        <div class="field span"><label>Title</label><input data-bind="title" value="${escapeHtml(bill.title)}" maxlength="60" /></div>
        <div class="field"><label>Merchant</label><input data-bind="merchant" value="${escapeHtml(bill.merchant)}" maxlength="60" placeholder="Optional" /></div>
        <div class="field"><label>Date</label><input type="date" data-bind="date" value="${escapeHtml(bill.date)}" /></div>
        <div class="field"><label>Currency</label><select data-bind="currency">${["EGP","EUR","USD","GBP"].map((cur) => `<option ${bill.currency === cur ? "selected" : ""}>${cur}</option>`).join("")}</select></div>
        <div class="field"><label>Printed total</label><input inputmode="decimal" data-money="printedTotal" value="${inputMoney(bill.printedTotal)}" /></div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><div><h2>Items</h2><p class="subtle">Use integer or decimal quantities. Money is rounded to cents.</p></div><button class="tiny-btn" data-action="add-item" aria-label="Add item">${icons.plus}</button></div>
      <div class="row-list">
        ${bill.items.map((item) => renderItemRow(bill, item)).join("")}
      </div>
      <div class="${ok ? "banner" : "banner bad"}">
        <strong>${ok ? "Total reconciled" : "Total needs review"}</strong>
        <span class="subtle">Items and extras: <span class="money">${formatMoney(math.calculated, bill.currency)}</span>. Printed total: <span class="money">${formatMoney(math.grand, bill.currency)}</span>. Difference: <span class="money">${formatMoney(math.diff, bill.currency)}</span>.</span>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><div><h2>Extras</h2><p class="subtle">Tax, service, tip, and discounts are bill-level for this MVP.</p></div></div>
      <div class="grid">
        ${moneyField("Tax", "tax", bill.tax)}
        ${moneyField("Service", "service", bill.service)}
        ${moneyField("Tip", "tip", bill.tip)}
        ${moneyField("Discount", "discount", bill.discount)}
      </div>
      <div class="actions"><button class="btn" data-action="to-split">Continue</button></div>
    </section>
  `;
}

function moneyField(label, key, value) {
  return `<div class="field"><label>${label}</label><input inputmode="decimal" data-money="${key}" value="${inputMoney(value)}" /></div>`;
}

function renderItemRow(bill, item) {
  return `
    <div class="item-row" data-item="${item.id}">
      <div class="item-grid">
        <div class="field name-field"><label>Name</label><input data-item-bind="name" value="${escapeHtml(item.name)}" maxlength="80" /></div>
        <div class="field"><label>Qty</label><input inputmode="decimal" data-item-bind="qty" value="${item.qty}" /></div>
        <div class="field"><label>Unit</label><input inputmode="decimal" data-item-money="unit" value="${inputMoney(item.unit)}" /></div>
        <button class="tiny-btn" data-action="delete-item" aria-label="Delete ${escapeHtml(item.name)}">${icons.trash}</button>
      </div>
      <div class="bill-line"><span>Line total</span><strong class="money">${formatMoney(Math.round(item.qty * item.unit), bill.currency)}</strong></div>
    </div>
  `;
}

function renderSplit(bill) {
  return `
    <section class="section">
      <div class="section-head"><button class="tiny-btn" data-action="to-edit" aria-label="Back">${icons.back}</button><div><h2>Split mode</h2><p class="subtle">Even is instant. By item gives you a fast assignment grid.</p></div></div>
      <div class="segmented">
        <button data-action="mode-even" class="${bill.splitMode === "even" ? "active" : ""}">Even</button>
        <button data-action="mode-item" class="${bill.splitMode === "item" ? "active" : ""}">By item</button>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><div><h2>People</h2><p class="subtle">Names are saved only on this device.</p></div><button class="tiny-btn" data-action="add-person" aria-label="Add person">${icons.plus}</button></div>
      <div class="row-list">
        ${bill.people.map((person, index) => `
          <div class="person-row" data-person="${person.id}">
            <div class="item-grid">
              <div class="field name-field"><label>Person ${index + 1}</label><input data-person-name value="${escapeHtml(person.name)}" maxlength="40" /></div>
              <button class="tiny-btn" data-action="delete-person" aria-label="Delete ${escapeHtml(person.name)}">${icons.trash}</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
    ${bill.splitMode === "item" ? renderMatrix(bill) : renderEvenPreview(bill)}
    <section class="section"><div class="actions"><button class="btn" data-action="to-summary">Summary</button></div></section>
  `;
}

function renderEvenPreview(bill) {
  return `
    <section class="section">
      <div class="section-head"><div><h2>Even preview</h2><p class="subtle">Remainder cents go to the earliest people, so the bill always closes exactly.</p></div></div>
      <div class="row-list">${splitBill(bill).map((row) => `
        <div class="total-row"><div class="bill-line"><span>${escapeHtml(row.person.name)}</span><strong class="money">${formatMoney(row.total, bill.currency)}</strong></div></div>
      `).join("")}</div>
    </section>
  `;
}

function renderMatrix(bill) {
  return `
    <section class="section">
      <div class="section-head">
        <div><h2>Item assignment</h2><p class="subtle">Tap plus and minus. Anything left becomes Unassigned, keeping totals exact.</p></div>
      </div>
      <div class="segmented">
        <button data-action="extras-proportional" class="${bill.extrasMode === "proportional" ? "active" : ""}">Proportional extras</button>
        <button data-action="extras-even" class="${bill.extrasMode === "even" ? "active" : ""}">Even extras</button>
      </div>
      <div class="split-matrix" style="margin-top:10px">
        ${bill.items.map((item) => {
          const used = bill.people.reduce((sum, person) => sum + getAssigned(bill, item.id, person.id), 0);
          return `
            <div class="matrix-item" data-item="${item.id}">
              <div class="matrix-head"><strong>${escapeHtml(item.name)}</strong><span class="money">${formatMoney(Math.round(item.qty * item.unit), bill.currency)}</span></div>
              <p class="subtle">Quantity ${item.qty}. Remaining ${Math.max(0, Math.round((item.qty - used) * 1000) / 1000)}.</p>
              ${bill.people.map((person) => `
                <div class="person-assignment" data-person="${person.id}">
                  <span>${escapeHtml(person.name)}</span>
                  <div class="stepper">
                    <button data-action="dec-assign" aria-label="Decrease ${escapeHtml(person.name)}">-</button>
                    <output>${getAssigned(bill, item.id, person.id)}</output>
                    <button data-action="inc-assign" aria-label="Increase ${escapeHtml(person.name)}">+</button>
                  </div>
                </div>
              `).join("")}
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderSummary(bill) {
  const math = billMath(bill);
  const split = splitBill(bill);
  const sum = split.reduce((total, row) => total + row.total, 0);
  return `
    <section class="section">
      <div class="section-head"><button class="tiny-btn" data-action="to-split" aria-label="Back">${icons.back}</button><div><h2>Summary</h2><p class="subtle">Ready to share. Exact total check: ${formatMoney(sum - math.grand, bill.currency)}.</p></div></div>
      <div class="row-list">
        ${split.map((row) => `
          <article class="summary-card">
            <header><h3>${escapeHtml(row.person.name)}</h3><strong class="money">${formatMoney(row.total, bill.currency)}</strong></header>
            <div class="breakdown">
              <div><span>Items</span><strong class="money">${formatMoney(row.itemTotal, bill.currency)}</strong></div>
              <div><span>Extras and rounding</span><strong class="money">${formatMoney(row.extras, bill.currency)}</strong></div>
              ${row.assigned?.length ? `<div><span>Assigned</span><strong>${escapeHtml(row.assigned.slice(0, 2).join(", "))}${row.assigned.length > 2 ? "..." : ""}</strong></div>` : ""}
            </div>
          </article>
        `).join("")}
      </div>
      <div class="banner">
        <strong>Bill total ${formatMoney(math.grand, bill.currency)}</strong>
        <span class="subtle">Split sum ${formatMoney(sum, bill.currency)}. The app uses integer cents and largest remainder allocation.</span>
      </div>
      <div class="actions">
        <button class="btn" data-action="share-summary">${icons.share} Share</button>
        <button class="btn secondary" data-action="finalize">${icons.check} End transaction</button>
      </div>
    </section>
  `;
}

function renderHistory() {
  const bills = state.bills.slice().sort((a, b) => (b.finalizedAt || 0) - (a.finalizedAt || 0));
  return `
    <section class="section flush">
      <div class="section" style="margin:0;border:0;border-radius:0;background:transparent">
        <div class="section-head"><div><h2>History</h2><p class="subtle">Finalized bills saved locally in this browser.</p></div></div>
      </div>
      ${bills.length ? bills.map((bill) => {
        const math = billMath(bill);
        return `<button class="history-row" data-action="open-history" data-bill="${bill.id}">
          <span><h3>${escapeHtml(bill.title)}</h3><span class="subtle">${escapeHtml(bill.merchant || "No merchant")} · ${escapeHtml(bill.date)}</span></span>
          <strong class="money">${formatMoney(math.grand, bill.currency)}</strong>
        </button>`;
      }).join("") : `<div class="empty">No finished bills yet. Make one excellent split and it will appear here.</div>`}
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="section">
      <div class="section-head"><div><h2>Settings</h2><p class="subtle">Simple, private, and free to publish as a static site.</p></div></div>
      <div class="row-list">
        <div class="total-row"><div class="bill-line"><span>Storage</span><strong>Local browser only</strong></div></div>
        <div class="total-row"><div class="bill-line"><span>Network</span><strong>No backend required</strong></div></div>
        <div class="total-row"><div class="bill-line"><span>Install</span><strong>Add to Home Screen</strong></div></div>
      </div>
      <div class="actions">
        <button class="btn secondary" data-action="export-data">Export data</button>
        <button class="btn warn" data-action="confirm-clear">Delete local data</button>
      </div>
    </section>
  `;
}

function renderNav() {
  return `
    <nav class="bottom-nav" aria-label="Main navigation">
      <button data-tab="scan" class="${state.tab === "scan" ? "active" : ""}">${icons.receipt}<span>Split</span></button>
      <button data-tab="history" class="${state.tab === "history" ? "active" : ""}">${icons.history}<span>History</span></button>
      <button data-tab="settings" class="${state.tab === "settings" ? "active" : ""}">${icons.settings}<span>Settings</span></button>
    </nav>
  `;
}

function renderModal() {
  const modal = state.modal;
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <h2 id="modalTitle">${escapeHtml(modal.title)}</h2>
        <p class="subtle">${escapeHtml(modal.body)}</p>
        <div class="actions">
          <button class="btn ${modal.danger ? "warn" : ""}" data-action="${modal.confirmAction}">${escapeHtml(modal.confirmLabel)}</button>
          <button class="btn secondary" data-action="close-modal">Cancel</button>
        </div>
      </section>
    </div>
  `;
}

function toast(message) {
  state.toast = message;
  render();
  window.setTimeout(() => {
    if (state.toast === message) {
      state.toast = "";
      render();
    }
  }, 2200);
}

function updateDraft(mutator) {
  if (!state.draft) return;
  mutator(state.draft);
  state.draft.updatedAt = Date.now();
  saveState();
  render();
}

function summaryText(bill) {
  const math = billMath(bill);
  const lines = [
    bill.title,
    bill.merchant ? `Merchant: ${bill.merchant}` : "",
    `Total: ${formatMoney(math.grand, bill.currency)}`,
    "",
    "Split"
  ].filter(Boolean);
  splitBill(bill).forEach((row) => {
    lines.push(`${row.person.name}: ${formatMoney(row.total, bill.currency)}`);
  });
  return lines.join("\n");
}

app.addEventListener("click", async (event) => {
  const tab = event.target.closest("[data-tab]")?.dataset.tab;
  if (tab) {
    state.tab = tab;
    saveState();
    render();
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const bill = state.draft;

  if (action === "new-bill") {
    state.draft = newBill();
    state.step = "edit";
  }
  if (action === "resume") state.step = "edit";
  if (action === "to-edit") state.step = "edit";
  if (action === "to-split") state.step = "split";
  if (action === "to-summary") state.step = "summary";
  if (action === "add-item") bill.items.push({ id: uid("item"), name: "New item", qty: 1, unit: 0 });
  if (action === "delete-item") bill.items = bill.items.filter((item) => item.id !== button.closest("[data-item]").dataset.item);
  if (action === "add-person") bill.people.push({ id: uid("person"), name: `Person ${bill.people.length + 1}` });
  if (action === "delete-person" && bill.people.length > 1) bill.people = bill.people.filter((person) => person.id !== button.closest("[data-person]").dataset.person);
  if (action === "mode-even") bill.splitMode = "even";
  if (action === "mode-item") bill.splitMode = "item";
  if (action === "extras-proportional") bill.extrasMode = "proportional";
  if (action === "extras-even") bill.extrasMode = "even";
  if (action === "inc-assign" || action === "dec-assign") {
    const itemId = button.closest("[data-item]").dataset.item;
    const personId = button.closest("[data-person]").dataset.person;
    const item = bill.items.find((entry) => entry.id === itemId);
    const current = getAssigned(bill, itemId, personId);
    const next = action === "inc-assign" ? current + 1 : current - 1;
    const others = bill.people.reduce((sum, person) => sum + (person.id === personId ? 0 : getAssigned(bill, itemId, person.id)), 0);
    setAssigned(bill, itemId, personId, Math.min(Math.max(0, next), Math.max(0, item.qty - others)));
  }
  if (action === "share-summary") {
    const text = summaryText(bill);
    if (navigator.share) await navigator.share({ title: bill.title, text }).catch(() => {});
    else await navigator.clipboard?.writeText(text).then(() => toast("Summary copied"));
  }
  if (action === "finalize") {
    const finalized = { ...bill, finalizedAt: Date.now(), edited: Boolean(state.bills.find((entry) => entry.id === bill.id)) };
    state.bills = state.bills.filter((entry) => entry.id !== finalized.id).concat(finalized);
    state.draft = null;
    state.step = "start";
    state.tab = "history";
    toast("Bill saved to history");
  }
  if (action === "open-history") {
    const saved = state.bills.find((entry) => entry.id === button.dataset.bill);
    if (saved) {
      state.draft = JSON.parse(JSON.stringify(saved));
      state.step = "summary";
      state.tab = "scan";
    }
  }
  if (action === "confirm-discard") state.modal = { title: "Discard draft?", body: "This removes the current in-progress bill from this browser.", confirmLabel: "Discard", confirmAction: "discard-draft", danger: true };
  if (action === "discard-draft") {
    state.draft = null;
    state.step = "start";
    state.modal = null;
  }
  if (action === "confirm-clear") state.modal = { title: "Delete local data?", body: "This wipes saved bills and the current draft from this browser.", confirmLabel: "Delete all", confirmAction: "clear-data", danger: true };
  if (action === "clear-data") state = defaultState();
  if (action === "close-modal") state.modal = null;
  if (action === "export-data") {
    const text = JSON.stringify({ bills: state.bills }, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "split-studio-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  saveState();
  render();
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (!state.draft) return;
  const bill = state.draft;
  const itemEl = target.closest("[data-item]");
  const personEl = target.closest("[data-person]");

  if (target.dataset.bind) bill[target.dataset.bind] = target.value;
  if (target.dataset.money) bill[target.dataset.money] = centsFromInput(target.value);
  if (itemEl) {
    const item = bill.items.find((entry) => entry.id === itemEl.dataset.item);
    if (item && target.dataset.itemBind === "name") item.name = target.value;
    if (item && target.dataset.itemBind === "qty") item.qty = qtyFromInput(target.value);
    if (item && target.dataset.itemMoney === "unit") item.unit = centsFromInput(target.value);
  }
  if (personEl && target.matches("[data-person-name]")) {
    const person = bill.people.find((entry) => entry.id === personEl.dataset.person);
    if (person) person.name = target.value.trim() || "Unnamed";
  }
  bill.updatedAt = Date.now();
  saveState();
});

app.addEventListener("change", (event) => {
  const input = event.target.closest("[data-action='image-input']");
  if (input?.files?.[0]) {
    const file = input.files[0];
    state.draft = newBill();
    state.draft.title = file.name.replace(/\.[^.]+$/, "") || state.draft.title;
    state.step = "edit";
    state.tab = "scan";
    saveState();
    render();
    toast("Image attached. OCR is intentionally skipped in this free web MVP.");
    return;
  }
  if (state.draft && event.target.matches("input, select")) {
    saveState();
    render();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

window.SplitStudioDebug = { allocate, billMath, newBill, splitBill };

render();
