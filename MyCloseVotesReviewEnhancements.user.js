// ==UserScript==
// @name         My Close Votes Review Enhancements
// @namespace    http://tampermonkey.net/
// @version      1.0.0.0
// @description  Loads posts in their natural form on the close votes page for users.
// @author       @Tiny-Giant
// @include      /https?:\/\/(meta\.|www\.)?stackoverflow\.com/users/\d+/.*?(\?tab=votes.*?\&sort=closure|\&sort=closure.*?\?tab=votes).*/
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

let initQuestion = post => {
    post.setAttribute('style', 'width: 680px !important');
    
    post.querySelector('.votecell').style.verticalAlign = 'top';
    
    let xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event => {
        if(xhr.status !== 200) {
            console.log(xhr.status, xhr.statusText, xhr.responseText);
            return;
        }

        StackExchange.question.init({
            votesCast: JSON.parse(xhr.responseText),
            canViewVoteCounts: true,
            questionId: post
        });

        post.querySelector('.js-show-link.comments-link').click();
    }, false);

    xhr.open('GET', '/posts/' + post.dataset.questionid + '/votes');

    xhr.send();
}

let fetchPost = post => {
    let container = document.querySelector('#enable-load-body-' + post).parentNode.nextElementSibling.querySelector('.body-container');
    
    let xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event => {
        if(xhr.status !== 200) {
            console.log(xhr.status, xhr.statusText, xhr.responseText);
            return;
        }
        
        let osnippets = container.querySelectorAll('.snippet');
        
        container.innerHTML = xhr.responseText;
        
        let nsnippets = container.querySelectorAll('.snippet');
        
        for(let i in Object.keys(nsnippets)) {
            nsnippets[i].parentNode.insertBefore(osnippets[i], nsnippets[i]);
            nsnippets[i].remove();
        }

        initQuestion(container.querySelector('.question'));
    }, false);

    xhr.open('GET', '/posts/ajax-load-realtime/' + post);

    xhr.send();
}

$(document).ajaxComplete((event, request, settings) => { 
    let post = (/posts\/(\d+)\/body/.exec(settings.url)||[0,0])[1];
    if (post) fetchPost(post);
});
