// ==================== STORAGE E DADOS ==================== //

// Classe para gerenciar localStorage
class Storage {
    static getUsuarios() {
        const data = localStorage.getItem('usuarios');
        return data ? JSON.parse(data) : [];
    }

    static saveUsuarios(usuarios) {
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
    }

    static getCurrentUserLogin() {
        return localStorage.getItem('currentUser');
    }

    static setCurrentUserLogin(username) {
        localStorage.setItem('currentUser', username);
    }

    static removeCurrentUserLogin() {
        localStorage.removeItem('currentUser');
    }

    static getCategorias() {
        const data = localStorage.getItem('categorias');
        return data ? JSON.parse(data) : [];
    }

    static saveCategorias(categorias) {
        localStorage.setItem('categorias', JSON.stringify(categorias));
    }
}

// Inicializar usuários padrão
function initUsuarios() {
    let usuarios = Storage.getUsuarios();
    if (usuarios.length === 0) {
        usuarios = [
            {
                id: 1,
                nomeCompleto: "Administrador do Sistema",
                re: "00000",
                cargo: "Administrador",
                localTrabalho: "Administrativo",
                gestor: "",
                gerente: "",
                perfil: "ADMIN",
                status: "Ativo",
                usuario: "admin",
                senha: "admin",
                foto: null,
                dataCadastro: new Date().toISOString()
            },
            {
                id: 2,
                nomeCompleto: "Felipe Jorge",
                re: "12345",
                cargo: "Solicitante",
                localTrabalho: "Canteiro A",
                gestor: "Caian Silva",
                gerente: "Pedro Costa",
                perfil: "SOLICITANTE",
                status: "Ativo",
                usuario: "felipe.jorge",
                senha: "123456",
                foto: null,
                dataCadastro: new Date().toISOString()
            },
            {
                id: 3,
                nomeCompleto: "Thiago Santos",
                re: "12346",
                cargo: "Técnico de Manutenção",
                localTrabalho: "Manutenção",
                gestor: "João Santos",
                gerente: "Ana Lima",
                perfil: "TECNICO",
                status: "Ativo",
                usuario: "thiago.santos",
                senha: "123456",
                foto: null,
                dataCadastro: new Date().toISOString()
            },
            {
                id: 4,
                nomeCompleto: "Carlos Eduardo",
                re: "12347",
                cargo: "Administrativo da Manutenção",
                localTrabalho: "Manutenção",
                gestor: "João Santos",
                gerente: "Ana Lima",
                perfil: "ADMINISTRATIVO",
                status: "Ativo",
                usuario: "carlos.eduardo",
                senha: "123456",
                foto: null,
                dataCadastro: new Date().toISOString()
            },
            {
                id: 5,
                nomeCompleto: "Robert Silva",
                re: "12348",
                cargo: "Comprador",
                localTrabalho: "Compras",
                gestor: "Maria Oliveira",
                gerente: "Carlos Souza",
                perfil: "COMPRADOR",
                status: "Ativo",
                usuario: "robert.silva",
                senha: "123456",
                foto: null,
                dataCadastro: new Date().toISOString()
            }
        ];
        Storage.saveUsuarios(usuarios);
    }
}

// Inicializar categorias padrão
function initCategorias() {
    let categorias = Storage.getCategorias();
    if (categorias.length === 0) {
        categorias = [
            { id: 1, nome: "Elétrica", descricao: "Problemas elétricos em geral", ativo: true },
            { id: 2, nome: "Hidráulica", descricao: "Vazamentos e problemas hidráulicos", ativo: true },
            { id: 3, nome: "TI - Hardware", descricao: "Problemas com computadores e equipamentos", ativo: true },
            { id: 4, nome: "TI - Software", descricao: "Problemas com sistemas e programas", ativo: true },
            { id: 5, nome: "Ar Condicionado", descricao: "Manutenção de ar condicionado", ativo: true },
            { id: 6, nome: "Estrutura", descricao: "Problemas estruturais do prédio", ativo: true },
            { id: 7, nome: "Limpeza", descricao: "Solicitações de limpeza", ativo: true },
            { id: 8, nome: "Outros", descricao: "Outras solicitações", ativo: true }
        ];
        Storage.saveCategorias(categorias);
    }
}

// ==================== FUNÇÕES DE UTILIDADE ==================== //

function showAlert(message, type = 'success') {
    const alert = document.getElementById('loginAlert');
    if (!alert) return;

    alert.textContent = message;
    alert.className = `alert ${type} show`;

    setTimeout(() => {
        alert.classList.remove('show');
    }, 4000);
}

// ==================== INICIALIZAÇÃO ==================== //

document.addEventListener('DOMContentLoaded', function() {
    
    // Inicializar dados
    initUsuarios();
    initCategorias();

    // Elementos do DOM
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOffIcon = document.getElementById('eyeOffIcon');
    
    // Modal de recuperação de senha
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeModal = document.getElementById('closeModal');
    const cancelRecovery = document.getElementById('cancelRecovery');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');

    // ==================== TOGGLE SENHA ====================
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            
            // Alternar tipo do input
            passwordInput.type = isPassword ? 'text' : 'password';
            
            // Alternar ícones
            eyeIcon.classList.toggle('hidden');
            eyeOffIcon.classList.toggle('hidden');
        });
    }

    // ==================== SUBMIT DO FORMULÁRIO ====================
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = passwordInput.value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // Validação básica
            if (!username || !password) {
                showAlert('Por favor, preencha todos os campos', 'error');
                return;
            }

            // Buscar usuário
            const usuarios = Storage.getUsuarios();
            const user = usuarios.find(u => u.usuario === username && u.senha === password);

            if (!user) {
                showAlert('Usuário ou senha incorretos!', 'error');
                return;
            }

            // Verificar status do usuário
            if (user.status === 'Desligado' || user.status === 'Inativo') {
                showAlert('Usuário desligado. Entre em contato com o administrador.', 'error');
                return;
            }

            // Salvar login
            Storage.setCurrentUserLogin(user.usuario);
            
            // Se marcou "Lembrar-me"
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }

            showAlert('Login realizado com sucesso!', 'success');
            
            // Redirecionar após 1 segundo
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }

    // ==================== MODAL ESQUECEU A SENHA ====================
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPasswordModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    function closeRecoveryModal() {
        forgotPasswordModal.classList.remove('active');
        document.body.style.overflow = '';
        forgotPasswordForm.reset();
    }

    if (closeModal) {
        closeModal.addEventListener('click', closeRecoveryModal);
    }

    if (cancelRecovery) {
        cancelRecovery.addEventListener('click', closeRecoveryModal);
    }

    // Fechar modal ao clicar fora
    if (forgotPasswordModal) {
        forgotPasswordModal.addEventListener('click', (e) => {
            if (e.target === forgotPasswordModal) {
                closeRecoveryModal();
            }
        });
    }

    // ==================== SUBMIT RECUPERAÇÃO DE SENHA ====================
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const recoveryUsername = document.getElementById('recoveryUsername').value.trim();
            
            if (!recoveryUsername) {
                alert('Por favor, insira seu usuário');
                return;
            }

            // Verificar se usuário existe
            const usuarios = Storage.getUsuarios();
            const user = usuarios.find(u => u.usuario === recoveryUsername);

            if (!user) {
                alert('Usuário não encontrado!');
                return;
            }

            // Aqui você enviaria o e-mail de recuperação
            console.log('Recuperação de senha para:', recoveryUsername);
            
            alert('Instruções de recuperação foram enviadas para o administrador. Entre em contato para resetar sua senha.');
            closeRecoveryModal();
        });
    }

    // ==================== ACESSIBILIDADE ====================
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && forgotPasswordModal.classList.contains('active')) {
            closeRecoveryModal();
        }
    });

    // ==================== AUTO-FOCUS NO USUÁRIO ====================
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }

    console.log('✅ Sistema de login inicializado!');
    console.log('Usuários disponíveis:');
    console.log('- admin / admin (ADMIN)');
    console.log('- felipe.jorge / 123456 (SOLICITANTE)');
    console.log('- thiago.santos / 123456 (TECNICO)');
    console.log('- carlos.eduardo / 123456 (ADMINISTRATIVO)');
    console.log('- robert.silva / 123456 (COMPRADOR)');
});

// ==================== INTEGRAÇÃO COM SISTEMA PRINCIPAL ==================== //

// Este arquivo deve ser incluído no seu index.html (sistema principal)
// <script src="auth-integration.js"></script>

// ==================== VERIFICAÇÃO DE AUTENTICAÇÃO ==================== //

function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        // Redirecionar para login se não estiver autenticado
        window.location.href = 'login.html';
        return null;
    }

    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const user = usuarios.find(u => u.usuario === currentUser);

    if (!user) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return null;
    }

    return user;
}

// ==================== FUNÇÕES DE PERFIL E PERMISSÕES ==================== //

function getUserProfile() {
    const user = checkAuth();
    return user ? user.perfil : null;
}

function hasPermission(allowedProfiles) {
    const profile = getUserProfile();
    return profile && allowedProfiles.includes(profile);
}

function showElementsByPermission() {
    const profile = getUserProfile();
    
    // Ocultar/mostrar menus baseado no perfil
    const menuAdmin = document.getElementById('menuAdmin');
    const menuCategorias = document.getElementById('menuCategorias');
    const menuUsuarios = document.getElementById('menuUsuarios');
    
    if (profile === 'ADMIN') {
        // Admin vê tudo
        if (menuAdmin) menuAdmin.classList.remove('hidden');
        if (menuCategorias) menuCategorias.classList.remove('hidden');
        if (menuUsuarios) menuUsuarios.classList.remove('hidden');
    } else if (profile === 'TECNICO' || profile === 'ADMINISTRATIVO') {
        // Técnicos veem apenas categorias
        if (menuCategorias) menuCategorias.classList.remove('hidden');
    }
}

// ==================== LOGOUT ==================== //

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberMe');
    window.location.href = 'login.html';
}

// ==================== INICIALIZAÇÃO ==================== //

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se está na página de login
    if (window.location.pathname.includes('login.html')) {
        return; // Não faz verificação na página de login
    }

    // Verificar autenticação
    const user = checkAuth();
    
    if (user) {
        // Exibir informações do usuário
        const userNameElement = document.getElementById('currentUserName');
        const userProfileElement = document.getElementById('currentUserProfile');
        
        if (userNameElement) {
            userNameElement.textContent = user.nomeCompleto;
        }
        
        if (userProfileElement) {
            const perfilNomes = {
                'ADMIN': 'Administrador',
                'SOLICITANTE': 'Solicitante',
                'TECNICO': 'Técnico',
                'ADMINISTRATIVO': 'Administrativo',
                'COMPRADOR': 'Comprador'
            };
            userProfileElement.textContent = perfilNomes[user.perfil] || user.perfil;
        }

        // Configurar permissões
        showElementsByPermission();

        // Adicionar evento de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Deseja realmente sair do sistema?')) {
                    logout();
                }
            });
        }
    }
});

// ==================== EXEMPLO DE USO NAS TELAS ==================== //

// Exemplo 1: Verificar permissão antes de abrir tela
function abrirTelaUsuarios() {
    if (!hasPermission(['ADMIN'])) {
        alert('Você não tem permissão para acessar esta área!');
        return;
    }
    // Código para abrir tela de usuários
}

// Exemplo 2: Verificar permissão antes de salvar
function salvarCategoria() {
    if (!hasPermission(['ADMIN', 'TECNICO', 'ADMINISTRATIVO'])) {
        alert('Você não tem permissão para editar categorias!');
        return;
    }
    // Código para salvar categoria
}

// Exemplo 3: Obter dados do usuário atual
function getChamadosDoUsuario() {
    const user = checkAuth();
    if (!user) return [];

    const chamados = JSON.parse(localStorage.getItem('chamados') || '[]');
    
    if (user.perfil === 'ADMIN' || user.perfil === 'TECNICO') {
        // Admin e técnico veem todos
        return chamados;
    } else {
        // Outros veem apenas os seus
        return chamados.filter(c => c.solicitante === user.usuario);
    }
}