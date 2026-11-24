
let modoEdicaoJogo = false;
let idEmEdicaoJogo = null;

// Se o main mandar um console pra editar, preenche o formulario (send/on)
window.api.aoReceberJogoParaEditar((jogo_) => {
  document.querySelector("#titulo").value = jogo_.titulo;
  document.querySelector("#genero").value = jogo_.genero;
  document.querySelector("#tipo_midia").value = jogo_.tipo_midia;
  document.querySelector("#ano_lancamento").value = jogo_.ano_lancamento;

  modoEdicaoJogo = true;
  idEmEdicaoJogo =jogo_.id;
});

document
  .querySelector("#formJogo")
  .addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.target));

    try {
      if (modoEdicaoJogo) {
        await window.api.atualizarJogo({ id: idEmEdicaoJogo, ...dados });
      } else {
        const resultado = await window.api.criarJogo(dados);
        console.log("Jogo a cadastrado:", resultado);
      }
    } catch (erro) {
      console.error("Erro ao salvar o jogo:", erro);
      window.alert("Nao foi possivel salvar o jogo. Confira a conexao e os dados informados.");
      return;
    }

    window.close(); // fecha o modal; frmPrincipal recarrega quando o foco voltar
  });
