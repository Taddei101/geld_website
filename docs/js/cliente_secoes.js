const SECOES = ['dashboard', 'patrimonio'];

function mostrarSecao() {
  const pedida = location.hash.slice(1);
  const escolhida = SECOES.includes(pedida) ? pedida : SECOES[0];
  SECOES.forEach(id => {
    document.getElementById(id).classList.toggle('d-none', id !== escolhida);
  });
  window.scrollTo(0, 0);

  if (escolhida === 'patrimonio') {
    requestAnimationFrame(() => {
      ['grafico-retorno', 'grafico-reais'].forEach(id => {
        if (document.getElementById(id).data) Plotly.Plots.resize(id);
      });
    });
  }
}

window.addEventListener('hashchange', mostrarSecao);
mostrarSecao();