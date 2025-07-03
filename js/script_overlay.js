const queueListEl = document.getElementById("filaLista");
const activeListEl = document.getElementById("listaAtiva");
const completedListEl = document.getElementById("listaCompleta");
const memoryEl = document.getElementById("memoria");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");


// paleta de cores para as subrotinas
const subColors = [
    "#8DF82B", "#2BF4F8", "#FFD700", "#FF6347", "#9370DB",
    "#FF4500", "#ADFF2F", "#DA70D6", "#40E0D0", "#FFDAB9",
    "#CD853F", "#6A5ACD", "#7FFFD4", "#F0E68C", "#8B0000"
];

// estado das subrotinas
let filaSubrotinas = []; // fila de espera
let duracao = {}; // duração das rotinas
let subrotinasAtiva = {};
let subrotinasCompleta = [];
let idIntervaloLista; // para atualização das listas
let rodando = false; // controla se a simulação está rodando
let totalSubrotinas = 0; // contador para o total de subrotinas geradas
let contadorSubrotinasFim = 0; // contador para subrotinas concluídas

// variaveis para o timer da rotina principal
let idRotinaPrincipalTempo; // id do intervalo para o timer da rotina principal

let rotinaPrincipalTempoSobra;
const DURACAO_ROTINA_PRINCIPAL = 15; // em segundos
const SUBROTINAS_MAX = 4; // numero maximo ativas simultaneamente

// novo ID de intervalo para geração de subrotinas
let idGeracaoIntervaloSubrotina;

// controla se o timer da rotina principal esta pausado
let rotinaPrincipalPausada = false;

// mostra algumas mensagens ao usuario ao topo da tela
function mostrarMensagem(message, duration = 3000) {
    let messageBox = document.querySelector('.message-box');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.className = 'message-box';
        document.body.appendChild(messageBox);
    }
    messageBox.textContent = message;
    messageBox.classList.add('show');
    setTimeout(() => {
        messageBox.classList.remove('show');
    }, duration);
}

// reseta o estado das subrotinas e limpa a memória
function resetEstado() {
    filaSubrotinas = [];
    duracao = {};
    subrotinasAtiva = {};
    subrotinasCompleta = [];
    totalSubrotinas = 0;
    contadorSubrotinasFim = 0;
    clearInterval(idIntervaloLista);
    clearInterval(idRotinaPrincipalTempo); // limpa o timer da rotina principal
    clearInterval(idGeracaoIntervaloSubrotina); // limpa o timer de geração de subrotinas
    rodando = false;
    idRotinaPrincipalTempo = null;
    rotinaPrincipalPausada = false;
    memoryEl.innerHTML = ""; // limpa a memória visual
    atualizarListas();
}

function configuraSubrotinas() {
    duracao = {};
    totalSubrotinas = 0;
}

function atualizarListas() {
    // fila (max 10 itens visiveis)
    queueListEl.innerHTML = "";
    filaSubrotinas.slice(0, 10).forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        queueListEl.appendChild(li);
    });

    // ativas
    activeListEl.innerHTML = "";
    Object.values(subrotinasAtiva).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `${item.name} (${item.timeRemaining.toFixed(1)}s)`; // tempo restante
        li.style.color = "var(--text-main)";
        activeListEl.appendChild(li);
    });

    // concluidas
    completedListEl.innerHTML = "";
    subrotinasCompleta.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        li.style.color = "var(--sub-color-3)";
        completedListEl.appendChild(li);
    });
}

// gera e adiciona uma nova subrotina na fila
function gerarSubrotina() {
    if (rodando && rotinaPrincipalTempoSobra > 0 && filaSubrotinas.length < 10) {
        let numero = 0;
        const rand = Math.random();

        if (rand < 0.15) { // 15% de chance para 3 rotinas
            numero = 3;
        } else if (rand < 0.15 + 0.35) { // 35% de chance para 2 rotinas (total 50%)
            numero = 2;
        } else { // 50% de chance para 1 rotina
            numero = 1;
        }

        let generatedAny = false;
        for (let i = 0; i < numero; i++) {
            if (filaSubrotinas.length < 10) {
                totalSubrotinas++;
                const newSubroutineName = `Subrotina ${totalSubrotinas}`;
                duracao[newSubroutineName] = parseFloat((Math.random() * 4 + 1).toFixed(1)); // tempo aleatório entre 1 e 5 segundos
                filaSubrotinas.push(newSubroutineName);
                mostrarMensagem(`Nova ${newSubroutineName} gerada e adicionada à fila.`);
                generatedAny = true;
            } else {
                mostrarMensagem("Fila de subrotinas cheia, não foi possível gerar mais.");
                break;
            }
        }

        // pausa o timer da principal se novas subrotinas foram geradas
        if (generatedAny && idRotinaPrincipalTempo && !rotinaPrincipalPausada) {
            clearInterval(idRotinaPrincipalTempo);
            idRotinaPrincipalTempo = null;
            rotinaPrincipalPausada = true;
            mostrarMensagem("Rotina Principal pausada para processar novas subrotinas.");
        }
    }
}

// processar a fila de subrotinas e ativar as que puderem
function processaFila() {
    for (let i = 0; i < SUBROTINAS_MAX; i++) {
        if (!subrotinasAtiva[i] && filaSubrotinas.length > 0) {
            const nextSubroutine = filaSubrotinas.shift();
            executarSubrotina(nextSubroutine, i);
        }
    }
}

function timerRotinaPrincipal() {
    if (idRotinaPrincipalTempo) { // limpa para evitar múltiplos timers
        clearInterval(idRotinaPrincipalTempo);
    }
    idRotinaPrincipalTempo = setInterval(() => {
        rotinaPrincipalTempoSobra -= 0.1;

        // atualiza o display do timer da rotina principal
        const mainTimerEl = memoryEl.querySelector('.main .timer');
        if (mainTimerEl) {
            mainTimerEl.textContent = `${rotinaPrincipalTempoSobra.toFixed(1)}s`;
        }

        // atualiza a altura do preenchimento de progresso da rotina principal
        const mainProgressFillEl = memoryEl.querySelector('.main .progress-fill');
        if (mainProgressFillEl) {
            const progressPercentage = ((DURACAO_ROTINA_PRINCIPAL - rotinaPrincipalTempoSobra) / DURACAO_ROTINA_PRINCIPAL) * 100;
            mainProgressFillEl.style.height = `${progressPercentage}%`;
            mainProgressFillEl.style.backgroundColor = '#dc2626';
        }

        if (rotinaPrincipalTempoSobra <= 0) {
            clearInterval(idRotinaPrincipalTempo);
            idRotinaPrincipalTempo = null;

            const progressFill = memoryEl.querySelector('.main .progress-fill');
            if (progressFill) {
                progressFill.style.height = '100%';
            }
            mostrarMensagem("Tempo da Rotina Principal esgotado! Simulação parada.", 5000);
            parar();
        }
    }, 100);
}


function iniciar() {
    if (rodando) {
        mostrarMensagem("A simulação já está em andamento.");
        return;
    }

    resetEstado();
    configuraSubrotinas();
    criarRotinaPrincipal();
    timerRotinaPrincipal();

    // gerar 5 subrotinas iniciais
    for (let i = 0; i < 5; i++) {
        gerarSubrotina();
    }

    // gera uma nova rotina a cada 5 segundos
    idGeracaoIntervaloSubrotina = setInterval(gerarSubrotina, 5000);

    idIntervaloLista = setInterval(() => {
        atualizarListas();
        processaFila();
    }, 500); // atualiza as listas e processa a fila a cada 0.5 segundos

    rodando = true;
    mostrarMensagem("Simulação iniciada!");
}

function parar() {
    if (!rodando) {
        mostrarMensagem("A simulação não está em andamento.");
        return;
    }

    Object.values(subrotinasAtiva).forEach((item) =>
        clearInterval(item.timerId)
    );
    clearInterval(idRotinaPrincipalTempo);
    clearInterval(idGeracaoIntervaloSubrotina);

    rodando = false;
    mostrarMensagem("Simulação pausada. O estado atual foi mantido.");
    atualizarListas();
}

// cria e adiciona rotina principal
function criarRotinaPrincipal() {
    rotinaPrincipalTempoSobra = DURACAO_ROTINA_PRINCIPAL; // inicializa o tempo

    const rotinaPrincipal = document.createElement("div");
    rotinaPrincipal.className = "main fade-in";
    rotinaPrincipal.innerHTML = `
        <div class="title">Rotina Principal</div>
        <div class="timer">${rotinaPrincipalTempoSobra.toFixed(1)}s</div>
        <div class="progress-fill"></div>
    `;
    memoryEl.appendChild(rotinaPrincipal);
}

function executarSubrotina(name, index) {
    // cor aleatória para o preenchimento
    const color = subColors[Math.floor(Math.random() * subColors.length)];

    const subDiv = document.createElement("div");
    subDiv.className = "sub fade-in"; // Mudança aqui

    // preenchimento de progresso
    const progressFillEl = document.createElement("div");
    progressFillEl.className = "progress-fill";
    progressFillEl.style.backgroundColor = color;
    subDiv.appendChild(progressFillEl);

    // titulo
    const title = document.createElement("div");
    title.textContent = name;
    title.style.position = 'relative';
    title.style.zIndex = '1';
    subDiv.appendChild(title);

    // contador
    const timerEl = document.createElement("div");
    let timeRemaining = duracao[name];
    timerEl.textContent = `${timeRemaining.toFixed(1)}s`;
    timerEl.style.position = 'relative';
    timerEl.style.zIndex = '1';
    subDiv.appendChild(timerEl);

    memoryEl.appendChild(subDiv);

    const timerId = setInterval(() => {
        timeRemaining -= 0.1; // -0.1s
        if (timeRemaining > 0) {
            timerEl.textContent = `${timeRemaining.toFixed(1)}s`; // atualiza o contador
            // atualiza o tempo restante no objeto subrotinasAtiva
            if (subrotinasAtiva[index]) {
                subrotinasAtiva[index].timeRemaining = timeRemaining;
            }
            // atualiza a altura do preenchimento de progresso
            const progressPercentage = ((duracao[name] - timeRemaining) / duracao[name]) * 100;
            progressFillEl.style.height = `${progressPercentage}%`;
        } else {
            clearInterval(timerId);
            finalizarSubrotina(name, index, subDiv);
            progressFillEl.style.height = '100%'; // garante que fique totalmente preenchido ao final
        }
    }, 100); // 0.1s

    // armazena a subrotina ativa, incluindo o tempo restante e o timerId
    subrotinasAtiva[index] = { name, el: subDiv, timerId, timeRemaining: timeRemaining };
}

function finalizarSubrotina(name, index, el) {
    el.remove(); // remove o elemento visual da subrotina da memória
    delete subrotinasAtiva[index]; // remove a subrotina da lista de ativas
    subrotinasCompleta.push(name); // adiciona em concluidas
    contadorSubrotinasFim++; // incrementa o contador de subrotinas concluidas
    mostrarMensagem(`Subrotina "${name}" concluída.`);

    processaFila(); // preenche o slot que acabou de ser liberado

    // retoma o timer da principal se ele estava pausado e nao ha outra subrotinas ativas ou na fila
    if (rotinaPrincipalPausada && Object.keys(subrotinasAtiva).length === 0 && filaSubrotinas.length === 0) {
        rotinaPrincipalPausada = false;
        timerRotinaPrincipal();
        mostrarMensagem("Rotina Principal retomada.");
    }

    if (rotinaPrincipalTempoSobra <= 0) {
        mostrarMensagem("Tempo da Rotina Principal esgotado! Simulação parada.", 5000);
        parar();
    }
}

startBtn.addEventListener("click", iniciar);
stopBtn.addEventListener("click", parar);
document.getElementById("home").onclick = function () {
    location.href = "gdupim.github.io/index.html";
};