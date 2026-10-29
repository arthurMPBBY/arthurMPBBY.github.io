# Arthur Kadri — Portfólio & Observatório de Sistemas

Portfólio estático pessoal desenvolvido para apresentar projetos práticos de programação em C#, Python e C++, demonstrando implementações de utilitários de sistema, automação de rede e modelagem quantitativa, além da busca por estágio no mercado financeiro ou em análise de dados.

Publicação de referência: https://arthurmpbby.github.io/

---

## Direção Visual & Arquitetura

Experiência imersiva inspirada na sofisticação tipográfica editorial e cenários espaciais interativos (como Remix e o portfólio de Guillaume Colombel), desenvolvida inteiramente com código e identidade gráfica próprios, sem cópia de marcas, ativos externos ou dependências de runtime.

- **Paleta de cores:** Base em grafite profundo (`#080a0c`, `#0e1217`, `#141922`), superfícies translúcidas em vidro escuro e tinta clara (`#f8fafc`, `#e2e8f0`, `#94a3b8`), com realces comedidos em verde marinho desaturado sea-glass (`#a6d6c0`, `rgba(166, 214, 192, 0.16)`) e prata (`#e2e8f0`). Cores como roxo, azul neon e preenchimentos marrons foram expressamente evitados.
- **Tipografia editorial:** Títulos monumentais e cabeçalhos em Plus Jakarta Sans com tracking preciso, corpo de leitura em DM Sans e identificadores/telemetria em JetBrains Mono.
- **Hero Landscape integrado:** Composição de abertura em paisagem contínua de largura total. Título monumental `ARTHUR KADRI` sobreposto a uma malha densa de partículas e nota pessoal flutuada no quadrante inferior esquerdo com links discretos de navegação, sem caixas de bio opacas ou badges duplicados.
- **Cenário espacial determinístico (`immersive-scene.js`):** Malha em Canvas 2D com projeção tridimensional em perspectiva, sem WebGL ou biblioteca 3D. Opera com 6.400 partículas em desktop (grade 80×80) e 1.600 em telas menores que 768px (40×40); o tamanho projetado varia com a profundidade. O canvas fixo fica fora dos contêineres recortados, aparece na abertura e nos projetos e é ocultado quando ambos saem da tela. As abas alteram sua geometria:
  - *Visão Geral / Hero:* Terreno com um vale de partículas, sem rotação automática ou carregamento bloqueante.
  - *YAHCW:* Planos quadrangulares de janelas suspensas em camadas de profundidade z com âncoras de canto.
  - *tuya-smart-lamps:* Barramento local com nós de comunicação e órbita elíptica tridimensional representando a nuvem.
  - *gaming-fps-hud:* Corredor de telemetria em 8 faixas paralelas com ondas harmônicas e perfil de oscilação 1% low.
  - *Laboratório Financeiro:* Superfície geométrica exponencial de juros compostos com nervuras em profundidade.
- **Eficiência e repouso de animação:** Bounded RAF settling que interrompe a execução contínua de quadros quando a interpolação atinge estabilidade ou quando o cursor permanece estático. O DPR é limitado a 2 com limpeza integral de backing store. A execução é suspensa via `IntersectionObserver` quando a área visível sai da tela, quando a aba fica oculta (`document.hidden`), quando as animações são pausadas ou no modo resumido.

---

## Projetos Apresentados & Demonstrações Interativas

### 1. YAHCW (Yet Another Hot Corners for Windows)
- **Tecnologias:** C# / .NET 4.5+, WinForms, Win32 API, Desktop Window Manager (DWM).
- **Descrição:** Utilitário nativo para Windows que combina navegação por cantos de tela com visão geral de miniaturas em tempo real (DWM API), ajuste de brilho dos monitores via Named Pipe local seguro com o assistente BrightTray e comutação ágil de dispositivos de saída de áudio via interface COM `IPolicyConfig`.
- **Demonstração interativa in-page:** Mini-desktop ilustrativo com gatilho de canto superior esquerdo e botão direto para abrir a Visão Geral de Janelas, ajuste de brilho no slider que altera a luminosidade da demonstração e seletor de áudio dinâmico responsivo sem sobreposição.
- **Transparência técnica:** A demonstração no navegador é estritamente ilustrativa e não controla o computador hospedeiro. No software nativo, o ajuste de brilho depende de suporte do monitor a DDC/CI ou WMI, e o utilitário não oferece garantia de sobreposição em jogos executando em modo exclusivo ou sob anti-cheats de kernel.

### 2. tuya-smart-lamps
- **Tecnologias:** Python 3, Sockets TCP, Server-Sent Events (SSE), Tuya Cloud OpenAPI, Android.
- **Descrição:** Sistema de controle para lâmpadas inteligentes priorizando conexões TCP locais persistentes na rede Wi-Fi e alternando automaticamente para a Tuya OpenAPI em nuvem caso a rota local não responda.
- **Playground in-page:** Simulação ilustrativa com chaveamento de lâmpada, seleção de rota (Local vs Nuvem) e teste de contingência ao simular perda do enlace local.

### 3. gaming-fps-hud
- **Tecnologias:** C++17, Vulkan API (`vkQueuePresentKHR`), Qt 6 Quick, KDE Wayland.
- **Descrição:** Camada em C++17 para ambientes Linux/Wayland que observa chamadas de apresentação da API Vulkan, calculando métricas de tempo de quadro e 1% lows. Emite snapshots JSON atômicos consumidos por um HUD independente em Qt sem bloquear o pipeline gráfico da aplicação.
- **Demonstração in-page:** Observador com três cenários de teste sintéticos (carga estável, compilação de shaders e carga elevada) e visualização do payload JSON gerado.

### 4. Simulador de Juros Compostos (Laboratório Financeiro)
- **Motor matemático (`finance-lab.js`):** Implementação pura preservada, convertendo taxa anual efetiva para taxa mensal equivalente `taxaMensal = (1 + taxaAnual / 100) ** (1 / 12) - 1`, com aportes no final de cada período e visualização gráfica em SVG reativo. Validação estrita de número inteiro de meses (1 a 360), preservando gráficos anteriores em caso de entrada incorreta.
- **Propósito:** Demonstração didática de modelagem quantitativa, sem fins de consultoria ou recomendação de investimentos.

### 5. Repositórios Complementares
- `python-curso`: Exercícios práticos de fundamentos da linguagem Python: cálculos numéricos e manipulação de listas e conjuntos.
- `spotifast-neon-theme`: Paleta de cores em formato JSON para o tema escuro do aplicativo Spotifast.

---

## Acessibilidade, Controles e Resiliência

- **Navegação nativa e sem hijacking:** Rolagem nativa do navegador e navegação direta por fragmentos hash (`#hero`, `#projetos`, `#laboratorio`, `#sobre`, `#contato`) totalmente preservadas. O hash `#laboratorio` ativa a aba de cálculo financeiro e rola o simulador diretamente à visualização.
- **Controle de Animações:** Botão acessível com persistência em `localStorage` sob a chave `arthur_portfolio_motion` com guarda contra falhas (`try/catch` para modo anônimo ou restrições de sandbox). Respeita preferência do sistema operacional `prefers-reduced-motion`.
- **Modo "Tenho 20 segundos":** Alternador rápido que oculta blocos detalhados e apresenta os fatos essenciais e contatos imediatamente, preservando o foco do teclado no botão acionador.
- **Degradação graciosa (Sem JavaScript):** Toda a estrutura semântica de textos, links de repositórios, advertências técnicas e canais de contato permanece visível no fluxo normal do documento caso o JavaScript esteja desabilitado.
- **Responsividade:** Testado sem transbordamento horizontal em larguras de 320px, 390px, 768px e 1440px; há verificação adicional de buffer em 800×1600 com DPR 2. São emulações no Edge, não testes em aparelhos físicos.

---

## Verificação Automatizada (QA Headless CDP)

A validação de integridade foi executada via Microsoft Edge headless utilizando o protocolo Chrome DevTools (CDP) através do script `outputs/immersive-qa.cjs`, registrando resultados em `outputs/immersive-qa.json` e capturas de tela:

- `outputs/immersive-desktophero.png`: Composição de abertura monumental em desktop 1440x900.
- `outputs/immersive-explorerYAHCW.png`: Observatório com aba YAHCW ativa, controles alinhados e mini-desktop interativo.
- `outputs/immersive-project-tuya.png`: Transição do observatório para tuya-smart-lamps.
- `outputs/immersive-project-gaming.png`: Transição do observatório para gaming-fps-hud.
- `outputs/immersive-brief.png`: Modo "Tenho 20 segundos" ativado.
- `outputs/immersive-contact.png`: Seção de contato com botão de cópia de e-mail.
- `outputs/immersive-mobile.png`: Layout renderizado em viewport móvel de 390x844.
- `outputs/immersive-nojs.png`: Layout estático com JavaScript desabilitado demonstrando leitura integral de todos os projetos.

Revisão independente do coordenador: `outputs/immersive-sol-review.cjs`, com relatório em `outputs/immersive-sol-review.json`. A suíte abre perfil temporário em porta dinâmica, sem desabilitar a segurança do navegador. O teste gráfico usa renderização por software (`--disable-gpu`): uma execução com aceleração travou na captura de screenshot deste ambiente e foi encerrada, sem que isso fosse contado como aprovação. A suíte concluída instrumenta callbacks reais de RAF e lê pixels do canvas para diferenciar terreno, janelas e rota Tuya; também cobre preferência real de movimento reduzido via CDP, repouso com ponteiro parado, canvas fora da tela, modo resumido, controles móveis, foco/Escape, prazo fracionário inválido, execução sem JS e falhas lançadas por Canvas e Storage.

O laboratório usa números de ponto flutuante JavaScript, sem arredondamento intermediário e com formatação monetária apenas na apresentação; não representa aritmética decimal exata nem um produto de investimento. As demonstrações de Windows, lâmpadas e HUD não acessam hardware ou métricas reais. `cloud-morph.js` permanece intacto e é usado como ilustração secundária; os arquivos legados `reactive-dots.js` e `portfolio-extras.js` não são carregados. Fontes externas usam fallback de sistema. Os resultados automatizados não substituem verificação em Safari, Firefox ou dispositivos físicos.
