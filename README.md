# Arthur Kadri de Oliveira &mdash; Portfólio de Projetos &amp; Atlas Espacial

Portfólio interativo com navegação espacial, ambiente óptico procedural inspirado no interior de uma íris e alternativa de leitura direta. Reúne projetos práticos desenvolvidos em C#, Python e C++, abrangendo utilitários para Windows, automação de rede, observação gráfica e modelagem quantitativa.

- **Autor:** Arthur Kadri de Oliveira
- **Formação:** Graduando na Universidade Federal do ABC (UFABC &mdash; 2º período)
- **Objetivo Profissional:** Primeiro estágio em **análise de dados ou mercado financeiro**
- **E-mail:** arthurkadri968@gmail.com
- **GitHub:** [arthurMPBBY](https://github.com/arthurMPBBY)
- **LinkedIn:** [Arthur Kadri de Oliveira](https://www.linkedin.com/in/arthur-kadri-de-oliveira-2586a12b2/)
- **Publicação:** https://arthurmpbby.github.io/
- **Versão Anterior Preservada:** [/2/](https://arthurmpbby.github.io/2/) (Edição Atlas Paper clara)

---

## Íris: ambiente óptico e interação

A referência de luz âmbar e atmosfera verde-petróleo evolui para uma interpretação original de íris, pupila e lente. O ambiente utiliza WebGL procedural; não depende de vídeo ou de imagens da Steam.

A superfície curva utiliza uma malha 3D com teste de profundidade, pupila recuada e borda elevada. A textura procedural de fibras é gerada uma vez por contexto gráfico e recebe filtragem por mipmaps; iluminação e reflexos variam com a câmera. A pupila dilata suavemente, ondas de tensão percorrem as fibras e os reflexos de aparência corneana se deslocam em ritmos distintos, mesmo sem movimento do ponteiro. A representação é artística, sem simulação física completa da refração ocular.

A malha possui 256 setores e 96 anéis, com maior concentração de amostras junto à pupila. A textura utiliza até 4096×1024 em ponteiro fino e 2048×512 em ponteiro grosso, respeitando os limites da GPU, com filtragem trilinear e anisotropia até 4 quando disponível. O relevo ocupa o canal vermelho; a textura é opaca para evitar distorções de dados por pré-multiplicação de transparência. A geometria usa antialiasing nativo quando o navegador o disponibiliza.

A atualização ambiente em desktop tem cadência-alvo de 60 desenhos por segundo. A câmera acompanha a entrada por interpolação baseada em tempo, e a interação pode acompanhar o ritmo de `requestAnimationFrame` do navegador. O buffer mantém as mesmas dimensões durante o movimento ambiente e a interação: parte da resolução CSS nativa, considera DPR até 2 e limita a ampliação a aproximadamente 4,15 milhões de pixels, sem reduzir abaixo das dimensões CSS. Isso elimina a troca visível de resolução ao mover o ponteiro. A cadência efetiva depende do navegador e do dispositivo.

- **Atlas:** projetos e tipografia permanecem em HTML acessível sobre a cena; as esculturas acompanham discretamente o ponto de vista.
- **Dentro da íris:** abre uma visão dedicada à arte, com arrasto, controle de profundidade e botão de retorno. O modo guarda a câmera do atlas e isola seus controles do teclado enquanto estiver aberto.
- **Celular:** o arrasto envia coordenadas normalizadas à cena, sem sensores, permissões de orientação ou movimento automático permanente.
- **Teclado:** setas alteram o ponto de vista; `+`/`-` ajustam profundidade; `0` centraliza; `Esc` retorna aos projetos com restauração de foco.
- **Movimento:** a respiração continua enquanto o atlas estiver visível e o movimento permitido, inclusive em telas de toque. Pausa manual, movimento reduzido, aba oculta, leitura direta e salas de projetos interrompem a animação. O relógio de tempo ativo fica congelado durante a suspensão e retoma sem compensar o intervalo ausente.
- **Falhas gráficas:** o portfólio continua disponível sem WebGL. Se o contexto for perdido dentro da experiência, os controles do atlas são restaurados.
- **Separação de módulos:** `kaleidoscope.js` renderiza a cena; `optics-interface.js` controla exploração e gestos; `optics-interface.css` define a interface. A comunicação usa `portfolio:opticsinput` com coordenadas, profundidade e reset.
- **Agendamento:** um único agendador combina a cadência ambiente com a acomodação de entradas. Não há um segundo ciclo de animação concorrente. A câmera do atlas ainda encerra seus próprios frames ao estabilizar; somente a íris possui movimento ambiente intencional.
- **Medições:** os relatórios de qualidade e desempenho em `outputs/iris-smooth-sol-*` registram a comparação com a versão anterior, separando cadência, resposta dos uniformes da câmera e custo de desenho com leitura síncrona. Essa leitura inclui sincronização e custo do driver; não é um temporizador exclusivo da GPU. Os testes de viewport móvel em desktop não medem desempenho de um telefone físico.

Comparação local em Edge headless, ANGLE/D3D11 e RX 7600, com viewport 1920×1080 e DPR 1:

| Medida | Versão anterior `0965896` | Renderizador atual |
| --- | --- | --- |
| Buffer ambiente | 1032×580 | 1920×1080 |
| Cadência de desenhos submetidos | 16,2/s | 60,0/s |
| Câmera chega a 90% do destino | 272 ms | 83 ms |
| Desenho + leitura síncrona, p95 | 1,9 ms | 1,3 ms |
| Amostras MSAA observadas | 0 | 4 |

São resultados dessa execução, não garantias para outros dispositivos ou medições de apresentação em uma janela visível a 180 Hz.

---

## Estrutura do Atlas e Modos de Navegação

O projeto oferece duas formas complementares de navegação e uma experiência óptica opcional:

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
  - As contagens e os resultados de cada execução ficam registrados nos relatórios JSON.
  - A interpolação de entrada usa uma constante de tempo de 40 ms; o movimento ambiente é verificado por pixels que mudam sem entrada, com suspensão em todos os estados de pausa.
  - Suspensão imediata em salas (`data-view="room"`), modo de leitura direta (`data-view="direct"`), deep links diretos (`#yahcw`, `#tuya`) e aba oculta (`document.hidden`).
  - DPR até 2, resolução nativa mínima e dimensões estáveis entre repouso e interação em viewports de 320px, 390px, 768px, 1440px e 1920px.
  - Tolerância e resiliência: testes de perda de contexto WebGL com recuperação dinâmica de recursos (`WEBGL_lose_context`), falha de compilação, linkagem e injeção de erros nulos/exceções (fail-open sem afetar o atlas).
- **Interface da íris (`outputs/iris-interface-review.cjs`):** testa clique real, preservação da câmera, foco, teclado, profundidade, arrasto touch, pausa, movimento reduzido, rotas externas e recuperação após perda de contexto. Os relatórios JSON registram os resultados de cada execução, local ou online.
- **Revisão independente (`outputs/iris-living-sol-review.cjs`):** mede a evolução do fundo, o congelamento do tempo durante a pausa e a retomada sem salto. Também congela o uniforme de tempo apenas no harness para verificar que profundidades diferentes alteram a geometria independentemente da respiração.
- Os testes funcionais gráficos usam Edge com SwiftShader; a revisão independente de qualidade e a comparação de desempenho usam ANGLE/D3D11 na GPU local. Não equivalem a uma medição de desempenho em todos os celulares ou GPUs físicos, nem comprovam a cadência de uma janela visível em monitor de 180 Hz.
