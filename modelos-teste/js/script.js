// ==================== VARIÁVEIS GLOBAIS ==================== //
let currentTicketId = null;
let usuarioAtual = null;

// ==================== INICIALIZAÇÃO ==================== //
document.addEventListener('DOMContentLoaded', function () {

    usuarioAtual = (typeof checkAuth === 'function') ? checkAuth() : null;
    if (!usuarioAtual) return;

    const btnNovoChamado      = document.getElementById('btnNovoChamado');
    const btnVoltar           = document.getElementById('btnVoltar');
    const btnCancelar         = document.getElementById('btnCancelar');
    const newTicketScreen     = document.getElementById('newTicketScreen');
    const newTicketForm       = document.getElementById('newTicketForm');
    const menuToggle          = document.getElementById('menuToggle');
    const sidebar             = document.getElementById('sidebar');
    const sidebarOverlay      = document.getElementById('sidebarOverlay');
    const ticketTypeSelect    = document.getElementById('ticketType');
    const manutencaoFields    = document.getElementById('manutencaoFields');
    const pedidoAnualFields   = document.getElementById('pedidoAnualFields');
    const pedidoAvulsoFields  = document.getElementById('pedidoAvulsoFields');
    const localSelect         = document.getElementById('local');
    const localOutroGroup     = document.getElementById('localOutroGroup');
    const checkOutroTipo      = document.getElementById('checkOutroTipo');
    const tipoManutencaoOutroGroup = document.getElementById('tipoManutencaoOutroGroup');
    const fotoUpload          = document.getElementById('fotoUpload');
    const fileName            = document.getElementById('fileName');
    const documentoPedidoAnual  = document.getElementById('documentoPedidoAnual');
    const fileNameAnual         = document.getElementById('fileNameAnual');
    const documentoPedidoAvulso = document.getElementById('documentoPedidoAvulso');
    const fileNameAvulso        = document.getElementById('fileNameAvulso');
    const navItems            = document.querySelectorAll('.nav-item');
    const pages               = document.querySelectorAll('.page-content');
    const ticketDetailsScreen = document.getElementById('ticketDetailsScreen');
    const btnVoltarDetalhes   = document.getElementById('btnVoltarDetalhes');

    // ==================== HELPERS localStorage ==================== //

    function getChamadosFluxo() {
        return JSON.parse(localStorage.getItem('chamadosFluxo') || '[]');
    }

    // ✅ CORREÇÃO: reidratar JSON como instância de Chamado
    function reidratarChamado(obj) {
        return Object.assign(Object.create(window.Chamado.prototype), obj);
    }

    function gerarNumeroChamado() {
        const chamados = getChamadosFluxo();
        const ano = new Date().getFullYear();
        const seq = chamados.length;
        return parseInt(`${ano}${String(seq).padStart(4, '0')}`);
    }

    // ==================== FILTROS DE CAIXA ==================== //

    function getChamadosEntrada() {
        return getChamadosFluxo().filter(c => {
            if (c.status === 'FINALIZADO') return false;
            const etapa = getEtapaAtiva(c);
            if (!etapa) return false;
            return podeAtenderEtapa(etapa, usuarioAtual.perfil);
        });
    }

    function getChamadosLog() {
        return getChamadosFluxo().filter(c => c._solicitanteUsuario === usuarioAtual.usuario);
    }

    function getChamadosSaida() {
        return getChamadosFluxo().filter(c => c.status === 'FINALIZADO');
    }

    function getEtapaAtiva(chamado) {
        if (!chamado.etapas) return null;
        for (const etapa of chamado.etapas) {
            if (etapa.status === 'EM_ANDAMENTO') {
                if (etapa.subetapas && etapa.subetapas.length > 0) {
                    const subAtiva = etapa.subetapas.find(s => s.status === 'EM_ANDAMENTO');
                    if (subAtiva) return subAtiva;
                }
                return etapa;
            }
        }
        return null;
    }

    function podeAtenderEtapa(etapa, perfil) {
        const mapa = {
            'SOLICITANTE':    ['SOLICITANTE'],
            'ADMINISTRATIVO': ['ADMINISTRATIVO', 'ADMIN'],
            'TECNICO':        ['TECNICO', 'ADMIN'],
            'COMPRADOR':      ['COMPRADOR', 'ADMIN'],
            'GESTOR':         ['ADMIN']
        };
        return (mapa[etapa.categoria] || []).includes(perfil);
    }

    function getNomeEtapaAtiva(chamado) {
        const e = getEtapaAtiva(chamado);
        return e ? e.titulo : (chamado.status === 'FINALIZADO' ? 'Finalizado' : '-');
    }

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

    // ==================== NAVEGAÇÃO ==================== //
    navItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            pages[index].classList.add('active');
            if (index === 1) renderTickets('entrada');
            if (index === 2) renderTickets('log');
            if (index === 3) renderTickets('saida');
            if (window.innerWidth <= 768) closeSidebar();
        });
    });

    // ==================== SIDEBAR MOBILE ==================== //
    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    window.addEventListener('resize', () => { if (window.innerWidth > 768) closeSidebar(); });

    // ==================== NOVO CHAMADO ==================== //
    if (btnNovoChamado) {
        btnNovoChamado.addEventListener('click', () => {
            newTicketScreen.classList.add('active');
            if (window.innerWidth <= 768) closeSidebar();
            setTimeout(() => { newTicketScreen.scrollTop = 0; }, 100);
        });
    }

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

    function hideAllTicketFields() {
        if (manutencaoFields) manutencaoFields.classList.add('hidden');
        if (pedidoAnualFields) pedidoAnualFields.classList.add('hidden');
        if (pedidoAvulsoFields) pedidoAvulsoFields.classList.add('hidden');
    }

    if (btnVoltar) btnVoltar.addEventListener('click', closeTicketScreen);
    if (btnCancelar) btnCancelar.addEventListener('click', closeTicketScreen);

    if (ticketTypeSelect) {
        ticketTypeSelect.addEventListener('change', (e) => {
            hideAllTicketFields();
            const v = e.target.value;
            if (v === 'manutencao' && manutencaoFields) manutencaoFields.classList.remove('hidden');
            else if (v === 'pedido_anual' && pedidoAnualFields) pedidoAnualFields.classList.remove('hidden');
            else if (v === 'pedido_avulso' && pedidoAvulsoFields) pedidoAvulsoFields.classList.remove('hidden');
        });
    }

    document.querySelectorAll('input[name="tipoManutencao"]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (tipoManutencaoOutroGroup)
                tipoManutencaoOutroGroup.classList.toggle('hidden', !checkOutroTipo?.checked);
        });
    });

    if (localSelect) {
        localSelect.addEventListener('change', (e) => {
            if (localOutroGroup) localOutroGroup.classList.toggle('hidden', e.target.value !== 'OUTRO');
        });
    }

    if (fotoUpload && fileName) fotoUpload.addEventListener('change', e => { fileName.textContent = e.target.files[0]?.name || 'Nenhum arquivo selecionado'; });
    if (documentoPedidoAnual && fileNameAnual) documentoPedidoAnual.addEventListener('change', e => { fileNameAnual.textContent = e.target.files[0]?.name || 'Nenhum arquivo selecionado'; });
    if (documentoPedidoAvulso && fileNameAvulso) documentoPedidoAvulso.addEventListener('change', e => { fileNameAvulso.textContent = e.target.files[0]?.name || 'Nenhum arquivo selecionado'; });

    // ==================== SUBMETER FORMULÁRIO ==================== //
    if (newTicketForm) {
        newTicketForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const selectedType = ticketTypeSelect?.value;
            if (!selectedType) { alert('Selecione o tipo de chamado'); return; }

            if (selectedType === 'manutencao') {
                const unidade    = document.getElementById('unidade')?.value;
                const local      = localSelect?.value;
                const titulo     = document.getElementById('tituloManutencao')?.value.trim();
                const observacao = document.getElementById('observacaoManutencao')?.value.trim();
                const tiposManutencao = Array.from(
                    document.querySelectorAll('input[name="tipoManutencao"]:checked')
                ).map(cb => cb.value);

                if (!unidade || !local || !titulo || !observacao || tiposManutencao.length === 0) {
                    alert('Preencha todos os campos obrigatórios de Manutenção'); return;
                }
                if (local === 'OUTRO' && !document.getElementById('localOutro')?.value.trim()) {
                    alert('Especifique o local'); return;
                }
                if (tiposManutencao.includes('OUTRO') && !document.getElementById('tipoManutencaoOutro')?.value.trim()) {
                    alert('Especifique o tipo de manutenção'); return;
                }

                const localFinal  = local === 'OUTRO' ? document.getElementById('localOutro').value : local;
                const tiposFinais = tiposManutencao.map(t => t === 'OUTRO' ? document.getElementById('tipoManutencaoOutro').value : t);

                if (typeof window.gerenciadorChamados === 'undefined') {
                    alert('Erro: gerenciador de chamados não carregado.'); return;
                }

                const novoChamado = window.gerenciadorChamados.criarChamado(
                    titulo,
                    observacao,
                    `${unidade} — ${localFinal} (${tiposFinais.join(', ')})`,
                    usuarioAtual
                );

                novoChamado._solicitanteUsuario = usuarioAtual.usuario;
                novoChamado._numero = gerarNumeroChamado();
                window.gerenciadorChamados.atualizarChamado(novoChamado);

                const numFormatado = String(novoChamado._numero).padStart(8, '0');
                alert(`Chamado #${numFormatado} criado com sucesso!\nAguardando ação da Administração de Manutenção (Etapa 2).`);

            } else {
                alert('Tipo registrado. O fluxo completo de etapas está disponível apenas para Manutenção Canteiros.');
            }

            closeTicketScreen();
            renderTickets('log');
            renderTickets('entrada');
        });
    }

    // ==================== RENDERIZAR CARDS ==================== //
    function renderTickets(tipo) {
        const gridIds = { entrada: 'ticketsEntradaGrid', log: 'ticketsLogGrid', saida: 'ticketsSaidaGrid' };
        const grid = document.getElementById(gridIds[tipo]);
        if (!grid) return;
        grid.innerHTML = '';

        const listas = { entrada: getChamadosEntrada, log: getChamadosLog, saida: getChamadosSaida };
        const lista = listas[tipo]();

        if (lista.length === 0) {
            grid.innerHTML = `
                <div class="no-tickets-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <p>Nenhum chamado encontrado</p>
                </div>`;
            return;
        }

        lista.forEach(c => grid.appendChild(createTicketCard(c)));
    }

    function createTicketCard(chamado) {
        const card = document.createElement('div');
        card.className = 'ticket-card';

        const numero = chamado._numero || chamado.id;
        const numeroFormatado = String(numero).padStart(8, '0');
        const etapaAtiva   = getNomeEtapaAtiva(chamado);
        const responsavel  = getResponsavelEtapaAtiva(chamado);
        const dataAbertura = formatarDataHora(chamado.dataCriacao);
        const solicitanteNome = chamado.etapas?.[0]?.conclusao?.usuario || chamado._solicitanteUsuario || '-';
        const statusLabel = chamado.status === 'FINALIZADO' ? 'Finalizado' : 'Em andamento';
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
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Solicitante: <strong>${solicitanteNome}</strong></span>
                </div>
                <div class="info-item">
                    <svg viewBox="0 0 24 24" class="info-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>
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

        card.addEventListener('click', () => openTicketDetails(chamado.id));
        return card;
    }

    // ==================== TELA DE DETALHES ==================== //
    function openTicketDetails(chamadoId) {
        // Buscar dado cru do localStorage
        const dadoBruto = getChamadosFluxo().find(c => c.id == chamadoId);
        if (!dadoBruto) {
            console.warn('Chamado não encontrado, id:', chamadoId);
            return;
        }

        // ✅ CORREÇÃO PRINCIPAL: reidratar como instância de Chamado para restaurar os métodos
        const chamado = reidratarChamado(dadoBruto);

        currentTicketId = chamadoId;
        window.chamadoAtual = chamado;

        const numero = chamado._numero || chamado.id;
        document.getElementById('detailsTicketNumber').textContent = '#' + String(numero).padStart(8, '0');
        document.getElementById('detailsTicketTitle').textContent  = chamado.titulo;
        document.getElementById('detailsAbertoPor').textContent    = chamado.etapas?.[0]?.conclusao?.usuario || '-';
        document.getElementById('detailsDataAbertura').textContent = formatarDataHora(chamado.dataCriacao);

        const badge = document.getElementById('detailsStatusBadge');
        if (badge) {
            badge.textContent  = chamado.status === 'FINALIZADO' ? 'Finalizado' : 'Em andamento';
            badge.className    = 'chamado-detalhes-badge' + (chamado.status === 'FINALIZADO' ? ' finalizado' : '');
        }

        renderProgresso(chamado);
        renderEtapaAtualPanel(chamado);
        renderMensagens(chamado);
        renderFormularioAba(chamado);

        document.querySelectorAll('.chamado-aba-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.chamado-aba-conteudo').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-aba="mensagens"]')?.classList.add('active');
        document.getElementById('aba-mensagens')?.classList.add('active');

        ticketDetailsScreen.classList.add('active');
    }

    function renderProgresso(chamado) {
        const container = document.getElementById('progressoLinha');
        if (!container) return;
        container.innerHTML = '';

        const etapasConfig = [
            { num: '1',   label: 'Abertura do Chamado' },
            { num: '2',   label: 'Agendamento da Avaliação' },
            { num: '3',   label: 'Avaliação Técnica' },
            { num: '4',   label: 'Verificação de Estoque' },
            { num: '5.1', label: 'Solicitação de Compra', sub: true },
            { num: '5.2', label: 'Pedido de Compra', sub: true },
            { num: '5.3', label: 'Programar Entrega', sub: true },
            { num: '6',   label: 'Recebimento de Mercadoria' },
            { num: '7',   label: 'Programação do Serviço' },
            { num: '8',   label: 'Execução da Manutenção' },
            { num: '9',   label: 'Finalização do Chamado' }
        ];

        const etapasMap = {};
        if (chamado.etapas) {
            chamado.etapas.forEach(e => {
                etapasMap[String(e.numero)] = e.status;
                if (e.subetapas) e.subetapas.forEach(s => { etapasMap[String(s.numero)] = s.status; });
            });
        }

        etapasConfig.forEach(cfg => {
            const status   = etapasMap[cfg.num];
            const concluida = status === 'CONCLUIDA';
            const atual     = status === 'EM_ANDAMENTO';

            const item = document.createElement('div');
            item.className = 'progresso-item' +
                (cfg.sub    ? ' subetapa'  : '') +
                (concluida  ? ' concluida' : '') +
                (atual      ? ' atual'     : '') +
                (!status    ? ' pendente'  : '');

            const circulo = document.createElement('div');
            circulo.className = 'progresso-circulo';
            circulo.innerHTML = concluida
                ? `<svg class="progresso-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                : cfg.num;

            const label = document.createElement('div');
            label.className  = 'progresso-label';
            label.textContent = cfg.label;

            item.appendChild(circulo);
            item.appendChild(label);
            container.appendChild(item);
        });
    }

    function renderEtapaAtualPanel(chamado) {
        const etapa = getEtapaAtiva(chamado);
        const categoriaLabel = {
            'SOLICITANTE':    'Solicitante',
            'ADMINISTRATIVO': 'Adm. de Manutenção',
            'TECNICO':        'Técnico de Manutenção',
            'COMPRADOR':      'Comprador',
            'GESTOR':         'Gestor'
        };

        const icone = document.getElementById('etapaAtualIcone');
        const titulo = document.getElementById('etapaAtualTitulo');
        const resp   = document.getElementById('etapaAtualResponsavel');
        const perm   = document.getElementById('etapaAtualPermissao');

        if (!etapa) {
            if (icone)  icone.textContent  = '✓';
            if (titulo) titulo.textContent = 'Chamado Finalizado';
            if (resp)   resp.textContent   = '-';
            if (perm)   { perm.textContent = '✓ Todas as etapas concluídas'; perm.style.color = '#059669'; }
            return;
        }

        if (icone)  icone.textContent  = String(etapa.numero);
        if (titulo) titulo.textContent = etapa.titulo;
        if (resp)   resp.textContent   = categoriaLabel[etapa.categoria] || etapa.categoria;

        if (perm) {
            const pode = podeAtenderEtapa(etapa, usuarioAtual.perfil);
            perm.textContent   = pode
                ? 'Você pode atender esta etapa — acesse a aba Formulário'
                : 'Sem permissão para atender esta etapa';
            perm.style.color       = pode ? '#059669' : '#6b7280';
            perm.style.borderColor = pode ? '#a7f3d0' : '#e5e7eb';
            perm.style.background  = pode ? '#ecfdf5' : '#f9fafb';
        }
    }

    function renderMensagens(chamado) {
        const container = document.getElementById('historyMessages');
        if (!container) return;
        container.innerHTML = '';

        const mensagens = [];
        if (chamado.etapas) {
            chamado.etapas.forEach(etapa => {
                if (etapa.status === 'CONCLUIDA' && etapa.conclusao)
                    mensagens.push({ numero: etapa.numero, titulo: etapa.titulo, categoria: etapa.categoria, usuario: etapa.conclusao.usuario, dataHora: etapa.conclusao.dataHora, dados: etapa.dados });
                if (etapa.subetapas) {
                    etapa.subetapas.forEach(sub => {
                        if (sub.status === 'CONCLUIDA' && sub.conclusao)
                            mensagens.push({ numero: sub.numero, titulo: sub.titulo, categoria: sub.categoria, usuario: sub.conclusao.usuario, dataHora: sub.conclusao.dataHora, dados: sub.dados });
                    });
                }
            });
        }

        const badgeEl = document.getElementById('badgeMensagens');
        if (badgeEl) badgeEl.textContent = mensagens.length;

        if (mensagens.length === 0) {
            container.innerHTML = '<p style="color:#9ca3af;font-size:14px;font-style:italic;padding:20px 0;">Nenhuma etapa concluída ainda.</p>';
            return;
        }

        const badgeClasses = { SOLICITANTE: 'badge-solicitante', TECNICO: 'badge-tecnico', ADMINISTRATIVO: 'badge-administrativo', COMPRADOR: 'badge-comprador', GESTOR: 'badge-admin' };
        const catLabels    = { SOLICITANTE: 'Solicitante', TECNICO: 'Técnico', ADMINISTRATIVO: 'Administração', COMPRADOR: 'Comprador', GESTOR: 'Gestor' };

        mensagens.forEach((msg, idx) => {
            const partes  = (msg.usuario || 'US').split(' ');
            const iniciais = (partes.length >= 2 ? partes[0][0] + partes[partes.length-1][0] : (msg.usuario||'US').substring(0,2)).toUpperCase();
            const observacao = msg.dados?.observacao || msg.dados?.descricaoTecnica || msg.dados?.descricaoServico || msg.dados?.observacaoFinal || '';

            const card   = document.createElement('div');
            card.className = 'chamado-mensagem-card';
            const bodyId   = `msg-body-${idx}`;

            card.innerHTML = `
                <div class="chamado-mensagem-header chamado-mensagem-header-toggle" data-target="${bodyId}">
                    <svg class="msg-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span class="chamado-mensagem-num">Mensagem ${idx + 1}</span>
                    <span class="chamado-mensagem-perfil-badge ${badgeClasses[msg.categoria] || 'badge-admin'}">${catLabels[msg.categoria] || msg.categoria}</span>
                    <span class="chamado-mensagem-etapa-tag">Etapa ${msg.numero}</span>
                </div>
                <div class="chamado-mensagem-body" id="${bodyId}">
                    <div class="chamado-mensagem-autor">
                        <div class="chamado-mensagem-avatar">${iniciais}</div>
                        <div class="chamado-mensagem-autor-info">
                            <span class="chamado-mensagem-nome">${msg.usuario}</span>
                            <span class="chamado-mensagem-data">${formatarDataHora(msg.dataHora)}</span>
                        </div>
                    </div>
                    <div class="chamado-mensagem-campos">
                        <div class="chamado-mensagem-campo">
                            <div class="chamado-mensagem-campo-label">Observação</div>
                            <div class="chamado-mensagem-campo-valor">${observacao || 'Etapa concluída.'}</div>
                        </div>
                    </div>
                </div>`;

            card.querySelector('.chamado-mensagem-header-toggle').addEventListener('click', function () {
                const body = document.getElementById(bodyId);
                const icon = this.querySelector('.msg-toggle-icon');
                const isOpen = !body.classList.contains('collapsed');
                body.classList.toggle('collapsed', isOpen);
                icon.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
            });

            container.appendChild(card);
        });
    }

    function renderFormularioAba(chamado) {
        const container = document.getElementById('chamadoFormularioContainer');
        if (!container) return;

        const etapa = getEtapaAtiva(chamado);
        if (!etapa) {
            container.innerHTML = chamado.status === 'FINALIZADO'
                ? '<p style="color:#10b981;font-weight:600;padding:20px 0;">✓ Chamado finalizado com sucesso.</p>'
                : '<p style="color:#9ca3af;font-size:14px;padding:20px 0;font-style:italic;">Nenhuma etapa ativa.</p>';
            return;
        }

        if (!podeAtenderEtapa(etapa, usuarioAtual.perfil)) {
            container.innerHTML = `
                <div style="padding:24px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;text-align:center;">
                    <p style="color:#6b7280;font-size:14px;font-weight:500;">Você não tem permissão para atender esta etapa.</p>
                    <p style="color:#9ca3af;font-size:12px;margin-top:6px;">Responsável: <strong>${etapa.categoria}</strong></p>
                </div>`;
            return;
        }

        if (typeof window.RenderizadorEtapas !== 'undefined') {
            container.innerHTML = '';
            const renderizador = new window.RenderizadorEtapas('chamadoFormularioContainer', chamado, usuarioAtual);
            window.renderizadorAtual = renderizador;
            container.appendChild(renderizador.criarConteudo(etapa));
        }
    }

    // Troca de abas
    document.querySelectorAll('.chamado-aba-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const aba = btn.dataset.aba;
            document.querySelectorAll('.chamado-aba-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.chamado-aba-conteudo').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('aba-' + aba)?.classList.add('active');
        });
    });

    if (btnVoltarDetalhes) {
        btnVoltarDetalhes.addEventListener('click', () => {
            ticketDetailsScreen.classList.remove('active');
            currentTicketId = null;
            renderTickets('entrada');
            renderTickets('log');
            renderTickets('saida');
        });
    }

    // ==================== FUNÇÕES AUXILIARES ==================== //
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
        return formatarData(data) + ', ' + formatarHora(data);
    }

    // ==================== ACESSIBILIDADE ==================== //
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (sidebar?.classList.contains('open')) closeSidebar();
        if (newTicketScreen?.classList.contains('active')) closeTicketScreen();
        if (ticketDetailsScreen?.classList.contains('active')) {
            ticketDetailsScreen.classList.remove('active');
            currentTicketId = null;
        }
    });

    console.log('✅ Sistema iniciado | Usuário:', usuarioAtual.usuario, '| Perfil:', usuarioAtual.perfil);
});