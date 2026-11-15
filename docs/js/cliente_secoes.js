const SECOES = { 'aba-objetivos': 'dashboard', 'aba-patrimonio': 'patrimonio' };
const ENDERECOS_ANTIGOS = { dashboard: 'aba-objetivos', patrimonio: 'aba-patrimonio' };

function mostrarSecao() {
  let pedida = location.hash.slice(1);
  if (ENDERECOS_ANTIGOS[pedida]) {
    pedida = ENDERECOS_ANTIGOS[pedida];
    history.replaceState(null, '', '#' + pedida);
  }
  const escolhida = SECOES[pedida] || 'dashboard';
  Object.values(SECOES).forEach(id => {
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
window.addEventListener('load', () => window.scrollTo(0, 0));
mostrarSecao();