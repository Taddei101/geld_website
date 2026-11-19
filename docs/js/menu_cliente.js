// Nas páginas das ferramentas: cliente logado (geld_token desta aba) vê o menu
// da área do cliente em vez do menu do site. Carregar ANTES do main.js.
(function () {
  let token = null;
  try { token = sessionStorage.getItem('geld_token'); } catch (e) { return; }
  const lista = document.querySelector('#navmenu > ul');
  if (!token || !lista) return;

  const pagina = location.pathname.split('/').pop();
  const item = (href, texto) => `<li><a href="${href}"${href === pagina ? ' class="active"' : ''}>${texto}</a></li>`;
  lista.innerHTML =
    item('cliente_dashboard.html#aba-objetivos', 'Objetivos') +
    item('cliente_dashboard.html#aba-patrimonio', 'Patrimônio e rentabilidade') +
    '<li class="dropdown"><a href="javascript:void(0)" class="active"><span>Ferramentas</span> <i class="bi bi-chevron-down toggle-dropdown"></i></a><ul>' +
    item('rebalanceamento.html', 'Rebalanceamento de carteira') +
    item('aposentadoria.html', 'Simulador de aposentadoria') +
    '</ul></li>' +
    '<li><a href="login.html" id="sair-cliente"><i class="bi bi-box-arrow-right me-1"></i>Sair</a></li>';

  document.getElementById('sair-cliente').addEventListener('click', () => {
    try { sessionStorage.removeItem('geld_token'); } catch (e) { /* nada */ }
  });
  const logo = document.querySelector('#header a.logo');
  if (logo) logo.href = 'cliente_dashboard.html';
})();
