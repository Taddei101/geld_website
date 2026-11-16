function semGraficos(texto) {
  document.querySelector('#patrimonio .row').innerHTML = `<p class="text-center">${texto}</p>`;
}

async function carregarGraficos() {
  let dados;
  try {
    const resposta = await fetch(API + '/api/cliente/patrimonio', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!resposta.ok) throw new Error(resposta.status);
    dados = await resposta.json();
  } catch (e) {
    return semGraficos('Não foi possível carregar seus gráficos agora. Tente novamente mais tarde.');
  }
  if (dados.pontos.length < 2) {
    return semGraficos('Seus gráficos aparecerão aqui a partir do segundo mês de acompanhamento.');
  }

  const AZUL = '#0057FF';
  const VERDE = '#146c43';
  const CORES_BENCHMARK = { IPCA: '#98A2B3', CDI: '#F79009', Ibovespa: '#7A5AF8' };
  const nomesBenchmark = Object.keys(dados.benchmarks || {});
  const cor = nome => CORES_BENCHMARK[nome] || '#667085';
  const estilo = nome => ({ color: cor(nome), width: 1.5, dash: 'dot' });
  const ligados = new Set(nomesBenchmark.includes('IPCA') ? ['IPCA'] : []);
  const MIN_MESES = 6;
  const MAX_ROTULOS = 4;
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const DIA = 24 * 60 * 60 * 1000;

  const todasDatas = dados.pontos.map(p => p.data);
  const anoMes = d => { const [a, m] = d.split('-').map(Number); return a * 12 + m; };
  const ultimoMes = anoMes(todasDatas[todasDatas.length - 1]);
  const periodos = [['1 ano', 12], ['2 anos', 24], ['Todo período', 0]]
    .filter(([, meses]) => !meses || anoMes(todasDatas[0]) < ultimoMes - meses);
  let periodo = periodos.length - 1;
  const inicioDe = meses => meses ? todasDatas.findIndex(d => anoMes(d) >= ultimoMes - meses) : 0;

  const fator = r => 1 + r / 100;
  const doInicio = (serie, s) => serie.slice(s).map(r =>
    r == null || serie[s] == null ? null : (fator(r) / fator(serie[s]) - 1) * 100);

  const recortar = s => {
    const valorInicial = dados.pontos[s].valor;
    const benchmarks = nomesBenchmark.map(nome => {
      const b = dados.benchmarks[nome];
      const reais = s === 0 ? b.reais : b.reais.slice(s).map((x, j) => {
        const r = b.retorno[s + j];
        if (x == null || r == null || b.reais[s] == null || b.retorno[s] == null) return null;
        return x + (valorInicial - b.reais[s]) * fator(r) / fator(b.retorno[s]);
      });
      return [nome, { retorno: doInicio(b.retorno, s), reais }];
    });
    return {
      datas: todasDatas.slice(s),
      meses: dados.meses.slice(s),
      carteira: doInicio(dados.retorno_carteira, s),
      atual: dados.pontos.slice(s).map(p => p.valor),
      investido: s === 0 ? dados.investido : dados.investido.slice(s).map(x => valorInicial + x - dados.investido[s]),
      benchmarks,
      doComeco: s === 0,
    };
  };

  const layout = (v, eixoY) => {
    const eixo = [...v.datas];
    const nomes = [...v.meses];
    while (eixo.length < MIN_MESES) {
      const [ano, mes] = eixo[eixo.length - 1].split('-').map(Number);
      nomes.push(MESES[mes - 1] + '/' + String(ano).slice(2));
      eixo.push(mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`);
    }
    const passo = Math.ceil(eixo.length / MAX_ROTULOS);
    const naMarca = (_, i) => (eixo.length - 1 - i) % passo === 0;
    const faixa = [new Date(eixo[0]).getTime() - 10 * DIA, new Date(eixo[eixo.length - 1]).getTime() + 10 * DIA];
    return {
      hovermode: 'x unified',
      dragmode: false,
      separators: ',.',
      xaxis: { range: faixa, tickvals: eixo.filter(naMarca), ticktext: nomes.filter(naMarca), hoverformat: 'Posição em %d/%m/%Y' },
      yaxis: eixoY,
      margin: { t: 5, r: 30, l: 50, b: 40 },
      showlegend: false,
    };
  };
  const opcoes = { responsive: true, displayModeBar: false, doubleClick: false };

  const tracosRetorno = v => [
    { x: v.datas, y: v.carteira, name: 'Carteira', mode: 'lines', line: { color: AZUL, width: 1.5 } },
    ...v.benchmarks.map(([nome, b]) =>
      ({ x: v.datas, y: b.retorno, name: nome, mode: 'lines', line: estilo(nome), visible: ligados.has(nome) })),
  ];

  const tracosReais = v => {
    const fluxo = v.investido.map((x, i) => i === 0 ? 0 : x - v.investido[i - 1]);
    const comDegrau = valores => {
      const x = [], y = [];
      valores.forEach((valor, i) => {
        if (fluxo[i] !== 0 && valor != null) { x.push(v.datas[i]); y.push(valor - fluxo[i]); }
        x.push(v.datas[i]); y.push(valor);
      });
      return { x, y };
    };
    return [
      { x: v.datas, y: v.investido, name: 'Investido', mode: 'lines', hoverinfo: 'none', line: { color: VERDE, width: 1.5, shape: 'hv' }, fill: 'tozeroy', fillcolor: 'rgba(20, 108, 67, 0.12)' },
      { ...comDegrau(v.atual), name: 'Atual', mode: 'lines', hoverinfo: 'none', line: { color: AZUL, width: 1.5 }, fill: 'tonexty', fillcolor: 'rgba(0, 87, 255, 0.12)' },
      ...v.benchmarks.map(([nome, b]) =>
        ({ ...comDegrau(b.reais), name: nome, mode: 'lines', hoverinfo: 'none', line: estilo(nome), visible: ligados.has(nome) })),
    ];
  };

  const faixaReais = tracos => {
    const valoresY = tracos.filter(t => t.visible !== false).flatMap(t => t.y).filter(y => y != null);
    const minY = Math.min(...valoresY);
    const maxY = Math.max(...valoresY);
    const folga = (maxY - minY) * 0.1 || maxY * 0.05;
    return [minY - folga, maxY + folga];
  };

  const traco = c => `<span style="display: inline-block; width: 18px; border-top: 2px solid ${c}; vertical-align: middle;"></span>`;
  const fixo = (nome, c) => `<span class="small text-secondary">${traco(c)} ${nome}</span>`;
  const pilulas = () => nomesBenchmark.map(nome => {
    const ligado = ligados.has(nome);
    return `<button type="button" class="btn btn-sm rounded-pill border py-0 px-2 ${ligado ? 'bg-light fw-semibold' : 'text-secondary'}" data-benchmark="${nome}" aria-pressed="${ligado}">`
      + `<i class="bi bi-${ligado ? 'circle-fill' : 'circle'}" style="color: ${cor(nome)};"></i> ${nome}</button>`;
  }).join('');
  const fmt = x => Math.abs(x).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const comparar = (v, nome, b) => {
    let k = v.datas.length - 1;
    while (k > 0 && (b.retorno[k] == null || v.carteira[k] == null)) k--;
    if (k === 0) return '';
    const meses = anoMes(v.datas[k]) - anoMes(v.datas[0]);
    const carteira = fator(v.carteira[k]);
    const indice = fator(b.retorno[k]);
    const anual = meses >= 12;
    const prazo = anual ? 'a.a.' : 'no período';
    let texto, acima;
    if (nome === 'CDI') {
      acima = carteira >= indice;
      if (indice === 1) return '';
      const razao = Math.round((carteira - 1) / (indice - 1) * 100);
      texto = (razao < 0 ? '−' : '') + Math.abs(razao) + '% do CDI';
    } else {
      const excesso = (carteira / indice) ** (anual ? 12 / meses : 1) - 1;
      acima = excesso >= 0;
      texto = `${nome} ${acima ? '+' : '−'} ${fmt(excesso * 100)}% ${prazo}`;
    }
    const titulo = `De ${v.meses[0]} a ${v.meses[k]}`;
    return `<span class="d-inline-block rounded-pill border bg-light small fw-semibold px-3 py-1" title="${titulo}" style="color: ${acima ? VERDE : '#b42318'};">${texto}</span>`;
  };

  const caixaPeriodos = document.getElementById('periodo-graficos');
  const desenharPeriodos = () => {
    if (periodos.length < 2) { caixaPeriodos.innerHTML = ''; return; }
    caixaPeriodos.innerHTML = periodos.map(([nome], i) => {
      const ligado = i === periodo;
      return `<button type="button" class="btn btn-sm rounded-pill border py-0 px-2 ${ligado ? 'bg-light fw-semibold' : 'text-secondary'}" data-periodo="${i}" aria-pressed="${ligado}">${nome}</button>`;
    }).join('');
  };

  const brl = x => x.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const pilula = document.getElementById('leitura-valor');
  pilula.style.fontVariantNumeric = 'tabular-nums';
  let mostrado = null;
  let quadro = null;
  let vista = null;
  const escrever = (rendimento, investido) => {
    mostrado = rendimento;
    const sobe = rendimento >= 0;
    let texto = brl(rendimento) + ' <i class="bi bi-arrow-' + (sobe ? 'up' : 'down') + '"></i>';
    if (investido > 0) texto += ' ' + (rendimento / investido * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    pilula.innerHTML = texto;
    pilula.style.color = sobe ? '#146c43' : '#b42318';
  };
  const leitura = i => {
    const v = vista;
    document.getElementById('leitura-titulo').textContent = v.doComeco
      ? 'Rendimento até ' + v.meses[i]
      : `Rendimento de ${v.meses[0]} a ${v.meses[i]}`;
    const destino = v.atual[i] - v.investido[i];
    const origem = mostrado === null ? destino : mostrado;
    const inicio = performance.now();
    cancelAnimationFrame(quadro);
    const passo = agora => {
      const t = Math.min((agora - inicio) / 300, 1);
      escrever(origem + (destino - origem) * t, v.investido[i]);
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    passo(inicio);
  };

  const desenhar = () => {
    vista = recortar(inicioDe(periodos[periodo][1]));
    const reais = tracosReais(vista);
    document.getElementById('comparacao-retorno').innerHTML = vista.benchmarks
      .filter(([nome]) => ligados.has(nome)).map(([nome, b]) => comparar(vista, nome, b)).join('');
    document.getElementById('legenda-retorno').innerHTML = fixo('Carteira', AZUL) + pilulas();
    document.getElementById('legenda-reais').innerHTML = fixo('Investido', VERDE) + fixo('Atual', AZUL) + pilulas();
    desenharPeriodos();
    leitura(vista.datas.length - 1);
    return Promise.all([
      Plotly.react('grafico-retorno', tracosRetorno(vista), layout(vista, { ticksuffix: '%' }), opcoes),
      Plotly.react('grafico-reais', reais, layout(vista, { tickprefix: 'R$ ', tickformat: ',.0f', automargin: true, range: faixaReais(reais) }), opcoes),
    ]);
  };

  desenhar().then(([, grafico]) => {
    const apontar = e => {
      if (!e.points || !e.points.length) return;
      const i = vista.datas.indexOf(e.points[0].x);
      if (i >= 0) leitura(i);
    };
    grafico.on('plotly_hover', apontar);
    grafico.on('plotly_click', apontar);
    grafico.on('plotly_unhover', () => leitura(vista.datas.length - 1));
  });

  caixaPeriodos.addEventListener('click', e => {
    const botao = e.target.closest('[data-periodo]');
    if (!botao) return;
    periodo = Number(botao.dataset.periodo);
    desenhar();
  });
  const carrossel = document.getElementById('carrossel-graficos');
  bootstrap.Carousel.getOrCreateInstance(carrossel);
  carrossel.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
  carrossel.addEventListener('click', e => {
    const botao = e.target.closest('[data-benchmark]');
    if (!botao) return;
    const nome = botao.dataset.benchmark;
    if (ligados.has(nome)) ligados.delete(nome); else ligados.add(nome);
    desenhar();
  });
  carrossel.addEventListener('slide.bs.carousel', () => {
    requestAnimationFrame(() => {
      Plotly.Plots.resize('grafico-retorno');
      Plotly.Plots.resize('grafico-reais');
    });
  });
}
