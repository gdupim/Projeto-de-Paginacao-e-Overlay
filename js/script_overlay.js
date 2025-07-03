const queueListEl = document.getElementById("filaLista");
const activeListEl = document.getElementById("listaAtiva");
const completedListEl = document.getElementById("listaCompleta");
const memoryEl = document.getElementById("memoria");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

//? Paleta de cores para as subrotinas
const subColors = [
    "#8DF82B", "#2BF4F8", "#FFD700", "#FF6347", "#9370DB",
    "#FF4500", "#ADFF2F", "#DA70D6", "#40E0D0", "#FFDAB9",
    "#CD853F", "#6A5ACD", "#7FFFD4", "#F0E68C", "#8B0000"
];

//? Variáveis das subrotinas
let filaSubrotinas = [];
let duracao = {};
let subrotinasAtiva = {};
let subrotinasCompleta = [];
let totalSubrotinas = 0;
let rodando = false;

//? Variáveis para controle de estado anterior
let estadoAnteriorFila = [];
let estadoAnteriorAtivas = {};
let estadoAnteriorCompletas = [];

//? Variáveis para timers
let idIntervaloLista;
let idRotinaPrincipalTempo;
let idGeracaoIntervaloSubrotina;

//? Constantes
let rotinaPrincipalTempoSobra;
const DURACAO_ROTINA_PRINCIPAL = 30;
const SUBROTINAS_MAX = 4;

//? Controles
let rotinaPrincipalPausada = false;

function mostrarMensagem(message, duration = 5000) {
    let messageBox = document.querySelector('.message-box');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.className = 'message-box';
        document.body.appendChild(messageBox);
    }
    messageBox.textContent = message;
    messageBox.classList.add('show');
    setTimeout(() => messageBox.classList.remove('show'), duration);
}

function resetEstado() {
    filaSubrotinas = [];
    duracao = {};
    subrotinasAtiva = {};
    subrotinasCompleta = [];
    totalSubrotinas = 0;
    estadoAnteriorFila = [];
    estadoAnteriorAtivas = {};
    estadoAnteriorCompletas = [];

    [idIntervaloLista, idRotinaPrincipalTempo, idGeracaoIntervaloSubrotina].forEach(clearInterval);

    rodando = false;
    idRotinaPrincipalTempo = null;
    rotinaPrincipalPausada = false;

    // Limpar completamente o overlay de memória
    memoryEl.innerHTML = "";

    atualizarListas();
}

function atualizarListas() {
    //? Fila de espera
    if (JSON.stringify(filaSubrotinas) !== JSON.stringify(estadoAnteriorFila)) {
        queueListEl.innerHTML = "";
        filaSubrotinas.forEach((subrotina, index) => {
            const li = document.createElement("li");
            li.className = "queue-item";
            li.textContent = `${index + 1}. ${subrotina}`;
            li.style.animationDelay = `${index * 0.1}s`;
            li.addEventListener('animationend', () => li.classList.add('animation-complete'));
            queueListEl.appendChild(li);
        });
        estadoAnteriorFila = [...filaSubrotinas];
    }

    //? Subrotinas ativas
    const ativasKeys = Object.keys(subrotinasAtiva).sort();
    const anteriorAtivasKeys = Object.keys(estadoAnteriorAtivas).sort();
    const ativasNames = ativasKeys.map(key => subrotinasAtiva[key].name);
    const anteriorAtivasNames = anteriorAtivasKeys.map(key => estadoAnteriorAtivas[key]?.name);

    if (JSON.stringify(ativasNames) !== JSON.stringify(anteriorAtivasNames)) {
        activeListEl.innerHTML = "";
        Object.entries(subrotinasAtiva).forEach(([index, subrotina], listIndex) => {
            const li = document.createElement("li");
            li.className = "active-item";
            li.id = `active-${index}`;
            li.textContent = `Slot ${index}: ${subrotina.name} (${subrotina.timeRemaining?.toFixed(1) || 0}s)`;
            li.style.animationDelay = `${listIndex * 0.1}s`;
            li.addEventListener('animationend', () => li.classList.add('animation-complete'));
            activeListEl.appendChild(li);
        });

        estadoAnteriorAtivas = Object.fromEntries(
            Object.entries(subrotinasAtiva).map(([index, sub]) => [index, { name: sub.name }])
        );
    }

    //? Subrotinas concluídas
    if (JSON.stringify(subrotinasCompleta) !== JSON.stringify(estadoAnteriorCompletas)) {
        completedListEl.innerHTML = "";
        subrotinasCompleta.forEach((subrotina, index) => {
            const li = document.createElement("li");
            li.className = "completed-item";
            li.textContent = `${index + 1}. ${subrotina}`;
            li.style.animationDelay = `${index * 0.1}s`;
            li.addEventListener('animationend', () => li.classList.add('animation-complete'));
            completedListEl.appendChild(li);
        });
        estadoAnteriorCompletas = [...subrotinasCompleta];
    }
}

function atualizarTemposAtivas() {
    Object.entries(subrotinasAtiva).forEach(([index, subrotina]) => {
        const li = document.getElementById(`active-${index}`);
        if (li) {
            li.textContent = `Slot ${index}: ${subrotina.name} (${subrotina.timeRemaining?.toFixed(1) || 0}s)`;
        }
    });
}

function gerarSubrotina() {
    if (rodando && rotinaPrincipalTempoSobra > 0 && filaSubrotinas.length < 10) {
        const rand = Math.random();
        const numero = rand < 0.15 ? 3 : rand < 0.5 ? 2 : 1;

        let generatedAny = false;
        for (let i = 0; i < numero && filaSubrotinas.length < 10; i++) {
            totalSubrotinas++;
            const newSubroutineName = `Subrotina ${totalSubrotinas}`;
            duracao[newSubroutineName] = parseFloat((Math.random() * 4 + 1).toFixed(1));
            filaSubrotinas.push(newSubroutineName);
            mostrarMensagem(`Nova ${newSubroutineName} gerada e adicionada à fila.`);
            generatedAny = true;
        }

        if (!generatedAny && filaSubrotinas.length >= 10) {
            mostrarMensagem("Fila de subrotinas cheia, não foi possível gerar mais.");
        }

        if (generatedAny && idRotinaPrincipalTempo && !rotinaPrincipalPausada) {
            clearInterval(idRotinaPrincipalTempo);
            idRotinaPrincipalTempo = null;
            rotinaPrincipalPausada = true;
            mostrarMensagem("Rotina Principal pausada para processar novas subrotinas.");
        }
    }
}

function processaFila() {
    for (let i = 0; i < SUBROTINAS_MAX; i++) {
        if (!subrotinasAtiva[i] && filaSubrotinas.length > 0) {
            const nextSubroutine = filaSubrotinas.shift();
            executarSubrotina(nextSubroutine, i);
        }
    }
}

function timerRotinaPrincipal() {
    if (idRotinaPrincipalTempo) clearInterval(idRotinaPrincipalTempo);

    idRotinaPrincipalTempo = setInterval(() => {
        rotinaPrincipalTempoSobra -= 0.1;

        const mainTimerEl = memoryEl.querySelector('.main .timer');
        if (mainTimerEl) {
            const displayTime = Math.max(0, rotinaPrincipalTempoSobra);
            mainTimerEl.textContent = `${displayTime.toFixed(1)}s`;
        }

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
            if (progressFill) progressFill.style.height = '100%';
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
    criarRotinaPrincipal();
    timerRotinaPrincipal();
    rodando = true;

    //? Gera subrotinas iniciais
    const numSubrotinasIniciais = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < numSubrotinasIniciais; i++) {
        gerarSubrotina();
    }

    idGeracaoIntervaloSubrotina = setInterval(gerarSubrotina, 5000);
    idIntervaloLista = setInterval(() => {
        atualizarListas();
        atualizarTemposAtivas();
        processaFila();
    }, 500);

    mostrarMensagem(`Simulação iniciada! ${numSubrotinasIniciais} subrotinas adicionadas à fila de espera.`);
}

function parar() {
    if (!rodando) {
        mostrarMensagem("A simulação não está em andamento.");
        return;
    }

    Object.values(subrotinasAtiva).forEach(item => clearInterval(item.timerId));
    [idRotinaPrincipalTempo, idGeracaoIntervaloSubrotina, idIntervaloLista].forEach(clearInterval);

    rodando = false;
    mostrarMensagem("Simulação pausada. O estado atual foi mantido.");
    atualizarListas();
}

function criarRotinaPrincipal() {
    rotinaPrincipalTempoSobra = DURACAO_ROTINA_PRINCIPAL;
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
    const color = subColors[Math.floor(Math.random() * subColors.length)];

    // Verificar se existe uma subrotina anterior no mesmo slot para substituir
    let subDiv;
    const existingSubDiv = memoryEl.querySelector(`[data-slot="${index}"]`);

    if (existingSubDiv) {
        // Reutilizar o elemento existente
        subDiv = existingSubDiv;
        subDiv.innerHTML = ''; // Limpar conteúdo anterior
        subDiv.className = "sub fade-in";
    } else {
        // Criar novo elemento
        subDiv = document.createElement("div");
        subDiv.className = "sub fade-in";
        subDiv.setAttribute('data-slot', index);
        memoryEl.appendChild(subDiv);
    }

    const progressFillEl = document.createElement("div");
    progressFillEl.className = "progress-fill";
    progressFillEl.style.backgroundColor = color;
    subDiv.appendChild(progressFillEl);

    const title = document.createElement("div");
    title.textContent = name;
    title.style.position = 'relative';
    title.style.zIndex = '1';
    subDiv.appendChild(title);

    const timerEl = document.createElement("div");
    let timeRemaining = duracao[name];
    timerEl.textContent = `${timeRemaining.toFixed(1)}s`;
    timerEl.style.position = 'relative';
    timerEl.style.zIndex = '1';
    subDiv.appendChild(timerEl);

    const timerId = setInterval(() => {
        timeRemaining -= 0.1;
        if (timeRemaining > 0) {
            timerEl.textContent = `${timeRemaining.toFixed(1)}s`;
            if (subrotinasAtiva[index]) {
                subrotinasAtiva[index].timeRemaining = timeRemaining;
            }
            const progressPercentage = ((duracao[name] - timeRemaining) / duracao[name]) * 100;
            progressFillEl.style.height = `${progressPercentage}%`;
        } else {
            timerEl.textContent = `0.0s`;
            clearInterval(timerId);
            finalizarSubrotina(name, index, subDiv);
            progressFillEl.style.height = '100%';
        }
    }, 100);

    subrotinasAtiva[index] = { name, el: subDiv, timerId, timeRemaining };
}

function finalizarSubrotina(name, index, el) {
    el.classList.add('fade-out');

    setTimeout(() => {
        // Não remover o elemento, apenas limpar o conteúdo
        el.classList.remove('fade-out');
        el.innerHTML = '';
        el.className = "sub"; // Reset para classe base

        delete subrotinasAtiva[index];
        subrotinasCompleta.push(name);
        mostrarMensagem(`Subrotina "${name}" concluída.`);
        processaFila();

        if (rotinaPrincipalPausada && Object.keys(subrotinasAtiva).length === 0 && filaSubrotinas.length === 0) {
            rotinaPrincipalPausada = false;
            timerRotinaPrincipal();
            mostrarMensagem("Rotina Principal retomada.");
        }

        if (rotinaPrincipalTempoSobra <= 0) {
            mostrarMensagem("Tempo da Rotina Principal esgotado! Simulação parada.", 5000);
            parar();
        }
    }, 600);
}

// Event listeners
startBtn.addEventListener("click", iniciar);
stopBtn.addEventListener("click", parar);
document.getElementById("home").onclick = () => location.href = "../index.html";