/* =========================================================================
   Albeno Seguros — Landing Page (Seguro para moto)
   Sem dependências externas. Tudo que costuma mudar está no bloco CONFIG.
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     1) CONFIGURAÇÃO — ALTERE APENAS AQUI
     ======================================================================= */

  // Número do WhatsApp com DDI + DDD, somente dígitos. Ex.: "5511999999999"
  var WHATSAPP_NUMBER = "SEU_NUMERO_AQUI";

  // Mensagem inicial enviada pelo usuário.
  var WHATSAPP_MESSAGE =
    "Olá! Vim pela página de seguro para moto da Albeno e gostaria de receber uma cotação para a minha moto.";

  // Identificador fixo da origem — facilita reconhecer leads desta landing page.
  var LEAD_SOURCE = "LP Seguro Moto";

  // Anexa origem/UTM ao final da mensagem para rastrear a campanha no atendimento.
  var APPEND_SOURCE_TO_MESSAGE = true;

  // Planilha: URL do app publicado no Google Apps Script (ver google-apps-script/README).
  // Enquanto estiver vazio, o formulário funciona normalmente e nada é enviado.
  var SHEET_ENDPOINT = "";

  // Parâmetros de campanha preservados durante a navegação.
  var TRACKED_PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "gclid"
  ];

  var STORAGE_KEY = "albeno_campaign_params";

  /* =======================================================================
     2) PARÂMETROS DE CAMPANHA (UTM / fbclid)
     Capturados na chegada e mantidos na sessão, para que continuem
     disponíveis mesmo se o usuário navegar/atualizar sem os parâmetros.
     ======================================================================= */

  function safeStorage(action, value) {
    try {
      if (action === "get") return window.sessionStorage.getItem(STORAGE_KEY);
      window.sessionStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* modo privado / storage bloqueado: segue sem persistência */
    }
    return null;
  }

  function readParamsFromUrl() {
    var found = {};
    var search = window.location.search;
    if (!search || search.length < 2) return found;

    var pairs = search.replace(/^\?/, "").split("&");
    for (var i = 0; i < pairs.length; i++) {
      if (!pairs[i]) continue;
      var parts = pairs[i].split("=");
      var key = decodeURIComponent(parts[0] || "").toLowerCase();
      var val = decodeURIComponent((parts[1] || "").replace(/\+/g, " ")).trim();
      if (val && TRACKED_PARAMS.indexOf(key) !== -1) found[key] = val;
    }
    return found;
  }

  function initCampaignParams() {
    var fromUrl = readParamsFromUrl();
    var stored = {};

    var raw = safeStorage("get");
    if (raw) {
      try { stored = JSON.parse(raw) || {}; } catch (e) { stored = {}; }
    }

    // A URL atual tem prioridade sobre o que já estava guardado.
    for (var key in fromUrl) {
      if (Object.prototype.hasOwnProperty.call(fromUrl, key)) stored[key] = fromUrl[key];
    }

    if (Object.keys(stored).length) {
      safeStorage("set", JSON.stringify(stored));
    }
    return stored;
  }

  var campaignParams = initCampaignParams();

  function campaignSummary() {
    var parts = [];
    var labels = {
      utm_source: "origem",
      utm_campaign: "campanha",
      utm_content: "anuncio",
      utm_medium: "midia",
      utm_term: "termo"
    };
    for (var key in labels) {
      if (campaignParams[key]) parts.push(labels[key] + ": " + campaignParams[key]);
    }
    return parts.join(" | ");
  }

  /* =======================================================================
     3) TRACKING
     Os eventos são enviados para Meta Pixel (fbq) e/ou GTM (dataLayer)
     quando essas tags existirem na página. Sem tag instalada, nada quebra.
     Nenhum evento de Lead é disparado no carregamento da página nem no
     clique do CTA: Lead representa o envio do formulário (contato real).
     ======================================================================= */

  function track(eventName, data) {
    var payload = data || {};

    // Contexto de campanha em todos os eventos.
    for (var key in campaignParams) {
      if (Object.prototype.hasOwnProperty.call(campaignParams, key)) {
        payload[key] = campaignParams[key];
      }
    }

    // Meta Pixel
    if (typeof window.fbq === "function") {
      // "Lead" é um evento padrão do Pixel; os demais são personalizados.
      if (eventName === "Lead") {
        window.fbq("track", "Lead", payload);
      } else {
        window.fbq("trackCustom", eventName, payload);
      }
    }

    // Google Tag Manager / GA4 via dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, albeno: payload });
  }

  /* =======================================================================
     4) WHATSAPP — função centralizada usada por todos os CTAs
     ======================================================================= */

  function buildWhatsAppMessage(lead) {
    var data = lead || {};
    var message = WHATSAPP_MESSAGE;

    if (data.nome) {
      message = "Olá! Meu nome é " + data.nome + ". " + WHATSAPP_MESSAGE.replace(/^Olá!\s*/, "");
    }

    if (APPEND_SOURCE_TO_MESSAGE) {
      var ref = [LEAD_SOURCE];
      if (data.origin) ref.push("secao: " + data.origin);
      var campaign = campaignSummary();
      if (campaign) ref.push(campaign);
      message += "\n\n(" + ref.join(" | ") + ")";
    }
    return message;
  }

  /**
   * Abre a conversa no WhatsApp.
   * Precisa ser chamada de forma síncrona dentro do gesto do usuário
   * (clique/submit), caso contrário navegadores in-app bloqueiam a janela.
   */
  function openWhatsApp(lead) {
    var data = lead || {};
    var digits = String(WHATSAPP_NUMBER).replace(/\D/g, "");

    if (!digits) {
      // Número ainda não configurado: evita abrir uma conversa inválida.
      if (window.console && console.warn) {
        console.warn("[Albeno] Configure WHATSAPP_NUMBER em script.js.");
      }
      return;
    }

    var url = "https://wa.me/" + digits + "?text=" + encodeURIComponent(buildWhatsAppMessage(data));

    var win = window.open(url, "_blank", "noopener");
    if (!win) window.location.href = url;
  }

  // Exposto para uso manual/depuração, se necessário.
  window.openWhatsApp = openWhatsApp;

  /* =======================================================================
     5) PLANILHA — envio dos dados capturados
     Envio "fire and forget": não bloqueia o redirecionamento para o WhatsApp
     e nunca impede o lead de ser atendido se a planilha estiver fora do ar.
     ======================================================================= */

  function saveLead(lead) {
    if (!SHEET_ENDPOINT) {
      if (window.console && console.warn) {
        console.warn("[Albeno] Configure SHEET_ENDPOINT em script.js para salvar na planilha.");
      }
      return;
    }

    var payload = {
      nome: lead.nome,
      whatsapp: lead.whatsapp,
      whatsapp_digitos: lead.whatsappDigits,
      origem_cta: lead.origin,
      pagina: window.location.href,
      referrer: document.referrer || "",
      user_agent: navigator.userAgent,
      enviado_em: new Date().toISOString()
    };

    for (var key in campaignParams) {
      if (Object.prototype.hasOwnProperty.call(campaignParams, key)) {
        payload[key] = campaignParams[key];
      }
    }

    var body = JSON.stringify(payload);

    // text/plain evita preflight CORS com o Google Apps Script.
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
        if (navigator.sendBeacon(SHEET_ENDPOINT, blob)) return;
      }
    } catch (e) {
      /* segue para o fetch abaixo */
    }

    try {
      fetch(SHEET_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: body
      })["catch"](function () {
        /* falha de rede não deve interromper o atendimento */
      });
    } catch (e) {
      /* ambiente sem fetch: o lead segue para o WhatsApp mesmo assim */
    }
  }

  /* =======================================================================
     6) MODAL DE CAPTURA (nome + WhatsApp)
     ======================================================================= */

  var modal = document.getElementById("modal");
  var dialog = document.getElementById("modal-dialog");
  var form = document.getElementById("lead-form");
  var inputNome = document.getElementById("lead-nome");
  var inputWhats = document.getElementById("lead-whatsapp");
  var lastFocused = null;
  var currentOrigin = "indefinido";

  var FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function openModal(origin) {
    currentOrigin = origin || "indefinido";
    lastFocused = document.activeElement;

    modal.hidden = false;
    document.body.classList.add("is-locked");

    track("LeadFormOpen", { cta_origin: currentOrigin });

    // No desktop o foco vai direto para o primeiro campo. No mobile o foco fica
    // no diálogo, para não abrir o teclado por cima do conteúdo antes da leitura.
    var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    var alvo = fine ? inputNome : dialog;

    window.setTimeout(function () {
      alvo.focus();
    }, 60);

    document.addEventListener("keydown", onModalKeydown);
  }

  function closeModal(reason) {
    if (modal.hidden) return;

    modal.hidden = true;
    document.body.classList.remove("is-locked");
    document.removeEventListener("keydown", onModalKeydown);

    if (reason === "abandono") track("LeadFormAbandon", { cta_origin: currentOrigin });
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function onModalKeydown(event) {
    if (event.key === "Escape" || event.keyCode === 27) {
      closeModal("abandono");
      return;
    }

    if (event.key !== "Tab" && event.keyCode !== 9) return;

    // Mantém o foco dentro do modal.
    var items = [];
    var candidates = modal.querySelectorAll(FOCUSABLE);
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].offsetParent !== null && !candidates[i].disabled) items.push(candidates[i]);
    }
    if (!items.length) return;

    var first = items[0];
    var last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  var closers = modal.querySelectorAll("[data-modal-close]");
  for (var c = 0; c < closers.length; c++) {
    closers[c].addEventListener("click", function () {
      closeModal("abandono");
    });
  }

  /* Máscara e validação -------------------------------------------------- */

  function onlyDigits(value) {
    return String(value).replace(/\D/g, "");
  }

  function maskPhone(value) {
    var d = onlyDigits(value).slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  inputWhats.addEventListener("input", function () {
    inputWhats.value = maskPhone(inputWhats.value);
    clearError(inputWhats, "erro-whatsapp");
  });

  inputNome.addEventListener("input", function () {
    clearError(inputNome, "erro-nome");
  });

  function setError(input, errorId) {
    input.setAttribute("aria-invalid", "true");
    document.getElementById(errorId).hidden = false;
  }

  function clearError(input, errorId) {
    input.removeAttribute("aria-invalid");
    document.getElementById(errorId).hidden = true;
  }

  function validate() {
    var ok = true;

    var nome = inputNome.value.trim().replace(/\s+/g, " ");
    if (nome.length < 2) {
      setError(inputNome, "erro-nome");
      ok = false;
    }

    // 10 dígitos (fixo com DDD) ou 11 dígitos (celular com DDD).
    var digits = onlyDigits(inputWhats.value);
    if (digits.length < 10 || digits.length > 11) {
      setError(inputWhats, "erro-whatsapp");
      ok = false;
    }

    return ok ? { nome: nome, whatsapp: inputWhats.value.trim(), whatsappDigits: digits } : null;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var lead = validate();
    if (!lead) {
      var invalid = modal.querySelector('[aria-invalid="true"]');
      if (invalid) invalid.focus();
      track("LeadFormError", { cta_origin: currentOrigin });
      return;
    }

    lead.origin = currentOrigin;

    // Conversão: só aqui o contato existe de fato.
    track("Lead", {
      cta_origin: currentOrigin,
      content_category: "seguro-moto",
      content_name: "cotacao-seguro-moto"
    });
    track("WhatsAppClick", { cta_origin: currentOrigin });

    saveLead(lead);

    // Aberto de forma síncrona, ainda dentro do gesto do usuário.
    openWhatsApp(lead);

    closeModal("enviado");
    form.reset();
  });

  /* =======================================================================
     7) LIGAÇÃO DOS CTAs — todos abrem o modal
     ======================================================================= */

  var ctas = document.querySelectorAll("[data-cta]");
  for (var i = 0; i < ctas.length; i++) {
    (function (button) {
      button.addEventListener("click", function () {
        openModal(button.getAttribute("data-cta"));
      });
    })(ctas[i]);
  }

  /* =======================================================================
     8) ENGAJAMENTO — profundidade de scroll (uma vez por marco)
     ======================================================================= */

  var milestones = [25, 50, 75, 100];
  var reached = {};
  var scrollTicking = false;

  function checkScrollDepth() {
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - window.innerHeight;
    var percent = scrollable > 0 ? ((window.pageYOffset || doc.scrollTop) / scrollable) * 100 : 100;

    for (var m = 0; m < milestones.length; m++) {
      var mark = milestones[m];
      if (!reached[mark] && percent >= mark) {
        reached[mark] = true;
        track("ScrollDepth", { percent: mark });
      }
    }
    if (reached[100]) window.removeEventListener("scroll", onScroll);
  }

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(function () {
      scrollTicking = false;
      checkScrollDepth();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  /* =======================================================================
     9) ANIMAÇÕES DE ENTRADA (respeitando prefers-reduced-motion)
     ======================================================================= */

  var reveals = document.querySelectorAll(".reveal");
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showAll() {
    for (var r = 0; r < reveals.length; r++) reveals[r].classList.add("is-visible");
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    for (var o = 0; o < reveals.length; o++) observer.observe(reveals[o]);
  }
})();
