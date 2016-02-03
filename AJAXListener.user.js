// ==UserScript==
// @name         AJAX Listener
// @namespace    https://github.com/Tiny-Giant/
// @version      1.0.0.2
// @description  This logs the results of any AJAX requests made to the console. 
// @author       @TinyGiant
// @include      /https?:\/\/\w*.?stackoverflow.com/.*/
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

$(document).ajaxComplete((event, request, settings) => {
    console.log(event, request, settings);
    console.log('\n');
});
