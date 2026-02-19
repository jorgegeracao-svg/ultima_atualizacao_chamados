// ==================== SISTEMA DE FLUXO DE CHAMADOS ==================== //

class Chamado {
    constructor(id, titulo, observacao, unidade, solicitante) {
        this.id = id;
        this.titulo = titulo;
        this.dataCriacao = new Date();
        this.status = 'EM_ANDAMENTO';
        this.solicitante = solicitante;
        this.etapas = [];

        this.criarEtapa1(observacao, unidade, solicitante);
    }

    // ==================== ETAPA 1 - ABERTURA DO CHAMADO ====================
    criarEtapa1(observacao, unidade, solicitante) {
        const etapa1 = {
            numero: 1,
            titulo: 'Abertura do Chamado',
            categoria: 'SOLICITANTE',
            status: 'CONCLUIDA',
            expandida: false,
            dados: { observacao, unidade },
            conclusao: {
                usuario: solicitante.nomeCompleto,
                dataHora: new Date()
            }
        };
        this.etapas.push(etapa1);
        this.criarEtapa2();
    }

    // ==================== ETAPA 2 - AGENDAMENTO DA AVALIAÇÃO ====================
    criarEtapa2() {
        this.etapas.push({
            numero: 2,
            titulo: 'Agendamento da Avaliação',
            categoria: 'ADMINISTRATIVO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    concluirEtapa2(dataAgendamento, horaAgendamento, usuario) {
        const etapa = this.etapas.find(e => e.numero === 2);
        if (etapa) {
            etapa.dados = { dataAgendamento, horaAgendamento };
            etapa.status = 'CONCLUIDA';
            etapa.expandida = false;
            etapa.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };
            this.criarEtapa3();
        }
    }

    // ==================== ETAPA 3 - AVALIAÇÃO TÉCNICA ====================
    criarEtapa3() {
        this.etapas.push({
            numero: 3,
            titulo: 'Avaliação Técnica',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    concluirEtapa3(descricaoTecnica, materiaisNecessarios, usuario) {
        const etapa = this.etapas.find(e => e.numero === 3);
        if (etapa) {
            etapa.dados = { descricaoTecnica, materiaisNecessarios };
            etapa.status = 'CONCLUIDA';
            etapa.expandida = false;
            etapa.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };
            this.criarEtapa4();
        }
    }

    // ==================== ETAPA 4 - VERIFICAÇÃO DE ESTOQUE ====================
    criarEtapa4() {
        this.etapas.push({
            numero: 4,
            titulo: 'Verificação de Estoque',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    concluirEtapa4(possuiEstoque, usuario) {
        const etapa = this.etapas.find(e => e.numero === 4);
        if (etapa) {
            etapa.dados.possuiEstoque = possuiEstoque;
            etapa.status = 'CONCLUIDA';
            etapa.expandida = false;
            etapa.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };

            if (possuiEstoque === 'SIM') {
                this.criarEtapa7();
            } else {
                this.criarEtapa5();
            }
        }
    }

    // ==================== ETAPA 5 - PROCESSO DE COMPRA (com subetapas) ====================
    criarEtapa5() {
        const etapa5 = {
            numero: 5,
            titulo: 'Processo de Compra',
            categoria: 'COMPRADOR',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null,
            subetapas: []
        };
        this.etapas.push(etapa5);
        this.criarSubetapa51();
    }

    // ---- 5.1 - SOLICITAÇÃO DE COMPRA ----
    criarSubetapa51() {
        const etapa5 = this.etapas.find(e => e.numero === 5);
        if (etapa5) {
            etapa5.subetapas.push({
                numero: 5.1,
                titulo: 'Solicitação de Compra',
                categoria: 'ADMINISTRATIVO',
                status: 'EM_ANDAMENTO',
                expandida: true,
                dados: {},
                conclusao: null,
                historicoReprovacoes: []
            });
        }
    }

    concluirSubetapa51(itens, justificativa, urgencia, usuario) {
        const etapa5 = this.etapas.find(e => e.numero === 5);
        if (etapa5) {
            const sub = etapa5.subetapas.find(s => s.numero === 5.1);
            if (sub) {
                sub.dados = { itens, justificativa, urgencia };
                sub.status = 'CONCLUIDA';
                sub.expandida = false;
                sub.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };
                this.criarSubetapa52();
            }
        }
    }

    // ---- 5.2 - PEDIDO DE COMPRA ----
    criarSubetapa52() {
        const etapa5 = this.etapas.find(e => e.numero === 5);
        if (etapa5) {
            etapa5.subetapas.push({
                numero: 5.2,
                titulo: 'Pedido de Compra',
                categoria: 'COMPRADOR',
                status: 'EM_ANDAMENTO',
                expandida: true,
                dados: {
                    produtos: [
                        { produto: '', quantidade: '', valorUnitario: '' },
                        { produto: '', quantidade: '', valorUnitario: '' },
                        { produto: '', quantidade: '', valorUnitario: '' }
                    ]
                },
                conclusao: null
            });
        }
    }

    concluirSubetapa52(numeroPedido, fornecedor, produtos, valorTotal, observacao, anexo, usuario) {
        const etapa5 = this.etapas.find(e => e.numero === 5);
        if (etapa5) {
            const sub = etapa5.subetapas.find(s => s.numero === 5.2);
            if (sub) {
                sub.dados = { numeroPedido, fornecedor, produtos, valorTotal, observacao, anexo };
                sub.status = 'CONCLUIDA';
                sub.expandida = false;
                sub.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };
                this.criarSubetapa53();
            }
        }
    }

    // ---- 5.3 - PROGRAMAR ENTREGA ----
    criarSubetapa53() {
        const etapa5 = this.etapas.find(e => e.numero === 5);
        if (etapa5) {
            etapa5.subetapas.push({
                numero: 5.3,
                titulo: 'Programar Entrega',
                categoria: 'COMPRADOR',
                status: 'EM_ANDAMENTO',
                expandida: true,
                dados: {},
                conclusao: null
            });
        }
    }

    concluirSubetapa53(dataEntrega, horaEntrega, localEntrega, observacao, usuario) {
        const etapa5 = this.etapas.find(e => e.numero === 5);
        if (etapa5) {
            const sub = etapa5.subetapas.find(s => s.numero === 5.3);
            if (sub) {
                sub.dados = { dataEntrega, horaEntrega, localEntrega, observacao };
                sub.status = 'CONCLUIDA';
                sub.expandida = false;
                sub.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };
                etapa5.status = 'EM_ANDAMENTO';
                this.criarEtapa6();
            }
        }
    }

    // ==================== ETAPA 6 - RECEBIMENTO DE MERCADORIA ====================
    criarEtapa6() {
        this.etapas.push({
            numero: 6,
            titulo: 'Recebimento de Mercadoria',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    concluirEtapa6(dataRecebimento, numeroNF, observacao, fotos, usuario) {
        const etapa = this.etapas.find(e => e.numero === 6);
        if (etapa) {
            etapa.dados = { dataRecebimento, numeroNF, observacao, fotos };
            etapa.status = 'CONCLUIDA';
            etapa.expandida = false;
            etapa.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };

            const etapa5 = this.etapas.find(e => e.numero === 5);
            if (etapa5) {
                etapa5.status = 'CONCLUIDA';
                etapa5.expandida = false;
                etapa5.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };
            }

            this.criarEtapa7();
        }
    }

    // ==================== ETAPA 7 - PROGRAMAÇÃO DO SERVIÇO ====================
    criarEtapa7() {
        this.etapas.push({
            numero: 7,
            titulo: 'Programação do Serviço',
            categoria: 'ADMINISTRATIVO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    concluirEtapa7(dataServico, horaServico, tecnicoResponsavel, observacao, usuario) {
        const etapa = this.etapas.find(e => e.numero === 7);
        if (etapa) {
            etapa.dados = { dataServico, horaServico, tecnicoResponsavel, observacao };
            etapa.status = 'CONCLUIDA';
            etapa.expandida = false;
            etapa.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };
            this.criarEtapa8();
        }
    }

    // ==================== ETAPA 8 - EXECUÇÃO DA MANUTENÇÃO ====================
    criarEtapa8() {
        this.etapas.push({
            numero: 8,
            titulo: 'Execução da Manutenção',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    concluirEtapa8(descricaoServico, materiaisUsados, fotos, usuario) {
        const etapa = this.etapas.find(e => e.numero === 8);
        if (etapa) {
            etapa.dados = { descricaoServico, materiaisUsados, fotos };
            etapa.status = 'CONCLUIDA';
            etapa.expandida = false;
            etapa.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };
            this.criarEtapa9();
        }
    }

    // ==================== ETAPA 9 - FINALIZAÇÃO DO CHAMADO ====================
    criarEtapa9() {
        this.etapas.push({
            numero: 9,
            titulo: 'Finalização do Chamado',
            categoria: 'SOLICITANTE',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    concluirEtapa9(confirmacao, avaliacao, observacaoFinal, usuario) {
        const etapa = this.etapas.find(e => e.numero === 9);
        if (etapa) {
            etapa.dados = { confirmacao, avaliacao, observacaoFinal };
            etapa.status = 'CONCLUIDA';
            etapa.expandida = false;
            etapa.conclusao = { usuario: usuario.nomeCompleto, dataHora: new Date() };
            this.status = 'FINALIZADO';
        }
    }

    // ==================== PERMISSÕES ====================
    podeEditarEtapa(etapaNumero, usuarioPerfil) {
        let etapa;

        if (Number.isInteger(etapaNumero)) {
            etapa = this.etapas.find(e => e.numero === etapaNumero);
        } else {
            const etapa5 = this.etapas.find(e => e.numero === 5);
            if (etapa5 && etapa5.subetapas) {
                etapa = etapa5.subetapas.find(s => Math.abs(s.numero - etapaNumero) < 0.01);
            }
        }

        if (!etapa) return false;
        if (etapa.status === 'CONCLUIDA') return false;

        const categoriaMap = {
            'SOLICITANTE':    ['SOLICITANTE'],
            'ADMINISTRATIVO': ['ADMINISTRATIVO', 'ADMIN'],
            'TECNICO':        ['TECNICO', 'ADMIN'],
            'COMPRADOR':      ['COMPRADOR', 'ADMIN'],
            'GESTOR':         ['ADMIN']
        };

        const perfisPermitidos = categoriaMap[etapa.categoria] || [];
        return perfisPermitidos.includes(usuarioPerfil);
    }

    toggleEtapa(etapaNumero) {
        let etapa;

        if (Number.isInteger(etapaNumero)) {
            etapa = this.etapas.find(e => e.numero === etapaNumero);
        } else {
            const etapa5 = this.etapas.find(e => e.numero === 5);
            if (etapa5 && etapa5.subetapas) {
                etapa = etapa5.subetapas.find(s => Math.abs(s.numero - etapaNumero) < 0.01);
            }
        }

        if (etapa) {
            etapa.expandida = !etapa.expandida;
        }
    }
}

// ==================== GERENCIADOR DE CHAMADOS ====================

class GerenciadorChamados {
    constructor() {
        this.chamados = this.carregarChamados();
        this.contadorId = this.chamados.length > 0
            ? Math.max(...this.chamados.map(c => c.id)) + 1
            : 1;
    }

    // ✅ CORREÇÃO: reidratar objetos JSON como instâncias de Chamado
    _reidratar(obj) {
        return Object.assign(Object.create(Chamado.prototype), obj);
    }

    carregarChamados() {
        const dados = localStorage.getItem('chamadosFluxo');
        if (!dados) return [];
        return JSON.parse(dados).map(c => this._reidratar(c));
    }

    salvarChamados() {
        localStorage.setItem('chamadosFluxo', JSON.stringify(this.chamados));
    }

    criarChamado(titulo, observacao, unidade, solicitante) {
        const chamado = new Chamado(this.contadorId++, titulo, observacao, unidade, solicitante);
        this.chamados.push(chamado);
        this.salvarChamados();
        return chamado;
    }

    getChamado(id) {
        const c = this.chamados.find(c => c.id == id);
        return c ? this._reidratar(c) : null;
    }

    getChamadosDoUsuario(usuario) {
        if (usuario.perfil === 'ADMIN') {
            return this.chamados.map(c => this._reidratar(c));
        }

        return this.chamados
            .map(c => this._reidratar(c))
            .filter(chamado => {
                if (chamado.solicitante && chamado.solicitante.usuario === usuario.usuario) return true;

                return chamado.etapas.some(etapa => {
                    if (etapa.status === 'EM_ANDAMENTO') {
                        const categoriaMap = {
                            'SOLICITANTE':    ['SOLICITANTE'],
                            'ADMINISTRATIVO': ['ADMINISTRATIVO'],
                            'TECNICO':        ['TECNICO'],
                            'COMPRADOR':      ['COMPRADOR'],
                            'GESTOR':         ['ADMIN']
                        };
                        const perfisPermitidos = categoriaMap[etapa.categoria] || [];
                        if (perfisPermitidos.includes(usuario.perfil)) return true;
                    }

                    if (etapa.numero === 5 && etapa.subetapas) {
                        return etapa.subetapas.some(sub => {
                            if (sub.status === 'EM_ANDAMENTO') {
                                const categoriaMap = {
                                    'SOLICITANTE':    ['SOLICITANTE'],
                                    'ADMINISTRATIVO': ['ADMINISTRATIVO'],
                                    'TECNICO':        ['TECNICO'],
                                    'COMPRADOR':      ['COMPRADOR']
                                };
                                const perfisPermitidos = categoriaMap[sub.categoria] || [];
                                return perfisPermitidos.includes(usuario.perfil);
                            }
                            return false;
                        });
                    }

                    return false;
                });
            });
    }

    atualizarChamado(chamado) {
        const index = this.chamados.findIndex(c => c.id == chamado.id);
        if (index !== -1) {
            this.chamados[index] = chamado;
            this.salvarChamados();
        }
    }
}

// Exportar para uso global
window.Chamado = Chamado;
window.GerenciadorChamados = GerenciadorChamados;
window.gerenciadorChamados = new GerenciadorChamados();