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

O design segue uma abordagem editorial suíça com alta disciplina tipográfica e estética limpa com difusão suave:

- **Paleta de Cores Estrita**:
  - Papel / Base: Off-white neutro frio (`#f5f5f3`)
  - Tinta / Tipografia Principal: Grafite escuro (`#25272b`)
  - Acento Único: Coral suave / terracota moderado (`#c16b59` e variações pastéis `#f6efec` / `#dfb3a7`)
  - Sem uso de roxos, neons ou clichês creme/sage.
- **Tipografia**:
  - Títulos: *Plus Jakarta Sans* (geométrica, limpa e editorial)
  - Corpo de texto: *DM Sans* (alta legibilidade e equilíbrio)
  - Metadados técnicos & Identificadores: *JetBrains Mono* (precisão de engenharia)
- **Arte Vetorial & Atmosfera**:
  - Escultura orbital geométrica em SVG com camadas de difusão atmosférica e efeito de névoa aplicado a elementos decorativos de fundo, preservando nitidez absoluta no texto.
  - Grade milimétrica pontilhada de precisão.
  - Ícones de traço vetorial inline SVG consistentes.

---

## 📂 Formação Acadêmica & Projetos

- **Universidade Federal do ABC (UFABC)**: Graduação em andamento (2º período), com foco em base quantitativa e métodos analíticos.
- **Lista Compacta de Projetos no GitHub (`arthurMPBBY`)**:
  1. **`gaming-fps-hud`** (C++17, Vulkan API, Qt 6 Quick, Wayland): medição de cadência e frametime em tempo real desacoplado na GPU.
  2. **`tuya-smart-lamps`** (Python 3.10+, TCP Sockets, PyQt6, SSE): automação local direta com fallback automático para Tuya Cloud API.
  3. **`python-curso`** (Python, Algoritmos, Cálculo Numérico): resolução de fórmulas matemáticas e estruturas de dados.
  4. **`spotifast-neon-theme`** (JSON, Design Tokens): estruturação de tema e customização visual.

---

## ♿ Acessibilidade & Usabilidade

- **Link de salto (`Skip Link`)**: Permite que usuários de teclado e leitores de tela naveguem diretamente para o conteúdo principal (`#main-content`).
- **Foco Visível**: Estilos destacados de `:focus-visible` em anel contrastante coral.
- **Suporte a Movimento Reduzido (`prefers-reduced-motion: reduce`)**: Pausa automaticamente as animações decorativas para usuários sensíveis a movimento.
- **Cópia de E-mail Acessível**: Botão com retorno dinâmico via região viva (`aria-live="polite"`), com debounce e limpeza de temporizadores para evitar inconsistências em cliques repetidos.
- **Layout Compacto e Responsivo**: Testado em resoluções de 320px até 1440px+, sem overflow horizontal.
