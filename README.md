# Relatório Técnico: Annadu ERP - Sistema de Gestão Estratégica

Este relatório detalha todas as funcionalidades, regras de negócio e a arquitetura do sistema **Annadu ERP**, desenvolvido para gestão de lojas de varejo com foco em controle de estoque e inteligência financeira.

---

## 1. Módulo de Segurança e Controle de Acesso (RBAC)
O sistema utiliza um modelo de Controle de Acesso Baseado em Funções (Role-Based Access Control) integrado ao **Firebase Auth**.

*   **Perfil Administrador (Master):**
    *   Acesso total a todas as unidades (Park, Madureira e Estoque Central).
    *   Pode configurar taxas de cartões, custos fixos e gerenciar o catálogo global de produtos.
    *   Acesso exclusivo às ferramentas de Importação em Massa e Relatórios de IA.
*   **Perfil Operador de Loja (Restrito):**
    *   Acesso exclusivo à sua unidade designada via `unitId`.
    *   Pode registrar vendas, despesas e movimentações de estoque locais.
    *   Visualização limitada aos dados da própria loja.

---

## 2. Ecossistema de Gestão de Estoque
O estoque é dividido em níveis hierárquicos para garantir a rastreabilidade dos produtos.

### 2.1. Estoque Central (Hub Logístico)
*   **Entradas Fornecedor:** Registro de chegada de mercadorias no depósito principal.
*   **Transferências Inteligentes:** Módulo que remove itens do estoque central e os adiciona automaticamente à loja de destino em uma única transação atômica.
*   **Auditoria de Transferência:** Logs automáticos de quem enviou e quem recebeu a mercadoria.

### 2.2. Gestão de Unidade (Loja)
*   **Movimentações:** Registro de **Entrada (reposição), Saída (venda direta) e Perda (quebra/vencimento)**.
*   **Identificação de Operador:** Todo registro exige o nome do operador para prestação de contas.
*   **Catálogo Dinâmico:** Busca de produtos via componente de busca inteligente (Combobox).

### 2.3. Inteligência de Inventário
*   **Status Visual (Badges):** Classificação automática de quantidade:
    *   *Nacional:* Baixo (≤5), Médio (≤10), Alto (>10).
    *   *Importado:* Baixo (≤2), Médio (≤4), Alto (>4).
*   **Previsão de Cobertura:** Cálculo de quantos dias o estoque durará com base na média de vendas dos últimos 30 dias (`Quantidade Atual / Média Diária`).

---

## 3. Fluxo de Caixa e Motor Financeiro
O coração financeiro do sistema processa dados brutos para gerar indicadores de performance.

### 3.1. Registros Financeiros
*   **Vendas Multimodal:** Lançamento de faturamento segmentado por **Dinheiro, Pix, Crédito e Débito**.
*   **Métricas de Performance:** Registro de **Ticket Médio** e **Número de Cupons** diários.
*   **Vendas por Categoria:** Lançamento por tipo de produto (ex: Regaliz, Balas de Urso) para análise de mix de produtos.
*   **Gestão de Despesas:** Registro de saídas variáveis (contas, compras de urgência) com descrição detalhada.

### 3.2. Regras de Cálculo Financeiro
*   **Lucro Real Operacional:** Calculado como `(Faturamento Bruto - Saídas Variáveis - Taxas de Cartão/Pix)`.
*   **Taxas POS Automatizadas:** O sistema desconta automaticamente a porcentagem configurada para cada método de pagamento (Crédito, Débito, Pix) para mostrar o valor líquido real recebido pela loja.
*   **Balanço Semanal:** Agrupamento automático por semana cronológica (ISO Week) para visão de lucro operacional de curto prazo.

---

## 4. Análise de Dados e Relatórios Gerenciais
Visualizações gráficas e insights automáticos baseados em dados reais.

### 4.1. Relatório de Fluxo de Caixa (Business Intelligence)
*   **Ponto de Equilíbrio (Break-even):** O sistema utiliza o **Custo Fixo Mensal** para calcular a meta diária necessária para a loja se pagar.
*   **Gráfico Comparativo:** Vendas diárias vs. Meta de Ponto de Equilíbrio (com correção de fuso horário para precisão total).
*   **Detalhamento de Taxas:** Tabela que mostra o "Valor Declarado" vs. "Valor Real" após taxas bancárias.
*   **Insights do Analista:**
    *   *Maior Gasto:* Identifica a maior saída de caixa no período.
    *   *Pico de Vendas:* Identifica a semana de maior produtividade.
    *   *Produto Estrela:* Identifica a categoria mais vendida por volume.
    *   *Pagamento Dominante:* Analisa a forma de pagamento mais utilizada.

### 4.2. Relatório de Estoque
*   **Top 5 Mais/Menos Vendidos:** Ranking de produtos baseado em volume de saída.
*   **Comparativo Mensal:** Gráfico de barras empilhadas mostrando a evolução de vendas do Top 5 produtos nos últimos 3, 6 ou 12 meses.
*   **Log de Transações:** Histórico completo de todas as entradas e saídas para auditoria interna.

---

## 5. Ferramentas Administrativas de Alta Performance
*   **Importação em Massa (Bulk Import):** Interface estilo planilha para inserir meses inteiros de dados históricos (Vendas, Métricas, Cupons) em uma única operação em lote (batch).
*   **Configurador de Taxas:** Ajuste fino das taxas de cartões por loja.
*   **Gestão de Custos Fixos:** Definição dos custos operacionais para cálculo de break-even.
*   **Gerenciador de Catálogo:** Criação, edição e exclusão de produtos e categorias de venda.

---

## 6. Especificações Técnicas (Stack)
*   **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Shadcn UI.
*   **Backend:** Firebase Firestore (Banco NoSQL) e Firebase Auth.
*   **Gráficos:** Recharts (SVG responsivo).
*   **PWA (Progressive Web App):** Aplicativo instalável com ícone de alta definição e suporte offline básico.
*   **Formulários:** React Hook Form com validação Zod.
