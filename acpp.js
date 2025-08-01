const sheetId = '15TFOc-3VDBy15W33K8u5yIc2ozOpNVwYQVl-gvTuInM';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=`;

async function fetchData(sheetName) {
  const res = await fetch(base + sheetName);
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));
  const headers = json.table.cols.map(col => col.label);
  const rows = json.table.rows.map(row => row.c.map(cell => cell ? cell.v : ''));
  return { headers, rows };
}

function renderTable(tableId, data) {
  const table = document.getElementById(tableId);
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  // Colunas que não devem aparecer na tabela de calibragens
  const isCalibragem = tableId.includes("calibragem");
  const colunasOcultas = isCalibragem ? ["Oficina", "Preventivas"] : [];

  // Índices das colunas visíveis
  const colunasVisiveis = data.headers
    .map((header, index) => colunasOcultas.includes(header) ? null : index)
    .filter(index => index !== null);

  // Cabeçalho
  thead.innerHTML = '<tr>' +
    colunasVisiveis.map(i => `<th>${data.headers[i]}</th>`).join('') +
    '</tr>';

  // Corpo da tabela
  tbody.innerHTML = data.rows.map(row => {
    return `<tr>${colunasVisiveis.map(idx => {
      const header = data.headers[idx];
      const cell = row[idx];

      if (header === "Feito ?") {
        const feito = cell?.toString().toUpperCase() === "SIM";
        if (feito) return `<td style="text-align: center;">✅</td>`;

        // Buscar a data da preventiva
        const vencimentoIndex = data.headers.findIndex(h => h.toLowerCase().includes("preventiva"));
        const vencimentoRaw = row[vencimentoIndex];

        if (!vencimentoRaw) return `<td style="text-align: center;"></td>`;

        let vencimentoDate = null;

        if (typeof vencimentoRaw === "string" && /^Date\(/.test(vencimentoRaw)) {
          const match = vencimentoRaw.match(/Date\((\d+),(\d+),(\d+)\)/);
          if (match) {
            const [, year, month, day] = match.map(Number);
            vencimentoDate = new Date(year, month, day);
          }
        } else {
          vencimentoDate = new Date(vencimentoRaw);
        }

        if (!isNaN(vencimentoDate)) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          vencimentoDate.setHours(0, 0, 0, 0);

          const diffDias = Math.floor((vencimentoDate - hoje) / (1000 * 60 * 60 * 24));
          let texto = "";

          if (diffDias === 0) texto = "Vence hoje";
          else if (diffDias > 0) texto = `Faltam ${diffDias} dia${diffDias > 1 ? "s" : ""}`;
          else texto = `${diffDias} dias`;

          return `<td style="text-align: center; color: ${diffDias < 0 ? 'red' : 'black'};">${texto}</td>`;
        }

        return `<td style="text-align: center;"></td>`;
      }

      if (typeof cell === "string" && /^Date\(/.test(cell)) {
        const match = cell.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const [, year, month, day] = match.map(Number);
          const date = new Date(year, month, day);
          return `<td>${formatarData(date)}</td>`;
        }
      }

      return `<td>${cell}</td>`;
    }).join('')}</tr>`;
  }).join('');
}

function formatarData(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function showTab(tabName) {
  // Oculta todas as abas
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });

  // Exibe a aba selecionada
  document.getElementById(tabName).style.display = 'block';

  // Remove a classe 'active' de todos os botões
  document.querySelectorAll('.tab-buttons button').forEach(button => {
    button.classList.remove('active');
  });

  // Adiciona a classe 'active' ao botão clicado
  if (tabName === 'preventivaTab') {
    document.querySelector('.tab-buttons button:nth-child(1)').classList.add('active');
  } else if (tabName === 'calibragemTab') {
    document.querySelector('.tab-buttons button:nth-child(2)').classList.add('active');
  }
}


function filterByTransportadora() {
  const input = document.getElementById("transportadoraInput").value.toLowerCase();
  document.querySelectorAll("table").forEach(table => {
    table.querySelectorAll("tbody tr").forEach(row => {
      const transportadoraCell = row.cells[0]?.textContent.toLowerCase();
      row.style.display = transportadoraCell.includes(input) ? "" : "none";
    });
  });
}

async function init() {
  const preventiva = await fetchData("Planejamento Preventivas");
  const calibragem = await fetchData("Planejamento Calibragens");

  renderTable("preventivaTable", preventiva);
  renderTable("calibragemTable", calibragem);
}

init();
