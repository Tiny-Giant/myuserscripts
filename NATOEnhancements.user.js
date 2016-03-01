// ==UserScript==
// @name         NATO Enhancements
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.6
// @description  Includes the actual post on the new answers to old questions page of the 10k tools. 
// @author       @TinyGiant
// @include      /https?:\/\/(meta\.)?stackoverflow.com\/tools\/new-answers-old-questions.*/
// @grant        none
// ==/UserScript==
/* jshint -W097 */
/* jshint esnext: true */
'use strict';

const ScriptToInject = function()
{
    'use strict';
    const funcs = {};

    funcs.fetch = (url, complete) => new Promise((resolve, reject) =>
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

        xhr.open('GET', url);

        xhr.send();
    });

    funcs.fetchPosts = posts =>
    {
        const promises = [];

        const postvotes = [];

        for (let post of posts)
        {
            // Blame Firefox's improper handling of let in for loops
            (function(post){
                // Get posts
                promises.push(funcs.fetch('/posts/ajax-load-realtime/' + post.questionid, html =>
                {
                    post.nodes.question.innerHTML = html;
                }));
                promises.push(funcs.fetch('/posts/ajax-load-realtime/' + post.answerid, html =>
                {
                    post.nodes.answer.innerHTML = html;
                }));

                // Get votes
                promises.push(funcs.fetch('/posts/' + post.questionid + '/votes', votes =>
                {
                    votes = JSON.parse(votes);

                    for (let post of votes)
                    {
                        postvotes.push(post);
                    }
                }));
            })(post);
        }

        Promise.all(promises).then(xhr =>
        {
            funcs.addCSS();

            for (let post of posts)
            {
                post.nodes.columns[0].innerHTML = '';
                post.nodes.columns[1].innerHTML = '';
                post.nodes.columns[0].appendChild(post.nodes.wrap);
                post.nodes.wrap.style.display = '';
            }

            StackExchange.question.init(
            {
                votesCast: postvotes,
                canViewVoteCounts: true,
                questionId: posts[0].questionid,
                canOpenBounty: true
            });

            const commentLinks = Array.from(document.querySelectorAll('.js-show-link.comments-link'));

            for (let commentLink of commentLinks)
            {
                commentLink.click();
            }

            for (let post of posts)
            {
                StackExchange.realtime.subscribeToQuestion(StackExchange.options.site.id, post.questionid);
            }

            StackExchange.helpers.removeSpinner(document.querySelector('.subheader h1'));
        }, xhr =>
        {
            console.log('Failed', xhr);
        });
    };

    funcs.appendNodes = posts =>
    {
        for (let post of posts)
        {
            post.nodes.columns[0].appendChild(post.nodes.wrap);
        }
    };

    funcs.getPosts = () =>
    {
        const posts = [];
        const rows = Array.from(document.querySelectorAll('.default-view-post-table > tbody > tr'));

        for (let row of rows)
        {
            const nodes = {};

            nodes.scope = row;
            nodes.columns = Array.from(nodes.scope.children);
            nodes.wrap = document.createElement('div');
            nodes.wrap.style.display = 'none';

            nodes.old = {};

            nodes.old.answer = nodes.scope.querySelector('.post-text');
            nodes.old.title = nodes.scope.querySelector('.answer-hyperlink');

            const urlsections = /(\d+)\/(.*?)\/(\d+)/.exec(nodes.old.title.href);
            const questionid = urlsections[1];
            const titleslug = urlsections[2];
            const answerid = urlsections[3];

            nodes.title = document.createElement('h1');
            nodes.wrap.appendChild(nodes.title);

            nodes.link = document.createElement('a');
            nodes.link.href = window.location.protocol + '//' + window.location.host + '/questions/' + questionid + '/' + titleslug;
            nodes.link.textContent = nodes.old.title.textContent;
            nodes.title.appendChild(nodes.link);

            nodes.question = document.createElement('div');
            nodes.wrap.appendChild(nodes.question);

            nodes.answer = document.createElement('div');
            nodes.wrap.appendChild(nodes.answer);

            posts.push(
            {
                answerid: answerid,
                questionid: questionid,
                nodes: nodes
            });
        }

        return posts;
    };

    funcs.addCSS = () =>
    {
        const CSS = [
            '.question, .answer {',
            '    width: 730px !important',
            '}',
            'h1, h2, h3, h4, h5, h6 {',
            '    font-weight: normal',
            '}',
            '.answer {',
            '    background: RGBA(255,153,0, 0.1);',
            '    margin-top: 1em;',
            '}'
        ].join('\n');

        const style = document.createElement('style');
        document.body.appendChild(style);

        const text = document.createTextNode(CSS);
        style.appendChild(text);
    }

    funcs.init = () =>
    {
        const posts = funcs.getPosts();

        const title = document.querySelector('.subheader h1');

        StackExchange.helpers.addSpinner(title);

        StackExchange.using("inlineEditing", () =>
        {
            StackExchange.inlineEditing.init();
        });

        funcs.appendNodes(posts);

        funcs.fetchPosts(posts);
    };

    funcs.init();
};

const ScriptToInjectNode = document.createElement('script');
document.body.appendChild(ScriptToInjectNode);

const ScriptToInjectContent = document.createTextNode('(' + ScriptToInject.toString() + ')()');
ScriptToInjectNode.appendChild(ScriptToInjectContent);
