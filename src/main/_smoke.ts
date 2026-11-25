import { ServicoService } from './application/ServicoService';
import { LembreteService } from './application/LembreteService';
import { dadosServicoSchema, filtroServicosSchema } from '../shared/validation/servicoSchemas';

async function main(): Promise<void> {
  const servicos = new ServicoService();
  const lembretes = new LembreteService();

  console.log('--- 1. LISTAR PROCEDIMENTOS ---');
  const lista = await servicos.listar({ apenasAtivos: false });
  console.log(`total=${lista.length}`);
  console.log(lista.map((s) => `  #${s.id} ${s.nome} | R$ ${s.preco_base} | ${s.ativo ? 'ativo' : 'inativo'} | agendamentos=${s.agendamentos_vinculados}`).join('\n'));

  console.log('\n--- 2. CRIAR PROCEDIMENTO ---');
  const criado = await servicos.criar({
    nome: `TESTE AUTOMATICO ${Date.now()}`,
    categoria: 'Estética',
    preco_base: 99.9,
    duracao_minutos: 45,
    descricao: 'Registro criado pelo teste de fumaça.',
    ativo: true,
  });
  console.log('criado id=', criado.id, 'nome=', criado.nome, 'preco=', criado.preco_base);

  console.log('\n--- 3. ATUALIZAR (preço + desativar) ---');
  const atualizado = await servicos.atualizar({
    id: criado.id,
    nome: criado.nome,
    categoria: 'Estética',
    preco_base: 149.5,
    duracao_minutos: 60,
    descricao: 'Atualizado pelo teste.',
    ativo: false,
  });
  console.log('preco=', atualizado.preco_base, 'duracao=', atualizado.duracao_minutos, 'ativo=', atualizado.ativo);

  console.log('\n--- 4. EXCLUIR ---');
  await servicos.excluir(criado.id);
  const sumiu = await servicos.buscar(criado.id);
  console.log('busca após excluir ->', sumiu);

  console.log('\n--- 5. REGRA: serviço com agendamento não pode ser excluído ---');
  const comAgenda = lista.find((s) => s.agendamentos_vinculados > 0);
  if (comAgenda) {
    try {
      await servicos.excluir(comAgenda.id);
      console.log('FALHA: excluiu um serviço com agendamento!');
    } catch (e) {
      console.log('OK, bloqueado:', e instanceof Error ? e.message : e);
    }
  } else {
    console.log('sem serviço com agendamento para testar');
  }

  console.log('\n--- 6. VALIDAÇÃO ZOD (payload inválido) ---');
  const invalidos = [
    { nome: 'ab', categoria: 'Tatuagem', preco_base: 10, duracao_minutos: 30, descricao: '', ativo: true },
    { nome: 'Nome valido', categoria: 'Invasao', preco_base: 10, duracao_minutos: 30, descricao: '', ativo: true },
    { nome: 'Nome valido', categoria: 'Tatuagem', preco_base: -5, duracao_minutos: 30, descricao: '', ativo: true },
    { nome: 'Nome valido', categoria: 'Tatuagem', preco_base: 10, duracao_minutos: 3, descricao: '', ativo: true },
  ];
  invalidos.forEach((p, i) => {
    const r = dadosServicoSchema.safeParse(p);
    console.log(`  caso ${i + 1}: ${r.success ? 'ACEITOU (ruim!)' : 'rejeitado -> ' + r.error.issues[0]?.message}`);
  });
  const filtroRuim = filtroServicosSchema.safeParse({ termo: 'x'.repeat(500) });
  console.log('  filtro com 500 chars:', filtroRuim.success ? 'ACEITOU (ruim!)' : 'rejeitado');

  console.log('\n--- 7. GERAR LEMBRETES PENDENTES ---');
  const gerados = await lembretes.gerarPendentes();
  console.log('gerados=', gerados);

  console.log('\n--- 8. LISTAR LEMBRETES ---');
  const fila = await lembretes.listar({ limite: 20 });
  console.log(`total=${fila.length}`);
  console.log(fila.map((l) => `  #${l.id} ${l.cliente_nome} | ${l.data_atendimento} | ${l.status} | tent=${l.tentativas} | ${l.destinatario}`).join('\n'));

  console.log('\n--- 9. ENVIAR PENDENTES (Ethereal) ---');
  const envio = await lembretes.enviarPendentes();
  console.log(`total=${envio.total} enviados=${envio.enviados} falhas=${envio.falhas}`);
  for (const d of envio.detalhes) {
    console.log(`  #${d.id} ${d.status}${d.previewUrl ? ' preview=' + d.previewUrl : ''}${d.erro ? ' erro=' + d.erro : ''}`);
  }

  console.log('\n--- 10. ESTADO FINAL DA FILA ---');
  const final = await lembretes.listar({ limite: 20 });
  console.log(final.map((l) => `  #${l.id} ${l.status} tent=${l.tentativas} enviado_em=${l.enviado_em ?? '-'}`).join('\n'));
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error('ERRO NO TESTE:', e);
    process.exit(1);
  },
);
