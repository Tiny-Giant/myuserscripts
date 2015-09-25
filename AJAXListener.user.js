// ==UserScript==
// @name         AJAX Listener
// @namespace    https://github.com/Tiny-Giant/
// @version      1.0.0.0
// @description  This logs the results of any AJAX requests made to the console. 
// @author       @TinyGiant
// @include      /https?:\/\/\w*.?stackoverflow.com/.*/
// @grant        none
// ==/UserScript==

$(document).on('load, ajaxComplete',function(){
    console.log(arguments);
})
