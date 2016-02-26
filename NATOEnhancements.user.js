// ==UserScript==
// @name         NATO Enhancements
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.2
// @description  Includes the actual post on the new answers to old questions page of the 10k tools. 
// @author       @TinyGiant
// @include      /https?:\/\/(meta\.)?stackoverflow.com\/tools\/new-answers-old-questions.*/
// @grant        GM_addStyle
// ==/UserScript==
/* jshint -W097 */
/* jshint esversion: 6 */
'use strict';

let css = [
    '.question, .answer {',
    '    width: 730px !important',
    '}',
    'h1, h2, h3, h4, h5, h6 {',
    '    font-weight: normal',
    '}',
    '.answer {',
    '    background: RGBA(255,153,0, 0.1);',
    '}'
].join('\n');

if (false);
else if ("undefined" != typeof GM_addStyle)  GM_addStyle(css);
else if ("undefined" != typeof PRO_addStyle) PRO_addStyle(css);
else if ("undefined" != typeof addStyle)     addStyle(css);
else (document.body || document.getElementsByTagName("body")[0]).appendChild(document.createElement("style").appendChild(document.createTextNode(css)).parentNode);

StackExchange.using("inlineEditing", function () {
    StackExchange.inlineEditing.init();
});

let posts = [], post = {}, funcs = {}, complete, Q = 1, A = 2;

funcs.showComments = (post) =>
{
    post.wrap.querySelector('.js-show-link.comments-link').click();
}

funcs.initQuestion = (post, votes) => 
{
    StackExchange.question.init({
        votesCast: votes,
        canViewVoteCounts: true,
        questionId: post.id
    });
    StackExchange.realtime.subscribeToQuestion('1', post.id);
}

funcs.replacePost = (post, html) =>
{
    let osnippets = Array.from(post.wrap.querySelectorAll('.snippet'));

    post.wrap.innerHTML = html;

    let nsnippets = Array.from(post.wrap.querySelectorAll('.snippet'));

    while(nsnippets.length > 0 && osnippets.length > 0)
    {
        let nsnippet = nsnippets.shift();
        let osnippet = osnippets.shift();

        nsnippet.parentNode.insertBefore(osnippet, nsnippet);
        nsnippet.parentNode.removeChild(nsnippet);
    }
}

funcs.fetchVotes = (post, complete) =>
{
    let xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event =>
    {
        if (xhr.status !== 200)
        {
            console.log(xhr.status, xhr.statusText, xhr.responseText);
            return;
        }

        if (typeof complete === 'function')
        {
            complete(JSON.parse(xhr.responseText));
        }
    }, false);

    xhr.open('GET', '/posts/' + post.id + '/votes');

    xhr.send();
};

funcs.fetchPost = (post, complete) =>
{   
    let xhr = new XMLHttpRequest();

    xhr.addEventListener('load', event =>
    {
        if (xhr.status !== 200)
        {
            console.log(xhr.status, xhr.statusText, xhr.responseText);
            return;
        }

        if (typeof complete === 'function')
        {
            complete(xhr.responseText);
        }
    }, false);

    xhr.open('GET', '/posts/ajax-load-realtime/' + post.id);

    xhr.send();
};

funcs.fetchAllPosts = () =>
{
    post = posts.shift();
    
    funcs.fetchPost(post.question, questionHTML =>
    {
        funcs.fetchPost(post.answer, answerHTML =>
        {
            funcs.fetchVotes(post.question, votes =>
            {
                post.answer.wrap.className = '';
                funcs.replacePost(post.question,  questionHTML);
                funcs.replacePost(post.answer,    answerHTML);
                funcs.initQuestion(post.question, votes);
                funcs.showComments(post.question);
                funcs.showComments(post.question);
                
                if (posts.length > 0)
                {
                    funcs.fetchAllPosts();
                }
            });
        });
    });
}

funcs.getPosts = () =>
{
    let postTexts = Array.from(document.querySelectorAll('.post-text'));

    for(let postText of postTexts)
    {
        let parent = postText.parentNode;
        let details = parent.nextElementSibling;
        parent.parentNode.removeChild(details);
        
        let questionWrap = document.createElement('div');
        parent.insertBefore(questionWrap, postText);
        
        let separator = document.createElement('hr');
        parent.insertBefore(separator, postText);
        
        let postLink = parent.querySelector('.answer-hyperlink');
        
        postLink.parentNode.removeChild(postLink.nextElementSibling);
        postLink.parentNode.removeChild(postLink.nextElementSibling);
        
        postLink.outerHTML = '<h1>' + postLink.outerHTML + '</h1>';
        
        let postIDs   = /(\d+).*?(\d+)$/.exec(postLink.href);
        
        posts.push({
            answer: {
                id:   postIDs[2],
                wrap: postText
            },
            question: {
                id:   postIDs[1],
                wrap: questionWrap
            }
        });
    }
};

funcs.getPosts();
funcs.fetchAllPosts();
