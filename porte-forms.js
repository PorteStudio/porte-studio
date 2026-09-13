/* =====================================================================
   PORTE STUDIO — form wiring (custom, not part of Claude Design)
   ---------------------------------------------------------------------
   What this file does:
     1. Makes the Contact page form actually send (via Web3Forms -> hello@)
     2. Adds a popup version of the same form to every page
     3. Opens that popup when "Book a discovery call" / "Get in touch"
        buttons are clicked
     4. Tidies internal links so they don't show ".html"

   HOW TO RE-ADD AFTER A CLAUDE DESIGN EXPORT (see PORTE-WIRING-NOTES.md):
     - keep this file in the site folder
     - keep vercel.json in the site folder
     - make sure each .html page has this line before </body>:
         <script src="porte-forms.js"></script>
   ===================================================================== */

(function () {
  "use strict";

  /* ---- 1. THE ONLY SETTING YOU EVER CHANGE ------------------------- */
  /* Paste your Web3Forms access key between the quotes below.          */
  var WEB3FORMS_KEY = "5b4f2855-7ad3-49e0-9fd2-6660fd0aca4c";
  /* ------------------------------------------------------------------ */

  var API = "https://api.web3forms.com/submit";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---- HubSpot (free CRM) — leads also push here, in parallel ------- */
  var HUBSPOT_PORTAL = "443081957";
  var HUBSPOT_FORM = "6b801fcb-65b6-488a-bf69-851312d43593";
  var HUBSPOT_TRACKER = "//js-ap1.hs-scripts.com/443081957.js";

  /* ---- Google Analytics (GA4) — a lead event fires on each submit -- */
  var GA4_ID = "G-F4FDLFBPGX";
  /* ------------------------------------------------------------------ */

  /* Buttons with this exact text (any case) open the popup form. */
  var OPEN_TRIGGERS = ["book a discovery call", "get in touch"];

  /* Send the collected fields to Web3Forms. Returns a promise. */
  function sendToWeb3Forms(payload) {
    payload.access_key = WEB3FORMS_KEY;
    payload.from_name = "Porte Studio Website";
    return fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  }

  /* Read a cookie (used to link the lead to HubSpot's page-view tracking) */
  function getCookie(name) {
    var m = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[2]) : "";
  }

  /* Load the HubSpot tracking script (page analytics + sets the hubspotutk cookie) */
  function loadHubSpot() {
    if (document.getElementById("hs-script-loader")) return;
    var s = document.createElement("script");
    s.id = "hs-script-loader"; s.type = "text/javascript"; s.async = true; s.defer = true;
    s.src = HUBSPOT_TRACKER;
    document.head.appendChild(s);
  }

  /* Push the lead into HubSpot's free CRM (parallel to the email). Best-effort. */
  function sendToHubSpot(d) {
    var msg = "";
    if (d.interest) msg += "Interested in: " + d.interest;
    if (d.source) msg += (msg ? " · " : "") + "via " + d.source;
    if (msg) msg += "\n\n";
    msg += (d.message || "");
    var body = {
      submittedAt: Date.now(),
      fields: [
        { name: "email", value: d.email || "" },
        { name: "firstname", value: (d.name || "").trim() },
        { name: "phone", value: d.phone || "" },
        { name: "company", value: d.business || "" },
        { name: "message", value: msg }
      ],
      context: { pageUri: location.href, pageName: document.title }
    };
    var hutk = getCookie("hubspotutk");
    if (hutk) body.context.hutk = hutk;
    return fetch("https://api.hsforms.com/submissions/v3/integration/submit/" + HUBSPOT_PORTAL + "/" + HUBSPOT_FORM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  /* Load Google Analytics (GA4) */
  function loadGA4() {
    if (!GA4_ID || window.__ga4Loaded) return;
    window.__ga4Loaded = true;
    var s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
  }

  /* Fire a GA4 "generate_lead" event, tagged with which form + page */
  function trackLead(source) {
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", {
          form_location: source,
          page_path: location.pathname,
          page_title: document.title
        });
      }
    } catch (e) {}
  }

  /* =================================================================
     PART A — make the existing Contact page form send for real
     ================================================================= */
  function wireContactForm() {
    var formBox = document.getElementById("formBox");
    var sendBtn = document.getElementById("sendBtn");
    var sentBox = document.getElementById("sentBox");
    if (!formBox || !sendBtn || !sentBox) return; // not the contact page

    // Replace the button to strip the placeholder click handler that
    // Claude Design generated (it only *pretended* to send).
    var freshBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(freshBtn, sendBtn);

    // Add an optional phone field after the email field (if not already there)
    var emailField = document.getElementById("cEmail");
    if (emailField && !document.getElementById("cPhone")) {
      var grp = document.createElement("div");
      grp.innerHTML = '<div style="font-size:10.5px; letter-spacing:0.24em; color:var(--ink-soft); margin-bottom:12px;">PHONE <span style="opacity:0.5;">(OPTIONAL)</span></div>'
        + '<input id="cPhone" placeholder="Your phone number" style="width:100%; background:transparent; border:none; border-bottom:1px solid var(--line); padding:8px 0; font-family:Jost,sans-serif; font-size:22px; font-weight:300; color:var(--ink); outline:none;" />';
      var emailGroup = emailField.parentNode;
      emailGroup.parentNode.insertBefore(grp, emailGroup.nextSibling);
    }

    // Add "Social Media Strategy" to the contact form's interest dropdown (if missing)
    var cInt = document.getElementById("cInterest");
    if (cInt && !Array.prototype.some.call(cInt.options, function (o) { return o.text === "Social Media Strategy"; })) {
      var smOpt = document.createElement("option"); smOpt.text = "Social Media Strategy";
      var after = -1;
      for (var k = 0; k < cInt.options.length; k++) { if (/Brand/.test(cInt.options[k].text)) { after = k; break; } }
      if (after >= 0 && after + 1 < cInt.options.length) cInt.add(smOpt, cInt.options[after + 1]); else cInt.add(smOpt);
    }

    function showErr(id, on) {
      var el = document.getElementById(id);
      if (el) el.style.display = on ? "block" : "none";
    }

    freshBtn.addEventListener("click", function () {
      var name = (document.getElementById("cName") || {}).value || "";
      var email = (document.getElementById("cEmail") || {}).value || "";
      var phone = (document.getElementById("cPhone") || {}).value || "";
      var business = (document.getElementById("cBusiness") || {}).value || "";
      var interest = (document.getElementById("cInterest") || {}).value || "";
      var message = (document.getElementById("cMessage") || {}).value || "";
      name = name.trim(); email = email.trim(); message = message.trim(); phone = phone.trim();

      var eN = !name, eE = !EMAIL_RE.test(email), eM = !message;
      showErr("errName", eN); showErr("errEmail", eE); showErr("errMessage", eM);
      if (eN || eE || eM) return;

      freshBtn.style.pointerEvents = "none";
      freshBtn.textContent = "SENDING…";

      sendToHubSpot({ name: name, email: email, phone: phone, business: business, interest: interest, message: message, source: "Contact page" });
      trackLead("Contact page");
      sendToWeb3Forms({
        subject: "New website enquiry — " + (interest || "General"),
        name: name, email: email, phone: phone, business: business,
        interest: interest, message: message, source: "Contact page"
      }).then(function (res) {
        if (res && res.success) {
          formBox.style.display = "none";
          sentBox.style.display = "block";
        } else { fail(); }
      }).catch(fail);

      function fail() {
        freshBtn.style.pointerEvents = "";
        freshBtn.textContent = "SEND MESSAGE";
        alert("Sorry — something went wrong sending your message. Please email hello@portestudio.com.au directly.");
      }
    });
  }

  /* =================================================================
     PART B — the popup form (added to every page)
     ================================================================= */
  function injectPopup() {
    if (document.getElementById("psOverlay")) return;

    var css = ''
      + '.ps-overlay{position:fixed;inset:0;z-index:1000;background:rgba(24,20,15,0.55);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .3s ease;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:6vh 20px;}'
      + '.ps-overlay.open{opacity:1;pointer-events:auto;}'
      + '.ps-modal{position:relative;width:min(560px,100%);background:var(--bone,#ece7df);color:var(--ink,#2d2922);padding:48px clamp(24px,5vw,56px) 52px;box-shadow:0 30px 80px rgba(18,15,11,0.4);transform:translateY(18px);transition:transform .35s cubic-bezier(.2,.7,.2,1);}'
      + '.ps-overlay.open .ps-modal{transform:translateY(0);}'
      + '.ps-close{position:absolute;top:16px;right:20px;cursor:pointer;font-size:26px;line-height:1;color:var(--ink-soft,#6b655c);padding:6px 10px;}'
      + '.ps-close:hover{opacity:.6;}'
      + '.ps-eyebrow{font-size:11px;letter-spacing:.3em;color:var(--ink-soft,#6b655c);margin-bottom:34px;}'
      + '.ps-field{margin-bottom:28px;}'
      + '.ps-label{font-size:10.5px;letter-spacing:.24em;color:var(--ink-soft,#6b655c);margin-bottom:12px;}'
      + '.ps-label span{opacity:.5;}'
      + '.ps-input,.ps-select,.ps-textarea{width:100%;background:transparent;border:none;border-bottom:1px solid var(--line,rgba(45,41,34,0.12));padding:8px 0;font-family:"Jost",sans-serif;font-size:20px;font-weight:300;color:var(--ink,#2d2922);outline:none;}'
      + '.ps-select{cursor:pointer;-webkit-appearance:none;appearance:none;}'
      + '.ps-textarea{resize:none;line-height:1.6;}'
      + '.ps-err{display:none;font-size:11px;color:var(--accent,#9a6f54);margin-top:8px;letter-spacing:.04em;}'
      + '.ps-send{cursor:pointer;margin-top:6px;padding:16px 40px;background:var(--ink,#2d2922);color:var(--bone,#ece7df);font-size:11px;letter-spacing:.24em;border:none;font-family:"Jost",sans-serif;}'
      + '.ps-send:hover{opacity:.85;}'
      + '.ps-sent{display:none;padding:10px 0 20px;}'
      + '.ps-sent .t{font-family:"Marcellus",serif;font-size:30px;margin-bottom:16px;}'
      + '.ps-sent p{font-weight:300;font-size:18px;line-height:1.8;color:var(--ink-soft,#6b655c);}'
      + '.ps-hp{position:absolute;left:-9999px;top:-9999px;}';
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var html = ''
      + '<div class="ps-modal" role="dialog" aria-modal="true" aria-label="Contact form">'
      + '  <div class="ps-close" aria-label="Close">&times;</div>'
      + '  <div id="psFormWrap">'
      + '    <div class="ps-eyebrow">( LET\'S TALK )</div>'
      + '    <div class="ps-field"><div class="ps-label">NAME</div><input id="pName" class="ps-input" placeholder="Your name" /><div id="pErrName" class="ps-err">Please enter your name.</div></div>'
      + '    <div class="ps-field"><div class="ps-label">EMAIL</div><input id="pEmail" class="ps-input" placeholder="you@business.com" /><div id="pErrEmail" class="ps-err">Please enter a valid email.</div></div>'
      + '    <div class="ps-field"><div class="ps-label">PHONE <span>(OPTIONAL)</span></div><input id="pPhone" class="ps-input" placeholder="Your phone number" /></div>'
      + '    <div class="ps-field"><div class="ps-label">BUSINESS <span>(OPTIONAL)</span></div><input id="pBusiness" class="ps-input" placeholder="Business name" /></div>'
      + '    <div class="ps-field"><div class="ps-label">WHAT ARE YOU INTERESTED IN?</div><select id="pInterest" class="ps-select">'
      + '      <option>Book a discovery call</option>'
      + '      <option>Marketing Strategy &amp; Campaigns</option>'
      + '      <option>Brand &amp; Communications</option>'
      + '      <option>Social Media Strategy</option>'
      + '      <option>CRM &amp; Systems</option>'
      + '      <option>Sales Consulting</option>'
      + '      <option>Not sure yet / general enquiry</option>'
      + '    </select></div>'
      + '    <div class="ps-field"><div class="ps-label">HOW CAN WE HELP?</div><textarea id="pMessage" class="ps-textarea" rows="3" placeholder="A few lines about your business and what you\'re after."></textarea><div id="pErrMessage" class="ps-err">Please add a short message.</div></div>'
      + '    <input type="text" id="pHp" class="ps-hp" tabindex="-1" autocomplete="off" />'
      + '    <button id="pSend" class="ps-send">SEND MESSAGE</button>'
      + '  </div>'
      + '  <div id="psSent" class="ps-sent"><div class="t">Thank you.</div><p>Your message is on its way. We\'ll get back to you within two business days, usually sooner.</p></div>'
      + '</div>';

    var overlay = document.createElement("div");
    overlay.id = "psOverlay";
    overlay.className = "ps-overlay";
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    var wrap = document.getElementById("psFormWrap");
    var sent = document.getElementById("psSent");
    var sendBtn = document.getElementById("pSend");

    function open(intent) {
      var sel = document.getElementById("pInterest");
      if (intent && sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value.toLowerCase() === intent.toLowerCase()) { sel.selectedIndex = i; break; }
        }
      }
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function close() {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
      setTimeout(function () { wrap.style.display = "block"; sent.style.display = "none"; }, 300);
    }
    window.PortePopup = { open: open, close: close };

    overlay.querySelector(".ps-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    function show(id, on) { var el = document.getElementById(id); if (el) el.style.display = on ? "block" : "none"; }

    sendBtn.addEventListener("click", function () {
      if (document.getElementById("pHp").value) return; // honeypot: bot filled it
      var name = document.getElementById("pName").value.trim();
      var email = document.getElementById("pEmail").value.trim();
      var phone = document.getElementById("pPhone").value.trim();
      var business = document.getElementById("pBusiness").value.trim();
      var interest = document.getElementById("pInterest").value;
      var message = document.getElementById("pMessage").value.trim();

      var eN = !name, eE = !EMAIL_RE.test(email), eM = !message;
      show("pErrName", eN); show("pErrEmail", eE); show("pErrMessage", eM);
      if (eN || eE || eM) return;

      sendBtn.style.pointerEvents = "none";
      sendBtn.textContent = "SENDING…";

      sendToHubSpot({ name: name, email: email, phone: phone, business: business, interest: interest, message: message, source: "Popup form" });
      trackLead("Popup form");
      sendToWeb3Forms({
        subject: "New website enquiry — " + (interest || "General"),
        name: name, email: email, phone: phone, business: business,
        interest: interest, message: message, source: "Popup form"
      }).then(function (res) {
        sendBtn.style.pointerEvents = "";
        sendBtn.textContent = "SEND MESSAGE";
        if (res && res.success) { wrap.style.display = "none"; sent.style.display = "block"; }
        else { alert("Sorry — something went wrong. Please email hello@portestudio.com.au directly."); }
      }).catch(function () {
        sendBtn.style.pointerEvents = "";
        sendBtn.textContent = "SEND MESSAGE";
        alert("Sorry — something went wrong. Please email hello@portestudio.com.au directly.");
      });
    });
  }

  /* =================================================================
     PART C — make the CTA buttons open the popup
     ================================================================= */
  function wireTriggers() {
    var candidates = document.querySelectorAll("a, button, div, span");
    candidates.forEach(function (el) {
      if (el.children.length > 0) return;            // only leaf elements
      var txt = (el.textContent || "").trim().toLowerCase();
      if (OPEN_TRIGGERS.indexOf(txt) === -1) return; // not a trigger
      el.style.cursor = "pointer";
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var intent = txt.indexOf("discovery") !== -1 ? "Book a discovery call" : "";
        if (window.PortePopup) window.PortePopup.open(intent);
      });
    });
  }

  /* =================================================================
     PART D — tidy internal links (hide the ".html")
     ================================================================= */
  function cleanLinks() {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) return;
      if (href === "index.html") { a.setAttribute("href", "/"); return; }
      a.setAttribute("href", href.replace(/\.html($|[?#])/, "$1"));
    });
  }

  /* =================================================================
     PART E — bottom-of-page inline form (auto-contrasting band)
     Replaces the "GET IN TOUCH" button in the closing band with the
     form, and sets the band colour to the opposite of the section above.
     ================================================================= */
  function isDark(rgb) {
    var m = (rgb || "").match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    var p = m[1].split(",").map(function (x) { return parseFloat(x); });
    if (p.length >= 4 && p[3] === 0) return false; // transparent = treat as light
    var lum = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
    return lum < 140;
  }

  function wireBottomCta() {
    // Find the closing-band button (text "GET IN TOUCH")
    var btn = null, els = document.querySelectorAll("a, button, span, div");
    for (var i = 0; i < els.length; i++) {
      if (els[i].children.length === 0 && (els[i].textContent || "").trim().toUpperCase() === "GET IN TOUCH") { btn = els[i]; break; }
    }
    if (!btn) return;
    var band = btn.closest("section");
    if (!band) return;

    // Match the form to the band's OWN current colour so it's always readable.
    // We deliberately don't change any section colours here — the overall
    // colour rhythm is a separate piece of work for its own session.
    var variant = isDark(getComputedStyle(band).backgroundColor) ? "dark" : "light";

    if (!document.getElementById("pf-cta-style")) {
      var st = document.createElement("style"); st.id = "pf-cta-style";
      st.textContent = ''
        + '.pf-cta{max-width:680px;margin:44px auto 0;display:grid;grid-template-columns:1fr 1fr;gap:30px 36px;text-align:left;}'
        + '.pf-cta .pf-full{grid-column:1/-1;}'
        + '.pf-cta label{display:block;font-size:10.5px;letter-spacing:0.24em;margin-bottom:11px;}'
        + '.pf-cta label .opt{opacity:0.55;}'
        + '.pf-cta input,.pf-cta select,.pf-cta textarea{width:100%;background:transparent;border:none;border-bottom:1px solid;padding:8px 0;font-family:Jost,sans-serif;font-size:19px;font-weight:300;outline:none;}'
        + '.pf-cta select{cursor:pointer;-webkit-appearance:none;appearance:none;}.pf-cta select option{color:#2d2922;}'
        + '.pf-cta textarea{resize:none;line-height:1.6;}'
        + '.pf-cta .pf-send{grid-column:1/-1;justify-self:center;margin-top:12px;padding:16px 44px;font-size:11px;letter-spacing:0.24em;border:none;font-family:Jost,sans-serif;cursor:pointer;}'
        + '.pf-cta .pf-err{display:none;font-size:11px;margin-top:8px;letter-spacing:0.04em;}'
        + '.pf-dark label{color:rgba(239,234,227,0.72);}.pf-dark input,.pf-dark select,.pf-dark textarea{color:#efeae3;border-bottom-color:rgba(239,234,227,0.45);}.pf-dark input::placeholder,.pf-dark textarea::placeholder{color:rgba(239,234,227,0.4);}.pf-dark .pf-send{background:#efeae3;color:#2d2922;}.pf-dark .pf-err{color:#efeae3;}'
        + '.pf-light label{color:#6b655c;}.pf-light input,.pf-light select,.pf-light textarea{color:#2d2922;border-bottom-color:rgba(45,41,34,0.18);}.pf-light input::placeholder,.pf-light textarea::placeholder{color:rgba(45,41,34,0.4);}.pf-light .pf-send{background:#2d2922;color:#efeae3;}.pf-light .pf-err{color:#9a6f54;}'
        + '@media(max-width:640px){.pf-cta{grid-template-columns:1fr;gap:24px;}}';
      document.head.appendChild(st);
    }

    var form = document.createElement("form");
    form.className = "pf-cta pf-" + variant;
    form.setAttribute("novalidate", "");
    form.innerHTML = ''
      + '<div><label>NAME</label><input id="bfName" placeholder="Your name" /><div id="bfErrName" class="pf-err">Please enter your name.</div></div>'
      + '<div><label>EMAIL</label><input id="bfEmail" placeholder="you@business.com" /><div id="bfErrEmail" class="pf-err">Please enter a valid email.</div></div>'
      + '<div><label>PHONE <span class="opt">(OPTIONAL)</span></label><input id="bfPhone" placeholder="Your phone number" /></div>'
      + '<div><label>BUSINESS <span class="opt">(OPTIONAL)</span></label><input id="bfBusiness" placeholder="Business name" /></div>'
      + '<div class="pf-full"><label>WHAT ARE YOU INTERESTED IN?</label><select id="bfInterest"><option>Book a discovery call</option><option>Marketing Strategy &amp; Campaigns</option><option>Brand &amp; Communications</option><option>Social Media Strategy</option><option>CRM &amp; Systems</option><option>Sales Consulting</option><option>Not sure yet / general enquiry</option></select></div>'
      + '<div class="pf-full"><label>HOW CAN WE HELP?</label><textarea id="bfMessage" rows="2" placeholder="A few lines about your business and what you\'re after."></textarea><div id="bfErrMessage" class="pf-err">Please add a short message.</div></div>'
      + '<input type="text" id="bfHp" style="position:absolute;left:-9999px;top:-9999px;" tabindex="-1" autocomplete="off" />'
      + '<button type="submit" class="pf-send">SEND MESSAGE</button>';
    btn.parentNode.replaceChild(form, btn);

    function show2(id, on) { var el = document.getElementById(id); if (el) el.style.display = on ? "block" : "none"; }
    function fail(sb) { sb.style.pointerEvents = ""; sb.textContent = "SEND MESSAGE"; alert("Sorry — something went wrong. Please email hello@portestudio.com.au directly."); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (document.getElementById("bfHp").value) return; // honeypot
      var name = document.getElementById("bfName").value.trim();
      var email = document.getElementById("bfEmail").value.trim();
      var phone = document.getElementById("bfPhone").value.trim();
      var business = document.getElementById("bfBusiness").value.trim();
      var interest = document.getElementById("bfInterest").value;
      var message = document.getElementById("bfMessage").value.trim();
      var eN = !name, eE = !EMAIL_RE.test(email), eM = !message;
      show2("bfErrName", eN); show2("bfErrEmail", eE); show2("bfErrMessage", eM);
      if (eN || eE || eM) return;
      var sb = form.querySelector(".pf-send");
      sb.style.pointerEvents = "none"; sb.textContent = "SENDING…";
      sendToHubSpot({ name: name, email: email, phone: phone, business: business, interest: interest, message: message, source: "Bottom CTA (" + location.pathname + ")" });
      trackLead("Bottom CTA");
      sendToWeb3Forms({
        subject: "New website enquiry — " + (interest || "Bottom form"),
        name: name, email: email, phone: phone, business: business,
        interest: interest, message: message, source: "Bottom CTA (" + location.pathname + ")"
      }).then(function (res) {
        if (res && res.success) {
          form.innerHTML = '<div class="pf-full" style="text-align:center;"><div style="font-family:Marcellus,serif;font-size:30px;margin-bottom:14px;">Thank you.</div><p style="font-weight:300;font-size:18px;line-height:1.8;opacity:0.85;">Your message is on its way. We\'ll get back to you within two business days, usually sooner.</p></div>';
        } else { fail(sb); }
      }).catch(function () { fail(sb); });
    });
  }

  /* =================================================================
     PART F — gentle auto-popup (exit-intent + delayed fallback, once)
     ================================================================= */
  function autoPopup() {
    if (/contact/.test(location.pathname)) return; // they're already on the form
    var KEY = "ps_popup_seen", seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch (e) {}
    if (seen) return;
    function fire() {
      if (seen) return; seen = true;
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      if (window.PortePopup) window.PortePopup.open();
    }
    // Desktop: fire when the cursor leaves the top of the window (exit intent)
    document.addEventListener("mouseout", function (e) {
      if (!e.relatedTarget && e.clientY <= 0) fire();
    });
    // Mobile / fallback: after 45s, on the next scroll
    setTimeout(function () {
      if (window.scrollY > 300) fire();
      else window.addEventListener("scroll", function once() { window.removeEventListener("scroll", once); fire(); });
    }, 45000);
  }

  /* =================================================================
     PART G — footer colour (bone footer where it follows a dark band,
     taupe footer where it follows a light section, e.g. Contact)
     ================================================================= */
  function wireFooter() {
    var footer = document.querySelector("footer");
    if (!footer) return;
    var sections = document.querySelectorAll("section");
    var last = sections.length ? sections[sections.length - 1] : null;
    var aboveDark = last ? isDark(getComputedStyle(last).backgroundColor) : true;
    if (!aboveDark) return; // section above the footer is light -> keep the current dark footer

    if (!document.getElementById("pf-footer-style")) {
      var st = document.createElement("style"); st.id = "pf-footer-style";
      st.textContent = ''
        + 'footer.pf-footer-light{background:#ece7df !important;border-top:1px solid rgba(45,41,34,0.12) !important;color:#6b655c !important;}'
        + 'footer.pf-footer-light *{color:#6b655c !important;opacity:1 !important;}'
        + 'footer.pf-footer-light .pf-fname{color:#8b8074 !important;}';
      document.head.appendChild(st);
    }
    footer.classList.add("pf-footer-light");
    // give the big "Porte Studio" name the taupe accent
    var all = footer.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      if (/Marcellus/i.test(all[i].getAttribute("style") || "")) { all[i].classList.add("pf-fname"); break; }
    }
  }

  /* =================================================================
     PART H — LANDING PAGES (ad pages under /go/)
     These are Claude Design "bundled" pages: the form is drawn by a
     small app after the page loads, so we can't rely on fixed IDs like
     the main site. Instead we listen for ANY form submit on the page,
     read whatever fields are there, and push the lead to Web3Forms +
     HubSpot + GA4 — tagged with this page's own label so we know which
     landing page it came from. The page's own "thank you" still shows.

     A page turns this on by adding, in its <head>:
       <meta name="porte-landing" content="Brand Strategy">
     The content is the label used in HubSpot and GA4 ("Landing: Brand
     Strategy"). No popup or bottom form is added on landing pages.
     ================================================================= */
  /* Per-page SEO (applied by JS because the bundled page rewrites its own <head>). */
  var LANDING_SEO = {
    "Brand Strategy": {
      title: "Brand Strategy & Brand Foundations Sprint | Porte Studio",
      desc: "Get a clear, practical brand foundation in a week. The Brand Foundations Sprint from Porte Studio: documented, ready to use, and built to make every marketing dollar work harder.",
      slug: "brand-strategy"
    },
    "Customer Journeys": {
      title: "Automated Customer Journeys & Email Marketing | Porte Studio",
      desc: "Marketing that responds to every customer automatically. Porte Studio builds customer journeys and automated email flows around what your customers actually do.",
      slug: "customer-journey"
    }
  };

  /* Which landing page is this? Detected by the /go/ URL so it survives the
     page rebuilding its own <head>. Falls back to a meta tag if present. */
  function landingLabel() {
    var mp = location.pathname.match(/\/go\/([^\/?#.]+)/);
    if (mp) {
      var slug = mp[1];
      for (var k in LANDING_SEO) { if (LANDING_SEO[k].slug === slug) return k; }
      return slug.replace(/-/g, " ").replace(/\b\w/g, function (x) { return x.toUpperCase(); });
    }
    var m = document.querySelector('meta[name="porte-landing"]');
    return m ? (m.getAttribute("content") || "").trim() : "";
  }

  /* Set title + description on the rendered page (crawlers render JS; browsers show it). */
  function applyLandingSeo(offer) {
    var seo = LANDING_SEO[offer];
    if (!seo) return;
    try {
      document.title = seo.title;
      var d = document.querySelector('meta[name="description"]');
      if (!d) { d = document.createElement("meta"); d.setAttribute("name", "description"); document.head.appendChild(d); }
      d.setAttribute("content", seo.desc);
      if (!document.querySelector('meta[name="robots"]')) {
        var rb = document.createElement("meta"); rb.setAttribute("name", "robots"); rb.setAttribute("content", "noindex, nofollow"); document.head.appendChild(rb);
      }
    } catch (e) {}
  }

  function initLandingForms(offer) {
    var source = "Landing: " + offer;
    applyLandingSeo(offer);

    // Find the wrapper label sitting just above a field (Name, Email, etc.)
    function labelFor(el) {
      var wrap = el.closest("div");
      if (!wrap) return "";
      var lab = wrap.querySelector("div");
      return lab ? (lab.textContent || "").trim() : "";
    }

    // Catch the submit in the capture phase, BEFORE the page's own handler,
    // so the field values are still there to read.
    function onLandingSubmit(e) {
      var form = e.target;
      if (e.composedPath) {                 // find the real <form> even inside a shadow root
        var path = e.composedPath();
        for (var p = 0; p < path.length; p++) { if (path[p] && path[p].nodeName === "FORM") { form = path[p]; break; } }
      }
      if (!form || form.nodeName !== "FORM" || form.__porteSent) return;

      var controls = form.querySelectorAll("input, select, textarea");
      if (!controls.length) return;

      var name = "", email = "", business = "", extras = [];
      for (var i = 0; i < controls.length; i++) {
        var c = controls[i];
        var t = (c.type || "").toLowerCase();
        if (t === "hidden" || t === "submit" || t === "button") continue;
        if (c.name && /hp|honey/i.test(c.name)) continue; // skip honeypots
        var val = (c.value || "").trim();
        var lab = labelFor(c) || c.placeholder || c.name || "";
        var labL = lab.toLowerCase();
        if (!email && t === "email") { email = val; continue; }
        if (!name && /name/.test(labL) && !/business|company/.test(labL)) { name = val; continue; }
        if (!business && /business|company/.test(labL)) { business = val; continue; }
        if (val) extras.push((lab ? lab.replace(/\s+/g, " ") + ": " : "") + val);
      }
      // If no field was clearly the name, use the first non-empty text box.
      if (!name) {
        for (var j = 0; j < controls.length; j++) {
          if ((controls[j].type || "").toLowerCase() === "text" && (controls[j].value || "").trim()) { name = controls[j].value.trim(); break; }
        }
      }
      // Not enough for a real lead — let the page show its thank-you, but don't send.
      if (!name || !EMAIL_RE.test(email)) return;

      form.__porteSent = true;
      var message = extras.join("\n");
      sendToHubSpot({ name: name, email: email, phone: "", business: business, interest: offer, message: message, source: source });
      trackLead(source);
      sendToWeb3Forms({
        subject: "New landing enquiry — " + offer,
        name: name, email: email, business: business,
        interest: offer, message: message, source: source
      });
    }

    // Attach now, then re-attach a few times in case the bundled page rebuilds
    // the document after we first loaded (adding the same handler again is a no-op
    // while it is still attached, and re-registers it if a rebuild removed it).
    document.addEventListener("submit", onLandingSubmit, true);
    var tries = 0;
    var iv = setInterval(function () {
      applyLandingSeo(offer);
      document.addEventListener("submit", onLandingSubmit, true);
      if (++tries >= 20) clearInterval(iv);   // ~12s safety net
    }, 600);
  }

  /* ---- run everything once the page is ready ---------------------- */
  function boot() {
    var offer = landingLabel();
    if (offer) {                         // landing page: tracking + lead capture only
      loadHubSpot(); loadGA4(); initLandingForms(offer);
      return;
    }
    loadHubSpot(); loadGA4(); injectPopup(); wireContactForm(); wireBottomCta(); wireTriggers(); cleanLinks(); wireFooter(); autoPopup();
  }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
