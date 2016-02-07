// ==UserScript==
// @name          Old Sidebar width
// @namespace     http://github.com/TinyGiant/
// @description	  Returns the old sizing of the sidebar
// @author        @TinyGiant
// @run-at        document-start
// @version       1.0.0.4
// @include       /^https?:\/\/(?!chat).*?(stackoverflow.com|stackexchange.com|superuser.com|serverfault.com|askubuntu.com|stackapps.com|mathoverflow.net)/.*$/
// ==/UserScript==

(function() {
    var css = [
        " #hireme {",
        "  display: none;",
        " }",
        " #hmenus {",
        "  right: 0 !important;",
        " }",
        " .ask-mainbar #excerpt {",
        "  width: 665px;",
        "  box-sizing: border-box;",
        " }",
        " .question-list-layout {",
        "  right: -230px !important;",
        " }",
        " #sidebar, .sidebar {",
        "  width: 220px !important;",
        " }",
        " .question-summary, #answers, #answers-header, .question, .answer {",
        "  width: 100% !important;",
        " }",
        " .contentWrapper {",
        "  width: auto;",
        " }",
        " header, #header, #content, .footerwrap, #footer-sites {",
        "  margin: 0 auto;",
        "  width: 970px !important;",
        " }",
        " header, #header, .topbar-wrapper {",
        "  width: 1000px !important;",
        " }",
        " .user-page .col-content {",
        "  width: 700px !important;",
        " }",
        " .card {",
        "  max-width: 365px!important;",
        " }",
        " .card.badges-card .badges .badge1-alternate, .card.badges-card .badges .badge2-alternate, .card.badges-card .badges .badge3-alternate, .card.badges-card .badges .badge-how-to {",
        "  width: 29% !important;",
        " }",
        " #main-content #mainbar {",
        "  width: 700px !important;",
        " }"
    ].join('\n');
    if (false);
    else if ("undefined" != typeof GM_addStyle)  GM_addStyle(css);
    else if ("undefined" != typeof PRO_addStyle) PRO_addStyle(css);
    else if ("undefined" != typeof addStyle)     addStyle(css);
    else (document.head || document.getElementsByTagName("head")[0]).appendChild(document.createElement("style").appendChild(document.createTextNode(css)).parentNode);
})();
