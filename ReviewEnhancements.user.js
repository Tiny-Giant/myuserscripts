// ==UserScript==
// @name         Review Enhancements
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.2
// @description  The review queues are abstractions with some limitations. This script removes those limitations on questions
// @author       @TinyGiant
// @include      /https?:\/\/(meta\.|www\.)?stackoverflow.com\/review\/(?!custom).*
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

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

let getPost = (post) => {
    if (!post) return;
    
    let xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event => {
        if(xhr.status !== 200) {
            console.log(xhr.status, xhr.statusText, xhr.responseText);
            return;
        }
        
        post.outerHTML = xhr.responseText;
        
        if (/question/.test(post.className)) initQuestion(post);
    }, false);

    xhr.open('GET', '/posts/ajax-load-realtime/' + (post.dataset.questionid || post.dataset.answerid));

    xhr.send();
}

$(document).ajaxComplete((one, two, three) => { 
    if(!/next\-task|task\-reviewed/.test(three.url)) return;
    
    let task = JSON.parse(two.responseText);
    
    console.log('TASK', task);
    
    if(!task || task.isAudit) return;
    
    let question = document.querySelector('.question');
    
    if (!question) return;
    
    let answers  = document.querySelectorAll('.answer');
    
    for(let i in Object.keys(answers)) getPost(answers[i]);
    
    getPost(question);
});
