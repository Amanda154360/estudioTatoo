let consolesCarregados = [];
let idParaExcluirConsole = null;
let JogoCarregados = [];
let idParaExcluirJogo = null;

// ============================================================
// CONSOLE -- CRUD completo, use como referencia pro de Jogo
// ============================================================

const carregarConsoles = async () => {
  consolesCarregados = await window.api.listarConsoles();

  const linhas = consolesCarregados
    .map(
      (console_) => `
      <tr>
      <td>${console_.titulo}</td>
      <td>${console_.empresa}</td>
      <td>${console_.ano_lancamento}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editarConsole(${console_.id})">
          Editar
        </button>
        <button class="btn btn-sm btn-danger" onclick="abrirConfirmacaoExclusaoConsole(${console_.id})">
          Excluir
        </button>
        </td>
    </tr>`,
    )
    .join("");

  document.querySelector("#tbodyConsoles").innerHTML = linhas;
};

const editarConsole = (id) => {
  const console_ = consolesCarregados.find((c) => c.id === id);
  window.api.editarConsole(console_);
};

const abrirConfirmacaoExclusaoConsole = (id) => {
  const console_ = consolesCarregados.find((item) => item.id === id);

  document.querySelector("#nomeConsoleExcluir").textContent = console_.titulo;
  idParaExcluirConsole = id;

  const modal = new bootstrap.Modal(
    document.querySelector("#modalConfirmarExclusaoConsole"),
  );
  modal.show();
};

document
  .querySelector("#btnConfirmarExclusaoConsole")
  .addEventListener("click", async () => {
    await window.api.excluirConsole(idParaExcluirConsole);

    const modal = bootstrap.Modal.getInstance(
      document.querySelector("#modalConfirmarExclusaoConsole"),
    );
    modal.hide();

    carregarConsoles();
  });

carregarConsoles();

// ============================================================
// TODO (aluno): JOGO -- implemente aqui, no mesmo padrao usado acima
// para Console:
//   - jogosCarregados (array) e idParaExcluirJogo
//   - carregarJogos() preenchendo a #tbodyJogos
//   - editarJogo(id) chamando window.api.editarJogo(jogo)
//   - abrirConfirmacaoExclusaoJogo(id) preenchendo o modal de jogo
//   - o listener de clique do botao de confirmar exclusao de jogo
//   - a chamada inicial carregarJogos()
// ============================================================

const carregarJogo = async () => {
  JogoCarregados = await window.api.listarJogos();

  const linhas = JogoCarregados
    .map(
      (jogo_) => `
      <tr>
      <td>${jogo_.titulo}</td>
      <td>${jogo_.genero}</td>
      <td>${jogo_.tipo_midia}</td>
      <td>${jogo_.ano_lancamento}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editarJogo(${jogo_.id})">
          Editar
        </button>
        <button class="btn btn-sm btn-danger" onclick="abrirConfirmacaoExclusaoJogo(${jogo_.id})">
          Excluir
        </button>
        </td>
    </tr>`,
    )
    .join("");

  document.querySelector("#tbodyJogos").innerHTML = linhas;
};

const editarJogo = (id) => {
  const jogo_ = JogoCarregados.find((j) => j.id === id);
  window.api.editarJogo(jogo_);
};

const abrirConfirmacaoExclusaoJogo = (id) => {
  const jogo_ = JogoCarregados.find((item) => item.id === id);

  document.querySelector("#nomeJogoExcluir").textContent = jogo_.titulo;
  idParaExcluirJogo = id;

  const modalJogo = new bootstrap.Modal(
    document.querySelector("#modalConfirmarExclusaoJogo"),
  );
  modalJogo.show();
};

document
  .querySelector("#btnConfirmarExclusaoJogo")
  .addEventListener("click", async () => {
    await window.api.excluirJogo(idParaExcluirJogo);

    const modalJogo = bootstrap.Modal.getInstance(
      document.querySelector("#modalConfirmarExclusaoJogo"),
    );
    modalJogo.hide();

    carregarJogo();
  });

carregarJogo();


  window.addEventListener('focus', async () => {
    await Promise.all([carregarConsoles(), carregarJogo()]);
  });
