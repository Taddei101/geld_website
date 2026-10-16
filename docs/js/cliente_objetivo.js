function mostrarObjetivo(obj) {
  const mesAno = iso => iso ? iso.slice(5, 7) + '/' + iso.slice(0, 4) : '-';
  const reais = v => v === null || v === undefined ? '-' : brl(v);
  const atual = obj.pontos[obj.pontos.length - 1].valor;
  const pctMeta = obj.valor_alvo && obj.valor_estimado != null
    ? ` <span class="small text-secondary">(${Math.round(obj.valor_estimado / obj.valor_alvo * 100)}% da meta)</span>`
    : '';
  const aporte = obj.aporte_mensal == null ? '-'
    : obj.aporte_mensal === 0 ? 'Nenhum, você está no caminho'
    : reais(obj.aporte_mensal) + ' por mês';
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
    item('Corrigido pela inflação', reais(obj.valor_alvo),'Seu valor desejado considerando o acumulado Da inflação projetada para a data final'),
    item('Você tem hoje', reais(atual)),
    item('Estimativa no prazo', reais(obj.valor_estimado) + pctMeta),
    item('Para completar, aporte', aporte),    
  ];
  const quadro = document.getElementById('detalhe-objetivo');
  quadro.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h5 class="mb-3">${obj.nome}</h5>
        <div class="row g-3">${itens.join('')}</div>
        <p class="small text-secondary mt-3 mb-0">Estimativa com o que você já guardou, rendendo IPCA + 3,5% ao ano. É uma projeção, não uma garantia de rentabilidade.</p>
      </div>
    </div>`;
  quadro.classList.remove('d-none');
  quadro.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function ligarObjetivos(objetivos) {
  document.querySelectorAll('#objetivos .card').forEach((card, i) => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => mostrarObjetivo(objetivos[i]));
  });
}