# Planilha de leads — configuração em 6 passos

Os dados do formulário são gravados numa planilha do Google, sem servidor e
sem custo. Leva cerca de cinco minutos.

1. Crie uma planilha nova em [sheets.new](https://sheets.new) e dê um nome
   (ex.: *Leads — Seguro Moto*). Não precisa criar colunas: o script cria a aba
   `Leads` e o cabeçalho no primeiro envio.

2. Na planilha, abra **Extensões → Apps Script**.

3. Apague o conteúdo do arquivo `Código.gs` e cole todo o conteúdo de
   [`Codigo.gs`](./Codigo.gs). Salve (Ctrl+S / Cmd+S).

4. Clique em **Implantar → Nova implantação → Tipo: App da Web** e configure:

   | Campo | Valor |
   | --- | --- |
   | Executar como | **Eu** (sua conta) |
   | Quem pode acessar | **Qualquer pessoa** |

   Esse par de opções é obrigatório: sem ele o navegador do visitante não
   consegue gravar na planilha.

5. Autorize o acesso quando o Google pedir. Na tela de aviso, use
   **Configurações avançadas → Acessar (projeto sem verificação)** — é o seu
   próprio script.

6. Copie a **URL do app da Web** (termina em `/exec`) e cole em `script.js`:

   ```js
   var SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfy.../exec";
   ```

Para testar, abra a URL direto no navegador: deve responder
`{"ok":true,"servico":"Albeno Seguros - captura de leads"}`. Depois envie um
lead de teste pela landing page e confira a linha na aba `Leads`.

## Webhook de notificação (Metrifiquei)

Depois de gravar a linha, o script repassa o lead para a URL definida em
`WEBHOOK_URL`, no topo do `Codigo.gs`:

```js
var WEBHOOK_URL = 'https://hooks.metrifiquei.com.br/url/ae76...';
```

Deixe `''` para desativar. O envio é `POST` com `application/json`:

```json
{
  "nome": "Maria Souza",
  "whatsapp": "(83) 99918-0369",
  "whatsapp_digitos": "83999180369",
  "origem_cta": "hero",
  "recebido_em": "01/09/2026 14:32:10",
  "pagina": "https://.../?utm_source=facebook",
  "name": "Maria Souza",
  "phone": "83999180369",
  "telefone": "(83) 99918-0369",
  "email": "",
  "mensagem": "Novo lead de seguro para moto pela landing page.",
  "utm_source": "facebook",
  "utm_medium": "paid",
  "utm_campaign": "moto_agosto",
  "utm_content": "criativo_02",
  "utm_term": "",
  "fbclid": "IwAR...",
  "gclid": ""
}
```

Os campos aparecem duas vezes de propósito: `nome`/`whatsapp` são os nomes
usados na landing page e `name`/`phone`/`telefone` são os apelidos que as
plataformas de notificação costumam esperar. Assim o mapeamento funciona sem
depender de qual convenção a Metrifiquei usa. Se ela exigir outros nomes de
campo, ajuste o objeto `corpo` dentro de `enviarWebhook_`.

O envio acontece **depois** do `appendRow`, dentro de um `try/catch`: se o
webhook estiver fora do ar ou responder erro, a linha na planilha permanece e o
lead segue normalmente para o WhatsApp. O código HTTP da resposta fica
registrado em **Execuções**, no editor do Apps Script — é ali que você confere
se a Metrifiquei aceitou (200) ou recusou o formato.

---

## Colunas gravadas

`Data/Hora`, `Nome`, `WhatsApp`, `WhatsApp (somente números)`, `CTA de origem`,
`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`,
`fbclid`, `gclid`, `Página`, `Referrer`, `User agent`.

A coluna **CTA de origem** mostra se o lead veio do botão do hero (`hero`) ou do
bloco de pré-qualificação (`qualificacao`). Junto com as UTMs, dá para ver
exatamente qual anúncio e qual bloco geraram cada conversa.

## Notificação por e-mail (opcional)

Para receber um aviso a cada lead, acrescente ao final de `doPost`, logo antes
do `return resposta_({ ok: true });`:

```js
MailApp.sendEmail(
  'seu-email@exemplo.com',
  'Novo lead — Seguro Moto',
  'Nome: ' + dados.nome + '\nWhatsApp: ' + dados.whatsapp +
  '\nCampanha: ' + (dados.utm_campaign || 'não informada')
);
```

## Alterar o script depois

Ao editar o código, é preciso republicar: **Implantar → Gerenciar implantações
→ editar → Versão: Nova versão → Implantar**. A URL continua a mesma.

## Observações

- O envio é feito em segundo plano (`sendBeacon`). Se a planilha estiver fora do
  ar, o lead continua sendo redirecionado ao WhatsApp — o atendimento nunca é
  bloqueado por causa da gravação.
- Por esse mesmo motivo a página não recebe confirmação de gravação. O WhatsApp
  segue como registro paralelo de todo contato.
- A URL do app fica visível no código-fonte da página. Ela só aceita gravação de
  novas linhas, mas evite reaproveitar essa mesma planilha para dados sensíveis.
