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
     Nenhum evento de Lead é disparado no carregamento da página:
     Lead representa a ação de intenção (clique que abre o WhatsApp).
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

  function buildWhatsAppMessage(origin) {
    var message = WHATSAPP_MESSAGE;

    if (APPEND_SOURCE_TO_MESSAGE) {
      var ref = [LEAD_SOURCE];
      if (origin) ref.push("secao: " + origin);
      var campaign = campaignSummary();
      if (campaign) ref.push(campaign);
      message += "\n\n(" + ref.join(" | ") + ")";
    }
    return message;
  }

  function openWhatsApp(origin) {
    var digits = String(WHATSAPP_NUMBER).replace(/\D/g, "");

    track("WhatsAppClick", { cta_origin: origin || "indefinido" });
    track("Lead", { cta_origin: origin || "indefinido", content_category: "seguro-moto" });

    if (!digits) {
      // Número ainda não configurado: evita abrir uma conversa inválida.
      if (window.console && console.warn) {
        console.warn("[Albeno] Configure WHATSAPP_NUMBER em script.js.");
      }
      return;
    }

    var url =
      "https://wa.me/" + digits + "?text=" + encodeURIComponent(buildWhatsAppMessage(origin));

    var win = window.open(url, "_blank", "noopener");
    if (!win) window.location.href = url;
  }

  // Exposto para uso manual/depuração, se necessário.
  window.openWhatsApp = openWhatsApp;

  /* =======================================================================
     5) LIGAÇÃO DOS CTAs
     ======================================================================= */

  var ctas = document.querySelectorAll("[data-cta]");
  for (var i = 0; i < ctas.length; i++) {
    (function (button) {
      button.addEventListener("click", function () {
        openWhatsApp(button.getAttribute("data-cta"));
      });
    })(ctas[i]);
  }

  /* =======================================================================
     6) ENGAJAMENTO — profundidade de scroll (uma vez por marco)
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
     7) ANIMAÇÕES DE ENTRADA (respeitando prefers-reduced-motion)
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
