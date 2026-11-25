let lequesCarregados = null;

function carregarLeques() {
  if (!lequesCarregados) {
    lequesCarregados = fetch(API + '/api/cliente/leques', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.ok ? r.json() : { objetivos: [] })
      .then(d => Object.fromEntries(d.objetivos.map(l => [l.nome, l])))
      .catch(() => ({}));
  }
  return lequesCarregados;
}

function mostrarObjetivo(obj) {
  const mesAno = iso => iso ? iso.slice(5, 7) + '/' + iso.slice(0, 4) : '-';
  const reais = v => v === null || v === undefined ? '-' : brl(v);
  const atual = obj.pontos[obj.pontos.length - 1].valor;
  const abaixoDaMeta = obj.valor_estimado != null && obj.valor_alvo && obj.valor_estimado < obj.valor_alvo;
  const item = (rotulo, valor, dica) => `
    <div class="col-6 col-md-4">
      <div class="small text-secondary">${dica
        ? `<span data-bs-toggle="tooltip" data-bs-title="${dica}" style="cursor: help;">${rotulo} <i class="bi bi-info-circle"></i></span>`
        : rotulo}</div>
      <div class="fw-semibold">${valor}</div>
    </div>`;
  const itens = [
    item('Início', mesAno(obj.data_inicial)),
    item('Prazo', mesAno(obj.data_alvo)),
    item('Valor desejado', reais(obj.valor_desejado)),
    item('Corrigido', reais(obj.valor_alvo),
      'Seu valor desejado considerando o acumulado com a inflação projetada para a data desejada'),
    item('Valor atual', reais(atual)),
    item('Valor futuro', reais(obj.valor_estimado),
      'Quanto o que você já guardou deve valer na data desejada, rendendo IPCA + 3,5% ao ano, sem considerar novos aportes nem saques. Cada aporte que você fizer aumenta esse valor.'),
  ];
  const quadro = document.getElementById('detalhe-objetivo');
  quadro.innerHTML = `
    <div class="card h-100">
      <div class="card-body">
        <h5 class="mb-3">${obj.nome}</h5>
        <div class="row g-3">${itens.join('')}</div>
        <div id="periodo-objetivo" class="d-flex gap-2 mt-3"></div>
        <div id="grafico-objetivo" class="mt-2" style="height: 220px;"></div>
        <div id="leque-objetivo" class="mt-4"></div>
        <p class="small text-secondary mt-3 mb-0">Projeção, não garantia de rentabilidade.${abaixoDaMeta ? ' Quer chegar lá mais rápido? Converse com seu gestor.' : ''}</p>
      </div>
    </div>`;
  quadro.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
}

function desenharGraficoObjetivo(obj) {
  const caixa = document.getElementById('grafico-objetivo');
  const periodos = document.getElementById('periodo-objetivo');
  if (!obj.pontos.length) { caixa.remove(); periodos.remove(); return; }
  const UM_ANO = 12;
  const MIN_BARRAS = 6;
  const MAX_ROTULOS = 6;
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mes = iso => MESES[Number(iso.slice(5, 7)) - 1] + '/' + iso.slice(2, 4);

  const desenhar = pontos => {
    const meses = pontos.map(p => mes(p.data));
    const passo = Math.ceil(meses.length / MAX_ROTULOS);
    const marcas = meses.filter((_, i) => (meses.length - 1 - i) % passo === 0);
    const folga = Math.max(0, (MIN_BARRAS - meses.length) / 2);
    const barras = {
      type: 'bar',
      x: meses,
      y: pontos.map(p => p.valor),
      marker: { color: '#0057FF' },
      hovertemplate: '%{x}: R$ %{y:,.2f}<extra></extra>',
    };
    return Plotly.react(caixa, [barras], {
      separators: ',.',
      dragmode: false,
      bargap: 0.3,
      margin: { t: 5, r: 10, l: 10, b: 30 },
      xaxis: { type: 'category', range: [-0.5 - folga, meses.length - 0.5 + folga], tickvals: marcas, ticktext: marcas, tickangle: 0, automargin: true, fixedrange: true },
      yaxis: { tickprefix: 'R$ ', tickformat: ',.0f', automargin: true, fixedrange: true },
      showlegend: false,
    }, { responsive: true, displayModeBar: false, doubleClick: false });
  };

  if (obj.pontos.length <= UM_ANO) { periodos.remove(); return desenhar(obj.pontos); }

  const opcoes = [['12 meses', obj.pontos.slice(-UM_ANO)], ['Todo período', obj.pontos]];
  periodos.innerHTML = opcoes.map(([nome], i) =>
    `<button type="button" class="btn btn-sm rounded-pill border py-0 px-2" data-periodo="${i}">${nome}</button>`).join('');
  const escolher = i => {
    periodos.querySelectorAll('button').forEach(b => {
      const ligado = Number(b.dataset.periodo) === i;
      b.classList.toggle('bg-light', ligado);
      b.classList.toggle('fw-semibold', ligado);
      b.classList.toggle('text-secondary', !ligado);
      b.setAttribute('aria-pressed', ligado);
    });
    return desenhar(opcoes[i][1]);
  };
  periodos.addEventListener('click', e => {
    const botao = e.target.closest('button');
    if (botao) escolher(Number(botao.dataset.periodo));
  });
  return escolher(0);
}

function ligarObjetivos(objetivos) {
  const grade = document.getElementById('objetivos');
  const foco = document.getElementById('foco');
  const destaque = document.getElementById('foco-destaque');
  const outros = document.getElementById('foco-outros');
  const caixas = [...grade.children];
  const cards = caixas.map(caixa => caixa.querySelector('.card'));
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let aberto = null;

  const animar = mudanca => {
    if (!document.startViewTransition || semMovimento) return mudanca();
    document.startViewTransition(mudanca);
  };
  const resumo = (card, mostrar) => card.querySelector('.card-body').classList.toggle('d-none', !mostrar);

  const abrir = i => {
    if (i === aberto) return;
    animar(() => {
      aberto = i;
      mostrarObjetivo(objetivos[i]);
      destaque.replaceChildren(cards[i]);
      resumo(cards[i], false);
      outros.replaceChildren(...cards.map((card, j) => {
        if (j === i) return null;
        const mini = document.createElement('div');
        mini.className = 'col-3 col-lg-6';
        mini.append(card);
        resumo(card, false);
        return mini;
      }).filter(Boolean));
      outros.parentElement.classList.toggle('d-none', cards.length === 1);
      grade.classList.add('d-none');
      foco.classList.remove('d-none');
      desenharGraficoObjetivo(objetivos[i]);
      desenharLeque(objetivos[i]);
      desenharRosca(objetivos[i], cards[i]);
    });
  };

  const fechar = () => {
    if (aberto === null) return;
    animar(() => {
      aberto = null;
      cards.forEach((card, i) => { caixas[i].append(card); resumo(card, true); });
      foco.classList.add('d-none');
      grade.classList.remove('d-none');
    });
  };

  cards.forEach((card, i) => {
    card.style.cursor = 'pointer';
    card.style.viewTransitionName = 'objetivo-' + i;
    card.title = objetivos[i].nome;
    card.addEventListener('click', () => abrir(i));
  });
  document.getElementById('detalhe-objetivo').style.viewTransitionName = 'objetivo-detalhe';
  document.getElementById('fechar-foco').addEventListener('click', fechar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
}


async function desenharLeque(obj) {
  const caixa = document.getElementById('leque-objetivo');
  if (!caixa) return;
  const l = (await carregarLeques())[obj.nome];
  if (document.getElementById('leque-objetivo') !== caixa) return;
  if (!l) {
    caixa.remove();
    return;
  }
  const pct = (v, casas = 1) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';
  const taxa = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const dataBr = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
  const [ano, mes] = l.congelado_em.split('-').map(Number);
  const dia = Math.min(Number(l.congelado_em.slice(8, 10)), 28);
  const dataDoMes = t => { const d = new Date(ano, mes - 1 + t, dia); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0'); };
  const mesesDesde = iso => (Number(iso.slice(0, 4)) - ano) * 12 + Number(iso.slice(5, 7)) - mes;

  const x = l.leque.map(p => dataDoMes(p.mes));
  const y = q => l.leque.map(p => p[q] * 100);
  const ultimo = l.twr[l.twr.length - 1];
  const hoje = ultimo ? Math.min(Math.max(mesesDesde(ultimo.data), 0), l.meses_total) : 0;
  const faixa = l.leque[hoje];
  const dentro = !ultimo || (ultimo.valor >= faixa.p10 && ultimo.valor <= faixa.p90);
  const fim = l.leque[l.leque.length - 1];
  const nominal = ((1 + l.ipca_anual / 100) * (1 + l.taxa_real_anual / 100) - 1) * 100;
  const explica = `<p class='text-start mb-2'>Calculado em ${dataBr(l.congelado_em)} e fixo até o prazo ou o tipo do objetivo mudarem.</p>`
    + `<p class='text-start mb-2'><b>Inflação:</b> IPCA dos 12 meses anteriores, ${taxa(l.ipca_anual)} a.a. (Banco Central).</p>`
    + `<p class='text-start mb-2'><b>Juro real:</b> ${taxa(l.taxa_real_anual)} a.a. Centro do leque: ${taxa(nominal)} a.a.</p>`
    + (l.sigma_inicial === l.sigma_final
      ? `<p class='text-start mb-2'><b>Oscilação:</b> ${taxa(l.sigma_inicial * 100)} a.a.</p>`
      : `<p class='text-start mb-2'><b>Oscilação:</b> de ${taxa(l.sigma_inicial * 100)} a ${taxa(l.sigma_final * 100)} a.a., menor conforme o prazo se aproxima.</p>`)
    + `<p class='text-start mb-0'>A borda de baixo da faixa clara não é piso garantido: em 9 de cada 10 cenários o resultado fica acima dela.</p>`;

  caixa.innerHTML = `
    <div class="d-flex flex-wrap align-items-baseline gap-2 mb-1">
      <span class="fw-semibold">Rentabilidade dentro do previsto</span>
      <span data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="${explica}" tabindex="0" style="cursor: help;"><i class="bi bi-info-circle"></i></span>
    </div>
    <div class="small text-secondary mb-2">
      ${ultimo ? `Desde ${dataBr(l.congelado_em)}: <b class="text-body">${pct(ultimo.valor)}</b> · previsto para agora entre ${pct(faixa.p10)} e ${pct(faixa.p90)}
      <span class="badge rounded-pill border ${dentro ? 'text-success border-success' : 'text-warning-emphasis border-warning'} fw-semibold ms-1">${dentro ? 'dentro do previsto' : (ultimo.valor < faixa.p10 ? 'abaixo' : 'acima') + ' do previsto'}</span>` : ''}
    </div>
    <div id="periodo-leque" class="d-flex gap-2 mb-2"></div>
    <div id="grafico-leque" style="height: 260px;"></div>
    <div class="small text-secondary mt-2">No prazo: centro ${pct(fim.p50, 0)} · em 9 de cada 10 cenários, acima de ${pct(fim.p10, 0)}.${dentro ? '' : ' Converse com seu gestor.'}</div>`;
  caixa.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));

  const linha = (nome, q, extra) => ({ type: 'scatter', mode: 'lines', x, y: y(q), name: nome, hoverinfo: 'skip', line: { width: 0 }, ...extra });
  const tracos = [
    linha('', 'p10'),
    linha('8 em 10 cenários', 'p90', { fill: 'tonexty', fillcolor: 'rgba(0, 87, 255, 0.10)' }),
    linha('', 'p25'),
    linha('metade dos cenários', 'p75', { fill: 'tonexty', fillcolor: 'rgba(0, 87, 255, 0.18)' }),
    linha('centro', 'p50', { line: { color: '#0057FF', width: 1.5, dash: 'dash' }, hovertemplate: 'Centro: %{y:.1f}%<extra></extra>', hoverinfo: undefined }),
    {
      type: 'scatter', mode: 'lines', name: 'sua carteira',
      x: l.twr.map(p => p.data), y: l.twr.map(p => p.valor * 100),
      line: { color: '#101828', width: 2.5 },
      hovertemplate: '%{x|%d/%m/%Y}: %{y:.1f}%<extra></extra>',
    },
  ];
  if (ultimo) tracos.push({
    type: 'scatter', mode: 'markers', x: [ultimo.data], y: [ultimo.valor * 100],
    marker: { size: 7, color: '#101828' }, hoverinfo: 'skip',
  });

  const grafico = document.getElementById('grafico-leque');
  const desenhar = fimMes => {
    const fimData = ultimo && ultimo.data > x[fimMes] ? ultimo.data : x[fimMes];
    const visiveis = [
      ...l.leque.slice(0, fimMes + 1).flatMap(p => [p.p10, p.p90]),
      ...l.twr.filter(p => p.data <= fimData).map(p => p.valor),
    ].map(v => v * 100);
    const baixo = Math.min(...visiveis), alto = Math.max(...visiveis), folga = (alto - baixo) * 0.06 || 1;
    return Plotly.react(grafico, tracos, {
      separators: ',.',
      dragmode: false,
      margin: { t: 5, r: 10, l: 10, b: 30 },
      xaxis: { type: 'date', tickformat: '%m/%y', range: [x[0], new Date(Date.parse(fimData) + (Date.parse(fimData) - Date.parse(x[0])) * 0.02)], automargin: true, fixedrange: true },
      yaxis: { ticksuffix: '%', tickformat: '.0f', range: [baixo - folga, alto + folga], zeroline: true, zerolinecolor: '#D0D5DD', automargin: true, fixedrange: true },
      showlegend: false,
    }, { responsive: true, displayModeBar: false, doubleClick: false });
  };

  const opcoes = [];
  if (l.twr.length >= 2 && hoje > 0) opcoes.push(['Até hoje', hoje]);
  for (const [nome, meses] of [['+1 ano', 12], ['+2 anos', 24]]) {
    const fimMes = Math.min(hoje + meses, l.meses_total);
    if (!opcoes.length || fimMes > opcoes[opcoes.length - 1][1]) opcoes.push([nome, fimMes]);
  }
  const periodos = document.getElementById('periodo-leque');
  if (opcoes.length === 1) { periodos.remove(); return desenhar(opcoes[0][1]); }
  periodos.innerHTML = opcoes.map(([nome], i) =>
    `<button type="button" class="btn btn-sm rounded-pill border py-0 px-2" data-periodo="${i}">${nome}</button>`).join('');
  const escolher = i => {
    periodos.querySelectorAll('button').forEach(b => {
      const ligado = Number(b.dataset.periodo) === i;
      b.classList.toggle('bg-light', ligado);
      b.classList.toggle('fw-semibold', ligado);
      b.classList.toggle('text-secondary', !ligado);
      b.setAttribute('aria-pressed', ligado);
    });
    return desenhar(opcoes[i][1]);
  };
  periodos.addEventListener('click', e => {
    const botao = e.target.closest('button');
    if (botao) escolher(Number(botao.dataset.periodo));
  });
  escolher(0);
}
