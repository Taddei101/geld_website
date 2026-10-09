function mostrarObjetivo(obj) {
  const mesAno = iso => iso ? iso.slice(5, 7) + '/' + iso.slice(0, 4) : '-';
  const reais = v => v === null || v === undefined ? '-' : brl(v);
  const atual = obj.pontos[obj.pontos.length - 1].valor;
  const item = (rotulo, valor) => `
    <div class="col-6 col-md-4">
      <div class="small text-secondary">${rotulo}</div>
      <div class="fw-semibold">${valor}</div>
    </div>`;
  const itens = [
    item('Início', mesAno(obj.data_inicial)),
    item('Prazo', mesAno(obj.data_alvo)),
    item('Valor desejado', reais(obj.valor_desejado)),
    item('Corrigido pela inflação', reais(obj.valor_alvo)),
    item('Você tem hoje', reais(atual)),
    item('Falta', obj.valor_alvo ? reais(Math.max(0, obj.valor_alvo - atual)) : '-'),
  ];
  const quadro = document.getElementById('detalhe-objetivo');
  quadro.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h5 class="mb-3">${obj.nome}</h5>
        <div class="row g-3">${itens.join('')}</div>
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