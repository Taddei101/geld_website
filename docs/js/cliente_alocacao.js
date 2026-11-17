const GRUPOS_ALOCACAO = [
  ['Renda Fixa', '#0057FF', c => c.startsWith('Renda Fixa')],
  ['Multimercado', '#7A5AF8', c => c === 'Fundos de Multimercado'],
  ['Ações', '#F79009', c => c === 'Ações'],
  ['Fundos Imobiliários', '#146c43', c => c === 'Fundos Imobiliários'],
  ['Cambial', '#0BA5EC', c => c === 'Cambial'],
  ['Previdência', '#98A2B3', c => c === 'Fundos de Previdência'],
];
const COR_OUTROS = '#D0D5DD';

async function carregarAlocacao() {
  let dados;
  try {
    const resposta = await fetch(API + '/api/cliente/alocacao', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!resposta.ok) return;
    dados = await resposta.json();
  } catch (e) {
    return;
  }

  const somas = new Map();
  (dados.classes || []).forEach(({ classe, valor }) => {
    const grupo = GRUPOS_ALOCACAO.find(([, , pertence]) => pertence(classe || ''));
    const nome = grupo ? grupo[0] : 'Outros';
    somas.set(nome, (somas.get(nome) || 0) + valor);
  });
  const fatias = [...somas].filter(([, valor]) => valor > 0).sort((a, b) => b[1] - a[1]);
  const total = fatias.reduce((s, [, valor]) => s + valor, 0);
  if (!total) return;

  const cor = nome => (GRUPOS_ALOCACAO.find(([n]) => n === nome) || [, COR_OUTROS])[1];
  const pct = valor => (valor / total * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  const brl = x => x.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  document.getElementById('alocacao').classList.remove('d-none');
  document.getElementById('alocacao-mes').textContent = 'Posição de ' + dados.mes;
  document.getElementById('legenda-alocacao').innerHTML = fatias.map(([nome, valor]) =>
    `<li class="d-flex align-items-center gap-2 py-1 small">`
    + `<i class="bi bi-circle-fill" style="color: ${cor(nome)};"></i>`
    + `<span class="flex-grow-1">${nome}</span>`
    + `<span class="fw-semibold" style="font-variant-numeric: tabular-nums;">${pct(valor)}</span>`
    + `<span class="text-secondary text-end" style="font-variant-numeric: tabular-nums; min-width: 8.5em;">${brl(valor)}</span>`
    + `</li>`).join('');

  Plotly.newPlot('grafico-alocacao', [{
    type: 'pie',
    hole: 0.62,
    labels: fatias.map(([nome]) => nome),
    values: fatias.map(([, valor]) => valor),
    marker: { colors: fatias.map(([nome]) => cor(nome)), line: { color: '#fff', width: 2 } },
    sort: false,
    direction: 'clockwise',
    textinfo: 'none',
    hovertemplate: '%{label}<br>%{percent}<extra></extra>',
  }], {
    margin: { t: 0, r: 0, b: 0, l: 0 },
    showlegend: false,
    separators: ',.',
  }, { responsive: true, displayModeBar: false });
}
