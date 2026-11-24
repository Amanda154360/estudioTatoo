let modoEdicao = false;
let idEmEdicao = null;

const feedbackCep = document.querySelector("#feedbackCep");

// Formatação modular de campos (CEP, CPF e Telefone)
const inputCep = document.querySelector("#cep");
inputCep.addEventListener("input", (e) => {
  e.target.value = typeof formatarCep === "function" ? formatarCep(e.target.value) : e.target.value;
  if (e.target.value.replace(/\D/g, "").length === 8) {
    executarBuscaCepSql(e.target.value);
  }
});

const inputCpf = document.querySelector("#cpf");
if (inputCpf) {
  inputCpf.addEventListener("input", (e) => {
    if (typeof formatarCpf === "function") e.target.value = formatarCpf(e.target.value);
  });
}

const inputTel = document.querySelector("#telefone");
if (inputTel) {
  inputTel.addEventListener("input", (e) => {
    if (typeof formatarTelefone === "function") e.target.value = formatarTelefone(e.target.value);
  });
}

// Botão de busca manual de CEP
document.querySelector("#btnBuscarCep").addEventListener("click", () => {
  const cep = inputCep.value.trim();
  if (cep) {
    executarBuscaCepSql(cep);
  }
});

// Função centralizada para consultar o CEP no banco SQL via Stored Procedure
async function executarBuscaCepSql(cep) {
  feedbackCep.textContent = "Buscando no banco SQL...";
  feedbackCep.className = "text-primary small";

  try {
    const dadosCep = await window.api.buscarCepSql(cep);
    if (dadosCep && dadosCep.logradouro) {
      document.querySelector("#logradouro").value = dadosCep.logradouro;
      document.querySelector("#bairro").value = dadosCep.bairro;
      document.querySelector("#cidade").value = dadosCep.cidade;
      document.querySelector("#estado").value = dadosCep.estado;

      feedbackCep.textContent = "CEP encontrado no banco SQL!";
      feedbackCep.className = "text-success small fw-bold";
      document.querySelector("#numero").focus();
    } else {
      feedbackCep.textContent = "CEP novo: preencha o endereço (o SQL salvará automaticamente).";
      feedbackCep.className = "text-muted small";
    }
  } catch (erro) {
    console.error("Erro ao buscar CEP no SQL:", erro);
    feedbackCep.textContent = "Erro na consulta do CEP no banco de dados.";
    feedbackCep.className = "text-danger small";
  }
}

// Receptor de dados para modo de edição
window.api.aoReceberClienteParaEditar((cliente_) => {
  modoEdicao = true;
  idEmEdicao = cliente_.id;

  document.querySelector("#tituloFormulario").textContent = "Editar Cliente";
  document.querySelector("#id").value = cliente_.id;
  document.querySelector("#nome").value = cliente_.nome || "";
  document.querySelector("#cpf").value = cliente_.cpf || "";
  document.querySelector("#telefone").value = cliente_.telefone || "";
  document.querySelector("#email").value = cliente_.email || "";

  if (cliente_.data_nascimento) {
    const dataIso = new Date(cliente_.data_nascimento).toISOString().split("T")[0];
    document.querySelector("#data_nascimento").value = dataIso;
  }

  document.querySelector("#cep").value = cliente_.cep || "";
  document.querySelector("#logradouro").value = cliente_.logradouro || "";
  document.querySelector("#numero").value = cliente_.numero || "";
  document.querySelector("#complemento").value = cliente_.complemento || "";
  document.querySelector("#bairro").value = cliente_.bairro || "";
  document.querySelector("#cidade").value = cliente_.cidade || "";
  document.querySelector("#estado").value = cliente_.estado || "";
  document.querySelector("#observacoes_medicas").value = cliente_.observacoes_medicas || "";
});

// Envio do formulário (Criação / Atualização via SQL)
document.querySelector("#formCliente").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const dados = Object.fromEntries(new FormData(evento.target));

  try {
    if (modoEdicao) {
      await window.api.atualizarCliente({ id: idEmEdicao, ...dados });
    } else {
      await window.api.criarCliente(dados);
    }
    window.close();
  } catch (erro) {
    console.error("Falha ao salvar cliente:", erro);
    alert("Erro ao salvar cliente no banco de dados. Verifique a conexão com o MySQL.");
  }
});
