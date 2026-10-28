# Portfólio Pessoal — Arthur Kadri de Oliveira

Portfólio estático editorial desenvolvido para apresentar a trajetória acadêmica na **Universidade Federal do ABC (UFABC — 2º período)** e os projetos práticos de Arthur Kadri de Oliveira, com foco na busca por oportunidade de **estágio em mercado financeiro / análise de dados**.

## Publicação no GitHub Pages

Site: https://arthurmpbby.github.io/

O GitHub Pages publica a raiz da branch `main`. Os arquivos da página precisam ficar na raiz do repositório, com `index.html`, `styles.css`, `script.js` e `cloud-morph.js` juntos. A pasta `dist` é mantida sincronizada para o servidor de desenvolvimento e para preservar os links antigos; atualizar apenas essa pasta não atualiza a página inicial publicada.

O efeito de nuvem usa uma série ilustrativa, não cotações ou resultados financeiros reais. Os controles de movimento e a preferência de movimento reduzido continuam disponíveis.

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

## 🎨 Direção de Arte & Efeitos Visuais

O design segue uma abordagem editorial suíça com alta disciplina tipográfica, estética limpa e difusão atmosférica suave inspirada na leveza orgânica e abstrata de Nika (sem uso de clichês de anime, neons ou roxos):

- **Paleta de Cores Estrita**:
  - Papel / Base: Off-white neutro frio (`#f5f5f3`)
  - Tinta / Tipografia Principal: Grafite escuro (`#25272b`)
  - Acento Único: Coral suave / terracota moderado (`#c16b59` e variações pastéis `#f6efec` / `#dfb3a7`)
  - Sem uso de roxos, neons saturados ou temas sage/creme.
- **Tipografia**:
  - Títulos: *Plus Jakarta Sans* (geométrica, limpa e editorial)
  - Corpo de texto: *DM Sans* (alta legibilidade e equilíbrio)
  - Metadados técnicos & Identificadores: *JetBrains Mono* (precisão de engenharia)
- **Escultura de Luz Perolada & Atmosfera**:
  - Escultura vetorial em SVG enriquecida com camadas de coroa radiante (*corona*), gradientes perolados em múltiplos pontos de parada, filamentos internos com pulsação suave e partículas de luz.
  - Fita orbital tripla com eixos inclinados (-26°, 35° e -62°) com satélites em coral e grafite.
  - Granulação atmosférica sutil via sobreposição milimétrica pontilhada (`.art-grain-overlay`), oferecendo profundidade tátil sem peso computacional.
  - Efeito paralaxe suave em 3D reativo ao ponteiro do mouse, restrito a ponteiros finos (`pointer: fine`).
- **Lista de Projetos com Luz Localizada**:
  - Cartões mantêm o formato compacto original de quatro linhas.
  - Filete coral na borda esquerda e brilho de luz localizado suave em gradiente radial (`--pointer-sheen-horizontal`, `--pointer-sheen-vertical`) que acompanha o ponteiro no hover/foco.
  - Revelação escalonada e suave (*staggered reveal*) acionada apenas quando a seção entra no campo de visão.
- **CTA Primário com Resposta Magnética Contida**:
  - Botão principal reage com leve atração magnética amortecida limitada a ±5px sob ponteiros finos, restaurando posição ao sair.

## Nuvem que se transforma em dados

A rolagem natural converte a escultura em partículas e depois em uma curva ilustrativa. Rolar para cima recompõe a escultura. O espaço reservado à arte permanece igual; não há seção extra, pinning ou alteração da rolagem do navegador.

- `dist/cloud-morph.js` contém o renderizador Canvas 2D. Os pontos iniciais são amostrados dos caminhos reais do SVG com `Path2D`; trajetórias e destinos são determinísticos.
- A distribuição usa 240 partículas no desktop e 120 até 640px, cobrindo a curva inteira em ambos os casos. DPR limitado a 2.
- `dist/script.js` calcula o progresso pela posição da arte e agrupa atualizações de rolagem com `requestAnimationFrame`. Medidas de layout são atualizadas no redimensionamento, mudanças de tamanho e carregamento das fontes, não em cada desenho.
- A paralaxe recua antes da dissolução para manter SVG e partículas alinhados. As partículas não dependem de mouse e continuam funcionando por rolagem no celular.
- O botão de pausa restaura a escultura estática. Ao reativar, a composição acompanha a posição atual de rolagem. Movimento reduzido pausa os efeitos por padrão.
- Sem JavaScript, Canvas 2D ou `Path2D`, o SVG original continua visível. A legenda da curva é texto HTML acessível: **Série ilustrativa · sem dados de mercado**.
- A série é sintética e serve apenas à composição visual; não representa preços, rentabilidade ou experiência profissional em finanças.

### Verificação desta implementação

Executada no Microsoft Edge headless, com o HTML local real, em 320, 390, 768 e 1440px: ausência de overflow, navegação visível, seis posições de rolagem por largura, retorno às mesmas posições das partículas, término da transformação dentro da tela e ausência de RAF pendente em repouso. Também foram verificados redimensionamento durante a transformação, pausa/retomada, movimento reduzido, suspensão fora da tela, ausência de `Path2D` e página com JavaScript desativado. Nenhuma exceção JavaScript foi registrada.

O relatório detalhado está em `../outputs/cloud-morph-qa.json` e o verificador em `../outputs/validate-cloud-morph.cjs`. A sintaxe dos dois scripts de produção foi verificada. Não foram medidos FPS, consumo de CPU ou desempenho em aparelhos físicos.

### Arquivos para publicar

Envie todos os arquivos de `dist` para a raiz do repositório do GitHub Pages, incluindo o novo `cloud-morph.js`. O ZIP em `../outputs/arthur-kadri-portfolio.zip` contém esses arquivos diretamente na raiz. Alterações e validação locais não publicam o site automaticamente.

---

## 📁 Formação Acadêmica & Projetos

- **Universidade Federal do ABC (UFABC)**: Graduação em andamento (2º período), com foco em base quantitativa e métodos analíticos.
- **Lista Compacta de Projetos no GitHub (`arthurMPBBY`)**:
  1. **`gaming-fps-hud`** (C++17, Vulkan API, Qt 6 Quick, Wayland): medição de cadência e frametime em tempo real desacoplado na GPU.
  2. **`tuya-smart-lamps`** (Python 3.10+, TCP Sockets, PyQt6, SSE): automação local direta com fallback automático para Tuya Cloud API.
  3. **`python-curso`** (Python, Algoritmos, Cálculo Numérico): resolução de fórmulas matemáticas e estruturas de dados.
  4. **`spotifast-neon-theme`** (JSON, Design Tokens): estruturação de tema e customização visual.

---

## ♿ Acessibilidade & Controle de Movimento

- **Botão Acessível de Controle de Movimento**:
  - Botão visível e destacado no cabeçalho: `Pausar efeitos` / `Ativar efeitos`.
  - Equipado com `aria-pressed`, `aria-label` descritivo e sincronizado com região viva (`#motion-live-status`, `role="status"` e `aria-live="polite"`).
  - Respeita por padrão a preferência do sistema operacional (`prefers-reduced-motion: reduce`).
  - Escolhas explícitas do usuário são persistidas com segurança no `localStorage` sob a chave `arthur_portfolio_motion`.
- **Desativação Inteligente de Recursos**:
  - Movimento decorativo suspenso com `data-motion="paused"` e em modo de movimento reduzido.
  - Paralaxe desativado em telas sensíveis ao toque (apenas ponteiros finos ativam o rastreamento).
  - Laço de renderização (`requestAnimationFrame`) interrompido imediatamente quando a aba é ocultada (`document.hidden`) ou quando a seção do herói sai do campo de visão (`IntersectionObserver`).
  - O laço JavaScript da paralaxe encerra quando o movimento do ponteiro estabiliza. As animações CSS continuam enquanto o herói estiver visível e os efeitos estiverem ativos; não há promessa de consumo zero.
  - Animações decorativas pausam quando a aba está oculta ou o herói sai da tela.
- **Aprimoramento Progressivo (Progressive Enhancement)**:
  - Todo o conteúdo de texto, metadados e links permanece 100% visível e funcional caso o JavaScript esteja desabilitado ou o IntersectionObserver não responda.
- **Link de Salto & Foco**:
  - Skip link funcional para `#main-content` e anéis contrastantes `:focus-visible` em coral.
- **Cópia de E-mail Segura**:
  - Feedback em região viva (`aria-live="polite"`), debounce e fallback com temporizadores gerenciados.

---

## 🧪 Validação & Verificações Realizadas

- **Verificação Sintática de JavaScript**:
  - Validado via Node embutido no executável do Electron (`ELECTRON_RUN_AS_NODE=1 "...\T3 Code (Beta).exe" --check dist/script.js`), concluído com código 0 e sem avisos sintáticos.
  - Auditoria estrita contra variáveis de letra única e ausência de novos comentários inline.
- **Responsividade & Overflow Horizontal**:
  - Testado via headless browser nas resoluções `320px`, `390px`, `768px` e `1440px`.
  - `document.documentElement.scrollWidth <= document.documentElement.clientWidth` confirmado em todas as resoluções (zero transbordamento horizontal).
  - O rótulo da marca UFABC no cabeçalho adapta-se sem cortes indesejados (`nowrap clipping`).
- **Ciclo de Estados do Botão de Efeitos**:
  - Transição de `aria-pressed` de `"false"` para `"true"`, alteração de texto dinâmico para `Ativar efeitos` e persistência em `localStorage` validada de ponta a ponta.
