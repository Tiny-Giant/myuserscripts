// ==UserScript==
// @name         Sticky vote controls
// @namespace    http://github.com/TinyGiant/
// @version      1.0.0.4
// @description  Makes the vote controls sticky
// @author       @TinyGiant
// @include      /^https?:\/\/(?!chat)\w*.?(stackexchange.com|stackoverflow.com|serverfault.com|superuser.com|askubuntu.com|stackapps.com|mathoverflow.net)\/.*/
// @grant        none
// ==/UserScript==
/* jshint esnext: true */
/* jshint -w097 */
'use strict';

document.body.insertAdjacentHTML("beforeend", `
    <style type="text/css">
        .question .vote,
        .answer .vote {
           position: sticky;
           top: 0px;
        }
    </style>
`);
