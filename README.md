# Portfólio Pessoal — Arthur Kadri de Oliveira

Portfólio estático editorial desenvolvido para apresentar a trajetória acadêmica na **Universidade Federal do ABC (UFABC — 2º período)** e os projetos práticos de Arthur Kadri de Oliveira, com foco na busca por oportunidade de **estágio em mercado financeiro / análise de dados**.

---

## 🚀 Como Executar Localmente

### Servidor Local Automatizado (Recomendado)
O projeto inclui um servidor HTTP embutido (`preview-server.cjs` e `preview.ps1`). Como o Node.js pode não estar configurado diretamente no `PATH` do sistema Windows, o script utiliza automaticamente o executável do Electron instalado pelo T3 Code como runtime Node.

Para iniciar o servidor local na porta `4173`:

```powershell
powershell -ExecutionPolicy Bypass -File .\preview.ps1
```

O portfólio estará acessível em: `http://127.0.0.1:4173`

### Alternativas de Servidor Local
Se preferir outras ferramentas estáticas:

```bash
# Com Python 3
cd dist
python -m http.server 8000

# Com Node / npx serve (caso node esteja no PATH)
npx serve dist -l 4173
```

---

## 🎨 Direção de Arte & Identidade Visual

O design segue uma abordagem editorial suíça com alta disciplina tipográfica, estética limpa e difusão atmosférica suave:

- **Paleta de Cores Estrita**:
  - Papel / Base: Off-white neutro frio (`#f5f5f3`)
  - Tinta / Tipografia Principal: Grafite escuro (`#25272b`)
  - Acento Único: Coral suave / terracota moderado (`#c16b59` e variações pastéis `#f6efec` / `#dfb3a7`)
  - Sem uso de roxos, neons saturados ou temas sage/creme.
- **Tipografia**:
  - Títulos: *Plus Jakarta Sans* (geométrica, limpa e editorial)
  - Corpo de texto: *DM Sans* (alta legibilidade e equilíbrio)
  - Metadados técnicos & Identificadores: *JetBrains Mono* (precisão de engenharia)
- **Escultura de Luz Perolada & Nuvem de Dados**:
  - Escultura vetorial com gradientes perolados e transformação contínua em gráfico sintetizado pela rolagem (`dist/cloud-morph.js`).
  - Totalmente preservada, mantendo sincronia com os novos eventos de layout e visão.

---

## ⚡ As Quatro Funcionalidades Integradas & Correções de Integração

### 1. Projetos com Raio-X Arquitetural (`dist/index.html`, `dist/styles.css` e `dist/portfolio-extras.js`)
- Cada um dos 4 projetos conta com controle secundário nativo `<details class="project-xray">` rotulado como **"Como funciona"**.
- **Diagrama Técnico Responsivo (`.xray-flow`)**: substituído o SVG largo de viewBox fixo por fluxo arquitetural estruturado.
  - Em telas amplas (desktop e tablet), os passos fluem horizontalmente com cartões técnicos e conectores vetoriais em coral com setas orientadas à direita.
  - Em telas estreitas (<= 600px até 320px), os passos se reorganizam verticalmente, preservando tipografia de 12px a 14px em *JetBrains Mono*, sem rótulos microscópicos.
- **Animação da Conexão Estrita**: conexão de 350ms (`animation: xrayConnect 350ms ease-out 1 forwards`), executando exatamente uma vez ao abrir e mantendo o estado final sem loops infinitos. O conteúdo (`.xray-content`) é exibido imediatamente sem animações de bloco inteiro. Sob `data-motion="paused"` ou `prefers-reduced-motion`, a animação é imediatamente desativada via CSS.
- **Acordeão com Fechamento Progressivo**: via JavaScript, abrir um raio-X fecha automaticamente os demais sem deslocar o foco ou salto de leitura; sem JavaScript, todos abrem e fecham nativamente.
- Esquemas arquiteturais fiéis aos repositórios reais:
  1. `gaming-fps-hud`: Apresentação Vulkan (`vkQueuePresentKHR`), Coleta C++ (Frame Time & Latência), Overlay Wayland (Qt 6 Quick / LayerShell).
  2. `tuya-smart-lamps`: Interface PyQt6 na bandeja, Serviço Python local (Eventos SSE & Sockets TCP diretos <10ms com heartbeat contínuo) e contingência automática via API Tuya Cloud.
  3. `python-curso`: Entrada analítica de coeficientes, Rotina Analítica (Bhaskara & Algoritmos) e Saída Validada de raízes estruturadas.
  4. `spotifast-neon-theme`: Configuração declarativa JSON, Mapeador de Cores (Tokens & Tipografia) e Interface de Áudio Spotifast Themed UI.

### 2. Mini Laboratório Financeiro (`dist/finance-lab.js` e `dist/portfolio-extras.js`)
- Localizado após os projetos em `<details class="finance-lab-details" id="finance-lab">`, fechado por padrão com o resumo **"Laboratório · O efeito do tempo nos juros"**.
- **Contrato Estrito de Cálculo Puro (`dist/finance-lab.js`)**:
  - Rejeita explicitamente tipos inválidos (`null`, `''`, `false`, `true`, `undefined`, `NaN`, `Infinity`, strings, objetos não conformes).
  - Valida limites numéricos reais: valor inicial (R$ 0 a R$ 1.000.000), aporte mensal (R$ 0 a R$ 10.000), taxa efetiva anual (0% a 30%) e prazo estritamente inteiro (1 a 360 meses).
  - Taxa anual efetiva com `Math.expm1(Math.log1p(annualRatePercent / 100) / 12)`, aportes no final de cada mês, sem arredondamentos intermediários acumulados. Formatação apenas na exibição via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **Tratamento Robusto de Entrada e Interface (`dist/portfolio-extras.js`)**:
  - `parseNumericValue` retorna `NaN` para strings vazias, incompletas (`-`, `+`, `.`, `,`) ou infinitas.
  - Erros são informados de forma individual sob cada campo sem apagar ou reescrever o que o visitante está digitando.
  - Em caso de entrada inválida ou incompleta, o gráfico, tabela e resultados retêm a última simulação válida.
  - Fallback sem `ResizeObserver`: alterações na exibição de mensagens de erro disparam evento `portfolio:layoutchange`.
- **Gráfico Vetorial SVG**: curva coral contínua para saldo acumulado, linha tracejada grafite para aportes, eixos, escala em reais e meses, e tabela de marcos anuais expansível.
- **Fallback sem JS**: controles interativos são ocultados e o exemplo estático pré-calculado com notas explicativas é exibido.

### 3. Modo "Tenho 20 segundos" (`dist/index.html`, `dist/styles.css` e `dist/portfolio-extras.js`)
- Botão acionador no hero: **"Tenho 20 segundos"**.
- Alterna o estado visual para `html[data-view="brief"]`, atualizando o botão para **"Ver portfólio completo"** com anúncio via live region acessível.
- Oculta via `data-full-only` e `display: none` elementos secundários (escultura/nuvem, laboratório financeiro, raio-X, caixas de citação e descrições longas), retirando-os da navegação por Tab.
- Cabe em aproximadamente uma tela em 1440x900 e exige rolagem curta em 390x844, mantendo corpo de texto >= 16px, os quatro projetos em linhas compactas e os contatos (e-mail, GitHub, LinkedIn).
- **Segurança de Foco**: se o elemento ativo estiver dentro de uma seção omitida, o foco é transferido de forma segura para o botão de modo.
- **Suspensão Real de RAF e Ciclos**: todos os loops e agendamentos de frame da nuvem, paralaxe, ponteiro e trilha são interrompidos no modo resumo. Ao rolar no modo resumo, nenhum RAF decorativo é disparado.
- **Preservação de Estado**: a preferência de efeitos do usuário no `localStorage` não é modificada pelo modo resumo. Ao retornar ao modo completo, o layout é recalculado considerando a posição atual de rolagem, sem medições com largura zero.

### 4. Luz que Atravessa o Site (`dist/index.html` e `dist/portfolio-extras.js`)
- Trilha decorativa vetorial contínua em SVG dentro de `#main-content`, conectando o gutter lateral do hero, passando pelos projetos e ancorando na borda externa do bloco de contato junto ao e-mail, sem cruzar ou cortar textos.
- **Mapeamento de Segmentos e Comprimentos Cumulativos**: calcula comprimentos cumulativos via busca binária na medição e mapeia a posição de leitura (`scrollY + innerHeight * 0.65`) ao segmento exato, evitando distorções decorrentes de proporções globais.
- **Cache de Topo do Conteúdo**: calcula e cacheia o topo de `#main-content` durante a medição, eliminando chamadas a `getBoundingClientRect` em cada frame de rolagem.
- **Guardas de Robustez**: verifica a existência funcional dos métodos SVG (`getTotalLength` e `getPointAtLength`), invalidando a geometria sob eventos de `pageshow`, `resize`, `orientationchange`, `portfolio:layoutchange`, `document.fonts.ready` e `ResizeObserver`.
- Eliminação de recursão duplicada entre renderização e medição.
- Iluminação sutil do cartão de contato perto do fim do percurso (`--contact-illumination`).
- Ocultação imediata do halo móvel sob pausa manual ou movimento reduzido.

---

## 🧪 Validação & Resultados Reais de Teste

Todos os testes foram executados com código real no ambiente Windows local.

### 1. Testes de Contrato e Casos Numéricos Financeiros (`outputs/four-features-math-test.js`)
- **Caso 1** (Inicial 1.000, Aporte 0, Taxa 0%, 12 meses): Saldo **R$ 1.000,00**, Juros **R$ 0,00** — Aprovado.
- **Caso 2** (Inicial 0, Aporte 100, Taxa 0%, 12 meses): Saldo **R$ 1.200,00**, Juros **R$ 0,00** — Aprovado.
- **Caso 3** (Inicial 1.000, Aporte 0, Taxa 12%, 12 meses): Saldo **R$ 1.120,00**, Juros **R$ 120,00** — Aprovado.
- **Caso 4** (Inicial 1.000, Aporte 100, Taxa 12%, 12 meses): Total aportado **R$ 2.200,00**, Saldo **R$ 2.384,65**, Juros **R$ 184,65** — Aprovado.
- **Caso 5** (Inicial 0, Aporte 0, Taxa 12%, 12 meses): Saldo **R$ 0,00**, Juros **R$ 0,00** — Aprovado.
- **Caso 6** (Valores limite): Mínimo (0/0/0%/1m) e máximo (1M/10k/30%/360m) calculados sem overflow.
- **Caso 7** (Tipagem e Rejeição Estrita): `null`, `''`, `false`, `true`, `'1000'`, `NaN`, `Infinity`, `-Infinity`, negativos, prazo fracionário (12.5) e limites violados disparam erros explícitos — Aprovado.

### 2. Integridade e Semântica do HTML (`outputs/four-features-validate-html.js`)
- Exatamente **1 `<h1>`** presente.
- **54 IDs únicos** conferidos sem duplicações.
- Todas as âncoras internas (`#main-content`, `#projetos`, `#sobre`, `#contato`) validadas e apontando para nós existentes.
- Os 4 fluxos de raio-X responsivos presentes com rótulos semânticos.

### 3. Validação CSSOM e Estilos Computados (`outputs/four-features-qa-results.json`)
- Inspeção de **326 regras CSSOM**: zero seletores inválidos seguidos de `@media`.
- `.xray-content` sem animação no contêiner (`contentAnimation: none`).
- Regras de fallback `:not(.js-ready)` presentes no CSSOM para ocultar botões e controles inoperantes sem JavaScript.

### 4. Testes de Interação no Microsoft Edge Headless via CDP (`outputs/four-features-qa-runner.cjs`)
Executado em ambiente isolado via Chrome DevTools Protocol com fechamento explícito do navegador ao final:
- **Validação Campo a Campo do Laboratório**: campos vazios geram erro imediato específico, não reescrevem o valor digitado, preservam o cálculo anterior e tratam `0` como entrada válida para aporte/inicial.
- **5 Alternâncias de Modo com Detalhes Abertos e Foco no Laboratório**: foco transferido de volta com segurança para o botão, dados preservados em memória, sem erros de foco ou duplicação de handlers.
- **Preservação de Movimento e Ausência de RAF**: estado pausado/ativo e chave no `localStorage` preservados ao alternar entre modos; contagem de RAFs decorativos durante rolagem no modo resumo = **0**.
- **Trilha de Luz**: cálculo de comprimentos cumulativos (`totalLength: ~5019px`), avanço contínuo do offset e ancoragem perto do e-mail.
- **Matriz de Responsividade (320px, 390px, 768px, 1440px)**:
  - `hasHorizontalOverflow: false` em 100% das larguras testadas (`scrollWidth <= innerWidth`).
  - Rótulos dos diagramas técnicos medidos em 320px e 390px: **14px** de título e **12px** de subtítulo (100% legíveis, nunca reduzidos a 5px).
- **Zero Exceções em Runtime**: `uncaughtExceptions: []`.

### 5. Screenshots Gerados para Auditoria Visual (`outputs/`)
- `outputs/four-features-sol-xray-390.png`: Diagrama técnico aberto em 390x844.
- `outputs/four-features-sol-finance-768.png`: Laboratório aberto com gráfico calculado em 768x900.
- `outputs/four-features-sol-brief-1440.png`: Resumo com projetos e contato visíveis na tela de 1440x900.
- `outputs/four-features-sol-brief-390.png`: Início do resumo móvel; contato permanece mais abaixo na mesma página.
- `outputs/four-features-sol-contact-390.png`: Contato e término da trilha no celular.

### Revisão final do Sol

O runner `outputs/four-features-sol-review.cjs` verifica a versão integrada, com resultados em `outputs/four-features-sol-review.json`. As capturas finais aguardam dois frames após a rolagem para registrar o componente correto. O resumo recebeu layout compacto próprio; os eixos usam valores abreviados em reais para não cortar os rótulos, mantendo valores exatos nos resultados e na tabela. Também foram testados ausência de observadores/Path2D, armazenamento bloqueado, movimento reduzido e JavaScript desativado. Os testes são de Edge headless, não de aparelhos físicos; não há medição de FPS ou certificação completa de acessibilidade.

---

## 📦 Arquivos sob Escopo Desta Entrega

- `arthur-portfolio/dist/finance-lab.js` (cálculo puro e validação estrita)
- `arthur-portfolio/dist/portfolio-extras.js` (componentes, erros por campo, segmentos de trilha e modo rápido)
- `arthur-portfolio/dist/script.js` (suspensão real de RAF e sincronia de modo)
- `arthur-portfolio/dist/styles.css` (correção sintática de media rules, fluxo responsivo e animação de conexão única)
- `arthur-portfolio/dist/index.html` (estrutura semântica com diagramas técnicos responsivos)
- `arthur-portfolio/README.md` (documentação técnica atualizada)
- `outputs/four-features-*` (testes automatizados, runner CDP, resultados JSON e screenshots oficiais)
