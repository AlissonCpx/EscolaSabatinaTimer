# Escola Sabatina Timer — Especificação Técnica

## Visão Geral

Aplicativo desktop Electron para controle visual de tempo da Escola Sabatina em igrejas Adventistas do Sétimo Dia. Exibe um relógio analógico com arcos coloridos representando cada etapa do programa, projetado em tela secundária via fullscreen frameless.

---

## Arquitetura

### Processo Principal (`main.js`)

Responsável por:
- Criar e gerenciar duas `BrowserWindow` (controle e display)
- Detectar monitores via `screen.getAllDisplays()`
- Manter `currentTimerState` — estado sincronizado do timer para que o display possa ser aberto após o início
- Encaminhar comandos IPC `timer-command` do controle para o display
- Atualizar `currentTimerState` em cada tipo de comando (`start`, `adjustEnd`, `updatePhases`, `pause`, `resume`, `reset`)

### Preload (`preload.js`)

Bridge segura via `contextBridge.exposeInMainWorld('electronAPI', {...})`:
- `getDisplays()` — lista monitores disponíveis
- `openDisplay(displayId)` / `closeDisplay()` — gerencia janela de projeção
- `sendTimerCommand(command)` — envia comando para display via IPC
- `onTimerCommand(callback)` — recebe comandos no display
- `getTimerState()` — obtém estado atual (para sincronização)
- `onDisplayClosed(callback)` — notifica controle quando display fecha

### Janela de Controle (`control.html`)

Painel do operador com:
- Seletor de monitor + botão abrir/fechar display
- Mini preview SVG do relógio com arcos e ponteiro
- Lista editável de etapas (nome, minutos, cor, ativar/desativar)
- Botões adicionar/remover/mover etapa
- Input de hora final do programa
- Botões iniciar, pausar, reset
- Botões de ajuste ±5min, ±1min
- Opções: mostrar cronômetro por etapa, tocar som ao concluir
- Botão "Restaurar padrão"
- Status text + feedback de validação

### Janela de Display (`display.html`)

Tela de projeção fullscreen com:
- Relógio analógico SVG (centro 200,200, raio 160)
- Arcos coloridos por etapa com filtros de glow dinâmicos
- Ponteiro animado via `requestAnimationFrame`
- Label da etapa atual
- Barra de progresso da etapa
- Cronômetro countdown da etapa (com fade suave em ajustes)
- Logo da Escola Sabatina no centro do relógio
- Cursor oculto (`cursor: none`)

---

## Sistema de Etapas

### Modelo de Dados

```javascript
phase = {
  name: string,      // Nome editável (ex: "Confraternização")
  minutes: number,   // Duração em minutos (mínimo 1)
  color: string,     // Cor hex (ex: "#F5C842")
  enabled: boolean   // Se a etapa está ativa
}
```

### Padrão

| Etapa | Minutos | Cor |
|-------|---------|-----|
| Confraternização | 10 | #F5C842 (dourado) |
| Estudo da Lição | 30 | #4A90D9 (azul) |
| Pastoreiro | 15 | #6BAE75 (verde) |

### Cálculo de Tempo

- Cada etapa ativa recebe uma **proporção** do tempo total: `phase.minutes / totalActiveMinutes`
- O arco SVG cobre `ratio * 360` graus
- `getPhaseInfo(elapsed, totalSeconds)` calcula qual etapa está ativa e o progresso dentro dela
- `getActivePhases()` retorna apenas etapas com `enabled: true`

### Redistribuição

Quando o tempo total muda (ajuste de hora final, botões +/-):
- `redistributeMinutes(newTotalMin)` redistribui os minutos proporcionalmente entre as etapas restantes
- **Etapas concluídas ficam travadas** — `getCompletedMinutes()` soma as já finalizadas
- `getRemainingPhases()` retorna apenas as etapas a partir da atual
- Validação: mínimo 1 minuto por etapa restante

---

## Transição Suave

Quando o operador ajusta o tempo, o display interpola suavemente em vez de saltar:

### Variáveis

```javascript
let targetEndTimestamp = null;  // Alvo real (o que o operador definiu)
let transitionStart = null;     // Timestamp de início da transição
let transitionFrom = null;      // endTimestamp no momento do ajuste
const TRANSITION_DURATION = 10000; // 10 segundos
```

### Lógica

1. Operador ajusta → `targetEndTimestamp` é atualizado imediatamente
2. `applyTransition()` chamada a cada frame:
   - Se `targetEndTimestamp === null`, usa `endTimestamp` diretamente
   - Senão, calcula progresso com easing `easeInOutCubic` sobre 10s
   - Interpola `endTimestamp` entre `transitionFrom` e `targetEndTimestamp`
3. O **controle** mostra o tempo alvo imediatamente (operador vê o real)
4. O **display** interpola suavemente (projetor vê transição)

### Easing

```javascript
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
```

---

## Cronômetro por Etapa (Phase Timer)

Exibe countdown da etapa atual na tela de projeção:

- Usa `targetEndTimestamp` (tempo real) para cálculo, não o interpolado
- Fade suave ao ajustar tempo: `smoothFadeUpdate()` adiciona classe `.fading` (opacity 0), espera 350ms, atualiza valor, remove `.fading` (opacity volta com CSS transition 0.3s)
- Font size responsivo: `clamp(2rem, 4.5vw, 3.5rem)`
- Cor da etapa com opacity `0.55` (base) / `0.99` (fase ativa)

---

## Validação

### Hora Final

- Se horário já passou → "Horário já passou!" no status + reverte input
- Se tempo insuficiente para etapas restantes → feedback + reverte
- Ao corrigir com sucesso → status volta para "Em andamento"

### Minutos por Etapa

- Mínimo 1 minuto por etapa ativa
- Input `min="1"`, validação `val >= 1`

### Ajuste ±5min/±1min

- Calcula tempo total após ajuste
- Verifica se há minutos suficientes para etapas restantes
- Se não, mostra feedback e bloqueia

---

## Persistência (localStorage)

| Chave | Conteúdo | Default |
|-------|----------|---------|
| `sabatina-phases` | Array de phases (JSON) | 3 etapas padrão |
| `sabatina-end-time` | String "HH:MM" | "10:00" |
| `sabatina-options` | `{ showPhaseTimer, playSoundOnEnd }` | `{ true, false }` |

---

## Som ao Concluir

Usa Web Audio API para tocar acorde C-E-G (dó-mi-sol):

```javascript
// 3 notas: C5 (523Hz), E5 (659Hz), G5 (784Hz)
// Sine wave, 0.6s cada, com fade-out
```

Ativado pela opção `playSoundOnEnd` (desativado por padrão).

---

## SVG do Relógio

### Estrutura

- ViewBox: `0 0 400 400`
- Centro: `(200, 200)`, Raio: `160`
- 12 marcas de hora (line elements)
- Ponteiro: `line` de (200,200) a (200,55), rotacionado via `transform`
- Arcos: `<path>` com `d` calculado via `describeArc()`
- Filtros de glow: criados dinamicamente via `ensureGlowFilter(color)`

### Cálculo de Arcos

```javascript
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  // Retorna path SVG com arco large-arc-flag baseado no ângulo
}
```

---

## Comunicação IPC

### Comandos (timer-command)

| Tipo | Payload | Descrição |
|------|---------|-----------|
| `start` | `{ startTimestamp, endTimestamp, phases }` | Inicia sessão |
| `adjustEnd` | `{ newEndTimestamp }` | Ajusta hora final |
| `updatePhases` | `{ phases }` | Atualiza configuração de etapas |
| `pause` | `{ pausedAt }` | Pausa timer |
| `resume` | — | Retoma timer (main recalcula startTimestamp) |
| `reset` | — | Reseta sessão |
| `setOptions` | `{ showPhaseTimer, playSoundOnEnd }` | Envia opções para display |

### Sincronização

Quando o display é aberto após o timer já estar rodando:
1. Main process envia `currentTimerState` (último estado `start` conhecido)
2. Display recebe e configura `startTimestamp`, `endTimestamp`, `phases`
3. Display calcula tempo decorrido e posição atual

---

## Build

### Configuração (package.json)

```json
{
  "build": {
    "appId": "com.escolasabatina.timer",
    "productName": "Escola Sabatina Timer",
    "win": {
      "target": [{ "target": "portable", "arch": ["x64"] }],
      "icon": "icon.png",
      "signAndEditExecutable": false
    },
    "portable": { "artifactName": "EscolaSabatinaTimer.exe" }
  }
}
```

### Comandos

| Comando | Descrição |
|---------|-----------|
| `npm start` | Executa em modo desenvolvimento |
| `npm run build` | Gera .exe portable (Windows) |
| `npm run build:nsis` | Gera instalador NSIS |

### Notas

- `signAndEditExecutable: false` — necessário porque Windows Defender bloqueia winCodeSign
- Ícone do .exe pode ser embutido manualmente com Resource Hacker
- Output: `app/dist/EscolaSabatinaTimer.exe` (~78MB)

---

## Janelas

### Controle

- Tamanho: 600x950
- Posição: monitor primário + offset (50, 10)
- Resizable, minimizable, maximizable
- `autoHideMenuBar: true`
- Background: `#111827`

### Display

- Tamanho: fullscreen do monitor alvo
- Frameless, non-resizable, non-movable
- `alwaysOnTop: true`
- Background: `#0a0e1a` / `#080c14`
- Cursor oculto

---

*Documento técnico gerado por Alisson Andrade com assistência do [Devin](https://cli.devin.ai).*
