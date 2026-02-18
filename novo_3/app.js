// ── DADOS ──────────────────────────────────────────────────────────────────────

const USUARIOS = [
  { id: 1, nome: "Ana Souza", categorias: ["Solicitante"] },
  { id: 2, nome: "Bruno Lima", categorias: ["Solicitante", "Administração de Manutenção"] },
  { id: 3, nome: "Carla Mendes", categorias: ["Solicitante", "Técnico de Manutenção"] },
  { id: 4, nome: "Diego Santos", categorias: ["Solicitante", "Comprador"] },
  { id: 5, nome: "Eva Rodrigues", categorias: ["Solicitante", "Gestor"] },
  { id: 6, nome: "Felipe Costa", categorias: ["Solicitante", "Técnico de Manutenção"] },
];

const ETAPAS = {
  1:    { nome: "Abertura do Chamado",       responsavel: "Solicitante",                   descricao: "Descrição do problema pelo solicitante",                           grupo: null },
  2:    { nome: "Agendamento da Avaliação",  responsavel: "Administração de Manutenção",   descricao: "Agendamento da visita técnica",                                    grupo: null },
  3:    { nome: "Avaliação Técnica",          responsavel: "Técnico de Manutenção",         descricao: "Diagnóstico do problema",                                          grupo: null },
  4:    { nome: "Verificação de Estoque",     responsavel: "Técnico de Manutenção",         descricao: "Verificação de disponibilidade de material",                       grupo: null },
  "5.1":{ nome: "Cotação",                    responsavel: "Comprador",                     descricao: "Informar data prevista e enviar os 3 orçamentos",                  grupo: 5, subIdx: 1 },
  "5.2":{ nome: "Envio do Orçamento",         responsavel: "Comprador",                     descricao: "Enviar os 3 orçamentos obtidos para aprovação",                    grupo: 5, subIdx: 2 },
  "5.3":{ nome: "Aprovação do Gestor",        responsavel: "Gestor",                        descricao: "Aprovar ou reprovar os orçamentos — reprovação retorna à Cotação",  grupo: 5, subIdx: 3 },
  "5.4":{ nome: "Programar Entrega",          responsavel: "Comprador",                     descricao: "Informar a data prevista de chegada da mercadoria",                 grupo: 5, subIdx: 4 },
  6:    { nome: "Recebimento de Mercadoria",  responsavel: "Administração de Manutenção",   descricao: "Confirmação do recebimento e nota fiscal",                         grupo: null },
  7:    { nome: "Programação do Serviço",     responsavel: "Técnico de Manutenção",         descricao: "Agendamento da execução",                                          grupo: null },
  8:    { nome: "Execução da Manutenção",     responsavel: "Técnico de Manutenção",         descricao: "Realização e registro do serviço (foto obrigatória)",               grupo: null },
  9:    { nome: "Finalização do Chamado",     responsavel: "Solicitante",                   descricao: "Avaliação e encerramento",                                         grupo: null },
};

const ETAPAS_ORDEM = [1, 2, 3, 4, "5.1", "5.2", "5.3", "5.4", 6, 7, 8, 9];

const CORES = {
  "Solicitante":                 { tag: "#2d5a2d", text: "#7fcf7f", dot: "#4caf50" },
  "Administração de Manutenção": { tag: "#2d2d5a", text: "#7f7fcf", dot: "#5c6bc0" },
  "Técnico de Manutenção":       { tag: "#5a2d2d", text: "#cf7f7f", dot: "#ef5350" },
  "Comprador":                   { tag: "#2d5a5a", text: "#7fcfcf", dot: "#26c6da" },
  "Gestor":                      { tag: "#5a5a2d", text: "#cfcf7f", dot: "#ffa726" },
};

const TIPOS_CHAMADO = [
  { codigo: "MTC.01", nome: "MANUTENÇÃO CANTEIRO", tipo: "mtc" },
  { codigo: "LP.01",  nome: "LANÇAMENTO PESSOA JURÍDICA", tipo: "lp" },
  { codigo: "LJ.01",  nome: "LANÇAMENTO PESSOA FÍSICA",   tipo: "lj" },
];

const UNIDADES_MTC = [
  "CANTEIRO ZONA LESTE", "CANTEIRO ZONA OESTE", "CANTEIRO ZONA SUL",
  "CANTEIRO CAIEIRAS", "HUNGRIA", "BOSQUE",
];

const LOCAIS_MTC = [
  "SALA", "BANHEIRO", "LABORATÓRIO", "MANUTENCAO", "PATIO",
  "ESTOQUE", "BANHEIRO MASCULINO", "BANHEIRO FEMININO", "REFEITÓRIO", "OUTRO",
];

const TIPOS_MANUTENCAO = [
  "ELÉTRICA", "HIDRÁULICA", "CIVIL", "PINTURA",
  "AR CONDICIONADO", "JARDINAGEM", "OUTRO",
];

// ── ESTADO ────────────────────────────────────────────────────────────────────

let usuarioAtual      = null;
let chamados          = [];
let chamadoAberto     = null;
let filtroAtual       = "todos";
let novoAnexo         = null;
let atenderObs        = "";
let atenderAnexo      = null;
let atenderMaterial   = null;
let atenderAprovacao  = null;
let atenderAvaliacao  = 0;
let modoAtender       = false;
let abaAtiva          = "mensagens";

// Estado etapa 3
let atenderTipoServico   = null;
let atenderProdutos      = [{ nome: "", qtd: "" }];

let novoTipoSelecionado    = null;
let novoSearchQuery        = "";
let novoUnidade            = "";
let novoLocal              = "";
let novoLocalOutro         = "";
let novoTiposManutencao    = [];
let novoTipoManutencaoOutro = "";
let novoTitulo             = "";
let novoDesc               = "";

// ── UTILS ─────────────────────────────────────────────────────────────────────

function gerarId() {
  const ano = new Date().getFullYear();
  const seq = String(chamados.length + 1).padStart(4, "0");
  return Number(`${ano}${seq}`);
}

function dataAgora() {
  return new Date().toLocaleString("pt-BR", {
    day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
  });
}

function mostrarNotif(msg, tipo = "ok") {
  const el = document.getElementById("notif");
  el.className = "show " + tipo;
  el.innerHTML = `<span>${tipo === "ok" ? "✓" : "✕"}</span> ${msg}`;
  clearTimeout(window._notifTimer);
  window._notifTimer = setTimeout(() => { el.className = ""; }, 3800);
}

function tagCat(cat, extra = "") {
  const c = CORES[cat] || { tag: "#333", text: "#ccc" };
  return `<span class="tag-cat${extra}" style="background:${c.tag};color:${c.text}">${cat}</span>`;
}

function barraProgresso(etapa, encerrado) {
  const total = ETAPAS_ORDEM.length;
  const idx   = ETAPAS_ORDEM.indexOf(etapa);
  const atual = encerrado ? total : Math.max(0, idx);
  const pct   = (atual / total) * 100;
  const cor   = encerrado ? "#4caf50" : "#5c6bc0";
  return `<div class="progress-wrap"><div class="progress-bar" style="width:${pct}%;background:${cor}"></div></div>`;
}

function estrelas(n) { return "★".repeat(n) + "☆".repeat(5 - n); }

// ── NAVEGAÇÃO ─────────────────────────────────────────────────────────────────

function mostrarTela(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + id).classList.add("active");
}

function irParaLista()  { renderLista(); mostrarTela("lista"); }

function irParaNovo() {
  novoAnexo = null; novoTipoSelecionado = null; novoSearchQuery = "";
  novoUnidade = ""; novoLocal = ""; novoLocalOutro = "";
  novoTiposManutencao = []; novoTipoManutencaoOutro = "";
  novoTitulo = ""; novoDesc = "";
  renderTipoSelector(); renderCamposTipo(); validarNovo();
  mostrarTela("novo");
}

function fazerLogout() {
  usuarioAtual = null; chamadoAberto = null;
  document.getElementById("header").style.display = "none";
  document.getElementById("main-area").style.display = "none";
  mostrarTela("login");
}

// ── ABAS ──────────────────────────────────────────────────────────────────────

function setTab(aba, btn) {
  abaAtiva = aba;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("tab-" + aba).classList.add("active");
}

function resetarAbas() {
  abaAtiva = "mensagens";
  document.querySelectorAll(".tab-btn").forEach((b, i) => {
    b.classList.toggle("active", i === 0);
  });
  document.querySelectorAll(".tab-panel").forEach((p, i) => {
    p.classList.toggle("active", i === 0);
  });
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────

function renderLogin() {
  const grid = document.getElementById("login-grid");
  grid.innerHTML = USUARIOS.map(u => {
    const inicial = u.nome.charAt(0);
    const tags    = u.categorias.map(c => tagCat(c)).join("");
    return `
      <button class="login-card" onclick="loginComo(${u.id})">
        <div class="login-avatar">${inicial}</div>
        <div class="login-name">${u.nome}</div>
        <div class="login-tags">${tags}</div>
      </button>`;
  }).join("");
}

function loginComo(id) {
  usuarioAtual = USUARIOS.find(u => u.id === id);
  document.getElementById("header-nome").textContent = usuarioAtual.nome;
  const cats = document.getElementById("header-cats");
  cats.innerHTML = usuarioAtual.categorias.filter(c => c !== "Solicitante").map(c => tagCat(c)).join("") + tagCat("Solicitante");
  document.getElementById("header").style.display = "flex";
  document.getElementById("main-area").style.display = "block";
  irParaLista();
}

// ── LISTA ─────────────────────────────────────────────────────────────────────

function meusEtapasFn() {
  return Object.keys(ETAPAS)
    .filter(k => usuarioAtual.categorias.includes(ETAPAS[k].responsavel))
    .map(k => isNaN(k) ? k : Number(k));
}

function setFiltro(btn, valor) {
  filtroAtual = valor;
  document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderCards();
}

function renderLista() {
  document.getElementById("lista-sub").textContent = `${chamados.length} chamado(s) registrado(s)`;
  renderCards();
}

function renderCards() {
  const container  = document.getElementById("cards-container");
  const meusEtapas = meusEtapasFn();

  const filtrados = chamados.filter(c => {
    if (filtroAtual === "meus") {
      if (c.status === "encerrado") return false;
      if (!meusEtapas.some(e => String(e) === String(c.etapaAtual))) return false;
      if (c.etapaAtual === 9 && c.solicitante.id !== usuarioAtual.id) return false;
      return true;
    }
    if (filtroAtual === "encerrados") return c.status === "encerrado";
    return true;
  });

  if (filtrados.length === 0) {
    container.innerHTML = `<div class="vazio"><div class="vazio-icon">📋</div><div class="vazio-msg">Nenhum chamado encontrado</div></div>`;
    return;
  }

  const html = filtrados.map(c => {
    const etapa     = ETAPAS[c.etapaAtual];
    const minhaVez  = meusEtapas.includes(c.etapaAtual) && c.status !== "encerrado";
    const enc       = c.status === "encerrado";
    const statusCls = enc ? "status-done" : "status-open";
    const statusTxt = enc ? "Encerrado" : "Em andamento";
    const stepBox   = !enc ? `<div class="card-step"><div class="card-step-num">Etapa ${c.etapaAtual}</div><div class="card-step-name">${etapa?.nome}</div></div>` : "";
    const avBox     = (enc && c.avaliacao) ? `<div style="margin-top:8px;color:#ffa726;font-size:14px">${estrelas(c.avaliacao)}</div>` : "";
    const tipoTag   = c.tipoCodigo ? `<span style="font-size:11px;color:#5c6bc0;font-weight:700">${c.tipoCodigo}</span>` : "";
    return `
      <div class="card${minhaVez ? " destaque" : ""}${enc ? " encerrado" : ""}" onclick="abrirChamado(${c.id})">
        <div class="card-top">
          <span class="card-id">#${c.id} ${tipoTag}</span>
          <span class="status-tag ${statusCls}">${statusTxt}</span>
        </div>
        <div class="card-title">${c.titulo}</div>
        <div class="card-meta">
          <span>👤 ${c.solicitante.nome}</span>
          <span>🕐 ${c.criadoEm}</span>
        </div>
        ${stepBox}${avBox}
        ${barraProgresso(c.etapaAtual, enc)}
      </div>`;
  }).join("");

  container.innerHTML = `<div class="cards-grid">${html}</div>`;
}

// ── TIPO DE CHAMADO ───────────────────────────────────────────────────────────

function renderTipoSelector() {
  const wrap = document.getElementById("tipo-selector-wrap");
  if (novoTipoSelecionado) {
    wrap.innerHTML = `
      <div class="tipo-selecionado">
        <div class="tipo-selecionado-info">
          <span class="tipo-code">${novoTipoSelecionado.codigo}</span>
          <span style="font-size:13px;color:var(--text)">${novoTipoSelecionado.nome}</span>
        </div>
        <button class="btn-trocar-tipo" onclick="trocarTipo()">Trocar</button>
      </div>`;
  } else {
    const filtrados = TIPOS_CHAMADO.filter(t =>
      novoSearchQuery === "" ||
      t.codigo.toLowerCase().includes(novoSearchQuery.toLowerCase()) ||
      t.nome.toLowerCase().includes(novoSearchQuery.toLowerCase())
    );
    const dropdownHtml = filtrados.map(t => `
      <div class="tipo-option" onclick="selecionarTipo('${t.codigo}')">
        <span class="tipo-code">${t.codigo}</span>
        <span class="tipo-name">${t.nome}</span>
      </div>`).join("");
    wrap.innerHTML = `
      <div class="tipo-search-wrap">
        <span class="tipo-search-icon">🔍</span>
        <input class="tipo-search-input" type="text" placeholder="Pesquisar tipo de chamado..."
          value="${novoSearchQuery}" oninput="novoSearchQuery=this.value; renderTipoSelector()" autofocus>
      </div>
      ${dropdownHtml.length > 0
        ? `<div class="tipo-dropdown">${dropdownHtml}</div>`
        : `<div style="padding:12px;color:var(--muted);font-size:13px;text-align:center">Nenhum tipo encontrado</div>`}`;
  }
}

function selecionarTipo(codigo) {
  novoTipoSelecionado = TIPOS_CHAMADO.find(t => t.codigo === codigo);
  novoUnidade = ""; novoLocal = ""; novoLocalOutro = "";
  novoTiposManutencao = []; novoTipoManutencaoOutro = "";
  novoTitulo = ""; novoDesc = ""; novoAnexo = null;
  renderTipoSelector(); renderCamposTipo(); validarNovo();
}

function trocarTipo() {
  novoTipoSelecionado = null; novoSearchQuery = "";
  renderTipoSelector(); renderCamposTipo(); validarNovo();
}

function renderCamposTipo() {
  const wrap = document.getElementById("campos-tipo");
  if (!novoTipoSelecionado) { wrap.innerHTML = ""; return; }
  if (novoTipoSelecionado.tipo === "mtc") renderCamposMTC(wrap);
  else renderCamposGenerico(wrap);
}

function renderCamposMTC(wrap) {
  const localOptionsHtml = LOCAIS_MTC.map(l =>
    `<option value="${l}" ${novoLocal === l ? "selected" : ""}>${l}</option>`
  ).join("");
  const chipsHtml = TIPOS_MANUTENCAO.map(t => {
    const isSelected = novoTiposManutencao.includes(t);
    return `<span class="multi-chip${isSelected ? " selected" : ""}" onclick="toggleManutencao('${t}')">${t}</span>`;
  }).join("");
  const localOutroHtml = novoLocal === "OUTRO"
    ? `<input class="inp" type="text" id="novo-local-outro" placeholder="Especifique o local..." value="${novoLocalOutro}" oninput="novoLocalOutro=this.value;validarNovo()" style="margin-top:8px">`
    : "";
  const manutOutroHtml = novoTiposManutencao.includes("OUTRO")
    ? `<input class="inp" type="text" id="novo-tipo-manut-outro" placeholder="Especifique o tipo de manutenção..." value="${novoTipoManutencaoOutro}" oninput="novoTipoManutencaoOutro=this.value;validarNovo()" style="margin-top:8px">`
    : "";
  wrap.innerHTML = `
    <div class="campos-mtc">
      <label class="lbl">Unidade *</label>
      <select class="inp" id="novo-unidade" onchange="novoUnidade=this.value;validarNovo()">
        <option value="">— Selecione a unidade —</option>
        ${UNIDADES_MTC.map(u => `<option value="${u}" ${novoUnidade === u ? "selected" : ""}>${u}</option>`).join("")}
      </select>
      <label class="lbl">Local *</label>
      <select class="inp" id="novo-local" onchange="novoLocal=this.value;renderCamposTipo();validarNovo()">
        <option value="">— Selecione o local —</option>
        ${localOptionsHtml}
      </select>
      ${localOutroHtml}
      <label class="lbl">Tipo de Manutenção *</label>
      <div class="multi-escolha">${chipsHtml}</div>
      ${manutOutroHtml}
      <hr class="separator-line">
      <label class="lbl">Título do Chamado *</label>
      <input class="inp" type="text" id="novo-titulo" placeholder="Ex: Ar-condicionado sala 3 não funciona" value="${novoTitulo}" oninput="novoTitulo=this.value;validarNovo()">
      <label class="lbl">Descrição do Problema *</label>
      <textarea class="inp" id="novo-desc" rows="5" placeholder="Descreva detalhadamente o problema observado..." oninput="novoDesc=this.value;validarNovo()">${novoDesc}</textarea>
      <label class="lbl">Anexar Foto *</label>
      <div id="novo-anexo-wrap" class="anexo-wrap"></div>
    </div>`;
  renderAnexo("novo-anexo-wrap", novoAnexo, val => { novoAnexo = val; validarNovo(); });
}

function renderCamposGenerico(wrap) {
  wrap.innerHTML = `
    <div class="campos-mtc">
      <hr class="separator-line" style="margin-top:0">
      <label class="lbl">Título do Chamado *</label>
      <input class="inp" type="text" id="novo-titulo" placeholder="Ex: Lançamento referente ao contrato X" value="${novoTitulo}" oninput="novoTitulo=this.value;validarNovo()">
      <label class="lbl">Descrição *</label>
      <textarea class="inp" id="novo-desc" rows="5" placeholder="Descreva detalhadamente..." oninput="novoDesc=this.value;validarNovo()">${novoDesc}</textarea>
      <label class="lbl">Anexar Arquivo (opcional)</label>
      <div id="novo-anexo-wrap" class="anexo-wrap"></div>
    </div>`;
  renderAnexo("novo-anexo-wrap", novoAnexo, val => { novoAnexo = val; validarNovo(); });
}

function toggleManutencao(tipo) {
  if (novoTiposManutencao.includes(tipo)) novoTiposManutencao = [];
  else novoTiposManutencao = [tipo];
  renderCamposTipo(); validarNovo();
}

// ── VALIDAR NOVO ──────────────────────────────────────────────────────────────

function validarNovo() {
  const btn = document.getElementById("btn-enviar");
  if (!novoTipoSelecionado) { btn.disabled = true; return; }
  const titulo = (document.getElementById("novo-titulo")?.value || novoTitulo).trim();
  const desc   = (document.getElementById("novo-desc")?.value   || novoDesc).trim();
  if (novoTipoSelecionado.tipo === "mtc") {
    const unidade     = document.getElementById("novo-unidade")?.value || novoUnidade;
    const local       = document.getElementById("novo-local")?.value   || novoLocal;
    const localOutroOk = local !== "OUTRO" || (document.getElementById("novo-local-outro")?.value || novoLocalOutro).trim();
    const tiposOk      = novoTiposManutencao.length > 0;
    const tipoOutroOk  = !novoTiposManutencao.includes("OUTRO") || (document.getElementById("novo-tipo-manut-outro")?.value || novoTipoManutencaoOutro).trim();
    const fotoOk       = !!novoAnexo;
    btn.disabled = !(unidade && local && localOutroOk && tiposOk && tipoOutroOk && titulo && desc && fotoOk);
  } else {
    btn.disabled = !(titulo && desc);
  }
}

// ── CRIAR CHAMADO ─────────────────────────────────────────────────────────────

function criarChamado() {
  const titulo    = (document.getElementById("novo-titulo")?.value || novoTitulo).trim();
  const descricao = (document.getElementById("novo-desc")?.value   || novoDesc).trim();
  if (!titulo || !descricao || !novoTipoSelecionado) return;

  let camposMTC = null;

  if (novoTipoSelecionado.tipo === "mtc") {
    const unidade   = document.getElementById("novo-unidade")?.value || novoUnidade;
    const local     = document.getElementById("novo-local")?.value   || novoLocal;
    const localFinal = local === "OUTRO" ? (document.getElementById("novo-local-outro")?.value || novoLocalOutro) : local;
    const tiposManut = novoTiposManutencao.map(t =>
      t === "OUTRO" ? (document.getElementById("novo-tipo-manut-outro")?.value || novoTipoManutencaoOutro) : t
    );
    camposMTC = { unidade, local: localFinal, tiposManutencao: tiposManut };
  }

  const novo = {
    id: gerarId(),
    titulo,
    tipoCodigo: novoTipoSelecionado.codigo,
    tipoNome:   novoTipoSelecionado.nome,
    tipoTipo:   novoTipoSelecionado.tipo,
    camposMTC,
    descricaoOriginal: descricao,
    etapaAtual: 2,
    status: "aberto",
    criadoEm: dataAgora(),
    solicitante: usuarioAtual,
    mensagens: [{
      num: 1,
      etapa: 1,
      nomeEtapa: ETAPAS[1].nome,
      usuario: usuarioAtual.nome,
      categoria: "Solicitante",
      data: dataAgora(),
      texto: descricao,
      anexo: novoAnexo || null,
    }],
    avaliacao: null,
  };

  chamados.unshift(novo);
  mostrarNotif(`✓ Chamado #${novo.id} aberto com sucesso!`);
  irParaLista();
}

// ── CHAMADO ABERTO ────────────────────────────────────────────────────────────

function abrirChamado(id) {
  chamadoAberto = chamados.find(c => c.id === id);
  modoAtender   = false;
  atenderObs    = "";
  atenderAnexo  = null;
  atenderMaterial  = null;
  atenderAprovacao = null;
  atenderAvaliacao = 0;
  resetarAbas();
  renderChamado();
  mostrarTela("chamado");
}

function renderChamado() {
  if (!chamadoAberto) return;
  const c         = chamadoAberto;
  const etapaAtual = c.etapaAtual;
  const etapaInfo  = ETAPAS[etapaAtual];
  const enc        = c.status === "encerrado";

  const podeAtender = !enc
    && usuarioAtual.categorias.includes(etapaInfo?.responsavel)
    && (etapaAtual !== 9 || chamadoAberto.solicitante.id === usuarioAtual.id);

  document.getElementById("chamado-titulo-hdr").textContent = `Chamado #${c.id}`;
  document.getElementById("chamado-sub-hdr").textContent    = c.titulo;
  const stTag = document.getElementById("chamado-status-tag");
  stTag.className  = "status-tag " + (enc ? "status-done" : "status-open");
  stTag.textContent = enc ? "Encerrado" : "Em andamento";

  // Barra de etapas
  const bar = document.getElementById("chamado-steps-bar");
  bar.innerHTML = ETAPAS_ORDEM.map(key => {
    const e        = ETAPAS[key];
    const idxAtual = ETAPAS_ORDEM.indexOf(c.etapaAtual);
    const idxItem  = ETAPAS_ORDEM.indexOf(key);
    const passada  = enc ? true : idxItem < idxAtual;
    const atual    = !enc && String(key) === String(c.etapaAtual);
    const cls      = atual ? "current" : passada ? "past" : "future";
    const isSub    = e.grupo !== null && e.grupo !== undefined;
    const label    = (passada && !atual) ? "✓" : String(key);
    return `
      <div class="step-item ${cls}${isSub ? " sub" : ""}">
        <div class="step-circle">${label}</div>
        <div class="step-label">${e.nome}</div>
      </div>`;
  }).join("");

  // Box etapa atual
  const box = document.getElementById("chamado-current-box");
  if (!enc) {
    const corResp   = CORES[etapaInfo.responsavel]?.dot || "#aaa";
    const podeVoltar = podeAtender
      && MOTIVOS_VOLTAR[etapaAtual] !== null
      && MOTIVOS_VOLTAR[etapaAtual] !== undefined;
    const btnAtender = podeAtender && !modoAtender
      ? `<button class="btn-atender" onclick="abrirModoAtender()">Atender Chamado</button>`
      : !podeAtender
        ? `<div class="sem-permissao">Sem permissão para atender esta etapa</div>`
        : "";
    const btnVoltar = podeVoltar && !modoAtender
      ? `<button class="btn-secondary" onclick="abrirModalVoltar()" style="border-color:#ef535044;color:#cf7f7f">↩ Voltar Etapa</button>`
      : "";
    box.innerHTML = `
      <div class="current-step-box">
        <div>
          <div class="current-step-num">Etapa ${etapaAtual} — ${etapaInfo.nome}</div>
          <div class="current-step-desc">${etapaInfo.descricao}</div>
          <div style="margin-top:6px;font-size:13px;color:#888">
            Responsável: <span style="color:${corResp}">${etapaInfo.responsavel}</span>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
          ${btnVoltar}${btnAtender}
        </div>
      </div>`;
    box.style.display = "";
  } else {
    box.innerHTML = "";
    box.style.display = "none";
  }

  renderFormAtender();
  renderHistorico();
  renderFormulario();
  renderAnexosPanel();
  atualizarBadges();
}

function atualizarBadges() {
  const c = chamadoAberto;
  document.getElementById("badge-mensagens").textContent = c.mensagens.length;

  const totalAnexos = c.mensagens.filter(m => m.anexo).length;
  const badgeAnexos = document.getElementById("badge-anexos");
  if (totalAnexos > 0) {
    badgeAnexos.textContent = totalAnexos;
    badgeAnexos.style.display = "";
  } else {
    badgeAnexos.style.display = "none";
  }
}

function abrirModoAtender() {
  modoAtender       = true;
  atenderObs        = "";
  atenderAnexo      = null;
  atenderMaterial   = null;
  atenderAprovacao  = null;
  atenderAvaliacao  = 0;
  atenderTipoServico = null;
  atenderProdutos   = [{ nome: "", qtd: "" }];
  renderChamado();
}

function cancelarAtender() {
  modoAtender       = false;
  atenderAprovacao  = null;
  atenderTipoServico = null;
  atenderProdutos   = [{ nome: "", qtd: "" }];
  renderChamado();
}

function renderFormAtender() {
  const formEl = document.getElementById("chamado-form-atender");
  if (!modoAtender) { formEl.innerHTML = ""; return; }

  const c          = chamadoAberto;
  const etapaAtual = c.etapaAtual;
  const etapaInfo  = ETAPAS[etapaAtual];

  const placeholders = {
    2: "Informe a data e horário agendado para a visita técnica...",
    3: "Descreva o diagnóstico técnico do problema...",
    4: "Registre a verificação de estoque...",
    "5.1": "Informe a data prevista para o envio dos orçamentos...",
    "5.2": "Descreva os orçamentos obtidos e anexe os arquivos...",
    "5.3": "Justifique sua decisão de aprovação ou reprovação...",
    "5.4": "Informe a data prevista de chegada da mercadoria...",
    6: "Confirme o recebimento da mercadoria e registre a nota fiscal...",
    7: "Informe a data programada para execução do serviço...",
    8: "Registre a execução do serviço realizado...",
    9: "Descreva sua experiência (opcional)...",
  };
  const ph = placeholders[etapaAtual] || "Digite sua observação...";

  // ── ETAPA 3: AVALIAÇÃO TÉCNICA ──
  if (etapaAtual === 3) {
    const btnProtocolo = `<button class="btn-tipo-servico${atenderTipoServico === 'protocolo' ? ' ativo' : ''}" onclick="setTipoServico('protocolo')"><span class="ts-code">PROTOCOLO</span><span class="ts-desc">Manutenção normal</span></button>`;
    const btnProjeto   = `<button class="btn-tipo-servico${atenderTipoServico === 'projeto'   ? ' ativo' : ''}" onclick="setTipoServico('projeto')"><span class="ts-code">PROJETO</span><span class="ts-desc">Obra / Estrutural</span></button>`;

    const produtosRows = atenderProdutos.map((p, i) => `
      <div class="produto-row">
        <div class="produto-nome-wrap">
          <input class="inp" style="margin-bottom:0" type="text" placeholder="Nome do produto / serviço"
            value="${p.nome.replace(/"/g,'&quot;')}"
            oninput="atenderProdutos[${i}].nome=this.value">
        </div>
        <div class="produto-qtd-wrap">
          <input class="inp" style="margin-bottom:0" type="text" placeholder="Qtd"
            value="${p.qtd.replace(/"/g,'&quot;')}"
            oninput="atenderProdutos[${i}].qtd=this.value">
        </div>
        ${atenderProdutos.length > 1
          ? `<button class="btn-remover-produto" onclick="removerProduto(${i})" title="Remover">✕</button>`
          : `<div style="width:36px;flex-shrink:0"></div>`}
      </div>`).join("");

    formEl.innerHTML = `
      <div class="form-atender">
        <h3>Atendendo — Etapa 3: Avaliação Técnica</h3>
        <label class="lbl">Tipo de Serviço *</label>
        <div class="tipo-servico-wrap">${btnProtocolo}${btnProjeto}</div>
        <label class="lbl">Produtos / Materiais / Serviços *</label>
        <div class="produto-header">
          <div class="produto-col-nome">PRODUTO / MATERIAL / SERVIÇO</div>
          <div class="produto-col-qtd">QUANTIDADE</div>
        </div>
        <div id="produtos-list">${produtosRows}</div>
        <button class="btn-add-produto" onclick="adicionarProduto()">+ Adicionar item</button>
        <label class="lbl">Observação *</label>
        <textarea class="inp" id="atender-obs" rows="4" placeholder="Descreva o diagnóstico técnico do problema..." oninput="atenderObs=this.value">${atenderObs}</textarea>
        <div style="display:flex;gap:12px;margin-top:20px">
          <button class="btn-secondary" onclick="cancelarAtender()">Cancelar</button>
          <button class="btn-primary" onclick="avancarChamado()">Avançar Chamado →</button>
        </div>
      </div>`;
    return;
  }

  const estoqueHtml = etapaAtual === 4 ? `
    <div style="margin-bottom:16px">
      <label class="lbl">Situação do Estoque *</label>
      <div style="display:flex;gap:12px">
        <button id="btn-mat-sim" class="btn-opcao${atenderMaterial === true ? " ativo-verde" : ""}" onclick="setMaterial(true)">✓ Material Disponível</button>
        <button id="btn-mat-nao" class="btn-opcao${atenderMaterial === false ? " ativo-vermelho" : ""}" onclick="setMaterial(false)">✗ Sem Material</button>
      </div>
      ${atenderMaterial !== null ? `<div class="stock-hint">${atenderMaterial ? "→ Chamado avançará para Etapa 7 (Programação do Serviço)" : "→ Chamado avançará para Etapa 5 (Processo de Compras)"}</div>` : ""}
    </div>` : "";

  const aval = [1,2,3,4,5].map(n => `
    <button class="estrela-btn" onclick="setAvaliacao(${n})"
      style="color:${n <= atenderAvaliacao ? "#ffa726" : "#444"}">
      ${n <= atenderAvaliacao ? "★" : "☆"}
    </button>`).join("");
  const avaliacaoHtml = etapaAtual === 9 ? `
    <div style="margin-bottom:16px">
      <label class="lbl">Avaliação do Atendimento *</label>
      <div style="display:flex;gap:8px;margin-top:8px">${aval}</div>
    </div>` : "";

  const aprovacaoHtml = etapaAtual === "5.3" ? `
    <div style="margin-bottom:16px">
      <label class="lbl">Decisão do Gestor *</label>
      <div style="display:flex;gap:12px">
        <button class="btn-opcao${atenderAprovacao === true ? " ativo-verde" : ""}" onclick="setAprovacao(true)">✓ Aprovar Orçamento</button>
        <button class="btn-opcao${atenderAprovacao === false ? " ativo-vermelho" : ""}" onclick="setAprovacao(false)">✗ Reprovar — Nova Cotação</button>
      </div>
      ${atenderAprovacao !== null ? `<div class="stock-hint">${atenderAprovacao
        ? "→ Chamado avançará para Etapa 5.4 (Programar Entrega)"
        : "→ Chamado retornará à Etapa 5.1 (Cotação)"}</div>` : ""}
    </div>` : "";

  const anexoLabel = etapaAtual === 8 ? "Foto do Serviço (opcional)"
    : etapaAtual === "5.2" ? "Orçamentos (opcional)" : "Anexar Arquivo (opcional)";
  const btnLabel = etapaAtual === 9 ? "Finalizar Chamado"
    : etapaAtual === "5.3" && atenderAprovacao === false ? "Reprovar e Recotizar"
    : "Avançar Chamado →";

  formEl.innerHTML = `
    <div class="form-atender">
      <h3>Atendendo — Etapa ${etapaAtual}: ${etapaInfo.nome}</h3>
      ${estoqueHtml}${aprovacaoHtml}${avaliacaoHtml}
      <label class="lbl">Observação *</label>
      <textarea class="inp" id="atender-obs" rows="4" placeholder="${ph}" oninput="atenderObs=this.value">${atenderObs}</textarea>
      <label class="lbl">${anexoLabel}</label>
      <div id="atender-anexo-wrap" class="anexo-wrap"></div>
      <div style="display:flex;gap:12px;margin-top:20px">
        <button class="btn-secondary" onclick="cancelarAtender()">Cancelar</button>
        <button class="btn-primary" onclick="avancarChamado()">${btnLabel}</button>
      </div>
    </div>`;

  renderAnexo("atender-anexo-wrap", atenderAnexo, val => { atenderAnexo = val; renderFormAtender(); });
}

function setTipoServico(val) { atenderTipoServico = val; renderFormAtender(); }

function adicionarProduto() {
  atenderProdutos.push({ nome: "", qtd: "" });
  renderFormAtender();
  setTimeout(() => {
    const rows = document.querySelectorAll(".produto-row");
    if (rows.length) rows[rows.length-1].querySelector("input")?.focus();
  }, 50);
}

function removerProduto(i) {
  atenderProdutos.splice(i, 1);
  renderFormAtender();
}

function setMaterial(val)  { atenderMaterial  = val; renderFormAtender(); }
function setAprovacao(val) { atenderAprovacao = val; renderFormAtender(); }
function setAvaliacao(n)   { atenderAvaliacao = n;   renderFormAtender(); }

function proximaEtapa(etapaAtual) {
  if (etapaAtual === 4) {
    if (atenderMaterial === null) { mostrarNotif("Informe se há material em estoque.", "erro"); return null; }
    return atenderMaterial ? 7 : "5.1";
  }
  if (etapaAtual === "5.3") {
    if (atenderAprovacao === null) { mostrarNotif("Informe se os orçamentos foram aprovados.", "erro"); return null; }
    return atenderAprovacao ? "5.4" : "5.1";
  }
  if (etapaAtual === 9) return "encerrar";
  const mapa = { 1: 2, 2: 3, 3: 4, "5.1": "5.2", "5.2": "5.3", "5.4": 6, 6: 7, 7: 8, 8: 9 };
  return mapa[etapaAtual] ?? etapaAtual + 1;
}

function validarAvanco(etapaAtual) {
  const obsRaw = document.getElementById("atender-obs")?.value || atenderObs;
  const obs = obsRaw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  atenderObs = obs;

  if (etapaAtual === 9 && atenderAvaliacao === 0) {
    mostrarNotif("Por favor, avalie o atendimento antes de finalizar.", "erro"); return false;
  }
  if (etapaAtual === "5.3" && atenderAprovacao === null) {
    mostrarNotif("Informe se os orçamentos foram aprovados ou reprovados.", "erro"); return false;
  }
  if (!obs) { mostrarNotif("O campo de observação é obrigatório.", "erro"); return false; }
  return true;
}

function avancarChamado() {
  const c          = chamadoAberto;
  const etapaAtual = c.etapaAtual;
  const etapaInfo  = ETAPAS[etapaAtual];
  const obsVal = document.getElementById("atender-obs")?.value || atenderObs;
  atenderObs = obsVal.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  if (!validarAvanco(etapaAtual)) return;
  const prox = proximaEtapa(etapaAtual);
  if (prox === null) return;

  const novaMsg = {
    num:       c.mensagens.length + 1,
    etapa:     etapaAtual,
    nomeEtapa: etapaInfo.nome,
    usuario:   usuarioAtual.nome,
    categoria: usuarioAtual.categorias.find(ct => ct === etapaInfo.responsavel) || usuarioAtual.categorias[0],
    data:      dataAgora(),
    texto:     atenderObs,
    anexo:     atenderAnexo,
    ...(etapaAtual === 3       ? { tipoServico: atenderTipoServico, produtos: atenderProdutos.filter(p => p.nome.trim()) } : {}),
    ...(etapaAtual === 4       ? { temMaterial: atenderMaterial }    : {}),
    ...(etapaAtual === "5.3"   ? { aprovado:    atenderAprovacao }   : {}),
    ...(etapaAtual === 9       ? { avaliacao:   atenderAvaliacao }   : {}),
  };

  const atualizado = {
    ...c,
    mensagens:    [...c.mensagens, novaMsg],
    etapaAtual:   prox === "encerrar" ? 9 : prox,
    status:       prox === "encerrar" ? "encerrado" : "aberto",
    avaliacao:    prox === "encerrar" ? atenderAvaliacao : c.avaliacao,
  };

  chamados = chamados.map(ch => ch.id === atualizado.id ? atualizado : ch);
  chamadoAberto = atualizado;
  modoAtender  = false;
  atenderObs   = "";
  atenderAnexo = null;
  atenderMaterial  = null;
  atenderAprovacao = null;
  atenderAvaliacao = 0;

  let notifMsg;
  if (prox === "encerrar") notifMsg = "Chamado encerrado com sucesso!";
  else if (etapaAtual === "5.3" && !atenderAprovacao) notifMsg = "Orçamento reprovado — retornando à Cotação (5.1)";
  else notifMsg = `Chamado avançado para Etapa ${prox}`;
  mostrarNotif(notifMsg);
  renderChamado();
}

// ── HISTÓRICO (ABA MENSAGENS) ─────────────────────────────────────────────────

function toggleMsgCard(num) {
  const body = document.getElementById(`msg-body-${num}`);
  const icon = document.getElementById(`msg-icon-${num}`);
  const isOpen = body.style.display !== "none";
  body.style.display = isOpen ? "none" : "block";
  icon.style.transform = isOpen ? "rotate(-90deg)" : "rotate(0deg)";
}

function renderHistorico() {
  const c    = chamadoAberto;
  const enc  = c.status === "encerrado";
  const wrap = document.getElementById("chamado-historico");

  const msgs = c.mensagens.map((msg, idx) => {
    const cor = CORES[msg.categoria] || { tag: "#333", text: "#ccc", dot: "#888" };
    const isLast = idx === c.mensagens.length - 1;

    const avaliacaoTecnica = (msg.tipoServico || msg.produtos) ? (() => {
      const tipoLabel = msg.tipoServico === 'protocolo' ? 'PROTOCOLO — Manutenção normal' : 'PROJETO — Obra / Estrutural';
      const tipoHtml  = msg.tipoServico ? `<div style="margin-bottom:8px"><span style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.5px">TIPO DE SERVIÇO</span><div style="margin-top:4px;font-size:13px;color:#ccc">${tipoLabel}</div></div>` : "";
      const prodRows  = (msg.produtos || []).map(p => `<div style="display:flex;gap:12px;font-size:13px;color:#ccc;padding:5px 0;border-bottom:1px solid var(--border)"><span style="flex:1">${p.nome}</span><span style="color:var(--muted2);white-space:nowrap">${p.qtd || "—"}</span></div>`).join("");
      const prodHtml  = prodRows ? `<div style="margin-top:8px"><span style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.5px">PRODUTOS / MATERIAIS / SERVIÇOS</span><div style="margin-top:6px;background:var(--bg);border:1px solid var(--border2);border-radius:8px;padding:8px 12px">${prodRows}</div></div>` : "";
      return `<div style="margin-top:12px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 14px">${tipoHtml}${prodHtml}</div>`;
    })() : "";

    const materialInfo = msg.temMaterial !== undefined
      ? `<div style="margin-top:12px;font-size:13px;color:${msg.temMaterial ? "#4caf50" : "#ef5350"}">
           ${msg.temMaterial ? "✓ Material disponível em estoque" : "✗ Material indisponível — encaminhado para compras"}
         </div>` : "";
    const aprovadoInfo = msg.aprovado !== undefined
      ? `<div style="margin-top:12px;font-size:13px;color:${msg.aprovado ? "#4caf50" : "#ef5350"}">
           ${msg.aprovado ? "✓ Orçamento aprovado pelo Gestor" : "✗ Orçamento reprovado — retornou à Cotação (5.1)"}
         </div>` : "";
    const avalInfo    = msg.avaliacao ? `<div style="margin-top:12px;color:#ffa726;font-size:16px">${estrelas(msg.avaliacao)}</div>` : "";
    const devolucaoInfo = msg.devolucao
      ? `<div style="margin-top:12px;padding:8px 12px;background:#2a1a1a;border:1px solid #ef535044;border-radius:8px;font-size:13px">
           <span style="color:#cf7f7f;font-weight:700">↩ Devolução</span>
           <span style="color:#888"> — Motivo: </span><span style="color:#e0a0a0">${msg.devolucao.motivo}</span>
           <div style="color:#666;margin-top:2px;font-size:12px">Devolvido para Etapa ${msg.devolucao.para} — ${msg.devolucao.nomeEtapa}</div>
         </div>` : "";
    const textoFormatado = (msg.texto || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "<br>");

    // Preview resumido para quando o card está fechado
    const previewTxt = (msg.texto || "").replace(/\n/g, " ").trim();
    const preview    = previewTxt.length > 60 ? previewTxt.slice(0, 60) + "…" : previewTxt;

    // Última mensagem começa aberta, as demais fechadas
    const startOpen  = isLast;
    const bodyDisplay = startOpen ? "block" : "none";
    const iconRotate  = startOpen ? "rotate(0deg)" : "rotate(-90deg)";

    return `
      <div class="msg-card" style="border-left-color:${cor.dot};padding:0;overflow:hidden;">

        <!-- CABEÇALHO CLICÁVEL -->
        <div class="msg-card-header" onclick="toggleMsgCard(${msg.num})" style="
          display:flex; align-items:center; gap:12px; padding:14px 18px;
          cursor:pointer; user-select:none;
        ">
          <!-- Chevron -->
          <span id="msg-icon-${msg.num}" style="
            font-size:12px; color:var(--muted); flex-shrink:0;
            transition:transform .2s; transform:${iconRotate};
            display:inline-block;
          ">▼</span>

          <!-- Número + badges -->
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;flex-wrap:wrap;">
            <span class="msg-num" style="margin:0">Mensagem ${msg.num}</span>
            <span class="tag-cat" style="background:${cor.tag};color:${cor.text}">${msg.categoria}</span>
            <span style="font-size:11px;color:var(--muted)">Etapa ${msg.etapa} · ${msg.data}</span>
          </div>

          <!-- Preview do texto (visível só quando fechado) -->
          <span class="msg-preview" style="
            font-size:12px; color:#555; white-space:nowrap; overflow:hidden;
            text-overflow:ellipsis; max-width:200px; flex-shrink:1;
            display:${startOpen ? "none" : "block"};
          " id="msg-preview-${msg.num}">${preview}</span>
        </div>

        <!-- CORPO COLAPSÁVEL -->
        <div id="msg-body-${msg.num}" style="display:${bodyDisplay};padding:0 18px 18px;border-top:1px solid var(--border);">
          <div style="padding-top:14px;">
            <div class="msg-meta" style="margin-bottom:14px">
              <span>👤 ${msg.usuario}</span>
              <span>🕐 ${msg.data}</span>
            </div>
            <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 14px;">
              <div style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.5px;margin-bottom:6px">OBSERVAÇÃO</div>
              <div class="msg-texto">${textoFormatado}</div>
            </div>
            ${avaliacaoTecnica}${materialInfo}${aprovadoInfo}${avalInfo}${devolucaoInfo}
          </div>
        </div>

      </div>`;
  }).join("");

  const avaliacaoFinal = (enc && c.avaliacao)
    ? `<div class="avaliacao-final">
         <div style="font-size:13px;color:#888;margin-bottom:4px">Avaliação do solicitante</div>
         <div style="font-size:26px;color:#ffa726">${estrelas(c.avaliacao)}</div>
       </div>` : "";

  wrap.innerHTML = msgs + avaliacaoFinal;

  // Sincroniza preview: esconde quando aberto, mostra quando fechado
  c.mensagens.forEach((msg, idx) => {
    const isLast = idx === c.mensagens.length - 1;
    const preview = document.getElementById(`msg-preview-${msg.num}`);
    if (preview) preview.style.display = isLast ? "none" : "block";
  });
}

// ── PAINEL FORMULÁRIO (ABA) ───────────────────────────────────────────────────

function renderFormulario() {
  const c    = chamadoAberto;
  const wrap = document.getElementById("chamado-formulario");

  const tipoHtml = `
    <div class="form-campos-grid">
      <div class="form-campo">
        <div class="form-campo-label">CÓDIGO DO TIPO</div>
        <div class="form-campo-valor">${c.tipoCodigo || "—"}</div>
      </div>
      <div class="form-campo">
        <div class="form-campo-label">TIPO DE CHAMADO</div>
        <div class="form-campo-valor">${c.tipoNome || "—"}</div>
      </div>
      <div class="form-campo">
        <div class="form-campo-label">SOLICITANTE</div>
        <div class="form-campo-valor">${c.solicitante.nome}</div>
      </div>
      <div class="form-campo">
        <div class="form-campo-label">DATA DE ABERTURA</div>
        <div class="form-campo-valor">${c.criadoEm}</div>
      </div>
    </div>`;

  let camposEspecificos = "";
  if (c.tipoTipo === "mtc" && c.camposMTC) {
    const m = c.camposMTC;
    const chipsManut = m.tiposManutencao.map(t => `<span class="chip">${t}</span>`).join("");
    camposEspecificos = `
      <hr class="divider">
      <h3>Especificações Técnicas — ${c.tipoCodigo}</h3>
      <div class="form-campos-grid">
        <div class="form-campo">
          <div class="form-campo-label">UNIDADE</div>
          <div class="form-campo-valor">${m.unidade}</div>
        </div>
        <div class="form-campo">
          <div class="form-campo-label">LOCAL</div>
          <div class="form-campo-valor">${m.local}</div>
        </div>
      </div>
      <div class="form-campo">
        <div class="form-campo-label">TIPOS DE MANUTENÇÃO</div>
        <div class="form-campo-valor"><div class="chip-list">${chipsManut}</div></div>
      </div>`;
  }

  wrap.innerHTML = `
    <div class="formulario-panel">
      <h3>DADOS DO CHAMADO</h3>
      ${tipoHtml}
      ${camposEspecificos}
    </div>`;
}

// ── PAINEL ANEXOS (ABA) ───────────────────────────────────────────────────────

function renderAnexosPanel() {
  const c    = chamadoAberto;
  const wrap = document.getElementById("chamado-anexos");
  window._anexosCache = [];

  const grupos = {};
  c.mensagens.forEach(msg => {
    if (!msg.anexo) return;
    const key = `${msg.etapa}`;
    if (!grupos[key]) grupos[key] = { etapa: msg.etapa, nomeEtapa: msg.nomeEtapa, anexos: [] };
    grupos[key].anexos.push({ ...msg.anexo, usuario: msg.usuario, data: msg.data, categoria: msg.categoria });
  });

  const keys = Object.keys(grupos);

  if (keys.length === 0) {
    wrap.innerHTML = `
      <div class="anexos-panel">
        <h3>ANEXOS DO CHAMADO</h3>
        <div class="sem-anexos">
          <div class="sem-anexos-icon">📎</div>
          <div style="color:var(--muted2)">Nenhum anexo enviado ainda</div>
        </div>
      </div>`;
    return;
  }

  const gruposHtml = keys.map(k => {
    const g = grupos[k];
    const itensHtml = g.anexos.map((a) => {
      const isImg = a.dataUrl && a.dataUrl.startsWith("data:image");
      const thumb = isImg
        ? `<img class="anexo-thumb" src="${a.dataUrl}" alt="${a.nome}">`
        : `<div class="anexo-thumb-icon">📄</div>`;
      const idx = window._anexosCache.length;
      window._anexosCache.push(a);
      return `
        <div class="anexo-item" onclick="abrirModalAnexoIdx(${idx})">
          ${thumb}
          <div class="anexo-info">
            <div class="anexo-nome">📎 ${a.nome}</div>
            <div class="anexo-meta">👤 ${a.usuario} · 🕐 ${a.data}${a.tamanho ? " · " + a.tamanho : ""}</div>
          </div>
          <span class="anexo-etapa-tag">Etapa ${g.etapa}</span>
        </div>`;
    }).join("");

    return `
      <div class="anexo-grupo">
        <div class="anexo-grupo-titulo">ETAPA ${g.etapa} — ${g.nomeEtapa}</div>
        ${itensHtml}
      </div>`;
  }).join("");

  wrap.innerHTML = `
    <div class="anexos-panel">
      <h3>ANEXOS DO CHAMADO</h3>
      ${gruposHtml}
    </div>`;
}

// ── VOLTAR ETAPA ──────────────────────────────────────────────────────────────

const MOTIVOS_VOLTAR = {
  1: null, 2: 1, 3: 2, 4: 3,
  "5.1": 4, "5.2": "5.1", "5.3": "5.2", "5.4": "5.3",
  6: "5.4", 7: 6, 8: 7, 9: 8,
};

function abrirModalVoltar() {
  const c          = chamadoAberto;
  const etapaAtual = c.etapaAtual;
  const anterior   = MOTIVOS_VOLTAR[etapaAtual];
  if (!anterior) return;
  const sub = document.getElementById("modal-voltar-sub");
  sub.innerHTML = `Etapa atual: <strong style="color:#9fa8da">Etapa ${etapaAtual} — ${ETAPAS[etapaAtual].nome}</strong><br>
    Será devolvida para: <strong style="color:#cf7f7f">Etapa ${anterior} — ${ETAPAS[anterior].nome}</strong>`;
  document.getElementById("modal-motivo-select").value = "";
  document.getElementById("modal-obs").value = "";
  document.getElementById("modal-voltar").style.display = "block";
}

function fecharModalVoltar(event) {
  if (event && event.target !== document.querySelector("#modal-voltar .modal-overlay")) return;
  document.getElementById("modal-voltar").style.display = "none";
}

function syncMotivoSelect() {
  const sel = document.getElementById("modal-motivo-select").value;
  const obs = document.getElementById("modal-obs");
  if (sel && sel !== "Outro" && !obs.value) obs.placeholder = sel;
}

function confirmarVoltarEtapa() {
  const motivo = document.getElementById("modal-motivo-select").value;
  const obs    = document.getElementById("modal-obs").value.trim();
  if (!motivo) { mostrarNotif("Selecione um motivo de devolução.", "erro"); return; }
  if (!obs)    { mostrarNotif("O campo de observação é obrigatório.", "erro"); return; }

  const c          = chamadoAberto;
  const etapaAtual = c.etapaAtual;
  const anterior   = MOTIVOS_VOLTAR[etapaAtual];
  const etapaInfo  = ETAPAS[etapaAtual];

  const novaMsg = {
    num:       c.mensagens.length + 1,
    etapa:     etapaAtual,
    nomeEtapa: etapaInfo.nome,
    usuario:   usuarioAtual.nome,
    categoria: usuarioAtual.categorias.find(ct => ct === etapaInfo.responsavel) || usuarioAtual.categorias[0],
    data:      dataAgora(),
    texto:     obs,
    anexo:     null,
    devolucao: { motivo, para: anterior, nomeEtapa: ETAPAS[anterior].nome },
  };

  const atualizado = { ...c, mensagens: [...c.mensagens, novaMsg], etapaAtual: anterior };
  chamados      = chamados.map(ch => ch.id === atualizado.id ? atualizado : ch);
  chamadoAberto = atualizado;

  document.getElementById("modal-voltar").style.display = "none";
  modoAtender = false;
  mostrarNotif(`Chamado devolvido para Etapa ${anterior} — ${ETAPAS[anterior].nome}`);
  renderChamado();
}

// ── UPLOAD REAL ───────────────────────────────────────────────────────────────

function formatarTamanho(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderAnexo(containerId, valor, onChange) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap._onChange = onChange;

  if (!valor) {
    const isImagem = containerId === "novo-anexo-wrap";
    const accept   = isImagem ? "image/*" : "image/*,.pdf,.doc,.docx,.xls,.xlsx";
    const hint     = isImagem ? "PNG, JPG, WEBP" : "Imagens, PDF, DOC, XLS";
    wrap.innerHTML = `
      <div class="upload-area">
        <input type="file" accept="${accept}" onchange="handleFileUpload(event, '${containerId}')">
        <div class="upload-icon">📷</div>
        <div class="upload-label">Clique ou arraste um arquivo aqui<br><span>${hint}</span></div>
      </div>`;
  } else {
    const isImg  = valor.dataUrl && valor.dataUrl.startsWith('data:image');
    const preview = isImg
      ? `<img src="${valor.dataUrl}" alt="preview">`
      : `<div style="width:56px;height:56px;background:#1a1a2a;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:24px;border:1px solid #2a2a3e">📎</div>`;
    wrap.innerHTML = `
      <div class="upload-preview">
        ${preview}
        <div class="upload-preview-info">
          <div class="upload-preview-name">${valor.nome}</div>
          <div class="upload-preview-size">${valor.tamanho || ''}</div>
        </div>
        <button class="btn-remover-anexo" onclick="removerAnexo('${containerId}')" title="Remover">✕</button>
      </div>`;
  }
}

function handleFileUpload(event, containerId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const val = { nome: file.name, tamanho: formatarTamanho(file.size), dataUrl: e.target.result };
    const wrap = document.getElementById(containerId);
    const cb   = wrap._onChange;
    cb(val);
    renderAnexo(containerId, val, cb);
    if (containerId === "novo-anexo-wrap")    { novoAnexo   = val; validarNovo(); }
    if (containerId === "atender-anexo-wrap") { atenderAnexo = val; renderFormAtender(); }
  };
  reader.readAsDataURL(file);
}

function removerAnexo(containerId) {
  const wrap = document.getElementById(containerId);
  const cb   = wrap._onChange;
  cb(null);
  if (containerId === "novo-anexo-wrap")    { novoAnexo   = null; validarNovo(); }
  if (containerId === "atender-anexo-wrap") { atenderAnexo = null; renderFormAtender(); }
  renderAnexo(containerId, null, cb);
}

// ── MODAL ANEXO ──────────────────────────────────────────────────────────────

function abrirModalAnexoIdx(idx) {
  const a = (window._anexosCache || [])[idx];
  if (!a) return;
  document.getElementById("modal-anexo-nome").textContent = a.nome;
  document.getElementById("modal-anexo-meta").textContent =
    `👤 ${a.usuario}  ·  🕐 ${a.data}${a.tamanho ? "  ·  " + a.tamanho : ""}`;

  const preview = document.getElementById("modal-anexo-preview");
  const isImg   = a.dataUrl && a.dataUrl.startsWith("data:image");
  preview.innerHTML = isImg
    ? `<img class="modal-anexo-img" src="${a.dataUrl}" alt="${a.nome}">`
    : `<div class="modal-anexo-file">📄</div>`;

  const btnBaixar = document.getElementById("btn-baixar-anexo");
  btnBaixar.href     = a.dataUrl || "#";
  btnBaixar.download = a.nome;

  document.getElementById("modal-anexo").style.display = "block";
}

function fecharModalAnexo(event) {
  if (event && event.target !== document.querySelector("#modal-anexo .modal-anexo-overlay")) return;
  document.getElementById("modal-anexo").style.display = "none";
}

// ── INIT ──────────────────────────────────────────────────────────────────────

renderLogin();