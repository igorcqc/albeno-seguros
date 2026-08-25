/**
 * Albeno Seguros — recebimento dos leads da landing page.
 *
 * Cole este arquivo em Extensões > Apps Script da sua planilha do Google
 * e publique como app da web (instruções em google-apps-script/README.md).
 *
 * Cada envio do formulário vira uma linha na aba definida em SHEET_NAME.
 */

var SHEET_NAME = 'Leads';

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

    return resposta_({ ok: true });
  } catch (erro) {
    return resposta_({ ok: false, erro: String(erro) });
  } finally {
    try { trava.releaseLock(); } catch (erro) { /* nada a fazer */ }
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
