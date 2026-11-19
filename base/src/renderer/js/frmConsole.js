let modoEdicao = false;
let idEmEdicao = null;

// Se o main mandar um console pra editar, preenche o formulario (send/on)
window.api.aoReceberConsoleParaEditar((console_) => {
  document.querySelector("#titulo").value = console_.titulo;
  document.querySelector("#empresa").value = console_.empresa;
  document.querySelector("#ano_lancamento").value = console_.ano_lancamento;

  modoEdicao = true;
  idEmEdicao = console_.id;
});

document
  .querySelector("#formConsole")
  .addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.target));

    if (modoEdicao) {
      await window.api.atualizarConsole({ id: idEmEdicao, ...dados });
    } else {
      try {
        const resultado = await window.api.criarConsole(dados);
        console.log("Console cadastrado:", resultado);
      } catch (erro) {
        console.error("Deu ruim ao cadastrar o console:", erro);
      }
    }

    window.close(); // fecha o modal; frmPrincipal recarrega quando o foco voltar
  });
