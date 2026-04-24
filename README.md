# Escola Sabatina Timer

Timer visual para Escola Sabatina com relógio analógico e arcos coloridos representando as etapas do programa. Projetado para uso em igrejas com tela de projeção.

![Electron](https://img.shields.io/badge/Electron-36-47848F?logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Funcionalidades

- **Relógio analógico SVG** com ponteiro animado e arcos coloridos por etapa
- **Tela de projeção** (fullscreen, frameless, always-on-top) em monitor secundário
- **Painel de controle** no monitor principal para o operador
- **Etapas configuráveis** — adicionar, remover, reordenar e editar nome/duração
- **Transição suave** — ajustes de tempo interpolam o ponteiro suavemente (10s com easing)
- **Cronômetro por etapa** — countdown da etapa atual na tela de projeção
- **Fade suave** no cronômetro ao ajustar tempo durante execução
- **Validação inteligente** — etapas concluídas ficam travadas, redistribuição só nas restantes
- **Persistência** — configurações de etapas, hora final e opções salvas no localStorage
- **Som ao concluir** — acorde C-E-G via Web Audio API (opcional)
- **Atalhos de teclado** — Espaço (iniciar/pausar), ←/→ (±5 min)
- **Seleção de monitor** — escolha onde projetar a tela de exibição
- **Preview em miniatura** no painel de controle

## Capturas de Tela

> _Adicione capturas de tela aqui_

## Instalação e Uso

### Executável (Windows)

Baixe o `EscolaSabatinaTimer.exe` da [página de releases](../../releases) e execute diretamente — não requer instalação.

### Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/SEU-USUARIO/escola-sabatina-timer.git
cd escola-sabatina-timer/app

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm start

# Gere o executável portable
npm run build
```

O executável será gerado em `app/dist/EscolaSabatinaTimer.exe`.

## Como Usar

1. **Abrir o programa** — o painel de controle aparece no monitor principal
2. **Selecionar monitor** — escolha o projetor na lista de monitores e clique "Abrir Display"
3. **Configurar etapas** — ajuste nomes, durações e cores das etapas conforme necessário
4. **Definir hora final** — insira o horário de término (ex: 10:00)
5. **Iniciar** — clique "Iniciar" ou pressione Espaço
6. **Ajustar durante execução** — use os botões ±5min/±1min ou altere a hora final diretamente
7. **Pausar/Retomar** — clique "Pausar" ou pressione Espaço

### Etapas Padrão

| Etapa | Duração | Cor |
|-------|---------|-----|
| Confraternização | 10 min | Dourado |
| Estudo da Lição | 30 min | Azul |
| Pastoreiro | 15 min | Verde |

### Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `Espaço` | Iniciar / Pausar |
| `←` | -5 minutos |
| `→` | +5 minutos |

## Estrutura do Projeto

```
app/
├── main.js          # Processo principal (Electron) — janelas, IPC, estado do timer
├── preload.js       # Bridge segura entre main e renderer (contextBridge)
├── control.html     # Painel de controle do operador
├── display.html     # Tela de projeção (relógio SVG, arcos, countdown)
├── logo.png         # Ícone da janela
├── icon.png         # Ícone do aplicativo (256x256)
├── icon.ico         # Ícone Windows (.ico)
├── package.json     # Configuração do Electron Builder
└── dist/            # Output do build (EscolaSabatinaTimer.exe)
```

## Tecnologias

- **Electron** 36 — framework desktop multi-plataforma
- **SVG** — relógio analógico com arcos e filtros dinâmicos
- **Web Audio API** — som de conclusão (sine wave)
- **localStorage** — persistência de configurações
- **IPC** (ipcMain/ipcRenderer) — comunicação entre janelas

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

Desenvolvido por **Alisson Andrade** com assistência do [Devin](https://cli.devin.ai).
