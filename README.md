# Simulador de Memória Virtual

Um simulador educacional que demonstra dois conceitos fundamentais de gerenciamento de memória em sistemas operacionais: **Overlay** e **Paginação**.

## Descrição

Este projeto implementa simulações visuais e interativas para ajudar no entendimento de como funcionam as técnicas de gerenciamento de memória virtual em sistemas operacionais.

## Funcionalidades

### Simulador de Overlay
- Visualização em tempo real da execução de rotinas e subrotinas
- Sistema de fila de espera para subrotinas
- Timer da rotina principal com pausa automática
- Animações nas novas rotinas
- Controle de máximo 4 subrotinas ativas simultaneamente

### Simulador de Paginação
- Implementação do algoritmo FIFO ("First In, First Out", "Primeiro a Entrar, Primeiro a Sair")
- Visualização de frames físicos da memória
- Tabelas de páginas por processo
- Log detalhado de eventos (hits, page faults, substituições)
- 6 frames físicos simulando memória real

## Conceitos Demonstrados

- **Overlay**: Técnica onde partes do programa são carregadas dinamicamente na memória conforme necessário
- **Paginação**: Divisão da memória em páginas fixas com algoritmo de substituição FIFO
- **Gerenciamento de Memória Virtual**: Como sistemas operacionais otimizam o uso da memória RAM
