/**
 * Albeno Seguros — recebimento dos leads da landing page.
 *
 * Cole este arquivo em Extensões > Apps Script da sua planilha do Google
 * e publique como app da web (instruções em google-apps-script/README.md).
 *
 * Cada envio do formulário vira uma linha na aba definida em SHEET_NAME
 * e é repassado ao webhook configurado em WEBHOOK_URL.
 */

var SHEET_NAME = 'Leads';

// Webhook de notificação (Metrifiquei). Deixe '' para desativar o envio.
var WEBHOOK_URL = 'https://hooks.metrifiquei.com.br/url/ae762792-4d4e-4248-b84d-2caf32907ab3';

var COLUNAS = [
  { chave: 'recebido_em',      titulo: 'Data/Hora' },
  { chave: 'nome',             titulo: 'Nome' },
  { chave: 'whatsapp',         titulo: 'WhatsApp' },
  { chave: 'whatsapp_digitos', titulo: 'WhatsApp (somente números)' },
  { chave: 'origem_cta',       titulo: 'CTA de origem' },
  { chave: 'utm_source',       titulo: 'utm_source' },
  { chave: 'utm_medium',       titulo: 'utm_medium' },
  { chave: 'utm_campaign',     titulo: 'utm_campaign' },
  { chave: 'utm_content',      titulo: 'utm_content' },
  { chave: 'utm_term',         titulo: 'utm_term' },
  { chave: 'fbclid',           titulo: 'fbclid' },
  { chave: 'gclid',            titulo: 'gclid' },
  { chave: 'pagina',           titulo: 'Página' },
  { chave: 'referrer',         titulo: 'Referrer' },
  { chave: 'user_agent',       titulo: 'User agent' }
];

function doPost(e) {
  var trava = LockService.getScriptLock();

  try {
    trava.waitLock(20000);

    var dados = {};
    if (e && e.postData && e.postData.contents) {
      dados = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      dados = e.parameter;
    }

    dados.recebido_em = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'dd/MM/yyyy HH:mm:ss'
    );

    var aba = obterAba_();
    var linha = COLUNAS.map(function (coluna) {
      var valor = dados[coluna.chave];
      return valor === undefined || valor === null ? '' : String(valor);
    });

    aba.appendRow(linha);

    // A gravação já está feita: uma falha no webhook não pode derrubar o lead.
    var webhook = enviarWebhook_(dados);

    return resposta_({ ok: true, webhook: webhook });
  } catch (erro) {
    return resposta_({ ok: false, erro: String(erro) });
  } finally {
    try { trava.releaseLock(); } catch (erro) { /* nada a fazer */ }
  }
}

/**
 * Repassa o lead ao webhook de notificação.
 * Envia application/json de verdade (aqui não existe restrição de CORS) e
 * inclui apelidos comuns dos campos para funcionar com receptores diferentes.
 */
function enviarWebhook_(dados) {
  if (!WEBHOOK_URL) return 'desativado';

  var corpo = {
    // Nomes usados pela landing page
    nome: dados.nome || '',
    whatsapp: dados.whatsapp || '',
    whatsapp_digitos: dados.whatsapp_digitos || '',
    origem_cta: dados.origem_cta || '',
    recebido_em: dados.recebido_em || '',
    pagina: dados.pagina || '',

    // Apelidos comuns em plataformas de notificação
    name: dados.nome || '',
    phone: dados.whatsapp_digitos || '',
    telefone: dados.whatsapp || '',
    email: '',
    mensagem: 'Novo lead de seguro para moto pela landing page.',

    // Campanha
    utm_source: dados.utm_source || '',
    utm_medium: dados.utm_medium || '',
    utm_campaign: dados.utm_campaign || '',
    utm_content: dados.utm_content || '',
    utm_term: dados.utm_term || '',
    fbclid: dados.fbclid || '',
    gclid: dados.gclid || ''
  };

  try {
    var resposta = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(corpo),
      muteHttpExceptions: true,
      followRedirects: true
    });

    var codigo = resposta.getResponseCode();
    if (codigo < 200 || codigo >= 300) {
      console.warn('Webhook respondeu ' + codigo + ': ' + resposta.getContentText().slice(0, 300));
    }
    return codigo;
  } catch (erro) {
    console.error('Falha ao chamar o webhook: ' + erro);
    return 'erro';
  }
}

/** Permite testar a URL publicada abrindo-a no navegador. */
function doGet() {
  return resposta_({ ok: true, servico: 'Albeno Seguros - captura de leads' });
}

function obterAba_() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(SHEET_NAME);

  if (!aba) {
    aba = planilha.insertSheet(SHEET_NAME);
  }

  if (aba.getLastRow() === 0) {
    var titulos = COLUNAS.map(function (coluna) { return coluna.titulo; });
    aba.appendRow(titulos);
    aba.getRange(1, 1, 1, titulos.length).setFontWeight('bold');
    aba.setFrozenRows(1);
  }

  return aba;
}

function resposta_(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
