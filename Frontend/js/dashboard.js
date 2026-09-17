requireAuth();

const zoneBoard = document.getElementById("zoneBoard");
const emptyState = document.getElementById("emptyState");
const formMsg = document.getElementById("formMsg");
const connDot = document.getElementById("connDot");

let areas = [];
let slotsByArea = {}; // areaId -> [slot, ...]
let openZones = new Set();

function showMsg(text) {
  formMsg.textContent = text;
  formMsg.hidden = false;
}
function clearMsg() {
  formMsg.hidden = true;
  formMsg.textContent = "";
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
function statusToClass(status) {
  return String(status).toLowerCase().replace(/\s+/g, "-");
}
function getAreaStats(areaId) {
  const slots = slotsByArea[areaId] || [];
  const occupied = slots.filter((slot) => slot.status === "occupied").length;
  const reserved = slots.filter((slot) => slot.status === "reserved").length;
  return {
    total: slots.length,
    occupied,
    reserved,
    available: Math.max(0, slots.length - occupied - reserved),
  };
}
function getDynamicZoneStatus(area) {
  const stats = getAreaStats(area._id);
  const unavailable = stats.occupied + stats.reserved;
  if (!stats.total) return area.status;
  if (unavailable >= stats.total) return "Full";
  if (unavailable / stats.total >= 0.8) return "High Capacity";
  return "Available";
}
function formatSince(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ---------- Header ----------

function renderHeader() {
  const user = getUser();
  document.getElementById("userName").textContent = user ? user.name : "";
  const roleBadge = document.getElementById("roleBadge");
  if (isAdmin()) {
    roleBadge.textContent = "ADMIN";
    roleBadge.hidden = false;
    document.getElementById("addZoneBtn").hidden = false;
  }
}

// ---------- Rendering ----------

function slotRowTemplate(slot) {
  const statusClass = statusToClass(slot.status);
  const since = slot.status === "occupied" ? formatSince(slot.occupied_since) : "—";
  return `
    <tr data-slot-id="${slot._id}">
      <td class="slot-label" data-label="Space"><span class="slot-marker"></span>${escapeHtml(slot.label)}</td>
      <td class="slot-sensor" data-label="Sensor">${escapeHtml(slot.sensor_id || "Not connected")}</td>
      <td data-label="Status"><span class="slot-status-pill ${statusClass}">${escapeHtml(slot.status)}</span></td>
      <td class="slot-since" data-label="Occupied since">${since}</td>
      <td class="slot-actions" data-label="Action">
        ${isAdmin() ? `
        <select class="slot-select" data-slot-id="${slot._id}">
          <option value="available" ${slot.status === "available" ? "selected" : ""}>available</option>
          <option value="reserved" ${slot.status === "reserved" ? "selected" : ""}>reserved</option>
          <option value="occupied" ${slot.status === "occupied" ? "selected" : ""}>occupied</option>
        </select>
        ` : slot.status === "available"
          ? `<button type="button" class="btn-reserve" data-slot-id="${slot._id}" data-slot-label="${escapeHtml(slot.label)}">Reserve</button>`
          : `<span class="slot-readonly">${slot.status === "reserved" ? "Reserved" : "Unavailable"}</span>`}
      </td>
    </tr>
  `;
}

function zoneSlotsHtml(area) {
  const slots = [...(slotsByArea[area._id] || [])].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const rows = slots.map(slotRowTemplate).join("");
  const occupied = slots.filter((slot) => slot.status === "occupied").length;
  const reserved = slots.filter((slot) => slot.status === "reserved").length;
  const addSlotBtn = isAdmin()
    ? `<button type="button" class="zone-add-slot" data-area-id="${area._id}">+ add slot to ${escapeHtml(area.zone_id)}</button>`
    : "";

  return `
    <div class="slot-panel">
      <div class="slot-panel-heading">
        <div><strong>Parking spaces</strong><span>${slots.length} monitored spaces</span></div>
        <div class="slot-legend"><span class="legend-available">${Math.max(0, slots.length - occupied - reserved)} available</span><span class="legend-reserved">${reserved} reserved</span><span class="legend-occupied">${occupied} occupied</span></div>
      </div>
      <div class="slot-table-wrap"><table class="slot-table">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Sensor</th>
            <th>Status</th>
            <th>Since</th>
            <th>Update</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="5" class="slot-empty">No parking spaces have been added to this zone yet.</td></tr>`}</tbody>
      </table></div>
      ${addSlotBtn}
    </div>
  `;
}

function zoneRowTemplate(area) {
  const isOpen = openZones.has(area._id);
  const stats = getAreaStats(area._id);
  const zoneStatus = getDynamicZoneStatus(area);
  const statusClass = statusToClass(zoneStatus);

  return `
    <div class="zone-row ${isOpen ? "open" : ""}" data-area-id="${area._id}">
      <div class="zone-summary" data-toggle="${area._id}" role="button" tabindex="0" aria-expanded="${isOpen}" aria-controls="slots-${area._id}">
        <div class="zone-id mono">${escapeHtml(area.zone_id)}</div>
        <div class="zone-name-col">
          <div class="zone-name">${escapeHtml(area.name)}</div>
          <div class="zone-district">${escapeHtml(area.district || "")}</div>
        </div>
        <div class="zone-capacity">
          ${stats.occupied}<span class="zone-cap-total">/${stats.total}</span>
        </div>
        <div class="zone-status-pill ${statusClass}">${escapeHtml(zoneStatus)}</div>
        <div class="zone-rate">${area.rate_egp_per_hour} EGP/hr</div>
        <div class="zone-caret">▶</div>
      </div>
      <div class="zone-slots" id="slots-${area._id}">${zoneSlotsHtml(area)}</div>
    </div>
  `;
}

function render() {
  renderOverview();
  if (!areas.length) {
    zoneBoard.innerHTML = "";
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  zoneBoard.innerHTML = areas.map(zoneRowTemplate).join("");
  attachRowHandlers();
}

function renderOverview() {
  const totals = areas.reduce((all, area) => {
    const stats = getAreaStats(area._id);
    all.capacity += stats.total;
    all.occupied += stats.occupied;
    all.available += stats.available;
    return all;
  }, { capacity: 0, occupied: 0, available: 0 });
  document.getElementById("zoneCount").textContent = areas.length;
  document.getElementById("availableCount").textContent = totals.available;
  document.getElementById("occupancyRate").textContent = totals.capacity ? `${Math.round((totals.occupied / totals.capacity) * 100)}%` : "0%";
}

function attachRowHandlers() {
  zoneBoard.querySelectorAll("[data-toggle]").forEach((el) => {
    const toggleZone = () => {
      const id = el.dataset.toggle;
      if (openZones.has(id)) openZones.delete(id);
      else openZones.add(id);
      render();
    };
    el.addEventListener("click", toggleZone);
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleZone();
      }
    });
  });

  zoneBoard.querySelectorAll(".slot-select").forEach((select) => {
    select.addEventListener("click", (e) => e.stopPropagation());
    select.addEventListener("change", (e) => {
      e.stopPropagation();
      updateSlotStatus(select.dataset.slotId, select.value);
    });
  });

  zoneBoard.querySelectorAll(".zone-add-slot").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openAddSlotModal(btn.dataset.areaId);
    });
  });

  zoneBoard.querySelectorAll(".btn-reserve").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      openReservationModal(btn.dataset.slotId, btn.dataset.slotLabel);
    });
  });
}

function flashRow(areaId) {
  const row = zoneBoard.querySelector(`.zone-row[data-area-id="${areaId}"] .zone-summary`);
  if (row) {
    row.classList.add("flip");
    row.addEventListener("animationend", () => row.classList.remove("flip"), { once: true });
  }
}

// ---------- Data loading ----------

async function loadAll() {
  clearMsg();
  try {
    const [areaList, slotList] = await Promise.all([
      apiFetch("/areas"),
      apiFetch("/parking/slots"),
    ]);
    areas = areaList;
    slotsByArea = {};
    slotList.forEach((slot) => {
      const key = typeof slot.area === "object" ? slot.area._id : slot.area;
      if (!slotsByArea[key]) slotsByArea[key] = [];
      slotsByArea[key].push(slot);
    });
    render();
  } catch (err) {
    showMsg(err.message);
  }
}

async function updateSlotStatus(id, status) {
  try {
    const updatedSlot = await apiFetch(`/parking/slots/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    const areaId = typeof updatedSlot.area === "object" ? updatedSlot.area._id : updatedSlot.area;
    const list = slotsByArea[areaId] || [];
    const index = list.findIndex((slot) => slot._id === updatedSlot._id);
    if (index >= 0) list[index] = updatedSlot;
    else list.push(updatedSlot);
    slotsByArea[areaId] = list;
    render();
    flashRow(areaId);
  } catch (err) {
    showMsg(err.message);
    render();
  }
}

// ---------- Reservation ----------

const reservationModalBackdrop = document.getElementById("reservationModalBackdrop");
const reservationForm = document.getElementById("reservationForm");
const cardPaymentDetails = document.getElementById("cardPaymentDetails");
const walletPaymentDetails = document.getElementById("walletPaymentDetails");
const cardInputs = [...cardPaymentDetails.querySelectorAll("input")];
const walletInput = document.getElementById("walletNumber");

function setPaymentMethod(method) {
  const isCard = method === "card";
  const isWallet = method === "wallet";
  cardPaymentDetails.hidden = !isCard;
  walletPaymentDetails.hidden = !isWallet;
  cardInputs.forEach((input) => {
    input.disabled = !isCard;
    input.required = isCard;
  });
  walletInput.disabled = !isWallet;
  walletInput.required = isWallet;
}

reservationForm.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
  input.addEventListener("change", () => setPaymentMethod(input.value));
});

reservationForm.querySelectorAll(".payment-option").forEach((option) => {
  option.addEventListener("click", () => {
    const input = option.querySelector('input[name="paymentMethod"]');
    input.checked = true;
    setPaymentMethod(input.value);
  });
});

document.getElementById("cardNumber").addEventListener("input", (event) => {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 19);
  event.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
});

document.getElementById("cardExpiry").addEventListener("input", (event) => {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
  event.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
});

function closeReservationModal() {
  reservationModalBackdrop.hidden = true;
  reservationForm.reset();
  setPaymentMethod("card");
}

function openReservationModal(slotId, slotLabel) {
  clearMsg();
  document.getElementById("reservationSlotId").value = slotId;
  document.getElementById("reservationSlotLabel").textContent = slotLabel;
  reservationModalBackdrop.hidden = false;
  setPaymentMethod(reservationForm.querySelector('input[name="paymentMethod"]:checked').value);
  reservationForm.querySelector('input[name="paymentMethod"]:checked').focus();
}

document.getElementById("cancelReservation").addEventListener("click", closeReservationModal);
reservationModalBackdrop.addEventListener("click", (event) => {
  if (event.target === reservationModalBackdrop) closeReservationModal();
});

reservationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const slotId = document.getElementById("reservationSlotId").value;
  const paymentMethod = reservationForm.querySelector('input[name="paymentMethod"]:checked').value;
  const paymentDetails = paymentMethod === "card"
    ? {
        cardholder_name: document.getElementById("cardHolder").value.trim(),
        card_number: document.getElementById("cardNumber").value.trim(),
        card_expiry: document.getElementById("cardExpiry").value.trim(),
        card_cvc: document.getElementById("cardCvc").value.trim(),
      }
    : paymentMethod === "wallet"
      ? { wallet_number: document.getElementById("walletNumber").value.trim() }
      : {};
  const submitButton = document.getElementById("confirmReservation");
  submitButton.disabled = true;

  try {
    const updatedSlot = await apiFetch(`/parking/slots/${slotId}/reserve`, {
      method: "POST",
      body: JSON.stringify({ payment_method: paymentMethod, ...paymentDetails }),
    });
    const areaId = typeof updatedSlot.area === "object" ? updatedSlot.area._id : updatedSlot.area;
    const list = slotsByArea[areaId] || [];
    const index = list.findIndex((slot) => slot._id === updatedSlot._id);
    if (index >= 0) list[index] = updatedSlot;
    else list.push(updatedSlot);
    slotsByArea[areaId] = list;
    closeReservationModal();
    render();
    flashRow(areaId);
  } catch (error) {
    closeReservationModal();
    showMsg(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

// ---------- Add zone modal ----------

const zoneModalBackdrop = document.getElementById("zoneModalBackdrop");
document.getElementById("addZoneBtn").addEventListener("click", () => {
  zoneModalBackdrop.hidden = false;
  document.getElementById("zoneIdInput").focus();
});
document.getElementById("cancelAddZone").addEventListener("click", () => {
  zoneModalBackdrop.hidden = true;
  document.getElementById("addZoneForm").reset();
});
zoneModalBackdrop.addEventListener("click", (e) => {
  if (e.target === zoneModalBackdrop) {
    zoneModalBackdrop.hidden = true;
    document.getElementById("addZoneForm").reset();
  }
});

document.getElementById("addZoneForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  ["zone_id", "name", "capacity_total", "rate_egp_per_hour"].forEach((f) => {
    const el = document.getElementById(`${f}Error`);
    if (el) el.hidden = true;
  });

  const payload = {
    zone_id: document.getElementById("zoneIdInput").value.trim(),
    name: document.getElementById("zoneNameInput").value.trim(),
    district: document.getElementById("zoneDistrictInput").value.trim(),
    capacity_total: Number(document.getElementById("zoneCapacityInput").value),
    rate_egp_per_hour: Number(document.getElementById("zoneRateInput").value),
    status: document.getElementById("zoneStatusInput").value,
  };

  const submitBtn = document.getElementById("addZoneSubmit");
  submitBtn.disabled = true;
  try {
    await apiFetch("/areas", { method: "POST", body: JSON.stringify(payload) });
    zoneModalBackdrop.hidden = true;
    document.getElementById("addZoneForm").reset();
    // The socket "area:created" event will refresh the board.
  } catch (err) {
    if (err.fieldErrors) {
      err.fieldErrors.forEach(({ field, message }) => {
        const el = document.getElementById(`${field}Error`);
        if (el) {
          el.textContent = message;
          el.hidden = false;
        }
      });
    } else {
      showMsg(err.message);
    }
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Add slot modal ----------

const slotModalBackdrop = document.getElementById("slotModalBackdrop");
function openAddSlotModal(areaId) {
  document.getElementById("slotAreaId").value = areaId;
  slotModalBackdrop.hidden = false;
  document.getElementById("slotLabelInput").focus();
}
document.getElementById("cancelAddSlot").addEventListener("click", () => {
  slotModalBackdrop.hidden = true;
  document.getElementById("addSlotForm").reset();
});
slotModalBackdrop.addEventListener("click", (e) => {
  if (e.target === slotModalBackdrop) {
    slotModalBackdrop.hidden = true;
    document.getElementById("addSlotForm").reset();
  }
});

document.getElementById("addSlotForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  document.getElementById("labelError").hidden = true;

  const payload = {
    area: document.getElementById("slotAreaId").value,
    label: document.getElementById("slotLabelInput").value.trim(),
    sensor_id: document.getElementById("slotSensorInput").value.trim() || undefined,
    status: document.getElementById("slotStatusInput").value,
  };

  const submitBtn = document.getElementById("addSlotSubmit");
  submitBtn.disabled = true;
  try {
    await apiFetch("/parking/slots", { method: "POST", body: JSON.stringify(payload) });
    slotModalBackdrop.hidden = true;
    document.getElementById("addSlotForm").reset();
    // The socket "slot:created" event will refresh the board.
  } catch (err) {
    if (err.fieldErrors) {
      const labelErr = err.fieldErrors.find((e) => e.field === "label");
      if (labelErr) {
        const el = document.getElementById("labelError");
        el.textContent = labelErr.message;
        el.hidden = false;
      } else {
        showMsg(err.fieldErrors.map((e) => e.message).join(" · "));
      }
    } else {
      showMsg(err.message);
    }
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Logout ----------

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

// ---------- Live socket updates ----------

const socket = connectSocket();

socket.on("connect", () => connDot.classList.add("live"));
socket.on("disconnect", () => connDot.classList.remove("live"));

socket.on("slot:updated", (slot) => {
  const key = typeof slot.area === "object" ? slot.area._id : slot.area;
  const list = slotsByArea[key] || [];
  const idx = list.findIndex((s) => s._id === slot._id);
  if (idx >= 0) list[idx] = slot;
  else list.push(slot);
  slotsByArea[key] = list;
  render();
  flashRow(key);
});

socket.on("slot:created", () => loadAll());
socket.on("area:created", () => loadAll());

// ---------- Init ----------

renderHeader();
loadAll();
