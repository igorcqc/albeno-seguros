# Albeno Seguros — Landing Page (Seguro para moto)

Landing page estática de pré-qualificação para tráfego pago do Meta Ads.
Fluxo: **Meta Ads → Landing Page → WhatsApp**.

Sem build, sem framework, sem dependências. Basta publicar os três arquivos.

```
index.html    estrutura e conteúdo
styles.css    identidade visual (Sora + navy/azul/laranja/off-white)
script.js     WhatsApp, UTM, tracking e animações
```

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
| `TRACKED_PARAMS` | Parâmetros de URL preservados |

Exemplo de mensagem recebida no WhatsApp:

```
Olá! Vim pela página de seguro para moto da Albeno e gostaria de receber
uma cotação para a minha moto.

(LP Seguro Moto | secao: hero | origem: facebook | campanha: moto_frio | anuncio: criativo_a)
```

A segunda linha permite identificar de qual anúncio o lead veio, mesmo sem CRM.

---

## 2. Onde inserir Meta Pixel e Google Tag Manager

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

## 3. Eventos preparados

| Evento | Quando dispara | Meta Pixel | dataLayer |
| --- | --- | --- | --- |
| `WhatsAppClick` | Clique em qualquer CTA | `trackCustom` | `event: WhatsAppClick` |
| `Lead` | Mesmo clique (ação de intenção) | `track` (evento padrão) | `event: Lead` |
| `ScrollDepth` | 25%, 50%, 75% e 100% da página | `trackCustom` | `event: ScrollDepth` |

Nenhum evento de `Lead` é disparado no carregamento da página — apenas na ação
de intenção. Todos os eventos carregam junto os parâmetros de campanha
capturados (`utm_*`, `fbclid`, `gclid`) e o `cta_origin` (`hero` ou
`qualificacao`), o que permite comparar qual bloco converte mais.

Se preferir otimizar a campanha por `WhatsAppClick` em vez de `Lead` (por
exemplo, para reservar `Lead` ao momento em que a conversa realmente começa),
basta remover a chamada `track("Lead", ...)` dentro de `openWhatsApp()`.

---

## 4. UTM e fbclid

Capturados na chegada e guardados em `sessionStorage`, então continuam
disponíveis mesmo se o usuário recarregar a página sem os parâmetros.
São usados em dois lugares: no contexto dos eventos de tracking e no rodapé
da mensagem do WhatsApp. Se não existirem, nada quebra.

---

## 5. Decisões de CRO

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
- **Mensagem pré-preenchida qualificadora.** O lead já chega dizendo o que
  quer, o que encurta o primeiro contato do atendimento.
- **Hero completo acima da dobra** no mobile e no desktop: headline, promessa,
  CTA e microcopy sem necessidade de rolagem.
- **Sem preço, sem promessa e sem prova social inventada** — nada que gere
  expectativa que o atendimento não possa cumprir.

---

## 6. Pendências para publicação

- Preencher `WHATSAPP_NUMBER` em `script.js`.
- Colar Meta Pixel e/ou GTM em `index.html`.
- Substituir o favicon inline por `assets/favicon.svg` (opcional).
- Adicionar `assets/og-image.jpg` (1200×630) para o compartilhamento social.
