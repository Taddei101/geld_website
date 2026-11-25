const GRUPOS_ALOCACAO = [
  ['Renda Fixa', '#0057FF', c => c.startsWith('Renda Fixa')],
  ['Multimercado', '#7A5AF8', c => c === 'Fundos de Multimercado'],
  ['Ações', '#F79009', c => c === 'Ações'],
  ['Fundos Imobiliários', '#146c43', c => c === 'Fundos Imobiliários'],
  ['Cambial', '#0BA5EC', c => c === 'Cambial'],
  ['Previdência', '#98A2B3', c => c === 'Fundos de Previdência'],
];
const COR_OUTROS = '#D0D5DD';

let alocacoesCarregadas = null;

function carregarAlocacoes() {
  if (!alocacoesCarregadas) {
    alocacoesCarregadas = fetch(API + '/api/cliente/alocacao', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.ok ? r.json() : {})
      .then(d => ({ mes: d.mes, porNome: Object.fromEntries((d.objetivos || []).map(o => [o.nome, o.classes])) }))
      .catch(() => ({ porNome: {} }));
  }
  return alocacoesCarregadas;
}

function fatiasPorGrupo(classes) {
  const somas = new Map();
  classes.forEach(({ classe, valor }) => {
    const grupo = GRUPOS_ALOCACAO.find(([, , pertence]) => pertence(classe || ''));
    const nome = grupo ? grupo[0] : 'Outros';
    somas.set(nome, (somas.get(nome) || 0) + valor);
  });
  return [...somas].filter(([, valor]) => valor > 0).sort((a, b) => b[1] - a[1]);
}

async function desenharRosca(obj, card) {
  const { mes, porNome } = await carregarAlocacoes();
  const fatias = fatiasPorGrupo(porNome[obj.nome] || []);
  const total = fatias.reduce((s, [, valor]) => s + valor, 0);
  if (!total) return;

  let bloco = card.querySelector('.rosca-objetivo');
  if (!bloco) {
    bloco = document.createElement('div');
    bloco.className = 'rosca-objetivo so-no-foco';
    bloco.innerHTML = `
      <div class="small text-secondary text-center">Posição de ${mes}</div>
      <div class="grafico-rosca mx-auto" style="height: 140px; width: 140px;"></div>
      <ul class="list-unstyled small mb-0"></ul>`;
    card.querySelector('.position-relative').append(bloco);
  }

  const cor = nome => (GRUPOS_ALOCACAO.find(([n]) => n === nome) || [, COR_OUTROS])[1];
  const pct = valor => (valor / total * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

  bloco.querySelector('ul').innerHTML = fatias.map(([nome, valor]) =>
    `<li class="d-flex align-items-center gap-2">`
    + `<i class="bi bi-circle-fill" style="color: ${cor(nome)}; font-size: .6em;"></i>`
    + `<span class="flex-grow-1">${nome}</span>`
    + `<span class="fw-semibold" style="font-variant-numeric: tabular-nums;">${pct(valor)}</span>`
    + `</li>`).join('');

  Plotly.react(bloco.querySelector('.grafico-rosca'), [{
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
  }, { displayModeBar: false });
}
