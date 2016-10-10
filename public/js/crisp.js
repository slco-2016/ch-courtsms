// RENDER Crisp.im IF USER LOGGED IN
if (SESSION_USER) {
  CRISP_WEBSITE_ID = "54a27220-22bc-4baa-9756-ce636cd6f3de";
  (function() {
    d = document;
    s = d.createElement("script");
    s.src="https://client.crisp.im/l.js";
    s.async=1;
    d.getElementsByTagName("head")[0].appendChild(s);
  })();
}