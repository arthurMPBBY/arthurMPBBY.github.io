# Portfólio Pessoal — Arthur Kadri de Oliveira

Portfólio estático editorial desenvolvido para apresentar a trajetória acadêmica na **Universidade Federal do ABC (UFABC — 2º período)** e os projetos práticos de Arthur Kadri de Oliveira, com foco na busca por oportunidade de **estágio em mercado financeiro / análise de dados**.

---

## Como Executar Localmente

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

## Direção de Arte & Identidade Visual

O design segue uma abordagem editorial com alta disciplina tipográfica, estética limpa e difusão atmosférica suave:

- **Paleta de Cores Estrita**:
  - Papel / Base: Off-white neutro frio (`#f5f5f3`)
  - Tinta / Tipografia Principal: Grafite escuro (`#25272b`)
  - Acento Único: Coral suave / terracota moderado (`#c16b59` e variações pastéis `#f6efec` / `#dfb3a7`)
  - Sem uso de roxos, neons saturados ou conectores de partículas aleatórias.
- **Tipografia**:
  - Títulos: *Plus Jakarta Sans* (geométrica, limpa e editorial)
  - Corpo de texto: *DM Sans* (alta legibilidade e equilíbrio)
  - Metadados técnicos & Identificadores: *JetBrains Mono* (precisão de engenharia)
- **Escultura de Luz Perolada & Nuvem de Dados**:
  - Escultura vetorial com gradientes perolados e transformação contínua em gráfico sintetizado pela rolagem (`dist/cloud-morph.js`).
  - Totalmente preservada, mantendo sincronia com os novos eventos de layout e visão.

---

## Funcionalidades Implementadas & Correções

### 1. Fundo com Pontos Reativos Reversos e Desfoque Local (`dist/reactive-dots.js` e `dist/styles.css`)
- **Grid Determinístico de Canvas 2D**: viewport fixo de alta performance com espaçamento exato de 26px e DPR limitado a <= 2.
- **Alinhamento com Rolagem do Documento**: utiliza offset cacheado da rolagem da página para coincidir perfeitamente com o fundo editorial.
- **Fallback CSS Intacto**: `body` mantém o gradiente radial CSS como fallback nativo; a classe `has-reactive-dots` no elemento raiz desativa a duplicidade da grade apenas após a inicialização bem-sucedida do Canvas.
- **Repulsão Reversa (Inverse Parallax)**: os pontos reagem de forma inversa ao mouse, afastando-se suavemente do cursor em um raio local de ~160px com deslocamento máximo contido em 12px.
- **Desfoque Progressivo em 5 Níveis via Sprites Pré-renderizados**: os pontos mais próximos do cursor sofrem desfoque progressivo e suave na paleta papel grafite coral, gerado a partir de sprites offscreen pré-renderizados na inicialização (sem filtros caros de pixel ou layout thrashing a cada frame).
- **Sem Loop RAF Permanente**: animações com easing até repouso quando estático, interrompendo completamente o RAF quando estático, quando o mouse sai do viewport, em dispositivos com ponteiro grosso/toque, sob redução ou pausa de movimento, com a aba oculta ou no modo de 20 segundos.
- **Não Interceptação**: Canvas com `aria-hidden="true"`, `pointer-events: none;` e `z-index: 0` situado atrás do conteúdo e acima do fundo papel, sem cobrir textos ou interceptar links e botões.

### 2. Projetos com Raio-X Arquitetural (`dist/index.html`, `dist/styles.css` e `dist/portfolio-extras.js`)
- Cada um dos 4 projetos conta com controle secundário nativo `<details class="project-xray">` rotulado como **"Como funciona"**.
- Alvo de toque de 38px no `.xray-summary` para uso ergonômico no celular.
- **Diagrama Técnico Responsivo (`.xray-flow`)**: passos estruturados com conectores vetoriais em coral, fluindo horizontalmente no desktop e verticalmente em telas estreitas (<= 600px até 320px), preservando tipografia de 12px a 14px em *JetBrains Mono*.
- **Comportamento Acordeão Nativo**: apenas um painel de raio-X permanece aberto simultaneamente.

### 3. Laboratório de Finanças Quantitativas (`dist/index.html`, `dist/finance-lab.js` e `dist/portfolio-extras.js`)
- Módulo isolado de juros compostos (`PortfolioFinance.calculate`) com taxa anual efetiva e aportes mensais, validado para tipagem estrita e limites numéricos.
- Campos de entrada sincronizados com sliders acessíveis (`aria-valuetext`), validação com `aria-invalid="true"` e mensagens de erro contextuais.
- **Gráfico Vetorial SVG**: curva coral contínua para saldo acumulado, linha tracejada grafite para aportes, eixos, escala em reais e meses, e tabela de marcos anuais expansível.
- **Fallback sem JS**: controles interativos são ocultados e o exemplo estático pré-calculado com notas explicativas é exibido.

### 4. Modo "Tenho 20 segundos" (`dist/index.html`, `dist/styles.css` e `dist/portfolio-extras.js`)
- Botão acionador no hero: **"Tenho 20 segundos"**.
- Alterna o estado visual para `html[data-view="brief"]`, atualizando o botão para **"Ver portfólio completo"** com anúncio via live region acessível.
- Oculta via `data-full-only` e `display: none` elementos secundários (escultura/nuvem, laboratório financeiro, raio-X, caixas de citação e botões de ação do hero), retirando-os da navegação por Tab.
- **Segurança de Foco**: se o elemento ativo estiver nos botões de ação do hero (`.hero-actions .btn-primary` e `.btn-secondary`) ou em qualquer seção omitida, o foco é transferido de forma segura para o botão `#brief-mode-toggle`, evitando perda de foco para `document.body` ou elemento invisível.
- **Suspensão Real de RAF**: loops de nuvem, paralaxe e pontos reativos são suspensos no modo resumo.

### 5. Luz que Atravessa o Site (`dist/index.html` e `dist/portfolio-extras.js`)
- Trilha decorativa vetorial contínua em SVG dentro de `#main-content`, conectando o gutter lateral do hero, passando pelos projetos e ancorando na borda externa do bloco de contato junto ao e-mail.
- **Alcance Completo do Endpoint**: ao rolar até o fim da página, o percurso atinge 100% até a caixa de e-mail e a iluminação do cartão de contato atinge valor pleno.
- **Iluminação Suave ao Navegar**: clicar na âncora `#contato` ilumina suavemente o cartão de contato já a partir de ~78% do percurso.
- Sincronização rigorosa de classes e seletores CSS para os caminhos de fundo e ativo (`.light-trail-bg-line, .light-trail-bg, #light-trail-bg`).
- Ocultação imediata do halo móvel sob pausa manual ou movimento reduzido.

---

## Correções de Bugs Diagnosticadas & Resolvidas

1. **Alinhamento e Término da Trilha de Luz**:
   - Correção do ponto de término do percurso ativo e cálculo de rolagem final: quando o usuário atinge o fim da página ou navega diretamente para `#contato`, a trilha agora completa 100% de seu trajeto até a caixa de e-mail e ilumina o cartão de contato (`--contact-illumination: 1.000`).
   - Sincronização dos seletores CSS com classes e IDs dos caminhos SVG.

2. **Segurança de Foco no Modo Rápido (Brief Mode)**:
   - Identificado que o foco era perdido para `document.body` quando os botões de ação do hero estavam focados ao ativar o modo resumo. Atributos `data-full-only` foram adicionados aos botões e a guarda de foco foi estendida, garantindo foco consistente em `#brief-mode-toggle`.

3. **Nuvem no Meio da Rolagem (Midscroll Pause/Resume)**:
   - Diagnosticado e verificado que ao pausar os efeitos no meio da transformação da nuvem (`morphProgress ~ 0.4`), a escultura estática completa é exibida em repouso e, ao reativar, a nuvem restaura com precisão o progresso e opacidade originais sem saltos.

4. **Controles, Labels e Overflow Real em Telas Estreitas (320px/390px)**:
   - O haze e a granulação com insets negativos extrapolavam a área da arte em telas estreitas. O contêiner da escultura recebeu `overflow: hidden`; a validação confere também o tamanho dos contêineres, não apenas o corte na raiz da página.
   - Ajuste ergonômico no alvo de toque do sumário de raio-X para `min-height: 38px`.
   - Validação estrita de valores inválidos no laboratório com `aria-invalid="true"` e mensagens descritivas.

---

## Validação & Resultados Reais de Teste

Todos os testes foram executados com código real no Microsoft Edge Headless via Chrome DevTools Protocol (`outputs/reactive-dots-review.cjs` com saída em `outputs/reactive-dots-review.json`):

- A suíte registra cada asserção e seu resultado em `outputs/reactive-dots-review.json`.
- **Zero exceções de runtime no console do navegador** (`exceptions: []`).
- **Pontos Reativos Validados**: detecção de pixels renderizados sob o mouse, repulsão direcional e retorno automático ao repouso após saída do cursor.
- **Suspensão de Efeitos**: paralisação imediata sob redução de movimento, pausa manual e modo resumo.
- **Responsividade Real sem Overflow**: testado em 320px, 390px, 768px e 1440px (`scrollWidth <= innerWidth` em todas as larguras).
- **Trilha de Luz**: alcance de 100% do percurso e iluminação no bloco de contato confirmados.

### Screenshots Gerados para Auditoria Visual (`outputs/`)
- `outputs/reactive-dots-rest.png`: Grade de pontos no estado de repouso alinhada ao fundo.
- `outputs/reactive-dots-moving.png`: Pontos reativos em movimento, com repulsão e desfoque sob o cursor.
- `outputs/reactive-dots-lab-open.png`: Laboratório financeiro aberto com gráfico de evolução patrimonial.
- `outputs/reactive-dots-xray-open.png`: Diagrama de raio-X aberto em 390x844 no mobile.
- `outputs/reactive-dots-brief-1440.png`: Modo de 20 segundos ativo em 1440x900 no desktop.
- `outputs/reactive-dots-brief-390.png`: Modo de 20 segundos ativo em 390x844 no mobile.

---

## Arquivos sob Escopo Desta Entrega

- `arthur-portfolio/dist/reactive-dots.js` (novo módulo de pontos reativos com repulsão e desfoque)
- `arthur-portfolio/dist/portfolio-extras.js` (segurança de foco, iluminação de contato e término de trilha)
- `arthur-portfolio/dist/styles.css` (estilos do canvas de pontos, eliminação de overflow mobile e alvos de toque)
- `arthur-portfolio/dist/index.html` (inclusão do script de pontos reativos e marcação data-full-only)
- `arthur-portfolio/dist/finance-lab.js` (cálculo de juros e validações)
- `arthur-portfolio/dist/cloud-morph.js` (nuvem de dados determinística)
- `arthur-portfolio/dist/script.js` (paralaxe, orquestração e eventos)
- `arthur-portfolio/README.md` (documentação técnica atualizada)
- `outputs/reactive-dots-*` (runner CDP, resultados JSON e capturas visuais oficiais)
