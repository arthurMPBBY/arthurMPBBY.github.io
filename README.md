# Arthur Kadri — portfólio

Portfólio estático para apresentar projetos de programação e a busca por estágio em mercado financeiro ou dados. Publicado em https://arthurmpbby.github.io/.

## Direção visual

Composição tipográfica diagonal, espaço em branco e entrada suave por microbarras, inspirados na linguagem visual de Abliteration. Código e identidade próprios, sem copiar a marca, textos ou ativos da referência.

- Papel `#fafaf9`, tinta `#1b1c1b`, superfícies em pérola neutra / pedra suave (`#f0f2f1`), bordas em grafite (`#d0d5d3`) e acentos pontuais em coral (`#c16b59`).
- Superfícies com preenchimento em marrom/pêssego em contato, e-mail, badges e botões foram substituídas por tons neutros frios elegantes e legíveis.
- Plus Jakarta Sans para títulos, DM Sans para texto, JetBrains Mono para metadados.
- Microbarras em Canvas 2D com repulsão e desfoque próximo ao ponteiro; SVG estático em CSS com microbarras frias quando o efeito está indisponível.
- Introdução em microbarras com crescimento e decaimento contínuos, ondulação harmônica suave sem trepidação, nome legível e transição por crossfade para o layout real em menos de 2.200 ms. Cancelável por botão, Escape ou Tab, com preferência de sessão e fail-open total.
- A antiga trilha luminosa foi removida para não atravessar números ou textos.

## Conteúdo e interações

Arthur Kadri de Oliveira, estudante da UFABC no 2º período. Formação e objetivo profissional foram informados pelo próprio Arthur; descrições técnicas foram conferidas nos repositórios públicos.

- `gaming-fps-hud`: C++17, observação de apresentação Vulkan, snapshots JSON e HUD independente em Qt/KDE Wayland.
- `tuya-smart-lamps`: backend Python, controle local TCP, atualização por SSE e aplicativo Android, com alternativa pela Tuya OpenAPI.
- `python-curso`: exercícios de fundamentos em Python, cálculos, conversões e conjuntos.
- `spotifast-neon-theme`: paleta `neon.json` para Spotifast. Não é um tema Spicetify; os efeitos animados dependem da integração no aplicativo.

Cada projeto tem uma explicação expansível. O laboratório financeiro começa fechado para manter a página curta. O modo “Tenho 20 segundos” oculta conteúdo secundário e pausa os efeitos sem alterar a preferência de movimento salva.

A nuvem decorativa original permanece na seção Sobre e usa `cloud-morph.js` para a transformação ilustrativa em dados durante a rolagem.

## Simulador financeiro

Exemplo didático com taxa anual efetiva convertida para mensal:

`taxaMensal = (1 + taxaAnual / 100) ** (1 / 12) - 1`

Aportes no fim do mês, sem arredondamento intermediário. Não inclui impostos, taxas, inflação ou cotações e não constitui recomendação de investimento.

Exemplo padrão: R$ 1.000 iniciais, R$ 100 mensais, 12% ao ano e 12 meses. Total aportado R$ 2.200, saldo R$ 2.384,65 e juros R$ 184,65. O mesmo exemplo é exibido sem JavaScript. Entradas inválidas preservam o último resultado válido.

## Execução

Sem compilação ou dependências JavaScript externas. Para servir a pasta publicada:

```sh
python -m http.server 8000 --directory arthur-portfolio/dist
```

Execute a partir da pasta de trabalho que contém `arthur-portfolio`. No checkout GitHub Pages, sirva a própria raiz. Fontes remotas têm alternativas de sistema.

## Verificação

Revisão final executada em Microsoft Edge headless por CDP em 28/10/2026. Os scripts de QA e capturas ficam em `outputs/` na pasta de trabalho, não no site público.

- `smooth-neutral-review.cjs`: 24 verificações aprovadas. Registra capturas da introdução, confere cores computadas neutras frias no bloco de e-mail e badges, ausência de exceções de console e de RAF contínuo em repouso, além do layout em 320×640 e 390×844. A duração real é medida separadamente por `spatial-sol-review.cjs`.
- `abliteration-hardening-review.cjs`: 51 verificações aprovadas, sem exceções JavaScript na execução revisada.
- Cobertura: buffer Canvas em DPR 2, repulsão e sprites de desfoque, parada de RAF em repouso, pausa e modo resumo, fallback em falha de contexto e sem JavaScript, foco ao pular a entrada, laboratório e acordeão.
- Layouts verificados: 320×640, 390×844, 768×1024, 1440×900 e 800×1600 em DPR 2, sem transbordamento horizontal nos testes.
- `four-features-math-test.js`: contrato e casos numéricos aprovados.
- `spatial-sol-review.cjs`: mais 17 verificações aprovadas, incluindo duração real da entrada, mudanças de preferência de movimento e ponteiro, falhas de Canvas e armazenamento bloqueado.

Esses testes não equivalem a homologação em aparelhos físicos, todos os navegadores ou leitores de tela. Não há benchmark de desempenho de hardware.

## Publicação

A fonte fica em `arthur-portfolio/dist`. O checkout `github-pages` recebe os mesmos dez arquivos na raiz e em `dist/`, mantendo links antigos. `.nojekyll` é preservado. O ZIP contém somente os arquivos públicos na raiz.

Nenhum briefing privado, perfil de navegador ou script de teste faz parte da publicação.
