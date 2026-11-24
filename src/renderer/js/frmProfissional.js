let modoEdicao = false;
let idEmEdicao = null;

// Máscaras de CPF e Telefone
const inputCpfProf = document.querySelector("#cpf");
if (inputCpfProf) {
  inputCpfProf.addEventListener("input", (e) => {
    if (typeof formatarCpf === "function") e.target.value = formatarCpf(e.target.value);
  });
}

const inputTelProf = document.querySelector("#telefone");
if (inputTelProf) {
  inputTelProf.addEventListener("input", (e) => {
    if (typeof formatarTelefone === "function") e.target.value = formatarTelefone(e.target.value);
  });
}

// Preenchimento para modo de edição
window.api.aoReceberProfissionalParaEditar((prof_) => {
  modoEdicao = true;
  idEmEdicao = prof_.id;

  document.querySelector("#tituloFormulario").textContent = "Editar Profissional";
  document.querySelector("#id").value = prof_.id;
  document.querySelector("#nome").value = prof_.nome || "";
  document.querySelector("#cpf").value = prof_.cpf || "";
  document.querySelector("#telefone").value = prof_.telefone || "";
  document.querySelector("#email").value = prof_.email || "";
  document.querySelector("#especialidade").value = prof_.especialidade || "Tatuador";
  document.querySelector("#comissao_percentual").value = prof_.comissao_percentual !== undefined ? prof_.comissao_percentual : "50.00";
  document.querySelector("#ativo").value = prof_.ativo !== undefined ? (prof_.ativo ? "1" : "0") : "1";
  document.querySelector("#observacoes").value = prof_.observacoes || "";
});

// Envio do formulário
document.querySelector("#formProfissional").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const dados = Object.fromEntries(new FormData(evento.target));

  dados.ativo = dados.ativo === "1";
  dados.comissao_percentual = parseFloat(dados.comissao_percentual) || 0;

  try {
    if (modoEdicao) {
      await window.api.atualizarProfissional({ id: idEmEdicao, ...dados });
    } else {
      await window.api.criarProfissional(dados);
    }
    window.close();
  } catch (erro) {
    console.error("Erro ao salvar profissional:", erro);
    alert("Erro ao salvar profissional no banco de dados.");
  }
});
