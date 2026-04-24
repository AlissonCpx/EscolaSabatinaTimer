# Plano de Implementação: App Relógio Escola Sabatina

## Visão Geral

App para exibição no telão da igreja durante a Escola Sabatina. Funciona como um **relógio analógico visual** que mostra o progresso das três fases do encontro, calculando automaticamente o andamento para terminar pontualmente às 10h, independente do horário de início.

---

## Requisitos Funcionais

### Comportamento Principal
- O app deve calcular automaticamente quanto tempo resta para as 10h00 no momento em que é iniciado
- Dividir o tempo restante proporcionalmente entre as 3 fases (mantendo as proporções originais: 10m / 30m / 15m = total 55m)
- Exibir um **relógio analógico visual sem números/texto de tempo** — apenas o ponteiro e os arcos de fase
- A tela deve ser legível de longe (projetada no telão)

### As 3 Fases
| Fase | Nome | Proporção |
|------|------|-----------|
| 1 | Confraternização | 10/55 ≈ 18.2% |
| 2 | Estudo da Lição | 30/55 ≈ 54.5% |
| 3 | Pastoreiro | 15/55 ≈ 27.3% |

### Configuração em Tempo Real (Painel do Operador)
- Botão para **iniciar** o timer
- Botão para **adiantar** o horário de término (ex: -5min, -10min, -15min)
- Botão para **atrasar** o horário de término (caso necessário)
- Campo para definir manualmente o **horário de término** (padrão: 10:00)
- Os arcos e o ponteiro devem se recalcular imediatamente ao alterar o tempo

---

## Requisitos Visuais

### Estética Geral
- **Tema**: Sóbrio, eclesiástico, legível de longe
- **Fundo**: Escuro (preto ou azul muito escuro) para contraste no telão
- **Tipografia**: Mínima — apenas nome da fase atual em letras grandes e elegantes
- **Cores das Fases** (arcos distintos no relógio):
  - Confraternização: dourado/âmbar (`#F5C842`)
  - Estudo da Lição: azul suave (`#4A90D9`)
  - Pastoreiro: verde sage (`#6BAE75`)

### O Relógio Visual
- Círculo grande centralizado na tela
- **Sem marcadores de hora, sem números**
- **3 arcos coloridos** no fundo representando cada fase (como fatias de torta ao redor do círculo)
- **Ponteiro único** que gira de 0° a 360° ao longo de todo o tempo da sessão
- O ponteiro indica visualmente em que momento da sessão estão
- Quando o ponteiro entra em uma nova fase, aquela fase **acende/destaca** visualmente
- **Indicador da fase atual** (nome em texto grande abaixo do relógio)

### Elementos Adicionais na Tela
- Nome da fase atual em destaque (grande, centralizado abaixo do relógio)
- Barra de progresso da fase atual (discreta, abaixo do nome)
- **Sem mostrar o horário real** — apenas o progresso visual

---

## Arquitetura Técnica

### Stack Recomendada
- **HTML + CSS + JavaScript puro** (sem frameworks) — mais simples para rodar em qualquer dispositivo/navegador na igreja
- **Dois arquivos `.html`** — um para controle, um para apresentação — comunicando via `BroadcastChannel API` (nativa do navegador, funciona offline entre abas/janelas da mesma origem)

### Arquitetura Multi-Tela

```
┌─────────────────────┐        BroadcastChannel        ┌─────────────────────┐
│   control.html      │  ──── 'sabatina-channel' ────▶  │  display.html       │
│  (tela do operador) │                                  │  (telão / projetor) │
│                     │  mensagens JSON:                 │                     │
│  - Botão Iniciar    │  { type: 'start',                │  - Relógio SVG      │
│  - Ajuste de tempo  │    startTimestamp,               │  - Sem controles    │
│  - Input horário    │    endTimestamp }                │  - Fullscreen       │
│  - Preview do       │  { type: 'adjustEnd',            │  - Legível de longe │
│    relógio (mini)   │    newEndTimestamp }             │                     │
│                     │  { type: 'pause' }               │                     │
│                     │  { type: 'resume' }              │                     │
└─────────────────────┘                                  └─────────────────────┘
```

**Como usar na igreja:**
1. Abrir `control.html` no monitor do operador (mesa de som, por exemplo)
2. Abrir `display.html` no computador/notebook conectado ao projetor → pressionar F11
3. As duas janelas se comunicam automaticamente via BroadcastChannel (mesmo navegador, mesma máquina) ou via localStorage (caso estejam em máquinas diferentes na mesma rede — ver variação abaixo)

> **Nota:** BroadcastChannel funciona entre abas/janelas do **mesmo navegador na mesma máquina**. Se o controle e o display estiverem em computadores diferentes, usar a variação com `localStorage` + `storage events` via um arquivo compartilhado, ou um mini servidor local (ver seção "Deploy Avançado").

### Estrutura dos Arquivos

```
/escola-sabatina/
├── control.html     ← Tela do operador
└── display.html     ← Tela do telão (fullscreen)
```

#### control.html
```
<head> — fontes, CSS embutido
<body>
├── #preview — mini relógio (versão reduzida do display)
├── #config-panel — painel principal de controle
│   ├── #end-time-input — campo horário de término (padrão 10:00)
│   ├── #btn-start — Iniciar
│   ├── #btn-pause — Pausar/Retomar
│   ├── #adjust-buttons
│   │   ├── Botão -15min
│   │   ├── Botão -10min
│   │   ├── Botão -5min
│   │   ├── Botão +5min
│   │   └── Botão +10min
│   └── #status — feedback visual do estado atual
└── <script> — lógica de controle + BroadcastChannel sender
```

#### display.html
```
<head> — fontes, CSS fullscreen imersivo
<body>
├── #clock-container — relógio SVG principal (grande)
│   ├── SVG arcos das fases
│   └── Ponteiro animado
├── #phase-label — nome da fase atual (letras grandes)
└── <script> — BroadcastChannel receiver + lógica de animação
```

### Lógica JavaScript

#### Cálculo do Timer
```javascript
// Ao iniciar:
const now = new Date();
const endTime = new Date(); 
endTime.setHours(10, 0, 0, 0); // 10:00:00
// Se já passou das 10h, o app deve avisar

const totalSeconds = (endTime - now) / 1000;

// Proporções fixas
const ratios = [10/55, 30/55, 15/55];

// Tempo em segundos por fase (calculado dinamicamente)
const phaseDurations = ratios.map(r => r * totalSeconds);
```

#### Ângulo do Ponteiro
```javascript
// O ponteiro vai de 0° (topo) até 360° ao longo de totalSeconds
// A cada tick (1 segundo):
const elapsed = (Date.now() - startTimestamp) / 1000;
const angle = (elapsed / totalSeconds) * 360;
// Converter para coordenadas SVG e atualizar transform do ponteiro
```

#### Arcos SVG das Fases
- Usar `<path>` com `arc` commands do SVG
- Cada arco ocupa o ângulo proporcional ao seu tempo
- Recalcular quando o usuário altera o horário de término

#### Atualização em Tempo Real
```javascript
function adjustEndTime(deltaMinutes) {
  endTime.setMinutes(endTime.getMinutes() + deltaMinutes);
  recalculate(); // recalcula tudo e redesenha os arcos
}
```

#### Comunicação BroadcastChannel

**Em control.html (sender):**
```javascript
const channel = new BroadcastChannel('sabatina-channel');

function startSession() {
  const now = Date.now();
  const end = getEndTimestamp(); // baseado no input de horário
  channel.postMessage({ type: 'start', startTimestamp: now, endTimestamp: end });
}

function adjustEndTime(deltaMinutes) {
  endTimestamp += deltaMinutes * 60 * 1000;
  channel.postMessage({ type: 'adjustEnd', newEndTimestamp: endTimestamp });
}

function pause() {
  channel.postMessage({ type: 'pause', pausedAt: Date.now() });
}
```

**Em display.html (receiver):**
```javascript
const channel = new BroadcastChannel('sabatina-channel');

channel.onmessage = (event) => {
  const { type } = event.data;
  if (type === 'start') {
    startTimestamp = event.data.startTimestamp;
    endTimestamp = event.data.endTimestamp;
    startAnimation();
  } else if (type === 'adjustEnd') {
    endTimestamp = event.data.newEndTimestamp;
    recalculateArcs(); // redesenha os arcos no SVG
  } else if (type === 'pause') {
    pauseAnimation();
  } else if (type === 'resume') {
    resumeAnimation();
  }
};
```

> **Resiliência:** o display.html deve também salvar o estado no `localStorage` a cada segundo. Assim, se a aba do display for recarregada acidentalmente, ela recupera o estado sem precisar reiniciar o controle.

---

## Estados da Interface

| Estado | Descrição |
|--------|-----------|
| **Aguardando** | Tela inicial, mostra o relógio estático, botão "Iniciar" visível |
| **Rodando** | Ponteiro em movimento, painel de controle discreto (canto inferior) |
| **Fase 1 ativa** | Arco dourado destacado, label "Confraternização" |
| **Fase 2 ativa** | Arco azul destacado, label "Estudo da Lição" |
| **Fase 3 ativa** | Arco verde destacado, label "Pastoreiro" |
| **Encerrado** | Ponteiro chegou ao fim, animação sutil de conclusão |

---

## Animações

- **Ponteiro**: rotação suave via `requestAnimationFrame` — sem pulos, movimento contínuo
- **Transição de fase**: fade suave no label e brilho no arco correspondente (CSS transition)
- **Ajuste de tempo**: quando o usuário adianta, os arcos se redimensionam com transição CSS de 0.5s
- **Conclusão**: pulso suave no círculo quando o tempo acabar

---

## Painel de Controle (control.html)

Interface clara e funcional para o operador:
- **Preview mini** do relógio no topo (versão menor, idêntica ao display)
- Status em tempo real: fase atual, tempo restante estimado
- Botões grandes e bem espaçados (fácil de usar no calor do momento)
- Feedback visual quando a mensagem é enviada ao display ("✓ Display atualizado")
- Atalhos de teclado:
  - `Space` — Iniciar/Pausar
  - `←` — adiantar 5 minutos
  - `→` — atrasar 5 minutos

---

## Considerações de Deploy

### Opção 1 — Uma máquina, dois monitores (recomendado)
1. Salvar os dois arquivos na mesma pasta
2. Abrir `control.html` no monitor do operador
3. Abrir `display.html`, arrastar para o monitor do projetor → F11 (fullscreen)
4. BroadcastChannel funciona nativamente entre as duas janelas

### Opção 2 — Duas máquinas na mesma rede
Neste caso o BroadcastChannel não funciona entre máquinas diferentes. Alternativas:
- **Mini servidor local**: rodar `python3 -m http.server 8080` na máquina do controle, acessar via IP local no display (ex: `http://192.168.1.10:8080/display.html`). Usar `localStorage` + polling ou WebSocket simples para comunicação.
- **Recomendação**: sempre que possível, usar uma máquina só com dois monitores para simplicidade máxima.

### Checklist de Deploy
- Arquivos na mesma pasta
- Mesmo navegador (Chrome ou Edge recomendado)
- Testar comunicação antes do culto (abrir os dois, clicar Iniciar, verificar se display reage)
- display.html em fullscreen (F11) antes de começar
- Verificar legibilidade do display a ~5 metros de distância

---

## Checklist de Implementação

**display.html**
- [ ] Estrutura HTML fullscreen sem controles visíveis
- [ ] CSS: tema escuro imersivo, fontes grandes, layout centralizado
- [ ] SVG: desenhar os 3 arcos coloridos proporcionais
- [ ] SVG: desenhar o ponteiro animado
- [ ] JS: BroadcastChannel receiver — ouvir eventos de controle
- [ ] JS: loop com requestAnimationFrame para mover o ponteiro
- [ ] JS: recalculate() — redesenha arcos ao receber adjustEnd
- [ ] JS: detectar transição de fase e atualizar label/destaque
- [ ] JS: salvar estado no localStorage a cada segundo (resiliência)
- [ ] JS: ao carregar, tentar recuperar estado do localStorage
- [ ] CSS: animações de transição de fase

**control.html**
- [ ] Layout com preview mini do relógio + painel de controle
- [ ] Input de horário de término com valor padrão 10:00
- [ ] Botão Iniciar e Pausar/Retomar
- [ ] Botões de ajuste: -15, -10, -5, +5, +10 minutos
- [ ] JS: BroadcastChannel sender — enviar eventos ao display
- [ ] JS: mesma lógica de cálculo de tempo do display (para preview)
- [ ] Feedback visual de confirmação ao enviar comandos
- [ ] Atalhos de teclado (Space, ←, →)
- [ ] Status da sessão em tempo real (fase atual, tempo restante)

---

## Prompt Sugerido para o GLM

> Implemente um app de dois arquivos HTML (`control.html` e `display.html`) chamado "Escola Sabatina Timer", seguindo exatamente este plano. Não use frameworks externos — apenas HTML + CSS + JavaScript puro e Google Fonts via CDN.
>
> **display.html**: tela fullscreen para projeção no telão. Relógio SVG analógico grande com 3 arcos coloridos (dourado, azul, verde) e ponteiro animado. Sem controles. Recebe comandos via `BroadcastChannel('sabatina-channel')`. Salva estado no localStorage para resiliência.
>
> **control.html**: painel do operador com preview mini do relógio, input de horário de término (padrão 10:00), botões Iniciar/Pausar e ajuste de -15/-10/-5/+5/+10 minutos. Envia comandos via `BroadcastChannel('sabatina-channel')`. Interface clara, botões grandes, feedback visual de confirmação.
>
> A lógica de tempo: ao iniciar, calcula o total de segundos até o horário configurado e distribui proporcionalmente entre as 3 fases (10/55, 30/55, 15/55). O ponteiro gira de 0° a 360° cobrindo todo o período. Ao ajustar o tempo, os arcos SVG se redesenham em tempo real.

