// public/app.js
function toYYYYMMDD(d) {
  if (!d) return "";
  return d.replaceAll("-", "");
}

function fmt(n, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const num = Number(n);
  return num.toFixed(digits);
}

function parseWUResponse(json) {
  const arr = Array.isArray(json?.observations) ? json.observations
            : Array.isArray(json) ? json
            : [];
  return arr.map(o => ({
    epoch: o.epoch || o.obsTimeUtc,
    obsTimeLocal: o.obsTimeLocal || o.obsTimeLocalStr || "",
    obsTimeUtc: o.obsTimeUtc || "",
    tempAvg: o.metric?.tempAvg ?? o.imperial?.tempAvg ?? o.temperature ?? null,
    dewptAvg: o.metric?.dewptAvg ?? null,
    humidityAvg: o.humidityAvg ?? o.humidity ?? null,
    windspeedAvg: o.metric?.windspeedAvg ?? null,
    windgustHigh: o.metric?.windgustHigh ?? null,
    pressureMax: o.metric?.pressureMax ?? null,
    precipTotal: o.metric?.precipTotal ?? null,
  }));
}

async function loadData() {
  const status = document.getElementById("status");
  const table = document.getElementById("table");
  const stationId = document.getElementById("stationId").value.trim();
  const date = toYYYYMMDD(document.getElementById("date").value);
  const units = document.querySelector("input[name='units']:checked")?.value || "m";

  status.textContent = "Cargando...";
  table.innerHTML = "";

  try {
    const url = new URL("/api/wu/history", location.origin);
    url.searchParams.set("stationId", stationId);
    url.searchParams.set("date", date);
    url.searchParams.set("units", units);

    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const rows = parseWUResponse(data);
    if (!rows.length) {
      status.textContent = "Sin datos.";
      return;
    }

    const headers = ["Hora local", "Temp", "Humedad", "Viento", "Racha", "Presión", "Precip."];
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr>`;
    const tbody = document.createElement("tbody");
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.obsTimeLocal || r.obsTimeUtc || ""}</td>
        <td>${fmt(r.tempAvg, 1)}</td>
        <td>${fmt(r.humidityAvg, 0)}</td>
        <td>${fmt(r.windspeedAvg, 1)}</td>
        <td>${fmt(r.windgustHigh, 1)}</td>
        <td>${fmt(r.pressureMax, 1)}</td>
        <td>${fmt(r.precipTotal, 1)}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    status.textContent = `OK (${rows.length} registros)`;
  } catch (err) {
    console.error(err);
    const hint = (err.message === "Failed to fetch")
      ? "¿Servidor caído? ¿URL/origen correcto? (usa la misma URL del backend) ¿HTTPS/CORS?"
      : "";
    status.textContent = "Error: " + err.message + (hint ? " · " + hint : "");
  }
}

function toCSV() {
  const table = document.getElementById("table");
  if (!table.tBodies[0] || !table.tBodies[0].rows.length) return;
  const rows = [...table.querySelectorAll("tr")].map(tr =>
    [...tr.children].map(td => `\"${String(td.textContent).replace(/"/g,'""')}\"`).join(",")
  ).join("\n");
  const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pws_history.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

document.getElementById("loadBtn").addEventListener("click", loadData);
document.getElementById("csvBtn").addEventListener("click", toCSV);

(function init() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const el = document.getElementById("date");
  if (el && !el.value) el.value = `${yyyy}-${mm}-${dd}`;
})();
