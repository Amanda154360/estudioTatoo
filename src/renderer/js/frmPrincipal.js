let clientesCarregados = [];
let idParaExcluirCliente = null;
let profissionaisCarregados = [];
let idParaExcluirProfissional = null;

// =============================================================================
// GESTÃO DE CLIENTES
// =============================================================================

const carregarClientes = async (filtro = "") => {
  try {
    clientesCarregados = await window.api.listarClientes(filtro);

    const tbody = document.querySelector("#tbodyClientes");
    const contador = document.querySelector("#contadorClientes");
    contador.textContent = `${clientesCarregados.length} cliente(s)`;

    if (!clientesCarregados || clientesCarregados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-3">Nenhum cliente encontrado.</td></tr>`;
      return;
    }

    const linhas = clientesCarregados
      .map(
        (c) => `
        <tr>
          <td><strong>${escapeHtml(c.nome)}</strong></td>
          <td>${escapeHtml(c.telefone)}</td>
          <td>${c.cpf ? escapeHtml(c.cpf) : '<span class="text-muted">-</span>'}</td>
          <td><span class="badge bg-light text-dark border">${escapeHtml(c.cep)}</span></td>
          <td>${escapeHtml(c.logradouro)}, ${escapeHtml(c.numero)}${c.complemento ? ' - ' + escapeHtml(c.complemento) : ''}</td>
          <td>${escapeHtml(c.cidade)}/${escapeHtml(c.estado)}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-info btn-sm-action text-white" onclick="abrirDetalhesCliente(${c.id})" title="Ver Anamnese e Detalhes">
              Ficha
            </button>
            <button class="btn btn-sm btn-primary btn-sm-action" onclick="editarCliente(${c.id})">
              Editar
            </button>
            <button class="btn btn-sm btn-danger btn-sm-action" onclick="abrirConfirmacaoExclusaoCliente(${c.id})">
              Excluir
            </button>
          </td>
        </tr>`,
      )
      .join("");

    tbody.innerHTML = linhas;
  } catch (erro) {
    console.error("Erro ao carregar clientes do banco:", erro);
  }
};

const editarCliente = (id) => {
  const cliente_ = clientesCarregados.find((c) => c.id === id);
  if (cliente_) {
    window.api.abrirEdicaoCliente(cliente_);
  }
};

const abrirDetalhesCliente = (id) => {
  const c = clientesCarregados.find((item) => item.id === id);
  if (!c) return;

  const corpo = document.querySelector("#corpoDetalhesCliente");
  corpo.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <label class="text-muted small fw-bold">Nome Completo</label>
        <p class="fs-5 mb-1">${escapeHtml(c.nome)}</p>
      </div>
      <div class="col-md-3">
        <label class="text-muted small fw-bold">CPF</label>
        <p class="mb-1">${c.cpf ? escapeHtml(c.cpf) : 'Não informado'}</p>
      </div>
      <div class="col-md-3">
        <label class="text-muted small fw-bold">Telefone</label>
        <p class="mb-1">${escapeHtml(c.telefone)}</p>
      </div>
      <div class="col-md-6">
        <label class="text-muted small fw-bold">E-mail</label>
        <p class="mb-1">${c.email ? escapeHtml(c.email) : 'Não informado'}</p>
      </div>
      <div class="col-md-6">
        <label class="text-muted small fw-bold">Data de Nascimento</label>
        <p class="mb-1">${c.data_nascimento ? new Date(c.data_nascimento).toLocaleDateString('pt-BR') : 'Não informada'}</p>
      </div>
      <hr class="my-2" />
      <div class="col-12">
        <h6 class="fw-bold text-secondary mb-2">Endereço (Validado em SQL)</h6>
        <p class="mb-1">
          <strong>CEP:</strong> ${escapeHtml(c.cep)} | 
          <strong>Logradouro:</strong> ${escapeHtml(c.logradouro)}, Nº ${escapeHtml(c.numero)}
          ${c.complemento ? ' (' + escapeHtml(c.complemento) + ')' : ''}
        </p>
        <p class="mb-1">
          <strong>Bairro:</strong> ${escapeHtml(c.bairro)} | 
          <strong>Cidade/UF:</strong> ${escapeHtml(c.cidade)} - ${escapeHtml(c.estado)}
        </p>
      </div>
      <hr class="my-2" />
      <div class="col-12">
        <h6 class="fw-bold text-secondary mb-2">Ficha de Anamnese / Observações Médicas</h6>
        <div class="p-3 bg-light rounded border">
          ${c.observacoes_medicas ? escapeHtml(c.observacoes_medicas).replace(/\n/g, '<br>') : '<span class="text-muted">Nenhuma contraindicação ou observação médica registrada.</span>'}
        </div>
      </div>
    </div>
  `;

  const modal = new bootstrap.Modal(document.querySelector("#modalDetalhesCliente"));
  modal.show();
};

const abrirConfirmacaoExclusaoCliente = (id) => {
  const c = clientesCarregados.find((item) => item.id === id);
  if (!c) return;

  document.querySelector("#nomeClienteExcluir").textContent = c.nome;
  idParaExcluirCliente = id;

  const modal = new bootstrap.Modal(
    document.querySelector("#modalConfirmarExclusaoCliente"),
  );
  modal.show();
};

document
  .querySelector("#btnConfirmarExclusaoCliente")
  .addEventListener("click", async () => {
    try {
      await window.api.excluirCliente(idParaExcluirCliente);
      const modal = bootstrap.Modal.getInstance(
        document.querySelector("#modalConfirmarExclusaoCliente"),
      );
      modal.hide();
      carregarClientes(document.querySelector("#inputBuscaCliente").value.trim());
    } catch (erro) {
      console.error("Erro ao excluir cliente:", erro);
      alert("Não foi possível excluir o cliente.");
    }
  });

// =============================================================================
// GESTÃO DE PROFISSIONAIS
// =============================================================================

const carregarProfissionais = async (especialidade = "") => {
  try {
    profissionaisCarregados = await window.api.listarProfissionais(especialidade, 0);

    const tbody = document.querySelector("#tbodyProfissionais");
    const contador = document.querySelector("#contadorProfissionais");
    contador.textContent = `${profissionaisCarregados.length} profissional(is)`;

    if (!profissionaisCarregados || profissionaisCarregados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-3">Nenhum profissional encontrado.</td></tr>`;
      return;
    }

    const linhas = profissionaisCarregados
      .map(
        (p) => `
        <tr>
          <td><strong>${escapeHtml(p.nome)}</strong></td>
          <td><span class="badge badge-especialidade">${escapeHtml(p.especialidade)}</span></td>
          <td>${escapeHtml(p.telefone)}</td>
          <td>${p.email ? escapeHtml(p.email) : '<span class="text-muted">-</span>'}</td>
          <td>${p.comissao_percentual ? Number(p.comissao_percentual).toFixed(1) + '%' : '0%'}</td>
          <td>
            <span class="badge ${p.ativo ? 'badge-ativo' : 'badge-inativo'}">
              ${p.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </td>
          <td class="text-center">
            <button class="btn btn-sm btn-primary btn-sm-action" onclick="editarProfissional(${p.id})">
              Editar
            </button>
            <button class="btn btn-sm btn-danger btn-sm-action" onclick="abrirConfirmacaoExclusaoProfissional(${p.id})">
              Excluir
            </button>
          </td>
        </tr>`,
      )
      .join("");

    tbody.innerHTML = linhas;
  } catch (erro) {
    console.error("Erro ao carregar profissionais:", erro);
  }
};

const editarProfissional = (id) => {
  const prof_ = profissionaisCarregados.find((p) => p.id === id);
  if (prof_) {
    window.api.abrirEdicaoProfissional(prof_);
  }
};

const abrirConfirmacaoExclusaoProfissional = (id) => {
  const p = profissionaisCarregados.find((item) => item.id === id);
  if (!p) return;

  document.querySelector("#nomeProfissionalExcluir").textContent = p.nome;
  idParaExcluirProfissional = id;

  const modal = new bootstrap.Modal(
    document.querySelector("#modalConfirmarExclusaoProfissional"),
  );
  modal.show();
};

document
  .querySelector("#btnConfirmarExclusaoProfissional")
  .addEventListener("click", async () => {
    try {
      await window.api.excluirProfissional(idParaExcluirProfissional);
      const modal = bootstrap.Modal.getInstance(
        document.querySelector("#modalConfirmarExclusaoProfissional"),
      );
      modal.hide();
      carregarProfissionais(document.querySelector("#selectFiltroEspecialidade").value);
    } catch (erro) {
      console.error("Erro ao excluir profissional:", erro);
      alert("Não foi possível excluir o profissional. Verifique se ele possui vínculos.");
    }
  });

// =============================================================================
// BOTÕES DE AÇÃO E NAVEGAÇÃO
// =============================================================================

document.querySelector("#btnMenuNovoCliente").addEventListener("click", () => {
  window.api.abrirNovoCliente();
});

document.querySelector("#btnMenuNovoProfissional").addEventListener("click", () => {
  window.api.abrirNovoProfissional();
});

document.querySelector("#btnRecarregarTudo").addEventListener("click", () => {
  carregarClientes(document.querySelector("#inputBuscaCliente").value.trim());
  carregarProfissionais(document.querySelector("#selectFiltroEspecialidade").value);
});

// Busca de clientes por Nome, CPF ou CEP no SQL
document.querySelector("#btnBuscarCliente").addEventListener("click", () => {
  const termo = document.querySelector("#inputBuscaCliente").value.trim();
  carregarClientes(termo);
});

document.querySelector("#inputBuscaCliente").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const termo = document.querySelector("#inputBuscaCliente").value.trim();
    carregarClientes(termo);
  }
});

document.querySelector("#btnLimparBuscaCliente").addEventListener("click", () => {
  document.querySelector("#inputBuscaCliente").value = "";
  carregarClientes("");
});

// Filtro de profissionais por especialidade
document.querySelector("#selectFiltroEspecialidade").addEventListener("change", (e) => {
  carregarProfissionais(e.target.value);
});

// Atualiza ambas as tabelas automaticamente quando a janela ganha foco (ex: fechamento de modal de cadastro)
window.addEventListener("focus", async () => {
  await Promise.all([
    carregarClientes(document.querySelector("#inputBuscaCliente").value.trim()),
    carregarProfissionais(document.querySelector("#selectFiltroEspecialidade").value)
  ]);
});

window.api.aoRecarregar(() => {
  carregarClientes();
  carregarProfissionais();
});

// Função utilitária para evitar injeção de HTML
function escapeHtml(string) {
  if (string === null || string === undefined) return "";
  return String(string)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Carga inicial
carregarClientes();
carregarProfissionais();
