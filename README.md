# Arthur Kadri de Oliveira &mdash; Portfólio de Projetos &amp; Atlas Espacial

Portfólio interativo de projetos desenvolvido sob uma interface bidimensional (Atlas Espacial com estética de Observatório Óptico e Giroscópio procedural) e modo editorial de leitura direta. Reúne projetos práticos desenvolvidos em C#, Python e C++, abrangendo utilitários para Windows, automação de rede, observação gráfica e modelagem quantitativa.

- **Autor:** Arthur Kadri de Oliveira
- **Formação:** Graduando na Universidade Federal do ABC (UFABC &mdash; 2º período)
- **Objetivo Profissional:** Primeiro estágio em **análise de dados ou mercado financeiro**
- **E-mail:** arthurkadri968@gmail.com
- **GitHub:** [arthurMPBBY](https://github.com/arthurMPBBY)
- **LinkedIn:** [Arthur Kadri de Oliveira](https://www.linkedin.com/in/arthur-kadri-de-oliveira-2586a12b2/)
- **Publicação:** https://arthurmpbby.github.io/
- **Versão Anterior Preservada:** [/2/](https://arthurmpbby.github.io/2/) (Edição Atlas Paper clara)

---

## Estética do Observatório Óptico & Giroscópio 3D

A interface visual adota a estética do vídeo de inicialização do **Steam Deck 'Giroscópio'**:
- **Câmara Óptica Profunda:** Fundo em tons de grafite, petróleo e obsidiana (`#070b0e`), com curvatura esférica sutil e iluminação periférica em névoa esmeralda (`#10b981`).
- **Gimbals Mecânicos Concêntricos:** 5 anéis concêntricos aninhados, projetados analiticamente em 3D com inclinações polares e equatoriais independentes, gerando escorço elíptico realista e profundidade cinemática.
- **Calibrações em Âmbar Luminoso:** Marcações de precisão em escala Vernier (graduações de 30°, 10° e 2,5°), trilhas de setores e retículos luminescentes em ouro/âmbar (`#f59e0b` / `#fbbf24`).
- **Vazio Óptico Central:** Abertura central com queda suave para o preto profundo (`#020406`), preservando legibilidade absoluta para a tipografia editorial e as esculturas dos projetos.
- **Paralaxe e Resposta ao Ponteiro:** Movimentação do mouse orienta a câmera virtual e acelera suavemente a precessão dos anéis mecânicos, com amortecimento estrito (settling bounded em 700ms) e repouso total de RAF/GPU quando estático.
- **Degradação e Fallback Gracioso:** Em navegadores sem WebGL ou com falhas de driver/alocação, o layout é preservado integralmente através de gradiente radial estático escuro com alto contraste.

---

## Estrutura do Atlas e Modos de Navegação

O projeto oferece duas formas complementares de navegação:

1. **Atlas Espacial (Navegação Não Linear):**
   - Sistema de coordenadas mundiais contínuo com origem centralizada em `(0, 0)`.
   - Âncora tipográfica central e 6 objetos arquiteturais livres dispostos em constelação espacial.
   - Navegação por arrasto de ponteiro/touch, zoom ancorado no cursor do mouse e radar/minimapa de orientação (acessível via teclado com `Enter` ou `Espaço` para restauração de visão geral).
   - **Link Descoberta da Versão Clara:** Acesso direto à versão anterior preservada (`/2/`) disponível no menu de pílulas do cabeçalho ("Versão clara").
   - **Memória Espacial e Entrada Coesa:** Ao entrar em uma sala a partir do mapa, a câmera (pan e zoom) e o foco são preservados. Ao sair via `Esc` ou botão "Voltar", a visão retorna exatamente ao enquadramento anterior com micro-indicação visual no objeto de retorno.
   - **Atlas de Relações Conceituais (Curatorial):** Ao passar o mouse ou focar via teclado em qualquer objeto, são destacadas conexões conceituais curatoriais ("Em comum" / "Conexões de ideias") acompanhadas de legenda editorial e botões de salto rápido, com arcos projetados na periferia sem interceptar títulos centrais.
   - **Comportamento Material Derivado da Forma:** Cada escultura interage conforme sua própria natureza (YAHCW desliza lâminas de janelas Win32 DWM; Tuya expande órbitas e aquece o filamento; Gaming move o caliper de telemetria sobre a fita de pacing; Python tenciona treliças e nós de coleções; Spotifast rotaciona o vinil e posiciona o braço de leitura mecânico; Financeiro revela o arco da curva exponencial de juros compostos).
   - Detecção estrita de intenção: deslocamentos de ponteiro superiores a 6 pixels são classificados como arrasto e não ativam abertura indesejada de salas.

2. **Modo Leitura Direta (Linear):**
   - Acessível pelo cabeçalho ("Leitura direta") ou via hash `#leitura`.
   - Layout linear focado em leitura sequencial e impressão/revisão ágil por recrutadores.
   - Desativa a captura de teclado e gestos da câmera para permitir rolagem vertical nativa.

---

## Projetos em Destaque

### 1. YAHCW (Yet Another Hot Corners for Windows)
- **Tecnologias:** C#, .NET, WinForms, Win32 API, Desktop Window Manager (DWM).
- **Descrição:** Utilitário nativo de produtividade para Windows que ativa cantos de tela (hot corners), compõe miniaturas em tempo real via DWM, comuta endpoints de áudio via interface COM `IPolicyConfig` e integra ajuste de luminância via DDC/CI com o processo auxiliar `BrightTray`.
- **Ressalva Técnica & Demonstração Web:** A demonstração integrada no navegador é ilustrativa e utiliza filtro CSS de brilho para visualização conceitual; o projeto desktop em C# comunica-se com os monitores externos via barramento I2C/DDC (opcodes VCP `0x10`) e WMI.
- **Repositório:** [github.com/arthurMPBBY/YAHCW](https://github.com/arthurMPBBY/YAHCW)

### 2. tuya-smart-lamps
- **Tecnologias:** Python 3, Sockets TCP, OpenAPI Tuya.
- **Descrição:** Automação de rede para lâmpadas inteligentes priorizando comunicação persistente direta via socket TCP na rede local (porta 6668). Em caso de queda ou timeout local, aciona automaticamente o fallback para a OpenAPI da Tuya em nuvem.
- **Ressalva Técnica & Demonstração Web:** Os tempos de latência exibidos no simulador didático (4ms local vs 148ms nuvem) são valores simulados para exemplificar a transição entre rede local e trânsito externo; SSE é empregado como evento de UI na aplicação.
- **Repositório:** [github.com/arthurMPBBY/tuya-smart-lamps](https://github.com/arthurMPBBY/tuya-smart-lamps)

### 3. gaming-fps-hud
- **Tecnologias:** C++17, Vulkan API (`vkQueuePresentKHR`), Qt 6 Quick, KDE Wayland.
- **Descrição:** Camada de observação em C++17 para chamadas `vkQueuePresentKHR` na fila gráfica da GPU, capturando tempos de quadro e 1% lows através de relógio monotônico de alta precisão (`std::chrono::steady_clock`), estruturados em snapshots JSON atômicos consumidos por um HUD independente em Qt 6.
- **Ressalva Técnica & Demonstração Web:** A demonstração na página exibe cenários sintéticos pré-calculados (144 FPS estável, stutter de shaders e carga em 60 FPS) para validação da interface.
- **Repositório:** [github.com/arthurMPBBY/gaming-fps-hud](https://github.com/arthurMPBBY/gaming-fps-hud)

### 4. python-curso (Fundamentos & Algoritmos)
- **Tecnologias:** Python 3, Estruturas de Dados Básicas, UFABC.
- **Descrição:** Repositório de exercícios práticos desenvolvidos durante a graduação na UFABC, cobrindo operações fundamentais com conjuntos (`set.difference`), manipulação de listas, cálculos numéricos de capitalização e leitura defensiva de arquivos com context managers.
- **Repositório:** [github.com/arthurMPBBY/python-curso](https://github.com/arthurMPBBY/python-curso)

### 5. spotifast-neon-theme
- **Tecnologias:** JSON, Design Tokens.
- **Descrição:** Especificação estruturada de paleta de cores e tokens em formato JSON (`neon.json`) para tema de alto contraste, com documentação clara de valores hexadecimais para fundos, superfícies e cores de destaque.
- **Repositório:** [github.com/arthurMPBBY/spotifast-neon-theme](https://github.com/arthurMPBBY/spotifast-neon-theme)

### 6. Laboratório Financeiro (Simulador de Juros Compostos)
- **Tecnologias:** Modelagem Quantitativa, Taxa Efetiva, JavaScript determinístico (`finance-lab.js`), SVG Reativo.
- **Descrição:** Simulador de evolução patrimonial com cálculo rigoroso de taxa equivalente mensal a partir da taxa anual efetiva fornecida:
  $$\text{taxaMensal} = (1 + \text{taxaAnual} / 100)^{1/12} - 1$$
  calculada via `Math.expm1(Math.log1p(annualRatePercent / 100) / 12)`.
- **Caso de Validação Canônico:** R$ 1.000 de valor inicial + R$ 100/mês a 12% a.a. efetiva por 12 meses resulta em:
  - Saldo final acumulado: **R$ 2.384,65**
  - Total aportado: **R$ 2.200,00**
  - Juros acumulados: **R$ 184,65**
  - Taxa mensal equivalente: **0,95% a.m.**
- **Validação Estrita:** Prazos fracionários (ex: 12.5 meses) ou entradas inválidas são rejeitadas pelo formulário com mensagem diagnóstica clara, preservando intactos o gráfico e os resultados do último cálculo válido.

---

## Acessibilidade & Recursos Técnicos

- **Navegação Completa por Teclado:**
  - `Esc`: fecha salas ativas, modais ou modo de leitura, restaurando a visão geral do Atlas e reposicionando o foco no objeto de origem (inclusive quando o foco está em inputs ou selects).
  - `Setas Esquerda/Direita`: navegam entre projetos adjacentes quando dentro de uma sala.
  - `Setas do Teclado`: deslocam a câmera espacial quando no modo Atlas.
  - `+` / `-`: ajuste gradual de zoom espacial.
  - `0`: restaura o enquadramento de visão geral (Overview Fit).
- **Semântica e Leitores de Tela:**
  - Estrutura de títulos semânticos (`h1` central acessível, `h2` em cada objeto e sala).
  - Região de anúncios dinâmicos (`aria-live="polite"`).
  - Atributo `inert` aplicado ao viewport quando uma sala ou leitura direta está aberta, impedindo que o foco vaze para o plano de fundo.
- **Degradação sem JavaScript:**
  - Disponibilidade de bloco `<noscript>` com sumário completo, links diretos e dados de contato.
- **Respeito a Preferências de Movimento:**
  - Suporte à media query `prefers-reduced-motion: reduce` e botão manual para pausar animações na interface.

---

## Verificação e Suíte de Testes

- **Suíte de Ciclo de Vida do WebGL (`outputs/kaleidoscope-sol-review.cjs`):**
  - 29/29 verificações automatizadas com sucesso.
  - Testes de repouso total de RAF/GPU (0 frames e 0 draws após 700ms de ponteiro estacionário).
  - Suspensão imediata em salas (`data-view="room"`), modo de leitura direta (`data-view="direct"`), deep links diretos (`#yahcw`, `#tuya`) e aba oculta (`document.hidden`).
  - Gating de DPR máximo de 1,5 em resoluções de 320px, 390px, 768px e 1440px.
  - Tolerância e resiliência: testes de perda de contexto WebGL com recuperação dinâmica de recursos (`WEBGL_lose_context`), falha de compilação, linkagem e injeção de erros nulos/exceções (fail-open sem afetar o atlas).
- **Suíte do Observatório Óptico (`outputs/gyroscope-worker-review.cjs`):**
  - 18/18 verificações automatizadas com sucesso.
  - Validação colorimétrica dos gimbals 3D: câmara escura predominante (> 55% de amostras escuras na base), marcações em âmbar luminoso, reflexões esmeralda e centro óptico preto.
  - Inspeção de escorço elíptico e rotação de perspectiva interativa com mouse.
  - Responsividade móvel sem overflow horizontal em 320px e 390px.
  - Acesso ao link discoverable da versão `/2/` clara.
