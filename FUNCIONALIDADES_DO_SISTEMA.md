# Pisom OS - Documentação Completa de Funcionalidades

**Plataforma all-in-one para gestão de agências digitais**

**Última atualização:** 20/03/2026

---

## Sumário

1. [Autenticação e Segurança](#1-autenticação-e-segurança)
2. [Dashboard Principal](#2-dashboard-principal)
3. [CRM](#3-crm)
4. [Tarefas](#4-tarefas)
5. [Onboarding de Clientes](#5-onboarding-de-clientes)
6. [Gestão de Conteúdo](#6-gestão-de-conteúdo)
7. [Financeiro](#7-financeiro)
8. [Configurações](#8-configurações)

---

## 1. Autenticação e Segurança

### 1.1 Login
- Autenticação por e-mail e senha
- Token JWT para sessões autenticadas
- Redirecionamento automático: usuários logados vão para `/dashboard`, não logados vão para `/login`

### 1.2 Registro
- Criação de conta com: Nome, Sobrenome, E-mail, Senha (mín. 8 caracteres) e Nome da Organização
- Ao registrar, o sistema cria automaticamente:
  - Conta do usuário
  - Organização
  - Pipeline padrão com 5 estágios (Novo Lead, Qualificação, Proposta, Negociação, Fechamento)

### 1.3 Controle de Acesso (Roles)
- **OWNER** — Proprietário da organização (acesso total)
- **ADMIN** — Administrador
- **MANAGER** — Gerente
- **MEMBER** — Membro
- **VIEWER** — Visualizador (somente leitura)

---

## 2. Dashboard Principal

Visão geral completa do negócio com KPIs, gráficos e listas.

### 2.1 KPIs Financeiros
| Indicador | Descrição |
|---|---|
| **MRR** | Receita Recorrente Mensal + quantidade de contratos ativos + tendência mês a mês |
| **Valor do Pipeline** | Total em negócios abertos + quantidade de deals |
| **Deals Ganhos** | Quantidade e valor total de deals ganhos |
| **Faturas Vencidas** | Quantidade e valor de faturas em atraso |

### 2.2 KPIs Operacionais
| Indicador | Descrição |
|---|---|
| **Leads Recentes** | Total de leads cadastrados |
| **Tarefas Atrasadas** | Quantidade de tarefas vencidas (destaque em vermelho) |
| **Conteúdo** | Total de posts + quantidade de publicados |
| **Onboardings Ativos** | Quantidade ativa + quantidade concluída |

### 2.3 Gráficos e Visualizações
- **Receita vs Despesas** — Gráfico de barras empilhadas (últimos 6 meses)
- **Funil de Vendas** — Estágios do pipeline com quantidade e valores por estágio
- **Status de Conteúdo** — Gráfico donut (Rascunho, Em Revisão, Aprovado, Publicado)
- **Progresso de Tarefas** — Anéis de progresso (Concluído, Em Andamento, A Fazer)
- **Tendência de Receita** — Mini gráfico de barras (últimos 6 meses)

### 2.4 Listas Rápidas
- **Deals Recentes** — Top 5 com empresa, estágio e valor
- **Tarefas Atrasadas** — Top 5 com data de vencimento
- **Leads Recentes** — Tabela com nome, e-mail, status e origem

---

## 3. CRM

### 3.1 Empresas (Companies)

Cadastro completo de empresas/clientes.

**Campos:**
- Nome, CNPJ, Setor, Website, Telefone, E-mail, Cidade, Estado (UF), Endereço, Observações

**Setores disponíveis:** Tecnologia, Marketing, Saúde, Educação, Varejo, Serviços, Indústria, Alimentação, Imobiliário, Financeiro, Jurídico, Outros

**Funcionalidades:**
- Busca por nome da empresa
- Criação e edição via modal
- Visualização da quantidade de contatos e deals associados
- Tabela paginada (20 por página)

### 3.2 Contatos (Contacts)

Gestão de pessoas de contato.

**Campos:**
- Nome, Sobrenome, E-mail, Telefone, WhatsApp, Cargo, Empresa vinculada

**Funcionalidades:**
- Visualização em cards (grid 3 colunas)
- Busca por nome ou e-mail
- Criação e edição via modal
- Exibição de quantidade de leads e deals associados
- Avatar com iniciais do nome

### 3.3 Leads

Gestão de prospectos/oportunidades iniciais.

**Campos:**
- Nome, Sobrenome, E-mail, Telefone, Empresa, Origem, Notas, Status, Score (pontuação)

**Status:** Novo, Contatado, Qualificado, Desqualificado, Convertido, Perdido

**Origens:** Website, Redes Sociais, Indicação, Cold Call, E-mail, Evento, Outros

**Funcionalidades:**
- Tabela com filtros por status
- Busca por nome ou e-mail
- Criação e edição via modal
- Visualização do score do lead
- Paginação

### 3.4 Pipeline (Kanban)

Gestão visual de negociações/deals.

**Campos do Deal:**
- Título, Pipeline, Estágio, Valor, Dono, Lead, Empresa, Data prevista de fechamento

**Status do Deal:** Aberto, Ganho, Perdido, Arquivado

**Funcionalidades:**
- Visualização em Kanban (colunas por estágio)
- **Drag-and-drop** de deals entre estágios
- Cada estágio mostra: quantidade de deals, valor total
- Cada card mostra: título, empresa, valor, dono, contagem de tarefas
- Criação rápida de deal em qualquer estágio (formulário inline)
- Suporte a múltiplos pipelines

---

## 4. Tarefas

Gestão de tarefas e atividades.

**Campos:**
- Título, Descrição, Responsável, Deal vinculado, Prioridade, Data de vencimento, SLA

**Status:** A Fazer, Em Andamento, Aguardando, Concluído, Cancelado

**Prioridades:** Baixa, Média, Alta, Urgente

**Funcionalidades:**
- Lista com filtro por status (Todos, A Fazer, Em Andamento, Aguardando, Concluído)
- Contador total de tarefas
- Toggle rápido de status (clique no ícone para marcar como concluído)
- Texto tachado para tarefas concluídas
- Destaque em vermelho para tarefas atrasadas
- Exibição do deal associado
- Avatar do responsável com iniciais
- Badge de prioridade colorido

---

## 5. Onboarding de Clientes

Sistema de checklists para implantação de serviços.

### 5.1 Lista de Onboardings

**Status:** Pendente, Em Andamento, Aguardando Cliente, Em Revisão, Concluído, Cancelado

**Tipos de Serviço:** Tráfego Pago, Social Media, Website, CRM/Automação, Branding, SEO, Email Marketing, Consultoria, Personalizado

**Funcionalidades:**
- Cards resumo: Pendentes, Em Andamento, Aguardando Cliente, Concluídos, Atrasados
- Busca por título
- Filtro por status
- Cards com: status, título, tipo de serviço, responsável, data de vencimento, barra de progresso com percentual
- Indicador "Pronto para Operar" quando todos os itens obrigatórios estão completos

### 5.2 Criação de Onboarding (Wizard 3 etapas)

1. **Seleção do Tipo de Serviço** — Grid com botões para cada tipo
2. **Seleção de Template** — Templates disponíveis para o tipo selecionado (ou "Iniciar do Zero")
3. **Detalhes** — Nome, data de vencimento, notas

### 5.3 Detalhe do Onboarding

**Cabeçalho:**
- Título, status, responsável, data de vencimento
- Botões de ação: "Marcar como Aguardando Cliente", "Marcar como Concluído"

**Card de Progresso:**
- Percentual grande, barra de progresso colorida
- Estatísticas: X/Y itens concluídos, X/Y obrigatórios concluídos
- Status "Pronto para Operar"

**Seções com Checklist:**
- Cada seção com cabeçalho, progresso e barra
- **Tipos de item suportados:**
  - Checkbox (marcar/desmarcar)
  - Texto (campo de input)
  - Arquivo (upload)
  - URL (campo de link)
  - Credencial (dados sensíveis)
  - Seleção (dropdown)
  - Data (datepicker)
  - Assinatura (solicitação)
- Itens obrigatórios marcados com asterisco (*)
- Possibilidade de adicionar novas seções

**Termos:**
- Exibição e aceite de termos
- Registro de data de aceitação

### 5.4 Templates de Onboarding
- Templates reutilizáveis por tipo de serviço
- Seed de templates padrão (Tráfego Pago, Social Media, Website)
- Criação de templates customizados com seções e itens

---

## 6. Gestão de Conteúdo

### 6.1 Posts

Gestão de posts para redes sociais e canais de comunicação.

**Campos:**
- Título, Conteúdo, Legenda, Canal, Perfil do Cliente, Responsável, Data de agendamento, Tags, URLs de mídia

**Status:** Ideia, Rascunho, Em Revisão, Aprovado, Agendado, Publicado, Rejeitado

**Canais:** Instagram Feed, Instagram Stories, Instagram Reels, Facebook, TikTok, YouTube, LinkedIn, Twitter/X, Blog, E-mail, WhatsApp, Outros

**Funcionalidades:**
- Cards resumo: total e contagem por status
- Formulário de criação rápida
- Tabela com filtros por status e perfil/cliente
- Fluxo de aprovação:
  - Ideia/Rascunho → "Enviar para Revisão"
  - Em Revisão → "Aprovar" ou "Rejeitar" (com motivo)
  - Aprovado → "Publicar"
- Versionamento de posts (histórico de alterações)
- Estado vazio com mensagem orientativa

### 6.2 Calendário Editorial

- Navegação por mês (anterior/próximo)
- Grade do calendário (7 colunas, segunda a domingo)
- Destaque no dia atual
- Posts coloridos por status:
  - Cinza = Ideia, Amarelo = Rascunho, Azul = Em Revisão, Verde = Aprovado, Roxo = Agendado, Esmeralda = Publicado, Vermelho = Rejeitado
- Emojis por canal (IG, ST, RL, FB, TK, YT, LI, TW, BL, EM, WA)
- Título do post e nome do cliente
- Legenda com cores de status
- Suporte a visualização de 3, 6 ou 12 meses

### 6.3 Banco de Ideias

Repositório de ideias para conteúdo.

**Campos:**
- Título, Descrição, Canal, Perfil/Cliente, URL de referência

**Status:** Nova, Aprovada, Rejeitada, Utilizada

**Funcionalidades:**
- Formulário de criação
- Filtro por status
- Cards em grid (3 colunas) com: título, badge de status, descrição, canal, cliente, data
- Ações: Aprovar, Rejeitar, Converter em Post

### 6.4 Perfis de Conteúdo

Configurações de marca e diretrizes por cliente.

**Campos:**
- Nome do cliente, Voz da marca, Público-alvo, Concorrentes, Hashtags, Canais ativos, Notas adicionais

**Funcionalidades:**
- Formulário de criação completo
- Cards expansíveis com detalhes
- Multi-seleção visual de canais ativos
- Contagem de posts e ideias por perfil
- Exclusão com confirmação

---

## 7. Financeiro

### 7.1 Visão Geral Financeira

**KPIs:**
| Indicador | Descrição |
|---|---|
| **MRR** | Receita Recorrente Mensal + contratos ativos + ARR |
| **Recebido (mês)** | Valor recebido + taxa de conversão % |
| **Despesas (mês)** | Total de despesas + valor pendente |
| **Faturas Vencidas** | Valor em atraso + quantidade |

**DRE (Demonstrativo de Resultado):**
- Receita bruta
- Total de despesas (com breakdown por categoria)
- Lucro líquido
- Margem percentual (verde >20%, amarelo 0-20%, vermelho <0%)

**Links Rápidos:** Contratos, Faturas, Despesas, Fluxo de Caixa

**Lucratividade por Cliente:**
- Lista dos contratos com visualização de lucro
- Barra de proporção (despesas vs receita)
- Valor de lucro e margem %

**Gráfico de Fluxo de Caixa:** Barras de receita/despesas dos últimos 6 meses

### 7.2 Contratos

Gestão de contratos recorrentes e cobrança.

**Campos:**
- Título, Empresa, Valor (R$), Ciclo de cobrança, Data de início, Dia do mês para cobrança, Serviços, Notas

**Status:** Rascunho, Ativo, Pausado, Cancelado, Expirado

**Ciclos de Cobrança:** Mensal, Trimestral, Semestral, Anual

**Funcionalidades:**
- Header com MRR, ARR e total de contratos ativos
- Tabela paginada com busca e filtros por status e período
- Modal de detalhes com:
  - Modo visualização (todos os dados, resumo de receita, histórico de faturas)
  - Modo edição (todos os campos editáveis)
  - Cancelamento com motivo
- Resumo financeiro por contrato: Faturado, Recebido, Em atraso, Taxa de pagamento %

### 7.3 Faturas (Invoices)

Gestão completa de faturamento.

**Campos:**
- Descrição, Valor (R$), Data de vencimento, Tipo, Desconto, Impostos, Empresa, Contrato vinculado, Mês de referência

**Status:** Rascunho, Pendente, Enviada, Vencida, Paga, Parcialmente Paga, Cancelada, Estornada

**Tipos:** Recorrente, Avulsa, Adicional, Crédito

**Formas de Pagamento:** PIX, Boleto, Cartão, Transferência, Dinheiro

**Cards Resumo:**
| Card | Descrição |
|---|---|
| Faturado (mês) | Valor total faturado |
| Recebido | Valor recebido + taxa de conversão % |
| Pendente | Valor aguardando pagamento |
| Vencido | Valor em atraso |

**Funcionalidades:**
- Criação de fatura avulsa
- **Geração automática de faturas** a partir de contratos ativos
- Marcação automática de faturas vencidas
- Filtros: busca, status, período (Este mês, Mês passado, Trimestre), datas customizadas
- **Ações em lote (Bulk Actions):**
  - Selecionar múltiplas faturas via checkbox
  - Enviar faturas em lote
  - Cancelar faturas em lote
- Ações individuais por status:
  - Pendente: Visualizar, Enviar, Registrar Pagamento, Cancelar
  - Enviada/Vencida: Visualizar, Registrar Pagamento, Cancelar
  - Paga: Visualizar
- **Registrar pagamento:** Valor pago, método, data de pagamento
- Modal de detalhe com modo edição (para rascunho/pendente)
- **Exportar CSV**
- Paginação com navegação por páginas

### 7.4 Despesas (Expenses)

Gestão de custos e despesas.

**Campos:**
- Título, Valor (R$), Data de vencimento, Tipo, Categoria, Centro de Custo, Fornecedor, Descrição, Notas

**Status:** Pendente, Aprovada, Paga, Rejeitada, Cancelada

**Tipos:** Fixa, Variável, Avulsa, Investimento

**Gestão de Categorias:**
- Nome da categoria
- Seletor de cor (paleta de cores predefinidas)
- Lista de categorias com contagem de uso

**Centros de Custo:**
- Nome
- Tipo: Geral, Cliente, Projeto, Squad, Departamento
- Lista com tipo e contagem de uso

**Cards Resumo:**
| Card | Descrição |
|---|---|
| Total (mês) | Valor total + quantidade de despesas |
| Pago | Valor já pago |
| Pendente | Valor aguardando aprovação/pagamento |

**Breakdown por Categoria:**
- Barras visuais com: nome da categoria (cor), quantidade, valor total

**Funcionalidades:**
- Formulário completo de criação
- Filtros: busca, status, período (Este mês, Mês passado, Trimestre), datas customizadas
- Ações por status:
  - Pendente: Editar, Aprovar, Rejeitar
  - Aprovada: Editar, Pagar
  - Qualquer status: **Duplicar para o próximo mês**
- Modal de edição com todos os campos
- **Exportar CSV**
- Paginação

### 7.5 Fluxo de Caixa (Cashflow)

Análise financeira de fluxo de caixa.

**Controles:**
- Toggle de visualização: Gráfico / Tabela
- Exportar CSV
- Seletor de período: 3, 6 ou 12 meses

**Cards Resumo:**
| Card | Descrição |
|---|---|
| Receita Total | Valor total + média/mês |
| Despesas Totais | Valor total + média/mês |
| Saldo Acumulado | Verde (positivo) ou vermelho (negativo) |
| Crescimento MoM | Crescimento mês a mês em % |

**Gráfico de Fluxo de Caixa:**
- Barras lado a lado (receita/despesas) por mês
- Valor do saldo abaixo de cada mês (colorido)
- Meses projetados com opacidade reduzida e asterisco

**Tabela de Fluxo de Caixa:**
- Colunas: Mês, Receita, Despesas, Saldo
- Linhas projetadas destacadas em azul claro

**DRE Gerencial:**
- Navegação por mês (anterior/próximo)
- Receita bruta com contagem de faturas
- Total de despesas com contagem e breakdown por categoria
- Lucro líquido (verde/vermelho)
- Margem líquida % com badge colorido

**Lucratividade por Cliente:**
- Tabela: Contrato, Receita, Custo, Lucro, Margem %
- Margens coloridas por faixa

---

## 8. Configurações

### 8.1 Perfil (Aba "Perfil")
- Editar nome e sobrenome
- Visualizar e-mail (somente leitura)
- Alterar senha:
  - Senha atual
  - Nova senha
  - Confirmar nova senha

### 8.2 Organização (Aba "Organização")
- Editar nome da organização
- Visualizar e copiar ID da organização (botão de copiar)

### 8.3 Equipe (Aba "Equipe")
- Lista de membros com: avatar, nome, e-mail, cargo/role, status (ativo/inativo)
- Seletor de role por membro (desabilitado para OWNER)
- Exclusão de membro com confirmação (exceto OWNER)
- **Convidar novo membro:**
  - Campo de e-mail
  - Seletor de role (sem opção OWNER)
  - Formulário retrátil

---

## Funcionalidades Transversais

### Interface e Experiência
- **Layout responsivo** com Tailwind CSS
- **Sidebar** colapsável com navegação por módulos
- **Toasts/Notificações** — Sucesso, Erro, Aviso, Info (auto-dismiss 4s)
- **Modais** — 4 tamanhos (sm, md, lg, xl), fechar com Escape ou clique fora
- **Badges** coloridos por status
- **Estados vazios** personalizados com ícone, mensagem e botão de ação
- **Skeletons de carregamento** para cards, tabelas e KPIs
- **Paginação** em tabelas com grandes volumes de dados
- **Busca e filtros** em todas as listagens
- **Exportação CSV** em faturas, despesas e fluxo de caixa
- **Ações em lote** (bulk actions) em faturas

### Tecnologias
- **Frontend:** Next.js 13+ (App Router), React, TypeScript, Tailwind CSS
- **Backend:** NestJS, Prisma ORM, PostgreSQL
- **Autenticação:** JWT Bearer Token
- **Deploy:** Vercel (frontend), API separada
- **Domínio:** sistema.pisommidias.com.br

---

## Resumo de Endpoints da API

| Módulo | Endpoints | Métodos |
|---|---|---|
| Autenticação | `/auth/login`, `/auth/register` | POST |
| Usuários | `/users/me`, `/users/team` | GET |
| Organização | `/organizations/current` | GET, PATCH |
| Empresas | `/companies`, `/companies/:id` | GET, POST, PATCH |
| Contatos | `/contacts`, `/contacts/:id` | GET, POST, PATCH |
| Leads | `/leads`, `/leads/:id`, `/leads/:id/status` | GET, POST, PATCH |
| Pipelines | `/pipelines`, `/pipelines/default` | GET, POST |
| Deals | `/deals`, `/deals/:id`, `/deals/:id/move`, `/deals/:id/won`, `/deals/:id/lost`, `/deals/summary`, `/deals/kanban/:pipelineId` | GET, POST, PATCH |
| Tarefas | `/tasks`, `/tasks/my`, `/tasks/overdue`, `/tasks/:id/status` | GET, POST, PATCH |
| Onboarding | `/onboarding`, `/onboarding/:id`, `/onboarding/:id/items/:itemId`, `/onboarding/:id/sections`, `/onboarding/:id/accept-terms`, `/onboarding/summary` | GET, POST, PATCH |
| Templates | `/onboarding-templates`, `/onboarding-templates/:id`, `/onboarding-templates/seed-defaults` | GET, POST |
| Posts | `/content/posts`, `/content/posts/:id`, `/content/posts/:id/status`, `/content/posts/:id/versions`, `/content/posts/summary`, `/content/posts/calendar` | GET, POST, PUT, PATCH, DELETE |
| Ideias | `/content/ideas`, `/content/ideas/:id/status` | GET, POST, PATCH, DELETE |
| Perfis de Conteúdo | `/content/profiles`, `/content/profiles/:id` | GET, POST, PUT, DELETE |
| Contratos | `/financial/contracts`, `/financial/contracts/:id`, `/financial/contracts/:id/cancel`, `/financial/contracts/mrr` | GET, POST, PATCH |
| Faturas | `/financial/invoices`, `/financial/invoices/:id`, `/financial/invoices/:id/pay`, `/financial/invoices/:id/send`, `/financial/invoices/:id/cancel`, `/financial/invoices/summary`, `/financial/invoices/generate`, `/financial/invoices/mark-overdue` | GET, POST, PATCH |
| Despesas | `/financial/expenses`, `/financial/expenses/:id`, `/financial/expenses/:id/approve`, `/financial/expenses/:id/pay`, `/financial/expenses/:id/reject`, `/financial/expenses/summary`, `/financial/expenses/categories`, `/financial/expenses/cost-centers` | GET, POST, PATCH |
| Fluxo de Caixa | `/financial/cashflow/realized`, `/financial/cashflow/projected`, `/financial/cashflow/dre`, `/financial/cashflow/client-profitability` | GET |

**Total: 60+ endpoints**
