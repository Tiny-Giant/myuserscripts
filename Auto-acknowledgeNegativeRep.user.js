// ==UserScript==
// @name         Auto-acknowledge Negative Rep
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.0
// @description  Automatically marks negative reputation changes as read.
// @author       @TinyGiant
// @include      /^https?:\/\/.*?(stackoverflow.com|stackexchange.com|superuser.com|serverfault.com|askubuntu.com|stackapps.com|mathoverflow.net)/.*$/
// @grant        GM_xmlhttpRequest
// ==/UserScript==
/* jshint -W097 */
'use strict';

let getUnreadCounts, triggerUpdate;

triggerUpdate = () => {
    GM_xmlhttpRequest({
        method: 'GET',
        url: '/topbar/achievements',
        onload: xhr => {
            if (xhr.status !== 200) {
                console.log(xhr.status, xhr.statusText, xhr.responseText);
                return;
            }
            
            console.log('Marked negative reputation changes as read.');
        }
    });
}

getUnreadCounts = () => {
    GM_xmlhttpRequest({
        method: 'GET',
        url: 'http://chat.stackoverflow.com/topbar/get-unread-counts',
        onload: xhr => {
            if (xhr.status !== 200) {
                console.log(xhr.status, xhr.statusText, xhr.responseText);
                return;
            }
            
            if (+JSON.parse(xhr.responseText).UnreadRepCount < 0) triggerUpdate();
        }
    });
}

getUnreadCounts();
