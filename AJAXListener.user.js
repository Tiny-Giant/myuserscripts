// ==UserScript==
// @name         AJAX Listener
// @namespace    http://tiny-giant.github.io/myuserscripts
// @version      2.0.0.0
// @description  Intercepts and logs all AJAX requests
// @author       @TinyGiant
// @include      /https?:\/\/\w*.?stackoverflow.com/.*/
// @grant        none
// ==/UserScript==
/* jshint esnext: true */

const funcs = {};

funcs.addXHRListener = callback =>
{
    let open = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function() 
    {
        this.addEventListener('load', callback.bind(null, this), false);
        open.apply(this, arguments);
    };
};

funcs.addXHRListener(self => console.log(self));
