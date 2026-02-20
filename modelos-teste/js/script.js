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
let usuarioAtual    = null; // Objeto do usuário logado (preenchido no DOMContentLoaded)


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
    const btnNovoChamado          = document.getElementById('btnNovoChamado');
    const btnVoltar               = document.getElementById('btnVoltar');
    const btnCancelar             = document.getElementById('btnCancelar');
    const newTicketScreen         = document.getElementById('newTicketScreen');
    const newTicketForm           = document.getElementById('newTicketForm');
    const menuToggle              = document.getElementById('menuToggle');
    const sidebar                 = document.getElementById('sidebar');
    const sidebarOverlay          = document.getElementById('sidebarOverlay');
    const ticketTypeSelect        = document.getElementById('ticketType');
    const manutencaoFields        = document.getElementById('manutencaoFields');
    const pedidoAnualFields       = document.getElementById('pedidoAnualFields');
    const pedidoAvulsoFields      = document.getElementById('pedidoAvulsoFields');
    const localSelect             = document.getElementById('local');
    const localOutroGroup         = document.getElementById('localOutroGroup');
    const checkOutroTipo          = document.getElementById('checkOutroTipo');
    const tipoManutencaoOutroGroup = document.getElementById('tipoManutencaoOutroGroup');
    const fotoUpload              = document.getElementById('fotoUpload');
    const fileName                = document.getElementById('fileName');
    const documentoPedidoAnual    = document.getElementById('documentoPedidoAnual');
    const fileNameAnual           = document.getElementById('fileNameAnual');
    const documentoPedidoAvulso   = document.getElementById('documentoPedidoAvulso');
    const fileNameAvulso          = document.getElementById('fileNameAvulso');
    const ticketDetailsScreen     = document.getElementById('ticketDetailsScreen');
    const btnVoltarDetalhes       = document.getElementById('btnVoltarDetalhes');

    // Itens de navegação e páginas de conteúdo
    const navItems = document.querySelectorAll('.nav-item');
    const pages    = document.querySelectorAll('.page-content');


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
        const nome   = usuarioAtual.nomeCompleto;

        // Mapa de quais perfis atendem cada categoria de etapa
        const mapa = {
            'SOLICITANTE':    ['SOLICITANTE', 'ADMIN'],
            'ADMINISTRATIVO': ['ADMINISTRATIVO', 'ADMIN'],
            'TECNICO':        ['TECNICO', 'ADMIN'],
            'COMPRADOR':      ['COMPRADOR', 'ADMIN'],
            'GESTOR':         ['ADMIN']
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
            badgeLog:     getChamadosLog().length,
            badgeSaida:   getChamadosSaida().length
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
            'SOLICITANTE':    ['SOLICITANTE', 'ADMIN'],
            'ADMINISTRATIVO': ['ADMINISTRATIVO', 'ADMIN'],
            'TECNICO':        ['TECNICO', 'ADMIN'],
            'COMPRADOR':      ['COMPRADOR', 'ADMIN'],
            'GESTOR':         ['ADMIN']
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
            'SOLICITANTE':    'Solicitante',
            'ADMINISTRATIVO': 'Adm. de Manutenção',
            'TECNICO':        'Técnico de Manutenção',
            'COMPRADOR':      'Comprador',
            'GESTOR':         'Gestor'
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
            if (targetPageId === 'caixaLogPage')     renderTickets('log');
            if (targetPageId === 'caixaSaidaPage')   renderTickets('saida');

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
        if (localOutroGroup)          localOutroGroup.classList.add('hidden');
        if (tipoManutencaoOutroGroup) tipoManutencaoOutroGroup.classList.add('hidden');
        if (fileName)                 fileName.textContent    = 'Nenhum arquivo selecionado';
        if (fileNameAnual)            fileNameAnual.textContent  = 'Nenhum arquivo selecionado';
        if (fileNameAvulso)           fileNameAvulso.textContent = 'Nenhum arquivo selecionado';
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
        if (v === 'manutencao'    && manutencaoFields)   manutencaoFields.classList.remove('hidden');
        if (v === 'pedido_anual'  && pedidoAnualFields)  pedidoAnualFields.classList.remove('hidden');
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
            const unidade    = document.getElementById('unidade')?.value;
            const local      = localSelect?.value;
            const titulo     = document.getElementById('tituloManutencao')?.value.trim();
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
            const localFinal  = local === 'OUTRO'
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
            alert(`Chamado #${numFormatado} criado com sucesso!\nAguardando ação da Administração de Manutenção (Etapa 2).`);

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
            log:     'ticketsLogGrid',
            saida:   'ticketsSaidaGrid'
        };
        const filtroIds = {
            entrada: { texto: 'filtroEntradaNumero', data: 'filtroEntradaData', tipo: 'filtroEntradaTipo' },
            log:     { texto: 'filtroLogNumero',     data: 'filtroLogData',     tipo: 'filtroLogTipo'     },
            saida:   { texto: 'filtroSaidaNumero',   data: 'filtroSaidaData',   tipo: 'filtroSaidaTipo'   }
        };

        const grid = document.getElementById(gridIds[tipo]);
        if (!grid) return;

        // Ler valores dos filtros
        const textoFiltro = (document.getElementById(filtroIds[tipo].texto)?.value || '').trim().toLowerCase();
        const dataFiltro  = document.getElementById(filtroIds[tipo].data)?.value || '';
        const tipoFiltro  = document.getElementById(filtroIds[tipo].tipo)?.value || '';

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

        lista.forEach(c => grid.appendChild(createTicketCard(c)));
        atualizarBadgesNav();
    }


    // =========================================================================
    // LISTENERS DOS FILTROS — re-renderiza ao digitar/selecionar
    // =========================================================================

    [
        { texto: 'filtroEntradaNumero', data: 'filtroEntradaData', tipo: 'filtroEntradaTipo', caixa: 'entrada' },
        { texto: 'filtroLogNumero',     data: 'filtroLogData',     tipo: 'filtroLogTipo',     caixa: 'log'     },
        { texto: 'filtroSaidaNumero',   data: 'filtroSaidaData',   tipo: 'filtroSaidaTipo',   caixa: 'saida'   }
    ].forEach(({ texto, data, tipo, caixa }) => {
        document.getElementById(texto)?.addEventListener('input',  () => renderTickets(caixa));
        document.getElementById(data)?.addEventListener('change',  () => renderTickets(caixa));
        document.getElementById(tipo)?.addEventListener('change',  () => renderTickets(caixa));
    });

    /**
     * Cria e retorna o elemento DOM de um card de chamado.
     * @param {Object} chamado - Objeto do chamado (JSON simples do localStorage)
     * @returns {HTMLElement}
     */
    function createTicketCard(chamado) {
        const card = document.createElement('div');
        card.className = 'ticket-card';

        const numero          = chamado._numero || chamado.id;
        const numeroFormatado = String(numero).padStart(8, '0');
        const etapaAtiva      = getNomeEtapaAtiva(chamado);
        const responsavel     = getResponsavelEtapaAtiva(chamado);
        const dataAbertura    = formatarDataHora(chamado.dataCriacao);
        const solicitanteNome = chamado.etapas?.[0]?.conclusao?.usuario
                             || chamado._solicitanteUsuario
                             || '-';
        const statusLabel = chamado.status === 'FINALIZADO' ? 'Finalizado'  : 'Em andamento';
        const statusClass = chamado.status === 'FINALIZADO' ? 'badge-finalizado' : 'badge-andamento';

        card.innerHTML = `
            <div class="ticket-card-header">
                <span class="ticket-type-badge tipo-manutencao">Manutenção Canteiros</span>
                <span class="ticket-card-number">#${numeroFormatado}</span>
            </div>
            <h3 class="ticket-card-title">${chamado.titulo}</h3>
            <div class="ticket-card-info">
                <div class="info-item">
                    <svg viewBox="0 0 24 24" class="info-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Solicitante: <strong>${solicitanteNome}</strong></span>
                </div>
                <div class="info-item">
                    <svg viewBox="0 0 24 24" class="info-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>${dataAbertura}</span>
                </div>
            </div>
            <div class="ticket-card-footer">
                <div class="footer-item">
                    <span class="footer-label">Etapa atual:</span>
                    <span class="footer-value">${etapaAtiva}</span>
                </div>
                <div class="footer-item">
                    <span class="footer-label">Responsável:</span>
                    <span class="footer-value">${responsavel}</span>
                </div>
                <div class="footer-item">
                    <span class="footer-label">Status:</span>
                    <span class="footer-value ticket-status-badge ${statusClass}">${statusLabel}</span>
                </div>
            </div>`;

        // Clicar no card abre a tela de detalhes
        card.addEventListener('click', () => openTicketDetails(chamado.id));
        return card;
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

        currentTicketId     = chamadoId;
        window.chamadoAtual = chamado;

        // Preencher cabeçalho
        const numero = chamado._numero || chamado.id;
        document.getElementById('detailsTicketNumber').textContent = '#' + String(numero).padStart(8, '0');
        document.getElementById('detailsTicketTitle').textContent  = chamado.titulo;

        // Elementos opcionais (podem não existir no HTML)
        const abertoPorEl = document.getElementById('detailsAbertoPor');
        if (abertoPorEl) abertoPorEl.textContent = chamado.etapas?.[0]?.conclusao?.usuario || '-';

        const dataAberturaEl = document.getElementById('detailsDataAbertura');
        if (dataAberturaEl) dataAberturaEl.textContent = formatarDataHora(chamado.dataCriacao);

        // Badge de status
        const badge = document.getElementById('detailsStatusBadge');
        if (badge) {
            badge.textContent = chamado.status === 'FINALIZADO' ? 'Finalizado' : 'Em andamento';
            badge.className   = 'chamado-detalhes-badge' + (chamado.status === 'FINALIZADO' ? ' finalizado' : '');
        }

        // Renderizar seções da tela de detalhes
        renderProgresso(chamado);
        renderEtapaAtualPanel(chamado);
        renderMensagens(chamado);
        renderFormularioAba(chamado);

        // Resetar para a aba Mensagens
        document.querySelectorAll('.chamado-aba-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.chamado-aba-conteudo').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-aba="mensagens"]')?.classList.add('active');
        document.getElementById('aba-mensagens')?.classList.add('active');

        // Recolher sidebar e expandir tela de detalhes
        sidebar?.classList.add('sidebar-hidden');
        ticketDetailsScreen.classList.add('active', 'fullscreen');
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

        // Configuração fixa das etapas do fluxo de Manutenção Canteiros
        const etapasConfig = [
            { num: '1',   label: 'Abertura do Chamado' },
            { num: '2',   label: 'Agendamento da Avaliação' },
            { num: '3',   label: 'Avaliação Técnica' },
            { num: '4',   label: 'Verificação de Estoque' },
            { num: '5.1', label: 'Solicitação de Compra', sub: true },
            { num: '5.2', label: 'Pedido de Compra',      sub: true },
            { num: '5.3', label: 'Programar Entrega',     sub: true },
            { num: '6',   label: 'Recebimento de Mercadoria' },
            { num: '7',   label: 'Programação do Serviço' },
            { num: '8',   label: 'Execução da Manutenção' },
            { num: '9',   label: 'Finalização do Chamado' }
        ];

        // Montar mapa { numeroEtapa: status } para consulta rápida
        const etapasMap = {};
        if (chamado.etapas) {
            chamado.etapas.forEach(e => {
                etapasMap[String(e.numero)] = e.status;
                e.subetapas?.forEach(s => { etapasMap[String(s.numero)] = s.status; });
            });
        }

        etapasConfig.forEach(cfg => {
            const status    = etapasMap[cfg.num];
            const concluida = status === 'CONCLUIDA';
            const atual     = status === 'EM_ANDAMENTO';

            const item = document.createElement('div');
            item.className = [
                'progresso-item',
                cfg.sub   ? 'subetapa'  : '',
                concluida ? 'concluida' : '',
                atual     ? 'atual'     : '',
                !status   ? 'pendente'  : ''
            ].filter(Boolean).join(' ');

            // Círculo com número ou ícone de check
            const circulo = document.createElement('div');
            circulo.className = 'progresso-circulo';
            circulo.innerHTML = concluida
                ? `<svg class="progresso-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                : cfg.num;

            // Label abaixo do círculo
            const label = document.createElement('div');
            label.className   = 'progresso-label';
            label.textContent = cfg.label;

            item.appendChild(circulo);
            item.appendChild(label);
            container.appendChild(item);
        });
    }


    // =========================================================================
    // PAINEL DA ETAPA ATUAL
    // =========================================================================

    /**
     * Preenche o painel que exibe qual etapa está ativa,
     * quem é o responsável e se o usuário logado pode atendê-la.
     */
    function renderEtapaAtualPanel(chamado) {
        const etapa = getEtapaAtiva(chamado);

        const icone  = document.getElementById('etapaAtualIcone');
        const titulo = document.getElementById('etapaAtualTitulo');
        const resp   = document.getElementById('etapaAtualResponsavel');
        const perm   = document.getElementById('etapaAtualPermissao');

        const categoriaLabel = {
            'SOLICITANTE':    'Solicitante',
            'ADMINISTRATIVO': 'Adm. de Manutenção',
            'TECNICO':        'Técnico de Manutenção',
            'COMPRADOR':      'Comprador',
            'GESTOR':         'Gestor'
        };

        // Chamado finalizado
        if (!etapa) {
            if (icone)  icone.textContent  = '✓';
            if (titulo) titulo.textContent = 'Chamado Finalizado';
            if (resp)   resp.textContent   = '-';
            if (perm) {
                perm.textContent      = '✓ Todas as etapas concluídas';
                perm.style.color      = '#059669';
                perm.style.background = '#ecfdf5';
                perm.style.borderColor = '#a7f3d0';
            }
            return;
        }

        if (icone)  icone.textContent  = String(etapa.numero);
        if (titulo) titulo.textContent = etapa.titulo;
        if (resp)   resp.textContent   = categoriaLabel[etapa.categoria] || etapa.categoria;

        if (perm) {
            const pode = podeAtenderEtapa(etapa, usuarioAtual.perfil);
            perm.textContent       = pode
                ? 'Você pode atender esta etapa — acesse a aba Formulário'
                : 'Sem permissão para atender esta etapa';
            perm.style.color       = pode ? '#059669'  : '#6b7280';
            perm.style.background  = pode ? '#ecfdf5'  : '#f9fafb';
            perm.style.borderColor = pode ? '#a7f3d0'  : '#e5e7eb';
        }
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
                    numero:    etapa.numero,
                    titulo:    etapa.titulo,
                    categoria: etapa.categoria,
                    usuario:   etapa.conclusao.usuario,
                    dataHora:  etapa.conclusao.dataHora,
                    dados:     etapa.dados
                });
            }
            etapa.subetapas?.forEach(sub => {
                if (sub.status === 'CONCLUIDA' && sub.conclusao) {
                    mensagens.push({
                        numero:    sub.numero,
                        titulo:    sub.titulo,
                        categoria: sub.categoria,
                        usuario:   sub.conclusao.usuario,
                        dataHora:  sub.conclusao.dataHora,
                        dados:     sub.dados
                    });
                }
            });
        });

        // Atualizar badge
        const badgeEl = document.getElementById('badgeMensagens');
        if (badgeEl) badgeEl.textContent = mensagens.length;

        const badgeClasses = {
            SOLICITANTE:    'badge-solicitante',
            TECNICO:        'badge-tecnico',
            ADMINISTRATIVO: 'badge-administrativo',
            COMPRADOR:      'badge-comprador',
            GESTOR:         'badge-admin'
        };
        const catLabels = {
            SOLICITANTE:    'Solicitante',
            TECNICO:        'Técnico',
            ADMINISTRATIVO: 'Adm. de Manutenção',
            COMPRADOR:      'Comprador',
            GESTOR:         'Gestor'
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
            const label      = catLabels[msg.categoria]    || msg.categoria;

            const partes   = (msg.usuario || 'US').split(' ');
            const iniciais = (partes.length >= 2
                ? partes[0][0] + partes[partes.length - 1][0]
                : (msg.usuario || 'US').substring(0, 2)
            ).toUpperCase();

            // Montar campos dos dados da etapa
            const campos = [];
            const d = msg.dados || {};
            if (d.observacao)           campos.push({ label: 'OBSERVAÇÃO',             valor: d.observacao });
            if (d.unidade)              campos.push({ label: 'UNIDADE',                valor: d.unidade });
            if (d.dataAgendamento)      campos.push({ label: 'DATA AGENDADA',          valor: formatarData(d.dataAgendamento) + (d.horaAgendamento ? ' às ' + d.horaAgendamento : '') });
            if (d.descricaoTecnica)     campos.push({ label: 'DESCRIÇÃO TÉCNICA',      valor: d.descricaoTecnica });
            if (d.materiaisNecessarios) campos.push({ label: 'MATERIAIS NECESSÁRIOS',  valor: d.materiaisNecessarios });
            if (d.possuiEstoque)        campos.push({ label: 'ESTOQUE',                valor: d.possuiEstoque === 'SIM' ? '✓ Material disponível' : '✗ Sem material — encaminhado para compras' });
            if (d.itens)                campos.push({ label: 'ITENS SOLICITADOS',       valor: d.itens });
            if (d.justificativa)        campos.push({ label: 'JUSTIFICATIVA',          valor: d.justificativa });
            if (d.urgencia)             campos.push({ label: 'URGÊNCIA',               valor: d.urgencia });
            if (d.numeroPedido)         campos.push({ label: 'Nº DO PEDIDO',           valor: d.numeroPedido });
            if (d.fornecedor)           campos.push({ label: 'FORNECEDOR',             valor: d.fornecedor });
            if (d.valorTotal)           campos.push({ label: 'VALOR TOTAL',            valor: 'R$ ' + d.valorTotal });
            if (d.dataEntrega)          campos.push({ label: 'PREVISÃO DE ENTREGA',    valor: formatarData(d.dataEntrega) });
            if (d.localEntrega)         campos.push({ label: 'LOCAL DE ENTREGA',       valor: d.localEntrega });
            if (d.dataServico)          campos.push({ label: 'DATA DO SERVIÇO',        valor: formatarData(d.dataServico) });
            if (d.tecnicoResponsavel)   campos.push({ label: 'TÉCNICO RESPONSÁVEL',    valor: d.tecnicoResponsavel });
            if (d.descricaoServico)     campos.push({ label: 'SERVIÇO EXECUTADO',      valor: d.descricaoServico });
            if (d.materiaisUsados)      campos.push({ label: 'MATERIAIS UTILIZADOS',   valor: d.materiaisUsados });
            if (d.observacaoFinal)      campos.push({ label: 'OBSERVAÇÃO FINAL',       valor: d.observacaoFinal });
            if (d.avaliacao)            campos.push({ label: 'AVALIAÇÃO',              valor: '⭐'.repeat(parseInt(d.avaliacao)) });
            if (campos.length === 0)    campos.push({ label: 'STATUS',                 valor: 'Etapa concluída.' });

            const camposHTML = campos.map(c => `
                <div class="chamado-mensagem-campo">
                    <div class="chamado-mensagem-campo-label">${c.label}</div>
                    <div class="chamado-mensagem-campo-valor">${c.valor}</div>
                </div>`).join('');

            const card = document.createElement('div');
            card.className = 'chamado-mensagem-card';
            card.innerHTML = `
                <div class="chamado-mensagem-header chamado-mensagem-header-toggle" style="cursor:pointer;user-select:none;">
                    <svg class="msg-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                         style="width:16px;height:16px;flex-shrink:0;stroke:var(--color-gray-400);
                                transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span class="chamado-mensagem-num">Mensagem ${idx + 1}</span>
                    <span class="chamado-mensagem-perfil-badge ${badgeClass}">${label}</span>
                    <span class="chamado-mensagem-etapa-tag">Etapa ${msg.numero}</span>
                </div>
                <div class="chamado-mensagem-body collapsed">
                    <div class="chamado-mensagem-autor">
                        <div class="chamado-mensagem-avatar">${iniciais}</div>
                        <div class="chamado-mensagem-autor-info">
                            <span class="chamado-mensagem-nome">${msg.usuario}</span>
                            <span class="chamado-mensagem-data">${formatarDataHora(msg.dataHora)}</span>
                        </div>
                    </div>
                    <div class="chamado-mensagem-campos">${camposHTML}</div>
                </div>`;

            // Toggle ao clicar no header
            card.querySelector('.chamado-mensagem-header-toggle').addEventListener('click', function () {
                const body = card.querySelector('.chamado-mensagem-body');
                const icon = card.querySelector('.msg-toggle-icon');
                const isCollapsed = body.classList.contains('collapsed');
                body.classList.toggle('collapsed', !isCollapsed);
                icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
            });

            container.appendChild(card);
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
            SOLICITANTE:    'Solicitante',
            TECNICO:        'Técnico',
            ADMINISTRATIVO: 'Adm. de Manutenção',
            COMPRADOR:      'Comprador',
            GESTOR:         'Gestor'
        };

        const pode = podeAtenderEtapa(etapa, usuarioAtual.perfil);

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-top:24px;max-width:860px;';

        if (pode) {
            // --- Card com formulário de ação ---
            wrapper.innerHTML = `
                <div class="chamado-mensagem-card" id="cardFormularioInline">
                    <div class="chamado-mensagem-header" style="background:var(--color-primary-light);border-bottom-color:var(--color-primary);">
                        <span class="chamado-mensagem-num" style="color:var(--color-primary);">
                            ✦ Etapa ${etapa.numero} — ${etapa.titulo}
                        </span>
                        <span class="chamado-mensagem-etapa-tag" style="color:var(--color-primary);margin-left:auto;">
                            Sua vez de agir
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

            // Evento do botão Avançar
            document.getElementById('btnInlineAvancar')?.addEventListener('click', () => {
                const obs = document.getElementById('inlineObservacao')?.value.trim();
                if (!obs) {
                    document.getElementById('inlineObservacao')?.focus();
                    document.getElementById('inlineObservacao')?.setAttribute('style', 'min-height:80px;border-color:var(--color-danger);box-shadow:0 0 0 3px rgba(239,68,68,0.1);');
                    return;
                }
                concluirEtapaComObservacao(chamado, etapa, obs);
            });

        } else {
            // --- Card informativo: aguardando outro perfil ---
            wrapper.innerHTML = `
                <div class="chamado-mensagem-card">
                    <div class="chamado-mensagem-header">
                        <span class="chamado-mensagem-num">Aguardando</span>
                        <span class="chamado-mensagem-etapa-tag">Etapa ${etapa.numero} — ${etapa.titulo}</span>
                    </div>
                    <div class="chamado-mensagem-body">
                        <p style="font-size:13px;color:var(--color-gray-500);font-style:italic;">
                            Esta etapa aguarda ação de: <strong style="color:var(--color-gray-700);">${catLabels[etapa.categoria] || etapa.categoria}</strong>
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

        // Injetar observação nos dados antes de concluir
        const injetarObs = (etapaObj) => {
            if (!etapaObj.dados) etapaObj.dados = {};
            etapaObj.dados.observacao = observacao;
            etapaObj.status    = 'CONCLUIDA';
            etapaObj.expandida = false;
            etapaObj.conclusao = { usuario: usuarioAtual.nomeCompleto, dataHora: new Date() };
        };

        // Localizar a etapa (ou subetapa) e chamar o método correto da classe Chamado
        if (Number.isInteger(etapaNum)) {
            switch (etapaNum) {
                case 2:  chamado.concluirEtapa2('', '', usuarioAtual);   break;
                case 3:  chamado.concluirEtapa3('', '', usuarioAtual);   break;
                case 4:  chamado.concluirEtapa4('', usuarioAtual);       break;
                case 6:  chamado.concluirEtapa6('', usuarioAtual);       break;
                case 7:  chamado.concluirEtapa7('', '', '', '', usuarioAtual); break;
                case 8:  chamado.concluirEtapa8('', '', null, usuarioAtual);   break;
                case 9:  chamado.concluirEtapa9('CONFIRMADO', '', observacao, usuarioAtual); break;
                default: break;
            }
            // Sobrescrever dados com a observação do formulário inline
            const etapaObj = chamado.etapas.find(e => e.numero === etapaNum);
            if (etapaObj) injetarObs(etapaObj);
        } else {
            // Subetapa (5.1, 5.2, 5.3)
            const etapa5 = chamado.etapas.find(e => e.numero === 5);
            if (etapa5) {
                const sub = etapa5.subetapas?.find(s => Math.abs(s.numero - etapaNum) < 0.01);
                if (sub) {
                    if (Math.abs(etapaNum - 5.1) < 0.01) chamado.concluirSubetapa51('', '', '', usuarioAtual);
                    if (Math.abs(etapaNum - 5.2) < 0.01) chamado.concluirSubetapa52('', '', [], '', '', null, usuarioAtual);
                    if (Math.abs(etapaNum - 5.3) < 0.01) chamado.concluirSubetapa53('', '', '', '', usuarioAtual);
                    // Sobrescrever com observação
                    const subAtual = etapa5.subetapas?.find(s => Math.abs(s.numero - etapaNum) < 0.01);
                    if (subAtual) injetarObs(subAtual);
                }
            }
        }

        window.gerenciadorChamados.atualizarChamado(chamado);

        // Re-renderizar a tela de detalhes com os dados atualizados
        const dadoAtualizado = reidratarChamado(
            window.gerenciadorChamados.chamados.find(c => c.id == chamado.id)
        );
        window.chamadoAtual = dadoAtualizado;

        renderProgresso(dadoAtualizado);
        renderEtapaAtualPanel(dadoAtualizado);
        renderMensagens(dadoAtualizado);
        renderFormularioAba(dadoAtualizado);
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
        sidebar?.classList.remove('sidebar-hidden');
        currentTicketId = null;
        renderTickets('entrada');
        renderTickets('log');
        renderTickets('saida');
    });


    // =========================================================================
    // ACESSIBILIDADE — tecla Escape fecha telas sobrepostas
    // =========================================================================

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (sidebar?.classList.contains('open'))              closeSidebar();
        if (newTicketScreen?.classList.contains('active'))    closeTicketScreen();
        if (ticketDetailsScreen?.classList.contains('active')) {
            ticketDetailsScreen.classList.remove('active', 'fullscreen');
            sidebar?.classList.remove('sidebar-hidden');
            currentTicketId = null;
        }
    });


    // =========================================================================
    // FUNÇÕES AUXILIARES DE DATA/HORA
    // =========================================================================

    function formatarData(data) {
        const d = new Date(data);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    }

    function formatarHora(data) {
        const d = new Date(data);
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
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
});