// ==UserScript==
// @name         SO Zulu Time
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.1
// @description  Make all relative times zulu
// @author       @TinyGiant
// @include      /^https?://\w*.?(stack(exchange|overflow)|serverfault|superuser|askubuntu|stackapps|mathoverflow)\.(com|net).*/
// @grant        none
// ==/UserScript==

$('.user-action-time, .user-action-time a').each(function(){ this.firstChild.remove() })
$('[class*="relativetime"]').each(function(){ this.textContent = this.title });
