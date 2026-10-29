# Arthur Kadri de Oliveira &mdash; Portfólio de Projetos &amp; Atlas Espacial

Portfólio interativo de projetos desenvolvido sob uma interface bidimensional (Atlas Espacial) e modo editorial de leitura direta. Reúne projetos práticos desenvolvidos em C#, Python e C++, abrangendo utilitários para Windows, automação de rede, observação gráfica e modelagem quantitativa.

- **Autor:** Arthur Kadri de Oliveira
- **Formação:** Graduando na Universidade Federal do ABC (UFABC &mdash; 2º período)
- **Objetivo Profissional:** Primeiro estágio em **análise de dados ou mercado financeiro** (sem reivindicação de experiência corporativa anterior nessas áreas)
- **E-mail:** arthurkadri968@gmail.com
- **GitHub:** [arthurMPBBY](https://github.com/arthurMPBBY)
- **LinkedIn:** [Arthur Kadri de Oliveira](https://www.linkedin.com/in/arthur-kadri-de-oliveira-2586a12b2/)
- **Publicação:** https://arthurmpbby.github.io/

---

## Estrutura do Atlas e Modos de Navegação

O projeto oferece duas formas complementares de navegação:

1. **Atlas Espacial (Navegação Não Linear):**
   - Sistema de coordenadas mundiais contínuo com origem centralizada em `(0, 0)`.
   - Âncora tipográfica central e 6 objetos arquiteturais livres dispostos em constelação espacial.
   - Navegação por arrasto de ponteiro/touch, zoom ancorado no cursor do mouse e radar/minimapa de orientação.
   - Controles visíveis de zoom no rodapé para uso confortável em dispositivos móveis e desktop.
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

## Verificação da entrega

- Revisão independente: outputs/atlas-sol-review.cjs; resultados em outputs/atlas-sol-review.json no workspace de desenvolvimento.
- Entradas reais de mouse e toque, arrasto, zoom, histórico, Escape dentro de campos, isolamento do atlas e leitura sem captura de setas.
- Testes das seis salas em 320, 390, 768 e 1440px, incluindo largura interna e acesso aos controles do cabeçalho e dock.
- Falhas de Canvas e Storage injetadas antes da inicialização, movimento reduzido dinâmico, repouso de RAF e fallback sem JavaScript com rolagem nativa.
- Demonstrações são ilustrativas: métricas e mudanças visuais no navegador não medem nem controlam o hardware real.
- Testes feitos em Edge headless com renderização por software. Não equivalem a validação em aparelhos físicos, Safari ou Firefox.
