// ==UserScript==
// @name         Magic™ Tag Review 2
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.1
// @description  Custom review queue for tag oriented reviewing with the ability to filter by close votes and delete votes
// @author       @TinyGiant
// @include      /^https?:\/\/\w*.?stackoverflow\.com\/review*/
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==
/* jshint -W097 */
/* jshint esnext: true */
/* globals unsafeWindow, $, GM_setValue, GM_getValue */
(async _ => {
    'use strict';
    
    const StackExchange = (_ => {
        if ("StackExchange" in window)
            return window.StackExchange;
        if ("StackExchange" in unsafeWindow)
            return unsafeWindow.StackExchange;
        else return false;
    })();

    StackExchange.using('inlineEditing', function () {
        StackExchange.inlineEditing.init();
    });

    if (/^\/?review\/?$/.test(window.location.pathname)) {
        // We are on the review queue list page
        document.querySelector('.dashboard-item').insertAdjacentHTML('beforebegin', `
            <div class="dashboard-item">
                <div class="dashboard-count"></div>
                <div class="dashboard-summary">
                    <div class="dashboard-summary">
                        <div class="dashboard-title"><a href="/review/custom">Magic™ Tag Review</a></div>
                        <div class="dashboard-description">Concentrated tag review with options to filter by close votes or delete votes.</div>
                    </div>
                </div>
                <br class="cbt">
            </div>
        `);
    } else if (/^\/?review\/custom/.test(window.location.pathname)) {
        // We are on the Magic™ Tag Review page
        document.querySelector('title').textContent = 'Magic™ Tag Review';

        const store = new Proxy({}, {
            get: (t, k) => GM_getValue(`MagicTagReview-${ k }`),
            set: (t, k, v) => (GM_setValue(`MagicTagReview-${ k }`, v), true)
        });

        const nodes = (_ => {
            const scope = Object.assign(document.querySelector('#mainbar-full'), { innerHTML: '' });
            const wrapper = scope.appendChild(Object.assign(document.createElement('span'), { className: 'review-bar-wrapper'  }));
            const CSS = `
                body {
                    overflow-y: scroll;
                }
                .review-indicator-wrapper {
                    padding-left: 5px;
                    display: inline-block;
                    vertical-align: middle;
                }
                .review-spinner,
                .review-indicator {
                    display: inline-block;
                    vertical-align: middle;
                }
                .review-spinner {
                    height: 40px;
                }
                .review-indicator {
                    font-size: 13px !important;
                }
                .review-bar-container .review-bar {
                    white-space: nowrap;
                    position: static;
                    margin-top: 0px;
                    padding: 5px;
                    font-size: 0px;
                }
                .review-bar-container .review-bar input {
                    font-size: 13px;
                    vertical-align: middle;
                }
                .review-bar input {
                    margin: 0px;
                    margin-left: 5px
                }
                .review-bar input.review-tagged {
                    margin: 0px;
                }
                .review-form {
                    display: inline-block
                }
                .question-status {
                    width: 660px
                }
                .question {
                    float: left;
                }
                .review-sidebar {
                    width: 280px;
                    float: right;
                }
                .review-sidebar hr {
                    height: 2px;
                }
                .review-info label {
                    font-weight: bold;
                    font-size: 0.9em;
                    vertical-align: middle;
                    display: inline-block;
                    color: #9C988B;
                }
                h1, h2, h3, h4, h5, h6 {
                    font-weight: normal
                }
                [hidden] {
                    display: none;
                }
            `;
            const HTML = `
                <div class="review-bar-container">
                    <div class="review-bar-anchor"></div>
                    <div class="review-bar">
                        <form class="review-form">
                            <input class="review-tagged" type="text" placeholder="tag">
                            <input class="review-closevotes" type="text" placeholder="minimum close votes">
                            <input class="review-deletevotes" type="text" placeholder="minimum delete votes">
                            <input class="review-button" type="submit" value="Go">
                            <input class="review-stop" type="button" value="Stop">
                            <input class="review-refresh" type="submit" value="Refresh">
                        </form>
                        <input class="review-prev" type="button" value="Previous">
                        <input class="review-next" type="button" value="Next">
                        <div class="review-indicator-wrapper">
                            <img class="review-spinner" src="https://i.stack.imgur.com/MJFrt.gif" style="display: none">
                            <span class="review-indicator"></span>
                        </div>
                    </div>
                </div>
                <div class="review-header" id="question-header">
                    <h1><a class="review-title" target="_blank"></a></h1>
                </div>
                <div class="review-question"></div>
                <div class="review-sidebar module community-bulletin">
                    <div class="bulletin-title review-sidebar-header">Post Information</div> <hr>
                    <div class="review-information"></div>
                </div>
                <style type="text/css">${CSS}</style>
            `;
            wrapper.insertAdjacentHTML('beforeend', HTML);

            const trap = (target, key) => {
                if (!(key in target)) {
                    const node  = nodes.wrapper.querySelector(`.review-${ 
                        key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
                           .replace(/_/g,     m => ` ${m.toLowerCase()}`)
                    }`);
                    target[key] = node || null;
                }
            };
        
            return new Proxy({scope, wrapper}, {
                get: (target, key) => (trap(target, key),   target[key]),
                has: (target, key) => (trap(target, key), !!target[key]),
            });
        })();

        let queue         = JSON.parse(store.queue         || '[]'),
            question_list = JSON.parse(store.question_list || '[]');
        
        nodes.tagged.value      = store.tag         || '';
        nodes.closevotes.value  = store.closevotes  || '';
        nodes.deletevotes.value = store.deletevotes || '';
        
        nodes.spinner.show = _ => nodes.spinner.style.display = '';
        nodes.spinner.hide = _ => nodes.spinner.style.display = 'none';

        const reset = (queue, form, current) => {
            if(queue) {
                queue         = [];
                question_list = [];

                store.queue         = JSON.stringify(queue);
                store.question_list = JSON.stringify(question_list);
            }
            if(form) {
                store.tag         = '';
                store.closevotes  = '';
                store.deletevotes = '';
            }
            if(current) {
                store.current = 0;
            }

            nodes.information.innerHTML = '';
            nodes.question.innerHTML    = '';
            nodes.title.href            = '';
            nodes.title.innerHTML       = '';
            nodes.stop.disabled         = true;
            nodes.prev.disabled         = true;
            nodes.next.disabled         = true;
            nodes.indicator.textContent = '';
        };
        
        let stop = false;
        
        nodes.stop.addEventListener('click', _ => stop = true);

        const retrieve = tagged => new Promise(async (resolve, reject) => {
            reset(1,0,1);
            
            nodes.stop.disabled = false;

            const result = { quota_remaining: 1, backoff: undefined };

            let page = 1, totalpages = 1, url;
        
            nodes.spinner.show();
        
            while(page <= totalpages && result.quota_remaining !== 0 && !result.backoff && stop === false) {
                nodes.indicator.textContent = 'Retrieving question list (page ' + page + ' of ' + (totalpages||0)  + ')';
                url = location.protocol + '//api.stackexchange.com/2.2/questions?' + [
                    'page=' + page++,
                    'pagesize=100',
                    'order=asc',
                    'sort=votes',
                    'site=' + /\/([\w.]*)\.com/.exec(location.href)[1],
                    'key=dwtLmAaEXumZlC5Nj0vDuw((',
                    'filter=!m)BxSjkODD1qUae7JH1Ff5WcCKJJMTiHQO5fpin72FE2B_6YEmt(kALb',
                    'tagged=' + encodeURIComponent(tagged)
                ].join('&');
                
                const response = await fetch(url);
                
                if(!response.ok) {
                    return reject(response);
                }
                
                Object.assign(result, await response.json());
                
                totalpages = Math.ceil(result.total / 100);
                
                question_list.push(...result.items);
                
                if(result.backoff) console.log('Backoff: ' + result.backoff);
            }
            
            nodes.stop.disabled = true;
            stop = false;
            
            store.question_list = JSON.stringify(question_list);
            
            delete result.items;
            
            console.log(result, url);
            
            nodes.spinner.hide();
            nodes.indicator.textContent = '';
            
            if(result.quota_remaining === 0) {
                nodes.indicator.textContent = "No requests left, wait until next UTC day.";
            }
            
            console.log('Quota remaining: ' + result.quota_remaining);
            
            resolve(question_list);
        });

        const fetchVotes = post => new Promise(resolve => {
            const url = `/posts/${post.question_id}/votes`;
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('load', _ => {
                if (xhr.status !== 200) {
                    console.log(xhr.status, xhr.statusText, xhr);
                    resolve(`<h1>${xhr.status} - ${xhr.statusText}</h1><div>${url}</div>`);
                } else {
                    resolve(JSON.parse(xhr.responseText));
                }
            });
            xhr.open('GET', url);
            xhr.send();
        });
        
        const fetchQuestion = post => new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('load', _ => {
                if (xhr.status !== 200) {
                    console.log(xhr.status, xhr.statusText, xhr);
                    resolve([]);
                } else {
                    resolve(xhr.responseText);
                }
            });
            xhr.open('GET', `/posts/ajax-load-realtime/${post.question_id}`);
            xhr.send();
        });

        const display = current => new Promise(async (resolve, reject) => {
            reset();

            const post = queue[current];

            if (post) {
                nodes.title.href      = 'http://stackoverflow.com/q/' + post.question_id;
                nodes.title.innerHTML = post.title;

                if (document.querySelector('a[title^="You voted to close"]')) {
                    nodes.title.textContent += ' - <span style="color:red">Voted</span>';
                }

                nodes.question.innerHTML = await fetchQuestion(post);

                StackExchange.question.init({
                    votesCast: await fetchVotes(post),
                    canViewVoteCounts: true,
                    questionId: post
                });

                StackExchange.comments.loadAll($('.question'));
                const buildInfo = obj => {
                    const excludes = ['title'];
                    let str = '';
                    for(let [k, v] of Object.entries(obj)) {
                        if(excludes.includes(k)) continue;
                        if (/Object/.test(v.toString())) {
                            if ("display_name" in v && "link" in v) 
                                 v = `<a href="${v.link}">${v.display_name}</a>`;
                            else v = buildInfo(v);
                        }
                        if (/date/.test(k)) v = new Date(v * 1000).toISOString().replace(/T(.*)\..*/, ' $1');
                        let h = k.replace(/_/g, ' ');
                        h = h.charAt(0).toUpperCase() + h.slice(1);
                        str += `<div class="spacer review-info"><label>${h}:</label> ${v}</div>`;
                    }
                    return str;
                };
                
                nodes.information.insertAdjacentHTML('beforeend', buildInfo(post));
            }

            nodes.prev.disabled = !queue.length || current < 1;
            nodes.next.disabled = !queue.length || current === queue.length - 1;
            nodes.indicator.textContent = queue.length ? 'Reviewing question ' + (current + 1) + ' of ' + queue.length : 'No questions to review';
        });
        
        let refresh = false;
        
        nodes.refresh.addEventListener('click', _ => refresh = true);
        
        nodes.form.addEventListener('submit', async event => {
            event.preventDefault();
            
            if(!nodes.tagged.value) {
                nodes.indicator.textContent = 'Tag is required';
            }
            if(refresh || nodes.tagged.value !== store.tag) {
                reset(1,0,1);
                store.tag = nodes.tagged.value;
                question_list = await retrieve(store.tag);
                store.question_list = JSON.stringify(question_list);
                refresh = false;
            } else {
                reset(0,0,1);
            }
            
            queue = question_list.filter(e => 
                (nodes.closevotes.value && e.close_vote_count >= +nodes.closevotes.value) ||
                (nodes.deletevotes.value && e.delete_vote_count >= +nodes.deletevotes.value)
            );
            
            console.log(queue.map(post => ' - https://stackoverflow.com/q/' + post.question_id).join('\n'));

            store.queue = JSON.stringify(queue);
            store.closevotes = nodes.closevotes.value;
            store.deletevotes = nodes.deletevotes.value;

            display(+store.current);
        });

        nodes.prev.addEventListener('click', event => {
            event.preventDefault();
            store.current = +store.current - 1;
            display(+store.current);
        }, false);

        nodes.next.addEventListener('click', event => {
            event.preventDefault();
            store.current = +store.current + 1;
            display(+store.current);
        }, false);
        
        display(+store.current);
    }
})();
