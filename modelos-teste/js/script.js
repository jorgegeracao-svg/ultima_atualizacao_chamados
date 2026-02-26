// =============================================================================
// SCRIPT.JS — Controlador principal do index.html
// Responsabilidades:
//   - Navegação entre páginas (sidebar → .page-content)
//   - Sidebar mobile (abrir/fechar com overlay)
//   - Tela de Novo Chamado (abrir, fechar, submeter formulário)
//   - Tela de Detalhes do Chamado (abrir, renderizar progresso, mensagens, formulário)
//   - Renderização de cards nas caixas (Entrada, Log, Saída)
//
// NOTA: checkAuth() e showElementsByPermission() vêm de auth-integration.js,
// que é carregado antes deste arquivo. Não duplicar aqui.
// =============================================================================

// =============================================================================
// VARIÁVEIS GLOBAIS
// =============================================================================
let currentTicketId = null; // ID do chamado aberto na tela de detalhes
let usuarioAtual = null; // Objeto do usuário logado (preenchido no DOMContentLoaded)

// =============================================================================
// FUNÇÕES GLOBAIS — acessíveis por card-lista.js e card-quadrado.js
// =============================================================================

/**
 * Retorna a etapa (ou subetapa) atualmente EM_ANDAMENTO de um chamado.
 * Versão global (necessária para card-lista.js e card-quadrado.js).
 */
function getEtapaAtivaGlobal(chamado) {
    if (!chamado.etapas) return null;
    for (const etapa of chamado.etapas) {
        if (etapa.status === 'EM_ANDAMENTO') {
            if (etapa.subetapas?.length > 0) {
                const subAtiva = etapa.subetapas.find(s => s.status === 'EM_ANDAMENTO');
                if (subAtiva) return subAtiva;
            }
            return etapa;
        }
    }
    return null;
}

function getNomeEtapaAtiva(chamado) {
    const e = getEtapaAtivaGlobal(chamado);
    return e ? e.titulo : (chamado.status === 'FINALIZADO' ? 'Finalizado' : '-');
}

function getResponsavelEtapaAtiva(chamado) {
    const e = getEtapaAtivaGlobal(chamado);
    if (!e) return '-';
    const nomes = {
        'SOLICITANTE': 'Solicitante',
        'ADMINISTRATIVO': 'Adm. de Manutenção',
        'TECNICO': 'Técnico de Manutenção',
        'COMPRADOR': 'Comprador',
        'GESTOR': 'Gestor'
    };
    return nomes[e.categoria] || e.categoria;
}

function formatarDataHora(data) {
    if (!data) return '-';
    const d = new Date(data);
    const data_ = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const hora  = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${data_}, ${hora}`;
}



// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {

    // Verificar autenticação — redireciona para login.html se não logado
    usuarioAtual = (typeof checkAuth === 'function') ? checkAuth() : null;
    if (!usuarioAtual) return;

    // -------------------------------------------------------------------------
    // Referências aos elementos do DOM
    // -------------------------------------------------------------------------
    const btnNovoChamado = document.getElementById('btnNovoChamado');
    const btnVoltar = document.getElementById('btnVoltar');
    const btnCancelar = document.getElementById('btnCancelar');
    const newTicketScreen = document.getElementById('newTicketScreen');
    const newTicketForm = document.getElementById('newTicketForm');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const ticketTypeSelect = document.getElementById('ticketType');
    const manutencaoFields = document.getElementById('manutencaoFields');
    const pedidoAnualFields = document.getElementById('pedidoAnualFields');
    const pedidoAvulsoFields = document.getElementById('pedidoAvulsoFields');
    const localSelect = document.getElementById('local');
    const localOutroGroup = document.getElementById('localOutroGroup');
    const checkOutroTipo = document.getElementById('checkOutroTipo');
    const tipoManutencaoOutroGroup = document.getElementById('tipoManutencaoOutroGroup');
    const fotoUpload = document.getElementById('fotoUpload');
    const fileName = document.getElementById('fileName');
    const documentoPedidoAnual = document.getElementById('documentoPedidoAnual');
    const fileNameAnual = document.getElementById('fileNameAnual');
    const documentoPedidoAvulso = document.getElementById('documentoPedidoAvulso');
    const fileNameAvulso = document.getElementById('fileNameAvulso');
    const ticketDetailsScreen = document.getElementById('ticketDetailsScreen');
    const btnVoltarDetalhes = document.getElementById('btnVoltarDetalhes');
    const btnToggleSidebarDetalhes = document.getElementById('btnToggleSidebarDetalhes');
    const btnToggleSearch = document.getElementById('btnToggleSearch');
    const detSearchWrapper = document.getElementById('detSearchWrapper');
    const detSearchInput = document.getElementById('detSearchInput');
    const btnCloseSearch = document.getElementById('btnCloseSearch');
    const btnNotificacoes = document.getElementById('btnNotificacoes');

    // Itens de navegação e páginas de conteúdo
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-content');


    // =========================================================================
    // HELPERS — localStorage
    // =========================================================================

    /** Retorna todos os chamados salvos no localStorage como objetos simples */
    function getChamadosFluxo() {
        return JSON.parse(localStorage.getItem('chamadosFluxo') || '[]');
    }

    /**
     * Reidrata um objeto JSON simples como instância de Chamado,
     * restaurando os métodos da classe (concluirEtapa2, podeEditarEtapa, etc.).
     */
    function reidratarChamado(obj) {
        return Object.assign(Object.create(window.Chamado.prototype), obj);
    }

    /** Gera o número formatado do chamado: ANO + sequencial com 4 dígitos */
    function gerarNumeroChamado() {
        const ano = new Date().getFullYear();
        const seq = getChamadosFluxo().length;
        return parseInt(`${ano}${String(seq).padStart(4, '0')}`);
    }


    // =========================================================================
    // FILTROS DE CAIXA
    // =========================================================================

    /**
     * Verifica se o usuário logado já participou ou vai participar do chamado.
     * Considera todas as etapas (concluídas, ativas e futuras do fluxo).
     * - Etapas concluídas: verifica se o nome do usuário está na conclusão
     * - Etapa ativa: verifica se o perfil pode atendê-la
     * - Etapas futuras: não é possível saber (fluxo é dinâmico), então
     *   considera o perfil do usuário frente a todas as categorias do chamado
     */
    function chamadoPassouOuPassaPorMim(c) {
        const perfil = usuarioAtual.perfil;
        const nome = usuarioAtual.nomeCompleto;

        // Mapa de quais perfis atendem cada categoria de etapa
        const mapa = {
            'SOLICITANTE': ['SOLICITANTE', 'ADMIN'],
            'ADMINISTRATIVO': ['ADMINISTRATIVO', 'ADMIN'],
            'TECNICO': ['TECNICO', 'ADMIN'],
            'COMPRADOR': ['COMPRADOR', 'ADMIN'],
            'GESTOR': ['ADMIN']
        };

        // Verificar em todas as etapas e subetapas
        const todasEtapas = [];
        (c.etapas || []).forEach(e => {
            todasEtapas.push(e);
            (e.subetapas || []).forEach(s => todasEtapas.push(s));
        });

        return todasEtapas.some(e => {
            // 1. Já atuou: nome está na conclusão
            if (e.conclusao?.usuario === nome) return true;

            // 2. Perfil pode atender a categoria desta etapa
            if ((mapa[e.categoria] || []).includes(perfil)) return true;

            return false;
        });
    }

    /**
     * Caixa de Entrada:
     * Chamados EM ANDAMENTO cuja etapa ativa o usuário logado pode atender AGORA.
     */
    function getChamadosEntrada() {
        return getChamadosFluxo().filter(c => {
            if (c.status === 'FINALIZADO') return false;
            const etapa = getEtapaAtiva(c);
            return etapa && podeAtenderEtapa(etapa, usuarioAtual.perfil);
        });
    }

    /**
     * Caixa Log:
     * Chamados que já passaram ou vão passar pelo usuário logado,
     * excluindo os que estão na Entrada (ação pendente agora)
     * e os Finalizados (que ficam na caixa Finalizados).
     */
    function getChamadosLog() {
        return getChamadosFluxo().filter(c => {
            if (c.status === 'FINALIZADO') return false;

            // Excluir os que estão na Entrada (ação pendente agora)
            const etapaAtiva = getEtapaAtiva(c);
            if (etapaAtiva && podeAtenderEtapa(etapaAtiva, usuarioAtual.perfil)) return false;

            // Incluir se já passou ou vai passar pelo usuário
            return chamadoPassouOuPassaPorMim(c);
        });
    }

    /**
     * Caixa Finalizados:
     * Chamados com status FINALIZADO que passaram pelo usuário logado.
     */
    function getChamadosSaida() {
        return getChamadosFluxo().filter(c => {
            if (c.status !== 'FINALIZADO') return false;
            return chamadoPassouOuPassaPorMim(c);
        });
    }


    // =========================================================================
    // HELPERS — Etapas e permissões
    // =========================================================================

    /**
     * Retorna a etapa (ou subetapa) atualmente EM_ANDAMENTO de um chamado.
     * @param {Object} chamado
     * @returns {Object|null}
     */
    function getEtapaAtiva(chamado) {
        if (!chamado.etapas) return null;
        for (const etapa of chamado.etapas) {
            if (etapa.status === 'EM_ANDAMENTO') {
                // Se a etapa tem subetapas, retorna a subetapa ativa
                if (etapa.subetapas?.length > 0) {
                    const subAtiva = etapa.subetapas.find(s => s.status === 'EM_ANDAMENTO');
                    if (subAtiva) return subAtiva;
                }
                return etapa;
            }
        }
        return null;
    }

    /**
     * Atualiza os badges de contagem na sidebar.
     * Chamado sempre que os tickets são renderizados.
     */
    function atualizarBadgesNav() {
        const contagens = {
            badgeEntrada: getChamadosEntrada().length,
            badgeLog: getChamadosLog().length,
            badgeSaida: getChamadosSaida().length
        };

        Object.entries(contagens).forEach(([id, count]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
        });
    }

    function podeAtenderEtapa(etapa, perfil) {
        const mapa = {
            'SOLICITANTE': ['SOLICITANTE', 'ADMIN'],
            'ADMINISTRATIVO': ['ADMINISTRATIVO', 'ADMIN'],
            'TECNICO': ['TECNICO', 'ADMIN'],
            'COMPRADOR': ['COMPRADOR', 'ADMIN'],
            'GESTOR': ['ADMIN']
        };
        return (mapa[etapa.categoria] || []).includes(perfil);
    }

    /** Retorna o nome da etapa ativa, ou 'Finalizado' se concluído */
    function getNomeEtapaAtiva(chamado) {
        const e = getEtapaAtiva(chamado);
        return e ? e.titulo : (chamado.status === 'FINALIZADO' ? 'Finalizado' : '-');
    }

    /** Retorna o nome legível do responsável pela etapa ativa */
    function getResponsavelEtapaAtiva(chamado) {
        const e = getEtapaAtiva(chamado);
        if (!e) return '-';
        const nomes = {
            'SOLICITANTE': 'Solicitante',
            'ADMINISTRATIVO': 'Adm. de Manutenção',
            'TECNICO': 'Técnico de Manutenção',
            'COMPRADOR': 'Comprador',
            'GESTOR': 'Gestor'
        };
        return nomes[e.categoria] || e.categoria;
    }


    // =========================================================================
    // NAVEGAÇÃO — Sidebar → páginas de conteúdo
    // Usa o atributo data-page nos .nav-item para identificar qual página ativar,
    // sem depender de índice posicional (mais robusto a reordenações no HTML).
    // =========================================================================

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPageId = item.dataset.page;

            // Remover estado ativo de todos os itens e páginas
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));

            // Ativar item clicado
            item.classList.add('active');

            // Ativar a página correspondente
            const targetPage = document.getElementById(targetPageId);
            if (targetPage) targetPage.classList.add('active');

            // Renderizar os tickets da caixa ao navegar para ela
            if (targetPageId === 'caixaEntradaPage') renderTickets('entrada');
            if (targetPageId === 'caixaLogPage') renderTickets('log');
            if (targetPageId === 'caixaSaidaPage') renderTickets('saida');

            // Fechar sidebar no mobile após navegar
            if (window.innerWidth <= 768) closeSidebar();
        });
    });


    // =========================================================================
    // SIDEBAR MOBILE — abrir/fechar com overlay e botão hambúrguer
    // =========================================================================

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Impede scroll ao fundo
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Botão hambúrguer: alterna entre abrir e fechar
    menuToggle?.addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    // Clicar no overlay (fundo escuro) fecha a sidebar
    sidebarOverlay?.addEventListener('click', closeSidebar);

    // Em desktop, garantir que a sidebar fique visível (sem estado 'open' residual)
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeSidebar();
    });


    // =========================================================================
    // TELA DE NOVO CHAMADO
    // =========================================================================

    /** Abre a tela sobreposta de criação de chamado */
    btnNovoChamado?.addEventListener('click', () => {
        newTicketScreen.classList.add('active');
        if (window.innerWidth <= 768) closeSidebar();
        // Scroll para o topo da tela (útil em mobile)
        setTimeout(() => { newTicketScreen.scrollTop = 0; }, 100);
    });

    /** Fecha a tela de novo chamado e limpa o formulário */
    function closeTicketScreen() {
        newTicketScreen.classList.remove('active');
        newTicketForm.reset();
        hideAllTicketFields();
        if (localOutroGroup) localOutroGroup.classList.add('hidden');
        if (tipoManutencaoOutroGroup) tipoManutencaoOutroGroup.classList.add('hidden');
        if (fileName) fileName.textContent = 'Nenhum arquivo selecionado';
        if (fileNameAnual) fileNameAnual.textContent = 'Nenhum arquivo selecionado';
        if (fileNameAvulso) fileNameAvulso.textContent = 'Nenhum arquivo selecionado';
    }

    /** Oculta todas as seções de campos específicos de tipo */
    function hideAllTicketFields() {
        manutencaoFields?.classList.add('hidden');
        pedidoAnualFields?.classList.add('hidden');
        pedidoAvulsoFields?.classList.add('hidden');
    }

    btnVoltar?.addEventListener('click', closeTicketScreen);
    btnCancelar?.addEventListener('click', closeTicketScreen);

    // Exibir o bloco de campos correspondente ao tipo de chamado selecionado
    ticketTypeSelect?.addEventListener('change', (e) => {
        hideAllTicketFields();
        const v = e.target.value;
        if (v === 'manutencao' && manutencaoFields) manutencaoFields.classList.remove('hidden');
        if (v === 'pedido_anual' && pedidoAnualFields) pedidoAnualFields.classList.remove('hidden');
        if (v === 'pedido_avulso' && pedidoAvulsoFields) pedidoAvulsoFields.classList.remove('hidden');
    });

    // Exibir campo "Especifique o tipo" quando checkbox "Outro" está marcado
    document.querySelectorAll('input[name="tipoManutencao"]').forEach(cb => {
        cb.addEventListener('change', () => {
            tipoManutencaoOutroGroup?.classList.toggle('hidden', !checkOutroTipo?.checked);
        });
    });

    // Exibir campo "Especifique o local" quando Local = "OUTRO"
    localSelect?.addEventListener('change', (e) => {
        localOutroGroup?.classList.toggle('hidden', e.target.value !== 'OUTRO');
    });

    // Atualizar label do arquivo selecionado para cada input de upload
    fotoUpload?.addEventListener('change', e => {
        if (fileName) fileName.textContent = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
    });
    documentoPedidoAnual?.addEventListener('change', e => {
        if (fileNameAnual) fileNameAnual.textContent = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
    });
    documentoPedidoAvulso?.addEventListener('change', e => {
        if (fileNameAvulso) fileNameAvulso.textContent = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
    });


    // =========================================================================
    // SUBMETER FORMULÁRIO DE NOVO CHAMADO
    // =========================================================================

    newTicketForm?.addEventListener('submit', (e) => {
        e.preventDefault();

        const selectedType = ticketTypeSelect?.value;
        if (!selectedType) { alert('Selecione o tipo de chamado'); return; }

        // ------------------------------------------------------------------
        // Fluxo completo disponível apenas para Manutenção Canteiros
        // ------------------------------------------------------------------
        if (selectedType === 'manutencao') {
            const unidade = document.getElementById('unidade')?.value;
            const local = localSelect?.value;
            const titulo = document.getElementById('tituloManutencao')?.value.trim();
            const observacao = document.getElementById('observacaoManutencao')?.value.trim();
            const tiposManutencao = Array.from(
                document.querySelectorAll('input[name="tipoManutencao"]:checked')
            ).map(cb => cb.value);

            // Validação de campos obrigatórios
            if (!unidade || !local || !titulo || !observacao || tiposManutencao.length === 0) {
                alert('Preencha todos os campos obrigatórios de Manutenção');
                return;
            }
            if (local === 'OUTRO' && !document.getElementById('localOutro')?.value.trim()) {
                alert('Especifique o local');
                return;
            }
            if (tiposManutencao.includes('OUTRO') && !document.getElementById('tipoManutencaoOutro')?.value.trim()) {
                alert('Especifique o tipo de manutenção');
                return;
            }

            // Montar valores finais (substituindo "OUTRO" pelo valor digitado)
            const localFinal = local === 'OUTRO'
                ? document.getElementById('localOutro').value
                : local;
            const tiposFinais = tiposManutencao.map(t =>
                t === 'OUTRO' ? document.getElementById('tipoManutencaoOutro').value : t
            );

            if (typeof window.gerenciadorChamados === 'undefined') {
                alert('Erro: gerenciador de chamados não carregado.');
                return;
            }

            // Criar chamado via GerenciadorChamados
            const novoChamado = window.gerenciadorChamados.criarChamado(
                titulo,
                observacao,
                `${unidade} — ${localFinal} (${tiposFinais.join(', ')})`,
                usuarioAtual
            );

            // Adicionar metadados extras
            novoChamado._solicitanteUsuario = usuarioAtual.usuario;
            novoChamado._numero = gerarNumeroChamado();
            window.gerenciadorChamados.atualizarChamado(novoChamado);

            const numFormatado = String(novoChamado._numero).padStart(8, '0');
            alert(`Chamado ${numFormatado} criado com sucesso!\nAguardando ação da Administração de Manutenção (Etapa 2).`);

        } else {
            // Outros tipos ainda não têm fluxo de etapas implementado
            alert('Tipo registrado. O fluxo completo de etapas está disponível apenas para Manutenção Canteiros.');
        }

        closeTicketScreen();

        // Atualizar as caixas após criar o chamado
        renderTickets('log');
        renderTickets('entrada');
    });


    // =========================================================================
    // RENDERIZAR CARDS NAS CAIXAS
    // =========================================================================

    /**
     * Renderiza os cards de chamados no grid da caixa especificada,
     * aplicando os filtros de busca (nome/número, data e tipo).
     * @param {'entrada'|'log'|'saida'} tipo
     */
    function renderTickets(tipo) {
        const gridIds = {
            entrada: 'ticketsEntradaGrid',
            log: 'ticketsLogGrid',
            saida: 'ticketsSaidaGrid'
        };
        const filtroIds = {
            entrada: { texto: 'filtroEntradaNumero', data: 'filtroEntradaData', tipo: 'filtroEntradaTipo' },
            log: { texto: 'filtroLogNumero', data: 'filtroLogData', tipo: 'filtroLogTipo' },
            saida: { texto: 'filtroSaidaNumero', data: 'filtroSaidaData', tipo: 'filtroSaidaTipo' }
        };

        const grid = document.getElementById(gridIds[tipo]);
        if (!grid) return;

        // Ler valores dos filtros
        const textoFiltro = (document.getElementById(filtroIds[tipo].texto)?.value || '').trim().toLowerCase();
        const dataFiltro = document.getElementById(filtroIds[tipo].data)?.value || '';
        const tipoFiltro = document.getElementById(filtroIds[tipo].tipo)?.value || '';

        // Buscar lista base da caixa
        const listas = { entrada: getChamadosEntrada, log: getChamadosLog, saida: getChamadosSaida };
        let lista = listas[tipo]();

        // Aplicar filtro de texto (busca por número ou título/nome)
        if (textoFiltro) {
            lista = lista.filter(c => {
                const numero = String(c._numero || c.id || '').toLowerCase();
                const titulo = (c.titulo || '').toLowerCase();
                const solicitante = (c.etapas?.[0]?.conclusao?.usuario || c._solicitanteUsuario || '').toLowerCase();
                return numero.includes(textoFiltro)
                    || titulo.includes(textoFiltro)
                    || solicitante.includes(textoFiltro);
            });
        }

        // Aplicar filtro de data (compara apenas a data, sem hora)
        if (dataFiltro) {
            lista = lista.filter(c => {
                if (!c.dataCriacao) return false;
                const dataChamado = new Date(c.dataCriacao).toISOString().slice(0, 10);
                return dataChamado === dataFiltro;
            });
        }

        // Aplicar filtro de tipo
        if (tipoFiltro) {
            lista = lista.filter(c => {
                const tipo = (c.tipo || c._tipo || '').toLowerCase().replace(/\s/g, '_');
                return tipo === tipoFiltro;
            });
        }

        grid.innerHTML = '';

        // Estado vazio
        if (lista.length === 0) {
            const buscando = textoFiltro || dataFiltro || tipoFiltro;
            grid.innerHTML = `
                <div class="no-tickets-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <p>${buscando ? 'Nenhum chamado encontrado para este filtro.' : 'Nenhum chamado encontrado'}</p>
                </div>`;
            atualizarBadgesNav();
            return;
        }

        lista.forEach(c => grid.appendChild(createTicketCard(c, grid)));
        atualizarBadgesNav();
    }


    // =========================================================================
    // LISTENERS DOS FILTROS — re-renderiza ao digitar/selecionar
    // =========================================================================

    [
        { texto: 'filtroEntradaNumero', data: 'filtroEntradaData', tipo: 'filtroEntradaTipo', caixa: 'entrada' },
        { texto: 'filtroLogNumero', data: 'filtroLogData', tipo: 'filtroLogTipo', caixa: 'log' },
        { texto: 'filtroSaidaNumero', data: 'filtroSaidaData', tipo: 'filtroSaidaTipo', caixa: 'saida' }
    ].forEach(({ texto, data, tipo, caixa }) => {
        document.getElementById(texto)?.addEventListener('input', () => renderTickets(caixa));
        document.getElementById(data)?.addEventListener('change', () => renderTickets(caixa));
        document.getElementById(tipo)?.addEventListener('change', () => renderTickets(caixa));
    });

    /**
     * Cria e retorna o elemento DOM de um card de chamado.
     * @param {Object} chamado - Objeto do chamado (JSON simples do localStorage)
     * @returns {HTMLElement}
     */
    function createTicketCard(chamado, grid) {
        const isModoGrade = grid?.classList.contains('modo-grade') ?? false;
        if (isModoGrade) {
            return window.createCardQuadrado(chamado, openTicketDetails);
        }
        return window.createCardLista(chamado, openTicketDetails);
    }


    // =========================================================================
    // TELA DE DETALHES DO CHAMADO
    // =========================================================================

    /**
     * Abre a tela de detalhes de um chamado, carregando todos os seus dados.
     * @param {number|string} chamadoId - ID do chamado a abrir
     */
    function openTicketDetails(chamadoId) {
        const dadoBruto = getChamadosFluxo().find(c => c.id == chamadoId);
        if (!dadoBruto) {
            console.warn('[script.js] Chamado não encontrado, id:', chamadoId);
            return;
        }

        // Reidratar como instância de Chamado para restaurar os métodos da classe
        const chamado = reidratarChamado(dadoBruto);

        currentTicketId = chamadoId;
        window.chamadoAtual = chamado;

        // Preencher cabeçalho (elementos podem não existir se foram removidos do HTML)
        const numero = chamado._numero || chamado.id;
        const numEl = document.getElementById('detailsTicketNumber');
        if (numEl) numEl.textContent = String(numero).padStart(8, '0');
        const titleEl = document.getElementById('detailsTicketTitle');
        if (titleEl) titleEl.textContent = chamado.titulo;

        // Elementos opcionais (podem não existir no HTML)
        const abertoPorEl = document.getElementById('detailsAbertoPor');
        if (abertoPorEl) abertoPorEl.textContent = chamado.etapas?.[0]?.conclusao?.usuario || '-';

        const dataAberturaEl = document.getElementById('detailsDataAbertura');
        if (dataAberturaEl) dataAberturaEl.textContent = formatarDataHora(chamado.dataCriacao);

        // Badge de status
        const badge = document.getElementById('detailsStatusBadge');
        if (badge) {
            badge.textContent = chamado.status === 'FINALIZADO' ? 'Finalizado' : 'Em andamento';
            badge.className = 'chamado-detalhes-badge' + (chamado.status === 'FINALIZADO' ? ' finalizado' : '');
        }

        // Renderizar seções da tela de detalhes
        renderProgresso(chamado);
        renderMensagens(chamado);
        renderFormularioAba(chamado);
        renderResumoFluxo(chamado);

        // Resetar para a aba Mensagens
        document.querySelectorAll('.chamado-aba-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.chamado-aba-conteudo').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-aba="mensagens"]')?.classList.add('active');
        document.getElementById('aba-mensagens')?.classList.add('active');

        // Abrir tela de detalhes (sem recolher sidebar automaticamente)
        ticketDetailsScreen.classList.add('active');
        // Sincronizar classe fullscreen com estado atual da sidebar
        if (sidebar?.classList.contains('sidebar-hidden')) {
            ticketDetailsScreen.classList.add('fullscreen');
        } else {
            ticketDetailsScreen.classList.remove('fullscreen');
        }
    }


    // =========================================================================
    // BARRA DE PROGRESSO DAS ETAPAS
    // =========================================================================

    /**
     * Renderiza os itens da barra de progresso horizontal
     * com o status correto de cada etapa (concluída / atual / pendente).
     */
    function renderProgresso(chamado) {
        const container = document.getElementById('progressoLinha');
        if (!container) return;
        container.innerHTML = '';

        // Fonte única de verdade — definida em fluxo-config.js
        const etapasConfig = window.FLUXO_MANUTENCAO;

        // Montar mapa { numeroEtapa: status } para consulta rápida
        const etapasMap = {};
        if (chamado.etapas) {
            chamado.etapas.forEach(e => {
                etapasMap[String(e.numero)] = e.status;
                e.subetapas?.forEach(s => { etapasMap[String(s.numero)] = s.status; });
            });
        }

        etapasConfig.forEach(cfg => {
            const status = etapasMap[cfg.num];
            const concluida = status === 'CONCLUIDA';
            const atual = status === 'EM_ANDAMENTO';

            const item = document.createElement('div');
            item.className = [
                'progresso-item',
                cfg.sub ? 'subetapa' : '',
                concluida ? 'concluida' : '',
                atual ? 'atual' : '',
                !status ? 'pendente' : ''
            ].filter(Boolean).join(' ');

            // Círculo com número ou ícone de check
            const circulo = document.createElement('div');
            circulo.className = 'progresso-circulo';
            circulo.innerHTML = concluida
                ? `<svg class="progresso-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                : cfg.num;

            // Label abaixo do círculo
            const label = document.createElement('div');
            label.className = 'progresso-label';
            label.textContent = cfg.label;

            item.appendChild(circulo);
            item.appendChild(label);
            container.appendChild(item);
        });
    }


    // =========================================================================
    // ABA FLUXO / RESUMO — métricas e progresso do chamado
    // =========================================================================

    function renderResumoFluxo(chamado) {
        // Oculta os wrappers externos (que ficam fora do sistema de abas)
        // e usa o #aba-fluxo como único ponto de renderização.
        const wrapperCards  = document.querySelector('.fluxo-resumo-cards');
        const wrapperSumario = document.querySelector('.fluxo-sumario-section, .fluxo-progresso-section');
        if (wrapperCards)   wrapperCards.style.display   = 'none';
        if (wrapperSumario) wrapperSumario.style.display = 'none';

        // Renderiza dentro do #aba-fluxo (container correto da aba)
        const abaFluxo = document.getElementById('aba-fluxo');
        if (!abaFluxo) return;
        abaFluxo.innerHTML = '';

        // Coluna esquerda — sumário de etapas
        const colSumario = document.createElement('div');
        colSumario.className = 'fluxo-col-sumario';

        // Coluna direita — cards de métricas
        const container = document.createElement('div');
        container.className = 'fluxo-col-cards';

        abaFluxo.appendChild(colSumario);
        abaFluxo.appendChild(container);

        const agora = new Date();
        const dataAbertura = chamado.dataCriacao ? new Date(chamado.dataCriacao) : null;
        const diasAberto = dataAbertura
            ? Math.floor((agora - dataAbertura) / (1000 * 60 * 60 * 24))
            : null;

        const etapaAtiva = getEtapaAtiva(chamado);
        const finalizado = chamado.status === 'FINALIZADO';

        // Horas na etapa atual
        let horasEtapaAtual = null;
        if (etapaAtiva) {
            const dataInicioEtapa = etapaAtiva.dataInicio
                ? new Date(etapaAtiva.dataInicio)
                : (() => {
                    const etapas = chamado.etapas || [];
                    const idxAtiva = etapas.findIndex(e => e.numero === etapaAtiva.numero || e === etapaAtiva);
                    const anterior = idxAtiva > 0 ? etapas[idxAtiva - 1] : null;
                    return anterior?.conclusao?.dataHora ? new Date(anterior.conclusao.dataHora) : dataAbertura;
                })();
            if (dataInicioEtapa) {
                horasEtapaAtual = ((agora - dataInicioEtapa) / (1000 * 60 * 60)).toFixed(1);
            }
        }

        // Data de fim (se finalizado)
        let dataFim = null;
        if (finalizado && chamado.etapas) {
            const ultima = [...chamado.etapas].reverse().find(e => e.conclusao?.dataHora);
            if (ultima) dataFim = new Date(ultima.conclusao.dataHora);
        }
        const diasEmAndamento = dataAbertura && dataFim
            ? Math.floor((dataFim - dataAbertura) / (1000 * 60 * 60 * 24))
            : diasAberto;

        const totalEtapas = chamado.etapas?.length || 0;
        const etapasConcluidas = chamado.etapas?.filter(e => e.status === 'CONCLUIDA').length || 0;
        const nomeResponsavel = getResponsavelEtapaAtiva(chamado);
        const nomeEtapa = getNomeEtapaAtiva(chamado);

        const cards = [
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
                label: 'Data de abertura',
                valor: dataAbertura ? formatarDataHora(chamado.dataCriacao) : '-',
                cor: 'azul'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
                label: finalizado ? 'Duração total' : 'Dias em andamento',
                valor: diasEmAndamento !== null ? `${diasEmAndamento} dia${diasEmAndamento !== 1 ? 's' : ''}` : '-',
                cor: diasEmAndamento > 7 ? 'laranja' : 'verde'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
                label: 'Etapa atual',
                valor: nomeEtapa,
                cor: finalizado ? 'verde' : 'azul'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
                label: finalizado ? 'Finalizado por' : 'Setor responsável agora',
                valor: nomeResponsavel,
                cor: 'roxo'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
                label: 'Tempo na etapa atual',
                valor: horasEtapaAtual !== null
                    ? (horasEtapaAtual < 1
                        ? `${Math.round(horasEtapaAtual * 60)} min`
                        : `${horasEtapaAtual}h`)
                    : (finalizado ? 'Concluído' : '-'),
                cor: horasEtapaAtual > 48 ? 'vermelho' : horasEtapaAtual > 24 ? 'laranja' : 'verde'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
                label: 'Etapas concluídas',
                valor: `${etapasConcluidas} de ${totalEtapas}`,
                cor: etapasConcluidas === totalEtapas ? 'verde' : 'azul'
            }
        ];

        cards.forEach(card => {
            const el = document.createElement('div');
            el.className = `resumo-card resumo-card-${card.cor}`;
            el.innerHTML = `
                <div class="resumo-card-icone">${card.icone}</div>
                <div class="resumo-card-info">
                    <span class="resumo-card-label">${card.label}</span>
                    <span class="resumo-card-valor">${card.valor}</span>
                </div>`;
            container.appendChild(el);
        });

        // --- Sumário de etapas ---
        const sumario = colSumario;

        const catLabels = {
            SOLICITANTE:    'Solicitante',
            ADMINISTRATIVO: 'Adm. de Manutenção',
            TECNICO:        'Técnico',
            COMPRADOR:      'Comprador',
            GESTOR:         'Gestor'
        };

        // Fonte única de verdade — definida em fluxo-config.js
        const etapasConfig = window.FLUXO_MANUTENCAO;

        // Montar mapa com dados reais { numero: etapaObj }
        const etapasMap = {};
        chamado.etapas?.forEach(e => {
            etapasMap[String(e.numero)] = e;
            e.subetapas?.forEach(s => { etapasMap[String(s.numero)] = s; });
        });

        const titulo = document.createElement('p');
        titulo.className = 'fluxo-progresso-titulo';
        titulo.textContent = 'Sumário das etapas';
        sumario.appendChild(titulo);

        const lista = document.createElement('div');
        lista.className = 'fluxo-sumario-lista';

        etapasConfig.forEach(cfg => {
            const etapa       = etapasMap[cfg.num];
            const concluida   = etapa?.status === 'CONCLUIDA';
            const emAndamento = etapa?.status === 'EM_ANDAMENTO';
            // Se não existe no mapa ainda = pendente
            const responsavel = catLabels[etapa?.categoria || cfg.categoria] || cfg.categoria;
            const dataConc    = etapa?.conclusao?.dataHora ? formatarDataHora(etapa.conclusao.dataHora) : null;
            const usuario     = etapa?.conclusao?.usuario || null;

            const statusLabel = concluida ? 'Concluída' : emAndamento ? 'Em andamento' : 'Pendente';
            const statusClass = concluida ? 'sumario-status-ok' : emAndamento ? 'sumario-status-ativo' : 'sumario-status-pendente';
            const numClass    = concluida ? 'sumario-num-ok' : emAndamento ? 'sumario-num-ativo' : 'sumario-num-pendente';

            const row = document.createElement('div');
            row.className = `sumario-row${emAndamento ? ' sumario-row-ativo' : ''}`;
            row.innerHTML = `
                <div class="sumario-num ${numClass}">
                    ${concluida
                        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                        : cfg.num}
                </div>
                <div class="sumario-info">
                    <div class="sumario-titulo">${cfg.label}</div>
                    <div class="sumario-meta">
                        <span class="sumario-responsavel">${responsavel}</span>
                        ${dataConc ? `<span class="sumario-sep">·</span><span class="sumario-data">${dataConc}</span>` : ''}
                        ${usuario  ? `<span class="sumario-sep">·</span><span class="sumario-usuario">${usuario}</span>` : ''}
                    </div>
                </div>
                <span class="sumario-status ${statusClass}">${statusLabel}</span>`;

            lista.appendChild(row);
        });

        sumario.appendChild(lista);
    }


    // =========================================================================
    // ABA MENSAGENS — lista de etapas concluídas + formulário inline de ação
    // =========================================================================

    function renderMensagens(chamado) {
        const container = document.getElementById('historyMessages');
        if (!container) return;
        container.innerHTML = '';

        // Coletar etapas e subetapas concluídas em ordem
        const mensagens = [];
        chamado.etapas?.forEach(etapa => {
            if (etapa.status === 'CONCLUIDA' && etapa.conclusao) {
                mensagens.push({
                    numero: etapa.numero,
                    titulo: etapa.titulo,
                    categoria: etapa.categoria,
                    usuario: etapa.conclusao.usuario,
                    dataHora: etapa.conclusao.dataHora,
                    dados: etapa.dados
                });
            }
            etapa.subetapas?.forEach(sub => {
                if (sub.status === 'CONCLUIDA' && sub.conclusao) {
                    mensagens.push({
                        numero: sub.numero,
                        titulo: sub.titulo,
                        categoria: sub.categoria,
                        usuario: sub.conclusao.usuario,
                        dataHora: sub.conclusao.dataHora,
                        dados: sub.dados
                    });
                }
            });
        });

        // Atualizar badge
        const badgeEl = document.getElementById('badgeMensagens');
        if (badgeEl) badgeEl.textContent = mensagens.length;

        const badgeClasses = {
            SOLICITANTE: 'badge-solicitante',
            TECNICO: 'badge-tecnico',
            ADMINISTRATIVO: 'badge-administrativo',
            COMPRADOR: 'badge-comprador',
            GESTOR: 'badge-admin'
        };
        const catLabels = {
            SOLICITANTE: 'Solicitante',
            TECNICO: 'Técnico',
            ADMINISTRATIVO: 'Adm. de Manutenção',
            COMPRADOR: 'Comprador',
            GESTOR: 'Gestor'
        };

        // Estado vazio
        if (mensagens.length === 0) {
            const vazio = document.createElement('p');
            vazio.style.cssText = 'color:var(--color-gray-400);font-size:14px;font-style:italic;padding:20px 0;';
            vazio.textContent = 'Nenhuma etapa concluída ainda.';
            container.appendChild(vazio);
        }

        // Renderizar cada mensagem usando as classes CSS do sistema
        mensagens.forEach((msg, idx) => {
            const badgeClass = badgeClasses[msg.categoria] || 'badge-admin';
            const label = catLabels[msg.categoria] || msg.categoria;

            // Montar campos dos dados da etapa
            const campos = [];
            const d = msg.dados || {};
            if (d.observacao) campos.push({ label: 'OBSERVAÇÃO', valor: d.observacao });
            if (d.unidade) campos.push({ label: 'UNIDADE', valor: d.unidade });
            if (d.dataAgendamento) campos.push({ label: 'DATA AGENDADA', valor: formatarData(d.dataAgendamento) + (d.horaAgendamento ? ' às ' + d.horaAgendamento : '') });
            if (d.descricaoTecnica) campos.push({ label: 'DESCRIÇÃO TÉCNICA', valor: d.descricaoTecnica });
            if (d.materiaisNecessarios) campos.push({ label: 'MATERIAIS NECESSÁRIOS', valor: d.materiaisNecessarios });
            if (d.possuiEstoque) campos.push({ label: 'ESTOQUE', valor: d.possuiEstoque === 'SIM' ? '✓ Material disponível' : '✗ Sem material — encaminhado para compras' });
            if (d.itens) campos.push({ label: 'ITENS SOLICITADOS', valor: d.itens });
            if (d.justificativa) campos.push({ label: 'JUSTIFICATIVA', valor: d.justificativa });
            if (d.urgencia) campos.push({ label: 'URGÊNCIA', valor: d.urgencia });
            if (d.numeroPedido) campos.push({ label: 'Nº DO PEDIDO', valor: d.numeroPedido });
            if (d.fornecedor) campos.push({ label: 'FORNECEDOR', valor: d.fornecedor });
            if (d.valorTotal) campos.push({ label: 'VALOR TOTAL', valor: 'R$ ' + d.valorTotal });
            if (d.dataEntrega) campos.push({ label: 'PREVISÃO DE ENTREGA', valor: formatarData(d.dataEntrega) });
            if (d.localEntrega) campos.push({ label: 'LOCAL DE ENTREGA', valor: d.localEntrega });
            if (d.dataServico) campos.push({ label: 'DATA DO SERVIÇO', valor: formatarData(d.dataServico) });
            if (d.tecnicoResponsavel) campos.push({ label: 'TÉCNICO RESPONSÁVEL', valor: d.tecnicoResponsavel });
            if (d.descricaoServico) campos.push({ label: 'SERVIÇO EXECUTADO', valor: d.descricaoServico });
            if (d.materiaisUsados) campos.push({ label: 'MATERIAIS UTILIZADOS', valor: d.materiaisUsados });
            if (d.observacaoFinal) campos.push({ label: 'OBSERVAÇÃO FINAL', valor: d.observacaoFinal });
            if (d.avaliacao) campos.push({ label: 'AVALIAÇÃO', valor: '⭐'.repeat(parseInt(d.avaliacao)) });
            if (campos.length === 0) campos.push({ label: 'STATUS', valor: 'Etapa concluída.' });

            // Wrapper do card — estilo msg-ticket-*
            const wrapper = document.createElement('div');
            wrapper.className = 'msg-ticket-wrapper';

            wrapper.innerHTML = `
                <div class="msg-ticket-card concluida">
                    <!-- Header azul claro colapsável -->
                    <div class="msg-ticket-header msg-ticket-toggle">
                        <div class="msg-ticket-header-esq">
                            <div class="msg-ticket-num">${msg.numero}</div>
                            <div class="msg-ticket-header-info">
                                <span class="msg-ticket-subtexto">Etapa concluída</span>
                                <span class="msg-ticket-titulo">Etapa ${msg.numero} — ${msg.titulo}</span>
                            </div>
                        </div>
                        <button class="msg-ticket-detalhes-btn msg-ticket-toggle" aria-label="Expandir">
                            detalhes
                            <svg class="msg-ticket-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        </button>
                    </div>
                    <!-- Corpo colapsável -->
                    <div class="msg-ticket-body collapsed">
                        <!-- Remetente -->
                        <div class="msg-ticket-remetente">
                            <div class="msg-ticket-avatar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            <div class="msg-ticket-remetente-info">
                                <span class="msg-ticket-remetente-nome">${msg.usuario}</span>
                                <span class="msg-ticket-remetente-unidade">${label}</span>
                            </div>
                            <span class="msg-ticket-perfil-badge ${badgeClass}">${label.toUpperCase()}</span>
                        </div>
                        <div class="msg-ticket-divider"></div>
                        <!-- Conteúdo -->
                        <div class="msg-ticket-conteudo">
                            ${campos.map(c => `<p class="msg-ticket-conteudo-linha"><strong>${c.label}:</strong> ${c.valor}</p>`).join('')}
                            <span class="msg-ticket-data-rodape">${formatarDataHora(msg.dataHora)}</span>
                        </div>
                    </div>
                </div>`;

            // Toggle ao clicar no header ou botão
            wrapper.querySelector('.msg-ticket-toggle').addEventListener('click', function () {
                const body = wrapper.querySelector('.msg-ticket-body');
                const chevron = wrapper.querySelector('.msg-ticket-chevron');
                const isCollapsed = body.classList.contains('collapsed');
                body.classList.toggle('collapsed', !isCollapsed);
                chevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
            });

            container.appendChild(wrapper);
        });

        // Formulário inline de ação (ao final da lista)
        renderFormularioInline(chamado, container);
    }


    /**
     * Renderiza o formulário inline de atendimento ao final da aba Mensagens.
     * - Se o usuário tem permissão: mostra campo de observação + botão confirmar
     * - Se não tem permissão: mostra card informativo de aguardando
     */
    function renderFormularioInline(chamado, container) {
        const etapa = getEtapaAtiva(chamado);
        if (!etapa || chamado.status === 'FINALIZADO') return;

        const catLabels = {
            SOLICITANTE: 'Solicitante',
            TECNICO: 'Técnico',
            ADMINISTRATIVO: 'Adm. de Manutenção',
            COMPRADOR: 'Comprador',
            GESTOR: 'Gestor'
        };

        const badgeClasses = {
            SOLICITANTE: 'badge-solicitante',
            TECNICO: 'badge-tecnico',
            ADMINISTRATIVO: 'badge-administrativo',
            COMPRADOR: 'badge-comprador',
            GESTOR: 'badge-admin'
        };

        const pode = podeAtenderEtapa(etapa, usuarioAtual.perfil);
        const responsavel = catLabels[etapa.categoria] || etapa.categoria;
        const badgeClass = badgeClasses[etapa.categoria] || 'badge-admin';
        const totalMensagens = container.querySelectorAll('.msg-timeline-item').length;

        // Wrapper com estrutura de timeline (igual aos outros cards)
        const wrapper = document.createElement('div');
        wrapper.className = 'msg-timeline-item';

        if (pode) {
            // --- Card ativo: formulário de ação ---
            wrapper.innerHTML = `
                <div class="msg-timeline-coluna">
                    <div class="msg-timeline-dot msg-timeline-dot--ativo">${totalMensagens + 1}</div>
                </div>
                <div class="chamado-mensagem-card msg-card-ativo" id="cardFormularioInline" style="flex:1;min-width:0;">
                    <div class="chamado-mensagem-header" style="background:var(--color-primary-light);border-bottom-color:var(--color-primary);">
                        <span class="msg-etapa-titulo" style="color:var(--color-primary);">
                            Etapa ${etapa.numero} — ${etapa.titulo}
                        </span>
                        <span class="chamado-mensagem-perfil-badge ${badgeClass}" style="margin-left:auto;">
                            ${responsavel}
                        </span>
                    </div>
                    <div class="chamado-mensagem-body">
                        <div class="form-group" style="margin-bottom:16px;">
                            <label class="form-label">Observação</label>
                            <textarea
                                id="inlineObservacao"
                                class="form-textarea"
                                placeholder="Descreva a ação realizada nesta etapa..."
                                rows="3"
                                style="min-height:80px;"></textarea>
                        </div>
                        <div style="display:flex;gap:10px;justify-content:flex-end;">
                            <button id="btnInlineAvancar" class="btn-submit" style="display:flex;align-items:center;gap:8px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                                     stroke-linecap="round" stroke-linejoin="round"
                                     style="width:15px;height:15px;">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Avançar Chamado
                            </button>
                        </div>
                    </div>
                </div>`;

            container.appendChild(wrapper);

            // Evento do botão Avançar — busca dentro do wrapper, não no document inteiro
            wrapper.querySelector('#btnInlineAvancar')?.addEventListener('click', () => {
                const obsEl = wrapper.querySelector('#inlineObservacao');
                const obs = obsEl?.value.trim();
                if (!obs) {
                    obsEl?.focus();
                    obsEl?.setAttribute('style', 'min-height:80px;border-color:var(--color-danger);box-shadow:0 0 0 3px rgba(239,68,68,0.1);');
                    return;
                }
                concluirEtapaComObservacao(chamado, etapa, obs);
            });

        } else {
            // --- Card aguardando: sem permissão ---
            wrapper.innerHTML = `
                <div class="msg-timeline-coluna">
                    <div class="msg-timeline-dot msg-timeline-dot--ativo">${totalMensagens + 1}</div>
                </div>
                <div class="chamado-mensagem-card" style="flex:1;min-width:0;">
                    <div class="chamado-mensagem-header">
                        <span class="msg-etapa-titulo">
                            Etapa ${etapa.numero} — ${etapa.titulo}
                        </span>
                        <span class="chamado-mensagem-perfil-badge ${badgeClass}" style="margin-left:auto;">
                            ${responsavel}
                        </span>
                    </div>
                    <div class="chamado-mensagem-body">
                        <p style="font-size:13px;color:var(--color-gray-500);font-style:italic;">
                            Aguardando ação de: <strong style="color:var(--color-gray-700);">${responsavel}</strong>
                        </p>
                    </div>
                </div>`;
            container.appendChild(wrapper);
        }
    }


    /**
     * Conclui a etapa ativa com a observação digitada no formulário inline,
     * salva no localStorage e re-renderiza a tela de detalhes.
     */
    function concluirEtapaComObservacao(chamado, etapa, observacao) {
        const etapaNum = etapa.numero;

        // Injeta observação e marca a etapa como concluída
        const injetarObs = (etapaObj) => {
            if (!etapaObj.dados) etapaObj.dados = {};
            etapaObj.dados.observacao = observacao;
            etapaObj.status    = 'CONCLUIDA';
            etapaObj.expandida = false;
            etapaObj.conclusao = { usuario: usuarioAtual.nomeCompleto, dataHora: new Date() };
        };

        // Mapa de funções — escala sem switch/case
        const mapaConclusao = {
            2:   () => chamado.concluirEtapa2('', '', usuarioAtual),
            3:   () => chamado.concluirEtapa3('', '', usuarioAtual),
            4:   () => chamado.concluirEtapa4('', usuarioAtual),
            6:   () => chamado.concluirEtapa6('', usuarioAtual),
            7:   () => chamado.concluirEtapa7('', '', '', '', usuarioAtual),
            8:   () => chamado.concluirEtapa8('', '', null, usuarioAtual),
            9:   () => chamado.concluirEtapa9('CONFIRMADO', '', observacao, usuarioAtual),
            5.1: () => chamado.concluirSubetapa51('', '', '', usuarioAtual),
            5.2: () => chamado.concluirSubetapa52('', '', [], '', '', null, usuarioAtual),
            5.3: () => chamado.concluirSubetapa53('', '', '', '', usuarioAtual),
        };

        // Executa a função do mapa (chave numérica exata)
        const chave = Object.keys(mapaConclusao).find(k => Math.abs(Number(k) - etapaNum) < 0.01);
        if (chave) mapaConclusao[chave]();

        // Sobrescrever com a observação digitada
        const etapaObj = Number.isInteger(etapaNum)
            ? chamado.etapas?.find(e => e.numero === etapaNum)
            : chamado.etapas?.find(e => e.numero === 5)
                ?.subetapas?.find(s => Math.abs(s.numero - etapaNum) < 0.01);

        if (etapaObj) injetarObs(etapaObj);

        window.gerenciadorChamados.atualizarChamado(chamado);
        reRenderizarDetalhes(chamado.id);
    }


    // =========================================================================
    // RE-RENDERIZAÇÃO CENTRALIZADA DA TELA DE DETALHES
    // Fonte única — todos os pontos de atualização chamam isso.
    // =========================================================================

    function reRenderizarDetalhes(chamadoId) {
        const dadoAtualizado = reidratarChamado(
            window.gerenciadorChamados.chamados.find(c => c.id == chamadoId)
        );
        if (!dadoAtualizado) return;
        window.chamadoAtual = dadoAtualizado;
        renderProgresso(dadoAtualizado);
        renderMensagens(dadoAtualizado);
        renderFormularioAba(dadoAtualizado);
        renderResumoFluxo(dadoAtualizado);
    }


    // =========================================================================
    // ABA FORMULÁRIO — formulário da etapa ativa
    // =========================================================================

    /**
     * Renderiza o formulário da etapa ativa na aba Formulário.
     * Usa o RenderizadorEtapas (renderizador-etapas.js) para gerar o HTML.
     */
    function renderFormularioAba(chamado) {
        const container = document.getElementById('chamadoFormularioContainer');
        if (!container) return;

        const etapa = getEtapaAtiva(chamado);

        // Chamado finalizado
        if (!etapa) {
            container.innerHTML = chamado.status === 'FINALIZADO'
                ? '<p style="color:#10b981;font-weight:600;padding:20px 0;">✓ Chamado finalizado com sucesso.</p>'
                : '<p style="color:#9ca3af;font-size:14px;padding:20px 0;font-style:italic;">Nenhuma etapa ativa.</p>';
            return;
        }

        // Sem permissão para atender esta etapa
        if (!podeAtenderEtapa(etapa, usuarioAtual.perfil)) {
            container.innerHTML = `
                <div style="padding:24px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;text-align:center;">
                    <p style="color:#6b7280;font-size:14px;font-weight:500;">Você não tem permissão para atender esta etapa.</p>
                    <p style="color:#9ca3af;font-size:12px;margin-top:6px;">Responsável: <strong>${etapa.categoria}</strong></p>
                </div>`;
            return;
        }

        // Renderizar o formulário via RenderizadorEtapas
        if (typeof window.RenderizadorEtapas !== 'undefined') {
            container.innerHTML = '';
            const renderizador = new window.RenderizadorEtapas('chamadoFormularioContainer', chamado, usuarioAtual);
            window.renderizadorAtual = renderizador;
            container.appendChild(renderizador.criarConteudo(etapa));
        }
    }


    // =========================================================================
    // TROCA DE ABAS na tela de detalhes
    // =========================================================================

    document.querySelectorAll('.chamado-aba-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const aba = btn.dataset.aba;
            document.querySelectorAll('.chamado-aba-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.chamado-aba-conteudo').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('aba-' + aba)?.classList.add('active');
        });
    });


    // =========================================================================
    // VOLTAR DA TELA DE DETALHES
    // =========================================================================

    btnVoltarDetalhes?.addEventListener('click', () => {
        ticketDetailsScreen.classList.remove('active', 'fullscreen');
        currentTicketId = null;
        renderTickets('entrada');
        renderTickets('log');
        renderTickets('saida');
    });


    // =========================================================================
    // HEADER DE DETALHES — toggle sidebar, busca, notificações
    // =========================================================================

    // Toggle sidebar manual
    btnToggleSidebarDetalhes?.addEventListener('click', () => {
        const isHidden = sidebar?.classList.contains('sidebar-hidden');
        if (isHidden) {
            sidebar?.classList.remove('sidebar-hidden');
            ticketDetailsScreen?.classList.remove('fullscreen');
        } else {
            sidebar?.classList.add('sidebar-hidden');
            ticketDetailsScreen?.classList.add('fullscreen');
        }
    });

    // Toggle campo de busca
    btnToggleSearch?.addEventListener('click', () => {
        detSearchWrapper?.classList.add('active');
        setTimeout(() => detSearchInput?.focus(), 50);
    });

    btnCloseSearch?.addEventListener('click', () => {
        detSearchWrapper?.classList.remove('active');
        if (detSearchInput) detSearchInput.value = '';
    });

    // Fechar busca ao clicar fora
    document.addEventListener('click', (e) => {
        if (detSearchWrapper?.classList.contains('active') &&
            !detSearchWrapper.contains(e.target)) {
            detSearchWrapper.classList.remove('active');
            if (detSearchInput) detSearchInput.value = '';
        }
    });

    // Buscar chamado ao pressionar Enter
    detSearchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            detSearchWrapper?.classList.remove('active');
            detSearchInput.value = '';
            return;
        }
        if (e.key !== 'Enter') return;
        const termo = detSearchInput.value.trim().toLowerCase();
        if (!termo) return;

        const chamados = getChamadosFluxo();
        const encontrado = chamados.find(c =>
            c.numero?.toString().toLowerCase().includes(termo) ||
            c.titulo?.toLowerCase().includes(termo)
        );

        if (encontrado) {
            detSearchWrapper?.classList.remove('active');
            detSearchInput.value = '';
            openTicketDetails(encontrado.id);
        } else {
            detSearchInput.style.borderColor = 'var(--color-danger)';
            detSearchInput.placeholder = 'Chamado não encontrado';
            setTimeout(() => {
                detSearchInput.style.borderColor = '';
                detSearchInput.placeholder = 'Número ou nome do chamado...';
            }, 2000);
        }
    });

    // Notificações — placeholder (modal será configurado depois)
    btnNotificacoes?.addEventListener('click', () => {
        // TODO: abrir modal de notificações
        console.log('Modal de notificações — a implementar');
    });


    // =========================================================================
    // ACESSIBILIDADE — tecla Escape fecha telas sobrepostas
    // =========================================================================

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (sidebar?.classList.contains('open')) closeSidebar();
        if (newTicketScreen?.classList.contains('active')) closeTicketScreen();
        if (ticketDetailsScreen?.classList.contains('active')) {
            ticketDetailsScreen.classList.remove('active', 'fullscreen');
            currentTicketId = null;
        }
    });


    // =========================================================================
    // FUNÇÕES AUXILIARES DE DATA/HORA
    // =========================================================================

    function formatarData(data) {
        const d = new Date(data);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    function formatarHora(data) {
        const d = new Date(data);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function formatarDataHora(data) {
        if (!data) return '-';
        return `${formatarData(data)}, ${formatarHora(data)}`;
    }


    // =========================================================================
    // LOG DE DIAGNÓSTICO
    // =========================================================================
    console.log(`✅ Sistema iniciado | Usuário: ${usuarioAtual.usuario} | Perfil: ${usuarioAtual.perfil}`);

    // Atualizar badges logo ao carregar (sem precisar entrar nas caixas)
    atualizarBadgesNav();
    renderTickets('entrada');
    renderTickets('log');
    renderTickets('saida');


    // =========================================================================
    // TOGGLE LISTA / GRADE
    // =========================================================================

    const GRIDS = {
        entrada: 'ticketsEntradaGrid',
        log: 'ticketsLogGrid',
        saida: 'ticketsSaidaGrid'
    };
    const TOGGLES = {
        entrada: 'viewToggle',
        log: 'viewToggleLog',
        saida: 'viewToggleSaida'
    };

    // Recuperar preferência salva (padrão: lista)
    let modoVisualiz = localStorage.getItem('modoVisualizacao') || 'lista';

    function aplicarModoVisualizacao(modo) {
        modoVisualiz = modo;
        localStorage.setItem('modoVisualizacao', modo);

        // Aplicar/remover classe nos grids
        Object.values(GRIDS).forEach(gridId => {
            const grid = document.getElementById(gridId);
            if (grid) grid.classList.toggle('modo-grade', modo === 'grade');
        });

        // Atualizar estado ativo nos botões de todos os toggles
        Object.values(TOGGLES).forEach(toggleId => {
            document.querySelectorAll(`#${toggleId} .view-toggle-btn`).forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === modo);
            });
        });
    }

    // Adicionar listeners nos toggles das 3 caixas
    Object.values(TOGGLES).forEach(toggleId => {
        document.querySelectorAll(`#${toggleId} .view-toggle-btn`).forEach(btn => {
            btn.addEventListener('click', () => aplicarModoVisualizacao(btn.dataset.view));
        });
    });

    // Aplicar ao carregar
    aplicarModoVisualizacao(modoVisualiz);

});