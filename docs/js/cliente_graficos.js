async function carregarGraficos() {
  const resposta = await fetch(API + '/api/cliente/patrimonio', {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!resposta.ok) return;
  const dados = await resposta.json();
  if (dados.pontos.length < 2) return;

  const datas = dados.pontos.map(p => p.data);
  const linhas = [
    { x: datas, y: dados.retorno_carteira, name: 'Carteira', mode: 'lines+markers', line: { color: '#0057FF', width: 3 } },
  ];
  if (dados.retorno_cdi) {
    linhas.push({ x: datas, y: dados.retorno_cdi, name: 'CDI', mode: 'lines+markers', line: { color: '#98A2B3', width: 2, dash: 'dot' } });
  }

  document.getElementById('patrimonio').classList.remove('d-none');
  Plotly.newPlot('grafico-retorno', linhas, {
    title: 'Retorno acumulado (%)',
    hovermode: 'x unified',
    xaxis: { tickformat: '%d/%m/%y', hoverformat: '%d/%m/%Y', tickvals: datas.length <= 12 ? datas : undefined },
    yaxis: { ticksuffix: '%' },
    margin: { t: 50, r: 10, l: 50, b: 40 },
    legend: { orientation: 'h' },
  }, { responsive: true, displayModeBar: false });
}