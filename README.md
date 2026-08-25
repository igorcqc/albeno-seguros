# Albeno Seguros — Landing Page (Seguro para moto)

Landing page estática de pré-qualificação para tráfego pago do Meta Ads, com
captura de nome e WhatsApp antes do redirecionamento.

Sem build, sem framework, sem dependências.

```
index.html                    estrutura, conteúdo e modal de captura
styles.css                    identidade visual (Sora + navy/azul/laranja/off-white)
script.js                     modal, WhatsApp, planilha, UTM, tracking e animações
google-apps-script/Codigo.gs  recebimento dos leads na planilha do Google
```

## Fluxo

```
Meta Ads → Landing Page → [modal: nome + WhatsApp] → planilha + evento Lead → WhatsApp
```

Os dois CTAs abrem o mesmo modal. O redirecionamento para o WhatsApp só
acontece depois do envio, o que garante que todo lead atendido também está
registrado na planilha e contabilizado como conversão.

---

## 1. Alterar o número do WhatsApp

Abra `script.js`, no bloco **CONFIGURAÇÃO** (topo do arquivo):

```js
var WHATSAPP_NUMBER = "SEU_NUMERO_AQUI"; // ex.: "5511999999999"
```

Formato: DDI + DDD + número. Espaços, parênteses e traços são removidos
automaticamente, então `"55 11 99999-9999"` também funciona.

Todos os botões da página usam esse mesmo valor. Enquanto ele não for
preenchido, o clique não abre nenhuma conversa (evita conversa inválida) e
registra um aviso no console.

Outros ajustes no mesmo bloco:

| Variável | Função |
| --- | --- |
| `WHATSAPP_MESSAGE` | Mensagem já preenchida na conversa |
| `LEAD_SOURCE` | Rótulo de origem anexado à mensagem (`LP Seguro Moto`) |
| `APPEND_SOURCE_TO_MESSAGE` | Liga/desliga o anexo de origem e campanha |
| `SHEET_ENDPOINT` | URL do app do Google Apps Script (planilha) |
| `TRACKED_PARAMS` | Parâmetros de URL preservados |

Exemplo de mensagem recebida no WhatsApp:

```
Olá! Meu nome é Igor Pacheco. Vim pela página de seguro para moto da Albeno
e gostaria de receber uma cotação para a minha moto.

(LP Seguro Moto | secao: hero | origem: facebook | campanha: moto_frio | anuncio: criativo_a)
```

O nome vem do formulário e a última linha identifica de qual anúncio o lead
veio, mesmo sem CRM.

---

## 2. Planilha de leads

O passo a passo completo está em
[`google-apps-script/README.md`](./google-apps-script/README.md). Resumindo:
crie uma planilha, cole o `Codigo.gs` em Extensões → Apps Script, publique como
app da web e cole a URL em `SHEET_ENDPOINT` (`script.js`).

Enquanto `SHEET_ENDPOINT` estiver vazio o formulário continua funcionando e o
lead segue para o WhatsApp normalmente — apenas nada é gravado.

---

## 3. Onde inserir Meta Pixel e Google Tag Manager

Em `index.html`, dentro do `<head>`, no bloco comentado:

```html
<!-- INICIO META PIXEL -->
<!-- INICIO GOOGLE TAG MANAGER -->
<!-- FIM TAGS -->
```

Cole ali o snippet oficial de cada ferramenta. Se usar GTM, o `<noscript>`
correspondente vai logo após a abertura do `<body>` (já há um comentário
marcando o local).

Nada mais precisa ser alterado: `script.js` detecta `window.fbq` e
`window.dataLayer` em tempo de execução. Sem tags instaladas, a página
continua funcionando normalmente.

---

## 4. Eventos preparados

| Evento | Quando dispara | Meta Pixel | dataLayer |
| --- | --- | --- | --- |
| `LeadFormOpen` | Clique em qualquer CTA (abre o modal) | `trackCustom` | `event: LeadFormOpen` |
| `LeadFormError` | Envio com campo inválido | `trackCustom` | `event: LeadFormError` |
| `LeadFormAbandon` | Modal fechado sem envio | `trackCustom` | `event: LeadFormAbandon` |
| **`Lead`** | **Formulário enviado com sucesso** | `track` (evento padrão) | `event: Lead` |
| `WhatsAppClick` | Mesmo envio, ao abrir a conversa | `trackCustom` | `event: WhatsAppClick` |
| `ScrollDepth` | 25%, 50%, 75% e 100% da página | `trackCustom` | `event: ScrollDepth` |

**Otimize a campanha por `Lead`.** Ele dispara só quando existe nome e telefone
válidos, então representa um contato real — é o sinal que o Meta precisa para
buscar mais pessoas parecidas com quem de fato preencheu.

`LeadFormOpen` menos `Lead` mostra quantas pessoas clicaram no botão mas
desistiram no formulário: é o volume de curiosos que a página passou a filtrar.

Todos os eventos carregam os parâmetros de campanha capturados (`utm_*`,
`fbclid`, `gclid`) e o `cta_origin` (`hero` ou `qualificacao`), o que permite
comparar qual bloco converte mais.

---

## 5. UTM e fbclid

Capturados na chegada e guardados em `sessionStorage`, então continuam
disponíveis mesmo se o usuário recarregar a página sem os parâmetros.
São usados em dois lugares: no contexto dos eventos de tracking e no rodapé
da mensagem do WhatsApp. Se não existirem, nada quebra.

---

## 6. Decisões de CRO

- **Formulário curto como filtro final.** Nome e WhatsApp são o mínimo para
  qualificar sem criar fricção: quem digita o próprio telefone está declarando
  intenção real. Curioso não preenche.
- **Redirecionamento só depois do envio**, o que garante que nenhum lead
  atendido fique fora da planilha nem da otimização da campanha.
- **Evento `Lead` no envio, nunca no clique**, para o Meta aprender com quem
  realmente deixou contato em vez de com quem apenas tocou no botão.
- **Duas barreiras conscientes de intenção.** O CTA do hero e o do bloco de
  pré-qualificação exigem cliques distintos, com textos diferentes
  (“Simular meu seguro” / “Quero simular meu seguro”). Quem chegou por engano
  no anúncio não passa das primeiras linhas.
- **Microcopy de filtro, não de bloqueio.** Abaixo do hero: *“Atendimento
  voltado a quem quer conhecer as opções de seguro para a própria moto…”*.
  Define o público sem tom negativo.
- **Redução de fricção logo depois do filtro.** O bloco “Como funciona” deixa
  claro que falar com a equipe não gera contratação nem cobrança — filtrar
  curioso sem afastar quem tem intenção real.
- **Contexto antes do clique.** Nenhum número de telefone aparece na página; o
  usuário só chega ao WhatsApp pelo botão, o que garante que ele leu a
  proposta antes de abrir a conversa.
- **Zero rotas de fuga.** Sem menu, sem links externos, sem redes sociais, sem
  telefone clicável. A única ação possível é o WhatsApp.
- **Mensagem pré-preenchida qualificadora.** O lead chega ao WhatsApp já se
  identificando pelo nome e dizendo o que quer, o que encurta o primeiro
  contato do atendimento.
- **Contato salvo antes da conversa.** Mesmo quem desiste no meio do caminho e
  não envia mensagem no WhatsApp já está na planilha para retorno ativo.
- **Hero completo acima da dobra** no mobile e no desktop: headline, promessa,
  CTA e microcopy sem necessidade de rolagem.
- **Sem preço, sem promessa e sem prova social inventada** — nada que gere
  expectativa que o atendimento não possa cumprir.

---

## 7. Pendências para publicação

- ~~Preencher `WHATSAPP_NUMBER` em `script.js`~~ (`558399180369`).
- ~~Publicar a planilha e preencher `SHEET_ENDPOINT`~~ (feito).
- Enviar um lead de teste e confirmar a linha na aba `Leads`.
- Colar Meta Pixel e/ou GTM em `index.html`.
- Configurar a campanha para otimizar pelo evento `Lead`.
- Substituir o favicon inline por `assets/favicon.svg` (opcional).
- Adicionar `assets/og-image.jpg` (1200×630) para o compartilhamento social.
