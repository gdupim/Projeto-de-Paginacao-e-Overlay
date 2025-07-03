const memoryContainer = document.getElementById('memoria');
const tabelaPagContainer = document.getElementById('tabelaPaginas');
const eventLog = document.getElementById('eventLog');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

//? Configuração da paginação
const FRAME_CONTADOR = 6;
const PAGINA_TAMANHO = 1024;
const ACESSO_MEMORIA = 256;

const processos = [
    {
        name: 'Processo 1',
        subroutines: [
            { name: 'Sub A', size: 3500 },
            { name: 'Sub B', size: 1800 }
        ]
    },
    {
        name: 'Processo 2',
        subroutines: [
            { name: 'Sub C', size: 5200 },
            { name: 'Sub D', size: 2400 }
        ]
    }
];

//? Lista de todas as subrotinas para facilitar a seleção
const listaSubRotinas = processos.flatMap(proc =>
    proc.subroutines.map(sub => ({
        procName: proc.name,
        name: sub.name,
        size: sub.size
    }))
);

//? Paleta de cores
const frameColors = [
    "#8DF82B", "#2BF4F8", "#FFD700", "#FF6347", "#9370DB",
    "#FF8C00", "#00CED1", "#FF1493", "#7B68EE", "#32CD32",
    "#BA55D3", "#4682B4", "#D2B48C", "#F08080", "#20B2AA"
];

//? Variáveis da simulação
let frameLivres = [];
let frameLista = [];
let tabelaPag = {};
let tabelaFrame = Array(FRAME_CONTADOR).fill(null);
let idIntervaloSim = null;

function initUI() {
    //? Limpa e cria os elementos visuais dos frames físicos na memória
    memoryContainer.innerHTML = '';
    for (let i = 0; i < FRAME_CONTADOR; i++) {
        const slot = document.createElement('div');
        slot.classList.add('frame-slot');
        slot.textContent = `Frame ${i}`;
        memoryContainer.appendChild(slot);
    }

    //? Cria o container para as tabelas lado a lado
    tabelaPagContainer.innerHTML = '';
    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'page-tables-container';

    //? Cria uma tabela de páginas para cada processo
    processos.forEach(proc => {
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden';

        const tbl = document.createElement('table');
        tbl.className = 'page-table w-full';
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

        tableWrapper.appendChild(tbl);
        tablesContainer.appendChild(tableWrapper);
    });

    tabelaPagContainer.appendChild(tablesContainer);
    eventLog.innerHTML = '';
}

function logEvent(text, colorClass = 'log-event-blue') {
    const li = document.createElement('li');
    li.textContent = text;
    li.classList.add(colorClass);
    eventLog.appendChild(li);
    eventLog.scrollTop = eventLog.scrollHeight;
}

function highlightCell(cell) {
    cell.classList.remove('cell-highlight');
    cell.offsetHeight;
    cell.classList.add('cell-highlight');
}

function updateTabelaPagUI() {
    processos.forEach(proc => {
        const tbl = document.getElementById(`tbl-${proc.name.replace(/\s+/g, '-')}`);
        const tb = tbl.querySelector('tbody');

        // Armazena o estado anterior das células de frame
        const previousFrameStates = {};
        Array.from(tb.querySelectorAll('tr')).forEach((row, index) => {
            const frameCell = row.cells[3];
            if (frameCell) {
                previousFrameStates[index] = frameCell.textContent;
            }
        });

        tb.innerHTML = '';

        let rowIndex = 0;
        proc.subroutines.forEach(sub => {
            const pages = tabelaPag[proc.name][sub.name];
            pages.forEach((f, idx) => {
                const start = idx * PAGINA_TAMANHO;
                const end = (idx + 1) * PAGINA_TAMANHO - 1;
                const tr = document.createElement('tr');

                const currentFrameValue = f === null ? '—' : 'F' + f;
                const previousFrameValue = previousFrameStates[rowIndex];

                tr.innerHTML = `
                    <td>${sub.name}</td>
                    <td>${idx}</td>
                    <td>${start}–${end}</td>
                    <td class="frame-cell">${currentFrameValue}</td>
                `;

                tb.appendChild(tr);

                //? Aplica o efeito de destaque se o valor do frame mudou
                if (previousFrameValue && previousFrameValue !== currentFrameValue) {
                    const frameCell = tr.cells[3];
                    highlightCell(frameCell);
                }

                rowIndex++;
            });
        });
    });
}

function updateFrameUI(idx) {
    const slot = memoryContainer.children[idx];
    const entry = tabelaFrame[idx];

    //? Remove qualquer destaque anterior de todos os slots
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

    //? Reseta todas as variáveis
    frameLivres = Array.from({ length: FRAME_CONTADOR }, (_, i) => i);
    frameLista = [];
    tabelaPag = {};

    //? Inicializa as tabelas de páginas
    processos.forEach(proc => {
        tabelaPag[proc.name] = {};
        proc.subroutines.forEach(sub => {
            const count = Math.ceil(sub.size / PAGINA_TAMANHO);
            tabelaPag[proc.name][sub.name] = Array(count).fill(null);
        });
    });

    tabelaFrame = Array(FRAME_CONTADOR).fill(null);
    initUI();

    logEvent('*** Iniciando simulação de paginação ***', 'log-event-blue');
    logEvent(`Total de frames: ${FRAME_CONTADOR}, Tamanho da página: ${PAGINA_TAMANHO} bytes`, 'log-event-blue');

    //? Gera string de referência
    const referenceString = Array.from({ length: ACESSO_MEMORIA }, () => {
        const randomSub = listaSubRotinas[Math.floor(Math.random() * listaSubRotinas.length)];
        const pageCount = Math.ceil(randomSub.size / PAGINA_TAMANHO);
        const randomPageNum = Math.floor(Math.random() * pageCount);
        return [randomSub.procName, randomSub.name, randomPageNum];
    });

    let refIndex = 0;

    //? Inicia o intervalo principal da simulação
    idIntervaloSim = setInterval(() => {
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
            //? HIT
            logEvent(`HIT: ${procName}/${subName}[${pageNum}] já em frame ${table[pageNum]}`, 'log-event-green');
            updateFrameUI(table[pageNum]);
        } else {
            //? PAGE FAULT
            let frameToUse;

            if (frameLivres.length > 0) {
                frameToUse = frameLivres.shift();
                logEvent(`PAGE FAULT: ${procName}/${subName}[${pageNum}] → alocado para frame ${frameToUse} (Frame Livre)`, 'log-event-purple');
            } else {
                const victimFrame = frameLista.shift();
                const [vProc, vSub, vPg] = tabelaFrame[victimFrame];
                tabelaPag[vProc][vSub][vPg] = null;
                logEvent(`SUBSTITUIÇÃO: ${vProc}/${vSub}[${vPg}] removido do frame ${victimFrame} para dar lugar a ${procName}/${subName}[${pageNum}]`, 'log-event-orange');
                frameToUse = victimFrame;
            }

            const randomColor = frameColors[Math.floor(Math.random() * frameColors.length)];
            table[pageNum] = frameToUse;
            tabelaFrame[frameToUse] = [procName, subName, pageNum, randomColor];
            frameLista.push(frameToUse);

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

//? Event listeners
startBtn.addEventListener('click', startSim);
stopBtn.addEventListener('click', stopSim);
document.getElementById("home").onclick = () => location.href = "../index.html";

stopBtn.disabled = true;
initUI();
