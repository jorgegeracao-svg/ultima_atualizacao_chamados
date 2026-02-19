// ==================== INTEGRAÇÃO ENTRE LOGIN E SISTEMA PRINCIPAL ==================== //

// ==================== VERIFICAÇÃO DE AUTENTICAÇÃO ==================== //

function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    
    // Se não estiver na página de login e não tiver usuário, redireciona
    if (!window.location.pathname.includes('login.html') && !currentUser) {
        window.location.href = 'login.html';
        return null;
    }

    if (!currentUser) return null;

    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const user = usuarios.find(u => u.usuario === currentUser);

    if (!user) {
        localStorage.removeItem('currentUser');
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
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
    const user = checkAuth();
    
    if (!profile || !user) return;

    // Elemento de configurações na navegação
    const configNav = document.querySelector('.nav-settings');
    
    // Mostrar/ocultar configurações baseado no perfil
    if (configNav) {
        if (profile === 'ADMIN') {
            configNav.style.display = 'block';
        } else {
            configNav.style.display = 'none';
        }
    }

    // Atualizar informações do usuário na sidebar
    const userNameElement = document.querySelector('.user-name');
    const userEmailElement = document.querySelector('.user-email');
    const userAvatarElement = document.querySelector('.user-avatar');
    
    if (userNameElement) {
        userNameElement.textContent = user.nomeCompleto;
    }
    
    if (userEmailElement) {
        const perfilNomes = {
            'ADMIN': 'Administrador',
            'SOLICITANTE': 'Solicitante',
            'TECNICO': 'Técnico',
            'ADMINISTRATIVO': 'Administrativo',
            'COMPRADOR': 'Comprador'
        };
        userEmailElement.textContent = perfilNomes[user.perfil] || user.perfil;
    }

    if (userAvatarElement) {
        // Pegar iniciais do nome
        const nomes = user.nomeCompleto.split(' ');
        let iniciais = '';
        if (nomes.length >= 2) {
            iniciais = nomes[0][0] + nomes[nomes.length - 1][0];
        } else {
            iniciais = nomes[0][0] + (nomes[0][1] || '');
        }
        userAvatarElement.textContent = iniciais.toUpperCase();
    }
}

// ==================== LOGOUT ==================== //

function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberMe');
        window.location.href = 'login.html';
    }
}

// ==================== INICIALIZAÇÃO ==================== //

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se está na página de login
    if (window.location.pathname.includes('login.html')) {
        // Se já está logado, redirecionar para o sistema
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            window.location.href = 'index.html';
        }
        return;
    }

    // Verificar autenticação nas outras páginas
    const user = checkAuth();
    
    if (user) {
        // Configurar permissões e informações do usuário
        showElementsByPermission();

        // Adicionar evento de logout ao clicar no perfil do usuário
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            // Remover cursor pointer padrão e adicionar apenas no botão de logout
            userProfile.style.cursor = 'default';
        }
    }
});

// ==================== FUNÇÕES AUXILIARES DE PERMISSÃO ==================== //

// Exemplo: Verificar permissão antes de abrir tela
function abrirTelaUsuarios() {
    if (!hasPermission(['ADMIN'])) {
        alert('Você não tem permissão para acessar esta área!');
        return;
    }
    // Código para abrir tela de usuários
}

// Exemplo: Verificar permissão antes de salvar
function salvarCategoria() {
    if (!hasPermission(['ADMIN', 'TECNICO', 'ADMINISTRATIVO'])) {
        alert('Você não tem permissão para editar categorias!');
        return;
    }
    // Código para salvar categoria
}

// Exemplo: Obter dados do usuário atual
function getChamadosDoUsuario() {
    const user = checkAuth();
    if (!user) return [];

    const chamados = JSON.parse(localStorage.getItem('chamados') || '[]');
    
    if (user.perfil === 'ADMIN' || user.perfil === 'TECNICO' || user.perfil === 'ADMINISTRATIVO') {
        // Admin, técnico e administrativo veem todos
        return chamados;
    } else {
        // Outros veem apenas os seus
        return chamados.filter(c => c.solicitante === user.usuario);
    }
}

// ==================== EXPORTAR FUNÇÕES ==================== //
window.checkAuth = checkAuth;
window.getUserProfile = getUserProfile;
window.hasPermission = hasPermission;
window.logout = logout;
window.showElementsByPermission = showElementsByPermission;
