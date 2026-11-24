-- =============================================================================
-- MÓDULO 08: CARGA DE DADOS INICIAIS (SEEDS)
-- =============================================================================

USE estudio_tattoo;

-- 1. BASE INICIAL DE CEPS
INSERT INTO tabela_ceps (cep, logradouro, bairro, cidade, estado) VALUES
  ('01001-000', 'Praça da Sé', 'Sé', 'São Paulo', 'SP'),
  ('01310-100', 'Avenida Paulista', 'Bela Vista', 'São Paulo', 'SP'),
  ('04543-011', 'Avenida Brigadeiro Faria Lima', 'Itaim Bibi', 'São Paulo', 'SP'),
  ('20040-002', 'Rua Primeiro de Março', 'Centro', 'Rio de Janeiro', 'RJ'),
  ('22070-011', 'Avenida Nossa Senhora de Copacabana', 'Copacabana', 'Rio de Janeiro', 'RJ'),
  ('30130-100', 'Avenida Afonso Pena', 'Centro', 'Belo Horizonte', 'MG'),
  ('80010-000', 'Rua XV de Novembro', 'Centro', 'Curitiba', 'PR'),
  ('90010-150', 'Rua dos Andradas', 'Centro Histórico', 'Porto Alegre', 'RS'),
  ('70040-010', 'Esplanada dos Ministérios', 'Zona Cívico-Administrativa', 'Brasília', 'DF'),
  ('40020-000', 'Rua Chile', 'Centro', 'Salvador', 'BA'),
  ('60060-000', 'Rua Guilherme Rocha', 'Centro', 'Fortaleza', 'CE'),
  ('50030-000', 'Avenida Rio Branco', 'Bairro do Recife', 'Recife', 'PE'),
  ('88010-400', 'Rua Felipe Schmidt', 'Centro', 'Florianópolis', 'SC'),
  ('29010-000', 'Avenida Princesa Isabel', 'Centro', 'Vitória', 'ES'),
  ('74003-010', 'Avenida Goiás', 'Setor Central', 'Goiânia', 'GO')
ON DUPLICATE KEY UPDATE logradouro = VALUES(logradouro);

-- 2. PROFISSIONAIS DO ESTÚDIO
INSERT INTO profissionais (nome, cpf, telefone, email, especialidade, comissao_percentual, ativo, observacoes) VALUES
  ('Lucas "Shadow" Silveira', '111.222.333-44', '(11) 98765-4321', 'lucas.shadow@estudiotattoo.com', 'Tatuador', 50.00, 1, 'Especialista em Blackwork, Realismo e Fechamento de Braço.'),
  ('Beatriz "Bee" Martins', '222.333.444-55', '(11) 97654-3210', 'beatriz.bee@estudiotattoo.com', 'Tatuador', 50.00, 1, 'Especialista em Fineline delicado, Floral e Aquarela.'),
  ('Rafael "Titan" Alencar', '333.444.555-66', '(11) 96543-2109', 'rafael.titan@estudiotattoo.com', 'Body Piercer', 45.00, 1, 'Perfurações corporais avançadas, microdermal e joalheria em titânio F136.'),
  ('Camila Ferreira Rocha', '444.555.666-77', '(11) 95432-1098', 'camila.estetica@estudiotattoo.com', 'Esteticista', 40.00, 1, 'Procedimentos faciais, micropigmentação labial/sobrancelha e laser.');

-- 3. CLIENTES INICIAIS
INSERT INTO clientes (
  nome, cpf, telefone, email, data_nascimento,
  cep, logradouro, numero, complemento, bairro, cidade, estado, observacoes_medicas
) VALUES
  ('Mariana Duarte Costa', '123.456.789-01', '(11) 99123-4567', 'mariana.costa@email.com', '1998-05-14',
   '01310-100', 'Avenida Paulista', '1578', 'Apto 42', 'Bela Vista', 'São Paulo', 'SP', 'Sem histórico de alergias a pigmentos. Cicatrização normal.'),
  ('Gabriel Souza Mendes', '234.567.890-12', '(11) 98234-5678', 'gabriel.mendes@email.com', '1994-11-20',
   '04543-011', 'Avenida Brigadeiro Faria Lima', '2230', 'Conjunto 81', 'Itaim Bibi', 'São Paulo', 'SP', 'Possui histórico leve de dermatite de contato com látex (usar luva nitrílica).'),
  ('Larissa Vieira Lima', '345.678.901-23', '(21) 97345-6789', 'larissa.lima@email.com', '2001-03-08',
   '22070-011', 'Avenida Nossa Senhora de Copacabana', '500', 'Bloco B', 'Copacabana', 'Rio de Janeiro', 'RJ', 'Tendência a queloide em cartilagem auricular.');

-- 4. SERVIÇOS E PROCEDIMENTOS
INSERT INTO servicos (nome, categoria, preco_base, duracao_minutos, descricao) VALUES
  ('Tatuagem Fineline Autoral', 'Tatuagem', 450.00, 120, 'Tatuagem de traço fino personalizada até 10cm com pigmento vegetal.'),
  ('Fechamento Blackwork (Sessão)', 'Tatuagem', 1200.00, 360, 'Sessão integral de 6 horas para projetos de grande porte.'),
  ('Aplicação Piercing Titânio', 'Piercing', 150.00, 30, 'Perfuração asséptica com joia em titânio grau implante (rosca interna).'),
  ('Microdermal Completo', 'Piercing', 220.00, 45, 'Implante microdermal com topo de zircônia ou opala.'),
  ('Micropigmentação Labial', 'Estética', 650.00, 120, 'Revitalização e pigmentação dos lábios com efeito natural.'),
  ('Limpeza de Pele Profunda', 'Estética', 180.00, 90, 'Higienização facial profunda pós ou pré procedimentos cosméticos.');
