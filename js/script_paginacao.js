const memoryContainer = document.getElementById('memoria');
const tabelaPagContainer = document.getElementById('tabelaPaginas');
const eventLog = document.getElementById('eventLog');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

// configuração da paginação
const FRAME_CONTADOR = 6;
const PAGINA_TAMANHO = 1024;
const ACESSO_MEMORIA = 32;

const processos = [
    {
        name: 'Processo 1',
        subroutines: [
            { name: 'Sub A', size: 3500 }, // 3500 bytes = ~4 paginas
            { name: 'Sub B', size: 1800 }  // 1800 bytes = 2 paginas
        ]
    },
    {
        name: 'Processo 2',
        subroutines: [
            { name: 'Sub C', size: 5200 }, // 5200 bytes = ~6 paginas
            { name: 'Sub D', size: 2400 }  // 2400 bytes = 3 paginas
        ]
    }
];

// lista de todas as subrotinas para facilitar a seleção
const listaSubRotinas = processos.flatMap(proc =>
    proc.subroutines.map(sub => ({
        procName: proc.name,
        name: sub.name,
        size: sub.size
    }))
);

// paleta de cores
const frameColors = [
    "#8DF82B", "#2BF4F8", "#FFD700", "#FF6347", "#9370DB",
    "#FF8C00", "#00CED1", "#FF1493", "#7B68EE", "#32CD32",
    "#BA55D3", "#4682B4", "#D2B48C", "#F08080", "#20B2AA"
];


// estado da simulação
let frameLivres = [];
let frameLista = [];    // primeiro a entrar, primeiro a sair
let tabelaPag = {};    // armazena as tabelas de páginas de cada processo

let tabelaFrame = Array(FRAME_CONTADOR).fill(null); // mapeia frames físicos para páginas lógicas
let idIntervaloSim = null;  // id do intervalo da simulação para poder parar

// inicializa a interface do usuário: cria os frames visuais e limpa as tabelas/log
function initUI() {
    // limpa e cria os elementos visuais dos frames físicos na memória
    memoryContainer.innerHTML = '';
    for (let i = 0; i < FRAME_CONTADOR; i++) {
        const slot = document.createElement('div');
        slot.classList.add('frame-slot');
        slot.textContent = `Frame ${i}`;

        slot.style.backgroundColor = '';
        slot.style.color = '#475569';
        slot.style.fontWeight = 'normal';
        memoryContainer.appendChild(slot);
    }

    tabelaPagContainer.innerHTML = '';
    eventLog.innerHTML = '';

    // cria uma tabela de páginas para cada processo
    processos.forEach(proc => {
        const tbl = document.createElement('table');
        tbl.className = 'page-table';
        // gera um id unico para a tabela, substituindo espaços por hifens
        tbl.id = `tbl-${proc.name.replace(/\s+/g, '-')}`;
        tbl.innerHTML = `
      <caption>${proc.name}</caption>
      <thead>
        <tr>
          <th>Subrotina</th>
          <th>Página nº</th>
          <th>Endereço virtual</th>
          <th>Frame</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
        tabelaPagContainer.appendChild(tbl);
    });
}

function logEvent(text, colorClass = 'log-event-blue') {
    const li = document.createElement('li');
    li.textContent = text;
    li.classList.add(colorClass);
    eventLog.appendChild(li);

    eventLog.scrollTop = eventLog.scrollHeight;
}

function updateTabelaPagUI() {
    processos.forEach(proc => {
        const tbl = document.getElementById(`tbl-${proc.name.replace(/\s+/g, '-')}`);
        const tb = tbl.querySelector('tbody');
        tb.innerHTML = '';

        // itera pelas subrotinas do processo para preencher a tabela de páginas
        proc.subroutines.forEach(sub => {
            // obtem a tabela de páginas para a subrotina atual
            const pages = tabelaPag[proc.name][sub.name];
            pages.forEach((f, idx) => {
                const start = idx * PAGINA_TAMANHO; // endereço virtual inicial
                const end = (idx + 1) * PAGINA_TAMANHO - 1; // endereço virtual final
                const tr = document.createElement('tr');
                // variaveis>
                tr.innerHTML = `
          <td>${sub.name}</td>
          <td>${idx}</td>
          <td>${start}–${end}</td>
          <td>${f === null ? '—' : 'F' + f}</td>
        `;
                tb.appendChild(tr);
            });
        });
    });
}

function updateFrameUI(idx) {
    const slot = memoryContainer.children[idx]; // obtem o elemento do frame
    const entry = tabelaFrame[idx]; // obtem a entrada na tabela de frames

    // remove qualquer destaque anterior de todos os slots
    Array.from(memoryContainer.children).forEach(s => s.classList.remove('highlight'));

    if (entry) {
        const [pName, sName, pg, color] = entry;
        slot.textContent = `F${idx}: ${pName}/${sName}[${pg}]`;
        slot.style.backgroundColor = color;
        slot.style.color = '#ffffff';
        slot.style.fontWeight = 'bold';
        slot.classList.add('highlight');
    } else {
        slot.textContent = `Frame ${idx}`;
        slot.style.backgroundColor = '';
        slot.style.color = '#475569';
        slot.style.fontWeight = 'normal';
    }
}

function startSim() {
    if (idIntervaloSim !== null) return;

    // reseta todas as variaveis
    frameLivres = Array.from({ length: FRAME_CONTADOR }, (_, i) => i); // Todos os frames estão livres
    frameLista = [];
    tabelaPag = {};
    // inicializa as tabelas de páginas para cada processo e subrotina
    processos.forEach(proc => {
        tabelaPag[proc.name] = {};
        proc.subroutines.forEach(sub => {
            // calcula o numero de paginas que a subrotina ocupa
            const count = Math.ceil(sub.size / PAGINA_TAMANHO);
            // preenche a tabela de paginas da subrotina com 'null'
            tabelaPag[proc.name][sub.name] = Array(count).fill(null);
        });
    });
    tabelaFrame = Array(FRAME_CONTADOR).fill(null);

    initUI();

    logEvent('*** Iniciando simulação de paginação ***', 'log-event-blue');
    logEvent(`Total de frames: ${FRAME_CONTADOR}, Tamanho da página: ${PAGINA_TAMANHO} bytes`, 'log-event-blue');

    const referenceString = Array.from({ length: ACESSO_MEMORIA }, () => {
        const randomSub = listaSubRotinas[Math.floor(Math.random() * listaSubRotinas.length)];
        const pageCount = Math.ceil(randomSub.size / PAGINA_TAMANHO);
        const randomPageNum = Math.floor(Math.random() * pageCount);
        return [randomSub.procName, randomSub.name, randomPageNum];
    });

    let refIndex = 0;

    // inicia o intervalo principal da simulação
    idIntervaloSim = setInterval(() => {
        // se o indice de referencia atingir o final da string, a simulação termina
        if (refIndex >= referenceString.length) {
            clearInterval(idIntervaloSim);
            idIntervaloSim = null;
            logEvent('*** Simulação concluída. ***', 'log-event-blue');
            startBtn.disabled = false;
            stopBtn.disabled = true;
            Array.from(memoryContainer.children).forEach(s => s.classList.remove('highlight'));
            return;
        }

        const [procName, subName, pageNum] = referenceString[refIndex];
        const table = tabelaPag[procName][subName];

        if (table[pageNum] !== null) {
            logEvent(`HIT: ${procName}/${subName}[${pageNum}] já em frame ${table[pageNum]}`, 'log-event-green');
            updateFrameUI(table[pageNum]);
        } else {
            // PAGE FAULT
            let frameToUse;

            // há frame livre?
            if (frameLivres.length > 0) {
                frameToUse = frameLivres.shift();
                logEvent(`PAGE FAULT: ${procName}/${subName}[${pageNum}] → alocado para frame ${frameToUse} (Frame Livre)`, 'log-event-purple');
            } else {
                const victimFrame = frameLista.shift();
                const [vProc, vSub, vPg, vColor] = tabelaFrame[victimFrame];
                tabelaPag[vProc][vSub][vPg] = null;
                logEvent(`SUBSTITUIÇÃO: ${vProc}/${vSub}[${vPg}] removido do frame ${victimFrame} para dar lugar a ${procName}/${subName}[${pageNum}]`, 'log-event-orange');
                frameToUse = victimFrame;
            }

            const randomColor = frameColors[Math.floor(Math.random() * frameColors.length)];

            table[pageNum] = frameToUse;
            tabelaFrame[frameToUse] = [procName, subName, pageNum, randomColor];
            frameLista.push(frameToUse); // adiciona ao final

            updateFrameUI(frameToUse);
            updateTabelaPagUI();
        }

        refIndex++;
    }, 750);

    startBtn.disabled = true;
    stopBtn.disabled = false;
}

function stopSim() {
    if (idIntervaloSim !== null) {
        clearInterval(idIntervaloSim);
        idIntervaloSim = null;
        logEvent('Simulação parada pelo usuário.', 'log-event-red');
        startBtn.disabled = false;
        stopBtn.disabled = true;

        Array.from(memoryContainer.children).forEach(s => s.classList.remove('highlight'));
    }
}


startBtn.addEventListener('click', startSim);
stopBtn.addEventListener('click', stopSim);
document.getElementById('home').addEventListener('click', () => location.href = '/html/index.html');

stopBtn.disabled = true;
initUI();
