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

    function showErr(id, on) {
      var el = document.getElementById(id);
      if (el) el.style.display = on ? "block" : "none";
    }

    freshBtn.addEventListener("click", function () {
      var name = (document.getElementById("cName") || {}).value || "";
      var email = (document.getElementById("cEmail") || {}).value || "";
      var business = (document.getElementById("cBusiness") || {}).value || "";
      var interest = (document.getElementById("cInterest") || {}).value || "";
      var message = (document.getElementById("cMessage") || {}).value || "";
      name = name.trim(); email = email.trim(); message = message.trim();

      var eN = !name, eE = !EMAIL_RE.test(email), eM = !message;
      showErr("errName", eN); showErr("errEmail", eE); showErr("errMessage", eM);
      if (eN || eE || eM) return;

      freshBtn.style.pointerEvents = "none";
      freshBtn.textContent = "SENDING…";

      sendToWeb3Forms({
        subject: "New website enquiry — " + (interest || "General"),
        name: name, email: email, business: business,
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
      + '    <div class="ps-field"><div class="ps-label">BUSINESS <span>(OPTIONAL)</span></div><input id="pBusiness" class="ps-input" placeholder="Business name" /></div>'
      + '    <div class="ps-field"><div class="ps-label">WHAT ARE YOU INTERESTED IN?</div><select id="pInterest" class="ps-select">'
      + '      <option>Book a discovery call</option>'
      + '      <option>Marketing Strategy &amp; Campaigns</option>'
      + '      <option>Brand &amp; Communications</option>'
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
      var business = document.getElementById("pBusiness").value.trim();
      var interest = document.getElementById("pInterest").value;
      var message = document.getElementById("pMessage").value.trim();

      var eN = !name, eE = !EMAIL_RE.test(email), eM = !message;
      show("pErrName", eN); show("pErrEmail", eE); show("pErrMessage", eM);
      if (eN || eE || eM) return;

      sendBtn.style.pointerEvents = "none";
      sendBtn.textContent = "SENDING…";

      sendToWeb3Forms({
        subject: "New website enquiry — " + (interest || "General"),
        name: name, email: email, business: business,
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

  /* ---- run everything once the page is ready ---------------------- */
  function boot() { injectPopup(); wireContactForm(); wireTriggers(); cleanLinks(); }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
