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
    item('Corrigido pela inflação', reais(obj.valor_alvo),
      'Seu valor desejado considerando o acumulado com a inflação projetada para a data desejada'),
    item('Você tem hoje', reais(atual)),
    item('Mesmo sem novos aportes', reais(obj.valor_estimado),
      'Quanto o que você já guardou deve valer na data desejada, rendendo IPCA + 3,5% ao ano, sem considerar novos aportes nem saques. Cada aporte que você fizer aumenta esse valor.'),
  ];
  const quadro = document.getElementById('detalhe-objetivo');
  quadro.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h5 class="mb-3">${obj.nome}</h5>
        <div class="row g-3">${itens.join('')}</div>
        <p class="small text-secondary mt-3 mb-0">Projeção, não garantia de rentabilidade.${abaixoDaMeta ? ' Quer chegar lá mais rápido? Converse com seu assessor.' : ''}</p>
      </div>
    </div>`;
  quadro.classList.remove('d-none');
  quadro.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
  quadro.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function ligarObjetivos(objetivos) {
  document.querySelectorAll('#objetivos .card').forEach((card, i) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => mostrarObjetivo(objetivos[i]));
  });
}