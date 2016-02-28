// ==UserScript==
// @name         NATO Enhancements - FirefoxBullshitHack
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.1
// @description  Includes the actual post on the new answers to old questions page of the 10k tools. 
// @author       @TinyGiant
// @include      /https?:\/\/(meta\.)?stackoverflow.com\/tools\/new-answers-old-questions.*/
// @grant        GM_addStyle
// ==/UserScript==
/* jshint -W097 */
/* jshint esversion: 6 */
'use strict';

let FirefoxBullshitHack = function(){
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
    document.body.appendChild(document.createElement("style").appendChild(document.createTextNode(css)).parentNode);
    
    StackExchange.helpers.addSpinner(document.querySelector('.subheader h1'));
    
    StackExchange.using("inlineEditing", function () {
        StackExchange.inlineEditing.init();
    });
    
    const funcs = {};
    
    funcs.replacePost = (post, html) =>
    {
    
        post.wrap.innerHTML = html;
    
        const osnippets = post.snippets;
        const nsnippets = Array.from(post.wrap.querySelectorAll('.snippet'));
    
        while(nsnippets.length > 0 && osnippets.length > 0)
        {
            const nsnippet = nsnippets.shift();
            const osnippet = osnippets.shift();
    
            nsnippet.parentNode.insertBefore(osnippet, nsnippet);
            nsnippet.parentNode.removeChild(nsnippet);
        }
    };
    
    funcs.fetchVotes = (post, complete) => new Promise((resolve, reject) =>
    {
        let xhr = new XMLHttpRequest();
    
        xhr.addEventListener('load', event =>
        {
            if (xhr.status !== 200)
            {
                console.error(xhr);
                reject(xhr);
                return;
            }
    
            if (typeof complete === 'function')
            {
                complete(JSON.parse(xhr.responseText));
            }
            
            resolve(xhr);
        }, false);
    
        xhr.open('GET', '/posts/' + post.id + '/votes');
    
        xhr.send();
    });
    
    funcs.fetchPost = (post, complete) => new Promise((resolve, reject) =>
    {   
        let xhr = new XMLHttpRequest();
    
        xhr.addEventListener('load', event =>
        {
            if (xhr.status !== 200)
            {
                console.error(xhr);
                reject(xhr);
                return;
            }
            
            if (typeof complete === 'function')
            {
                complete(xhr.responseText);
            }
            
            resolve(xhr);
        }, false);
    
        xhr.open('GET', '/posts/ajax-load-realtime/' + post.id);
    
        xhr.send();
    });
    
    funcs.fetchAllPosts = posts =>
    {
        const promises = [];
        
        const postvotes = [];
        
        for(let post of posts)
        {
            // Get posts
            promises.push(funcs.fetchPost(post.question, html => 
            {
                funcs.replacePost(post.question, html);
            }));
            promises.push(funcs.fetchPost(post.answer, html => 
            {
                funcs.replacePost(post.answer, html);
                post.answer.wrap.className = '';
            }));
            
            // Get votes
            promises.push(funcs.fetchVotes(post.question, votes =>
            {
                for(let post of votes)
                {
                    postvotes.push(post);
                }
            }));
            promises.push(funcs.fetchVotes(post.answer, votes =>
            {
                for(let post of votes)
                {
                    postvotes.push(post);
                }
            }));
        }
        
        Promise.all(promises).then(xhr =>
        {
            console.log(xhr);
            
            StackExchange.question.init({
                votesCast: postvotes,
                canViewVoteCounts: true,
                questionId: posts[0].question.id,
                canOpenBounty:true
            });
            
            const commentLinks = Array.from(document.querySelectorAll('.js-show-link.comments-link'));
            
            for(let commentLink of commentLinks)
            {
                commentLink.click();
            }
            
            for(let post of posts)
            {
                StackExchange.realtime.subscribeToQuestion('1', post.question.id);
            }
            
            StackExchange.helpers.removeSpinner(document.querySelector('.subheader h1'));
        },xhr =>
        {
            console.log('Failed', xhr);
        });
    };
    
    funcs.getPosts = () =>
    {
        const posts = [];
        const answers = Array.from(document.querySelectorAll('.post-text'));
    
        for(let answer of answers)
        {
            const nodes = {};
            
            nodes.answer = answer;
            nodes.question = document.createElement('div');
            nodes.snippets = Array.from(nodes.answer.querySelectorAll('.snippet'));
            
            nodes.parent = answer.parentNode;
            nodes.details = nodes.parent.nextElementSibling;
            nodes.title = nodes.parent.querySelector('.answer-hyperlink');
            
            const urlsections = /(\d+)\/(.*?)\/(\d+)/.exec(nodes.title.href);
            const questionid = urlsections[1];
            const titleslug = urlsections[2];
            const answerid = urlsections[3];
            
            posts.push({
                answer: {
                    id:   answerid,
                    wrap: nodes.answer,
                    snippets: []
                },
                question: {
                    id:   questionid,
                    wrap: nodes.question,
                    snippets: []
                }
            });
            
            nodes.title.href = window.location.protocol + '//' + window.location.host + '/questions/' + questionid + '/' + titleslug;
            nodes.title.className = '';
            nodes.parent.insertBefore(nodes.question, nodes.answer);
            nodes.parent.insertBefore(document.createElement('br'), nodes.answer);
            nodes.title.parentNode.removeChild(nodes.title.nextElementSibling);
            nodes.title.parentNode.removeChild(nodes.title.nextElementSibling);
            nodes.parent.parentNode.removeChild(nodes.details);
            nodes.title.outerHTML = '<h1>' + nodes.title.outerHTML + '</h1>';
        }
        
        return posts;
    };
    
    const posts = funcs.getPosts();
    
    funcs.fetchAllPosts(posts);
};

let FirefoxBullshitHackScript = document.createElement('script');
FirefoxBullshitHackScript.textContent = '(' + FirefoxBullshitHack.toString() + ')()';
document.body.appendChild(FirefoxBullshitHackScript);
