// ==UserScript==
// @name         Enable Logging
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.0
// @description  Enables logging on Stack Exchange sites.
// @author       @TinyGiant
// @include      /^https?:\/\/.*?(stackoverflow.com|stackexchange.com|superuser.com|serverfault.com|askubuntu.com|stackapps.com|mathoverflow.net)/.*$/
// @grant        none
// @run-at       document-start
// ==/UserScript==
/* jshint -W097 */
'use strict';

let checker = setInterval(() => {
    console.log('checking');
    if(typeof StackExchange === 'undefined') return;
    clearInterval(checker);
    console.log('found it')
    StackExchange.options.enableLogging = true;
    StackExchange.options.enableLogging2 = true
}, 50);
