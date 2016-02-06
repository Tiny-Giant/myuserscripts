// ==UserScript==
// @name         Votes Page Enhancer
// @namespace    http://tampermonkey.net/
// @version      1.0.0.2
// @description  Loads posts in their natural form on the votes pages for users.
// @author       @Tiny-Giant
// @include      /https?:\/\/(meta\.|www\.)?stackoverflow\.com/users/.*?tab\=votes.*/
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

let style = document.createElement('style');
style.textContent = '.actual-edit-overlay { display: none !important; }';
document.body.appendChild(style);

StackExchange.using("inlineEditing", function () {
    StackExchange.inlineEditing.init();
});

let css = [
    '.question, .answer {',
    '    width: 730px !important',
    '}',
    '.votecell {',
    '    vertical-align: top !important;',
    '}',
    'h1, h2, h3, h4, h5, h6 {',
    '    font-weight: normal',
    '}'
].join('\n');

if (false);
else if ("undefined" != typeof GM_addStyle)  GM_addStyle(css);
else if ("undefined" != typeof PRO_addStyle) PRO_addStyle(css);
else if ("undefined" != typeof addStyle)     addStyle(css);
else (document.body || document.getElementsByTagName("body")[0]).appendChild(document.createElement("style").appendChild(document.createTextNode(css)).parentNode);

let initPost = (post, html, container, loader, parent) => {
    let xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event => {
        if(xhr.status !== 200) {
            console.log(xhr.status, xhr.statusText, xhr.responseText);
            return;
        }
        
        let question = (/\d+/.exec(document.querySelector('#enable-load-body-' + post).querySelector('a[href]'))||[false])[0];
        
        let osnippets = container.querySelectorAll('.snippet');
        
        container.innerHTML = html;
        
        let nsnippets = container.querySelectorAll('.snippet');
        
        loader.remove();
        parent.appendChild(container);

        StackExchange.question.init({
            votesCast: JSON.parse(xhr.responseText),
            canViewVoteCounts: true,
            questionId: question
        });

        container.querySelector('.js-show-link.comments-link').click();
        
        for(let i in Object.keys(nsnippets)) {
            nsnippets[i].parentNode.insertBefore(osnippets[i], nsnippets[i]);
            nsnippets[i].remove();
        }
    }, false);

    xhr.open('GET', '/posts/' + post + '/votes');

    xhr.send();
}

let fetchPost = post => {
    let container = document.querySelector('#enable-load-body-' + post).parentNode.nextElementSibling.querySelector('.body-container');
    let parent = container.parentNode;
    container.remove();
    
    let loader = parent.appendChild(document.createElement('td'));
    loader.className = 'body-container';
    loader.style.height = 'auto';
    loader.innerHTML = '<img class="ajax-loader" src="/content/img/progress-dots.gif" title="loading..." alt="loading...">';
    
    let xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event => {
        if(xhr.status !== 200) {
            console.log(xhr.status, xhr.statusText, xhr.responseText);
            return;
        }

        initPost(post, xhr.responseText, container, loader, parent);
    }, false);

    xhr.open('GET', '/posts/ajax-load-realtime/' + post);

    xhr.send();
}

$(document).ajaxComplete((event, request, settings) => { 
    let post = (/posts\/(\d+)\/body/.exec(settings.url)||[0,0])[1];
    if (post) fetchPost(post);
});
