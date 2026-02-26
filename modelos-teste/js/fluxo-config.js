// =============================================================================
// FLUXO-CONFIG.JS — Configuração centralizada do fluxo de Manutenção Canteiros
//
// Fonte única de verdade para as etapas do fluxo.
// Usada por: renderProgresso, renderResumoFluxo, sumário de etapas.
//
// Para adicionar/renomear uma etapa: edite APENAS este arquivo.
// =============================================================================

window.FLUXO_MANUTENCAO = [
    { num: '1',   label: 'Abertura do Chamado',       categoria: 'SOLICITANTE'    },
    { num: '2',   label: 'Agendamento da Avaliação',  categoria: 'ADMINISTRATIVO' },
    { num: '3',   label: 'Avaliação Técnica',         categoria: 'TECNICO'        },
    { num: '4',   label: 'Verificação de Estoque',    categoria: 'TECNICO'        },
    { num: '5.1', label: 'Solicitação de Compra',     categoria: 'ADMINISTRATIVO', sub: true },
    { num: '5.2', label: 'Pedido de Compra',          categoria: 'COMPRADOR',      sub: true },
    { num: '5.3', label: 'Programar Entrega',         categoria: 'COMPRADOR',      sub: true },
    { num: '6',   label: 'Recebimento de Mercadoria', categoria: 'ADMINISTRATIVO' },
    { num: '7',   label: 'Programação do Serviço',    categoria: 'ADMINISTRATIVO' },
    { num: '8',   label: 'Execução da Manutenção',    categoria: 'TECNICO'        },
    { num: '9',   label: 'Finalização do Chamado',    categoria: 'SOLICITANTE'    }
];