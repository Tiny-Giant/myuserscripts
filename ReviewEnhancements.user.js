// ==UserScript==
// @name         Review Enhancements
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.4
// @description  The review queues are abstractions with some limitations. This script removes those limitations on questions
// @author       @TinyGiant
// @include      /https?:\/\/(meta\.|www\.)?stackoverflow.com\/review\/(?!custom).*
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

StackExchange.using("inlineEditing", function () {
    StackExchange.inlineEditing.init();
});

let initQuestion = (post) => {
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

        let commentLinks = document.querySelectorAll('.js-show-link.comments-link');

        for(let i in Object.keys(commentLinks)) commentLinks[i].click();
    }, false);

    xhr.open('GET', '/posts/' + post.dataset.questionid + '/votes');

    xhr.send();
}

let postQueue = [], fetching = false;

let fetchPost = () => {
    fetching = true;

    let post = postQueue.shift();

    let xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event => {
        if(xhr.status !== 200) {
            console.log(xhr.status, xhr.statusText, xhr.responseText);
            return;
        }

        let parent = post.parentNode;
        
        let osnippets = post.querySelectorAll('.snippet');

        post.outerHTML = xhr.responseText;

        post = parent.querySelector('.question, .answer');
        
        let nsnippets = post.querySelectorAll('.snippet');
        
        for(let i in Object.keys(nsnippets)) {
            nsnippets[i].parentNode.insertBefore(osnippets[i], nsnippets[i]);
            nsnippets[i].remove();
        }

        if(/downvoted-answer/.test(post.className)) post.classList.remove('downvoted-answer');

        /*let hidden = post.querySelectorAll('.snippet');

        for(let i in Object.keys(hidden)) {
            hidden[i].dataset.hide = 'true';
        }*/

        if (/question/.test(post.className)) initQuestion(post);

        fetching = false;
    }, false);

    xhr.open('GET', '/posts/ajax-load-realtime/' + (post.dataset.questionid || post.dataset.answerid));

    xhr.send();
}

let queuePost = (post) => {
    if (!post) return;

    postQueue.push(post);

    if(fetching) {
        let fetchWait = setInterval(() => {
            if(fetching) return;

            clearInterval(fetchWait);

            fetchPost();
        }, 100);
    } else fetchPost();
}

$(document).ajaxComplete((one, two, three) => { 
    if(!/next\-task|task\-reviewed/.test(three.url)) return;

    let task = JSON.parse(two.responseText);

    console.log('TASK', task);

    if(!task || task.isAudit) return;

    let question = document.querySelector('.question');

    if (!question) return;

    let answers  = document.querySelectorAll('.answer');

    for(let i in Object.keys(answers)) queuePost(answers[i]);

    queuePost(question);

    let reviewable = document.querySelectorAll('.reviewable-post');

    for(let i in Object.keys(reviewable)) reviewable[i].parentNode.setAttribute('style', '');
});
