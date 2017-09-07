// ==UserScript==
// @name         Magic™ Tag Review 2
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.1.0
// @description  Custom review queue for tag oriented reviewing with the ability to filter by close votes and delete votes
// @author       @TinyGiant
// @contributor  @Makyen
// @include      /^https?:\/\/\w*.?stackoverflow\.com\/review*/
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==
/* jshint -W097 */
/* jshint esnext: true */
/* globals $, unsafeWindow, $, GM_setValue, GM_getValue, StackExchange */
'use strict';

/** Start Reusable Utilities **/

/**
 * @typedef XHRListener
 * @type {function}
 * @param {object} data - Object containing the request object, the property being accessed or method being called, and the value that would be returned
 * @param {XMLHttpRequest} data.xhr - The request object
 * @param {string} [data.property] - The property being accessed (get/set)
 * @param {string} [data.method] - the method being called (call)
 * @param {*} data.value - The value being returned or set (get/set/call)
 * @returns {undefined}
 */
/**
 * @typedef XHRListenerObject
 * @type {object}
 * @param {RegExp} regex - To be matched against XMLHttpRequest.responseURL in order to execute the listener
 * @param {XHRListener} [get] - Called when get operations occur on the request object, 
 * @param {XHRListener} [set] - Called when set operations occur on the request object
 * @param {XHRListener} [call] - Called when methods of the request object are called
 */
/**
 * @function addXHRListener - Intercepts XMLHttpRequests 
 * @param {XHRListenerObject} listener
 * @return {bool} false
 * @github https://github.com/Tiny-Giant/JS-Examples/blob/master/addXHRListener.js
 */
/* For de bug porpoises */
/*addXHRListener({
    regex: /./,
    get: data => console.log(data.xhr.responseURL, 'get', data),
    set: data => console.log(data.xhr.responseURL, 'set', data),
    call: data => console.log(data.xhr.responseURL, 'call', data)
});*/
const addXHRListener = (_ => {
    const XHR = XMLHttpRequest;

    const listeners = [];

    unsafeWindow.XMLHttpRequest = new Proxy(XHR, {
        construct: (target, args) => {
            const callall = (type, data) => (listeners.forEach(e => type in e && e.regex.test(xhr.responseURL) && e[type](data)), data);

            const xhr = new XHR();

            return new Proxy(xhr, {
                get: (t, k) => {
                    if(typeof xhr[k] === 'function') {
                        return new Proxy(xhr[k], {
                            apply: async (target, self, args) => {
                                const result = await xhr[k](...args);
                                const data = callall('call', { xhr, 'method': k, 'args': args.join(', '), 'value': result });
                                return data.value;
                            }
                        });
                    }
                    const data = callall('get', { xhr, 'property': k, 'value': xhr[k] });
                    return data.value;
                },
                set: (t, k, v) => {
                    const data = callall('set', { xhr, 'property': k, 'value': v });
                    xhr[k] = data.value;
                    return true;
                }
            });
        }
    });

    return listener => (listeners.push(listener), !0); 
})();
    
const executeInPage = function(functionToRunInPage, leaveInPage, id) { // + any additional JSON-ifiable arguments for functionToRunInPage
    //Execute a function in the page context.
    // Using () => doesn't set arguments, so can't use it on this function.
    // This has to be done without jQuery, as jQuery creates the script
    // within this context, not the page context, which results in
    // permission denied to run the function.
    var newScript = document.createElement('script');
    if(typeof id === 'string' && id) {
        newScript.id = id;
    }
    var args = [];
    //using .slice(), or other Array methods, on arguments prevents optimization
    for(var index=3;index<arguments.length;index++){
        args.push(arguments[index]);
    }
    newScript.textContent = '(' + functionToRunInPage.toString() + ').apply(null,JSON.parse(\'' + JSON.stringify(args).replace(/\\/g,'\\\\').replace(/'/g,"\\'") + "'));";
    document.head.appendChild(newScript);
    if(!leaveInPage) {
        //Synchronous scripts are executed immediately and can be immediately removed.
        //Scripts with asynchronous functionality of any type must remain in the page until all complete.
        document.head.removeChild(newScript);
    }
    return newScript;
};

/** @Proxy store - Wraps GM_(set/get)value with a prefix to prevent interference with other scripts */
const store = new Proxy({}, {
    get: (t, k) => GM_getValue(`MagicTagReview-${ k }`),
    set: (t, k, v) => (GM_setValue(`MagicTagReview-${ k }`, v), true)
});

/** End Reusable Utilities **/

unsafeWindow.onload = async _ => {
    if (/^\/?review\/?$/.test(window.location.pathname)) {
        // We are on the review queue list page
        document.querySelector('.dashboard-item').insertAdjacentHTML('beforebegin', `
            <div class="dashboard-item">
                <div class="dashboard-count"></div>
                <div class="dashboard-summary">
                    <div class="dashboard-summary">
                        <div class="dashboard-title"><a href="/review/custom?noredirect=1">Magic™ Tag Review</a></div>
                        <div class="dashboard-description">Concentrated tag review with options to filter by close votes or delete votes.</div>
                    </div>
                </div>
                <br class="cbt">
            </div>
        `);
    } else if (/^\/?review\/custom/.test(window.location.pathname)) {
        // We are on the Magic™ Tag Review page
        document.querySelector('title').textContent = 'Magic™ Tag Review';
        document.querySelector('#mainbar-full').innerHTML = '';

        /** Start Interface **/

        const nodes = (_ => {
            const scope = document.querySelector('#mainbar-full');
            const wrapper = scope.appendChild(Object.assign(document.createElement('span'), { className: 'review-bar-wrapper'  }));
            const CSS = `
                body {
                    overflow-y: scroll;
                }
                .review-indicator {
                    padding-left: 5px;
                    display: inline-block;
                    vertical-align: middle;
                }
                .review-spinner {
                    display: inline-block;
                    vertical-align: middle;
                    height: 30px;
                }
                .review-indicator .progress,
                .review-indicator .quota {
                    font-size: 11px;
                    height: 15px;
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
                }
                .review-bar input,
                .review-bar select {
                    margin: 0px;
                    display: inline-block;
                    vertical-align: middle;
                    box-sizing: border-box;
                    height: 35px;
                }
                .review-bar select {
                    font-size: 13px;
                    line-height: 30px;
                    border-color: rgb(200, 204, 208);
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
                .review-filters-toggle {
                    font-size:  11px;
                    text-align:  center;
                    padding:  0px;
                    margin: -5px;
                    margin-top:  5px;
                    border-top: 1px solid #c8ccd0;
                    line-height: 15px;
                    color: rgb(122, 122, 122);
                }
                .review-filters td {
                    font-size: 11px;
                    min-width: 85px;
                }
                .review-filters input {
                    margin: 0;
                    width: 100%;
                    box-sizing:  border-box;
                }
                .review-filters {
                    font-size: 12px;
                }
                .review-filters-toggle:hover {
                    background: #eee;
                    cursor: pointer;
                }
                .review-bar-top {
                    overflow: hidden;
                }
                .review-form {
                    white-space: nowrap;
                    float: left;
                }
                .review-top-right {
                    float: right;
                }
                .review-info {
                    overflow: hidden;
                }
                .review-info .left {
                    float: left;
                }
                .review-info .right {
                    float: right;
                }
                .review-filters-help-header:hover {
                    cursor: pointer;
                    background: #eee;
                }
                .review-filters-help-header {
                    padding: 5px;
                }
                .review-filters-help-header .toggle-indicator {
                    font-weight: bold;
                    font-size:  11px;
                    color: rgb(122, 122, 122);
                }
                .review-bar-container {
                    margin: 0;
                }
                div#content {
                    padding-top: 15px !important;
                }
                .review-bar {
                    margin-bottom: 15px!important;
                }
                .review-indicator .quota {
                    font-size: 11px;
                }
                .review-position {
                    text-align: center;
                    width: 50px;
                }
            `;
            const HTML = `
                <div class="review-bar-container">
                    <div class="review-bar-anchor"></div>
                    <div class="review-bar">
                        <div class="review-bar-top">
                            <form class="review-form">
                                <input class="review-tagged" type="text" placeholder="tag">
                                <select class="review-sort">
                                    <option selected value="activity">activity</option>
                                    <option value="votes">votes</option>
                                    <option value="creation">creation</option>
                                    <option value="hot">hot</option>
                                    <option value="week">week</option>
                                    <option value="month">month</option>
                                </select>
                                <select class="review-order">
                                    <option selected value="desc">desc</option>
                                    <option value="asc">asc</option>
                                </select>
                                <input class="review-fetch" type="submit" value="Fetch">
                                <input class="review-stop" type="button" value="Stop" disabled="">
                                <img class="review-spinner" src="https://i.stack.imgur.com/ccvLD.gif" style="display: none">
                                <div class="review-indicator">
                                    <div class="progress"></div>
                                    <div class="quota"></div>
                                </div>
                            </form>
                            <div class="review-top-right">
                                <input class="review-prev" type="button" value="Previous">
                                <input class="review-position" type="text" readonly value="0/0">
                                <input class="review-next" type="button" value="Next">
                            </div>
                        </div>
                        <div class="review-filters" style="display: none">
                            <form class="review-filters-form">
                                <div class="review-filters-help-header"><b>Filters:</b> <span class="toggle-indicator">?\u25BC</span></div>
                                <ul class="review-filters-help">
                                    <li>Leave filters blank to exclude them</li>
                                    <li>Close, reopen, and delete vote filters are primary filters.
                                        <ul>
                                            <li>Primary filters operate independantly of each other, except when both delete and reopen vote filters are set.</li>
                                            <li>When both delete and reopen vote filters are set, both will be required of questions matching either filter.</li>
                                            <li>When including a maximum primary filter a corresponding minimum should also be included to avoid short-circuiting.</li>
                                        </ul>
                                    </li>
                                    <li>The rest of the filters are secondary filters.
                                        <ul>
                                            <li>Secondary filters are required of all questions being filtered, except the close date range filters.</li>
                                            <li>The close date range filters do not apply to open questions.</li>
                                        </ul>
                                    </li>
                                </ul>
                                <table class="review-filters-table" border="0">
                                    <thead>
                                        <tr>
                                            <td colspan="42">
                                            </td>
                                        <tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Min Close:</td>
                                            <td>Max Close:</td>
                                            <td title="Will be ignored for close vote filter">Min Reopen:*</td>
                                            <td title="Will be ignored for close vote filter">Max Reopen:*</td>
                                            <td title="Will be ignored for close vote filter">Min Delete:*</td>
                                            <td title="Will be ignored for close vote filter">Max Delete:*</td>
                                            <td>Min Answers:</td>
                                            <td>Max Answers:</td>
                                            <td>Min Score:</td>
                                            <td>Max Score:</td>
                                            <td>Min Views:</td>
                                            <td>Max Views:</td>
                                        </tr>
                                        <tr>
                                            <td><input class="review-minclosevotes" type="number" min="1" max="4" value=""></td>
                                            <td><input class="review-maxclosevotes" type="number" min="0" max="4" value=""></td>
                                            <td title="Will be ignored for close vote filter"><input class="review-minreopenvotes" type="number" min="1" max="4" value=""></td>
                                            <td title="Will be ignored for close vote filter"><input class="review-maxreopenvotes" type="number" min="0" max="4" value=""></td>
                                            <td title="Will be ignored for close vote filter"><input class="review-mindeletevotes" type="number" min="1" value=""></td>
                                            <td title="Will be ignored for close vote filter"><input class="review-maxdeletevotes" type="number" min="0" value=""></td>
                                            <td><input class="review-minanswers" type="number" min="0" value=""></td>
                                            <td><input class="review-maxanswers" type="number" min="0" value=""></td>
                                            <td><input class="review-minscore" type="number" value=""></td>
                                            <td><input class="review-maxscore" type="number" value=""></td>
                                            <td><input class="review-minviews" type="number" value=""></td>
                                            <td><input class="review-maxviews" type="number" value=""></td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" title="Will be ignored for close vote filter">Close Date Range Start:*</td>
                                            <td colspan="2" title="Will be ignored for close vote filter">Close Date Range End:*</td>
                                            <td colspan="2">Asked Date Range Start:</td>
                                            <td colspan="2">Asked Date Range End:</td>
                                            <td colspan="2">Last Activity Date Range Start:</td>
                                            <td colspan="2">Last Activity Date Range End:</td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" title="Will be ignored for close vote filter"><input class="review-closedatestart" type="date"></td>
                                            <td colspan="2" title="Will be ignored for close vote filter"><input class="review-closedateend" type="date"></td>
                                            <td colspan="2"><input class="review-askeddatestart" type="date"></td>
                                            <td colspan="2"><input class="review-askeddateend" type="date"></td>
                                            <td colspan="2"><input class="review-activitydatestart" type="date"></td>
                                            <td colspan="2"><input class="review-activitydateend" type="date"></td>
                                        </tr>
                                        <tr>
                                            <td colspan="4">Includes Tags:</td>
                                            <td colspan="4">Excludes Tags:</td>
                                            <td colspan="2">Last Edit Date Range Start:</td>
                                            <td colspan="2">Last Edit Date Range End:</td>
                                        </tr>
                                        <tr>
                                            <td colspan="4"><input class="review-includestags" type="text" placeholder="html, css"></td>
                                            <td colspan="4"><input class="review-excludestags" type="text" placeholder="php, java"></td>
                                            <td colspan="2"><input class="review-editdatestart" type="date"></td>
                                            <td colspan="2"><input class="review-editdateend" type="date"></td>
                                        </tr>
                                        <tr>
                                            <td colspan="10"></td>
                                            <td colspan="2"><input class="review-apply-filters" type="submit" value="Apply filters"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </form>
                        </div>
                        <div class="review-filters-toggle">\u25BC</div>
                    </div>
                </div>
                <div class="review-task" style="display: none">
                    <div class="review-header" id="question-header">
                        <h1><a class="review-title" target="_blank"></a></h1>
                    </div>
                    <div class="review-question"></div>
                    <div class="review-sidebar module community-bulletin">
                        <div class="bulletin-title review-sidebar-header">Post Information</div> <hr>
                        <div class="review-information"></div>
                    </div>
                </div>
                <style type="text/css">${CSS}</style>
            `;
            wrapper.insertAdjacentHTML('beforeend', HTML);

            const trap = (target, key) => {
                if (!(key in target)) {
                    const selector = `.review-${ 
                        key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
                           .replace(/_/g,     m => ` .${m.toLowerCase().substr(1)}`)
                    }`;
                    const node  = nodes.wrapper.querySelector(selector);
                    if(!node) console.log(selector);
                    target[key] = node || null;
                }
            };
        
            return new Proxy({scope, wrapper}, {
                get: (target, key) => (trap(target, key),   target[key]),
                has: (target, key) => (trap(target, key), !!target[key]),
            });
        })();
        
        nodes.spinner.show = _ => nodes.spinner.style.display = '';
        nodes.spinner.hide = _ => nodes.spinner.style.display = 'none';

        /** End Interface **/

        /** Start Initialization **/

        const inPageInitInlineEditing = inlineEditingInitId => {
            StackExchange.using('inlineEditing', function () {
                StackExchange.inlineEditing.init();
                document.getElementById(inlineEditingInitId).remove();
            });
        };
        const inlineEditingInitId = 'magicTag2-initInlineEditing-' + performance.now();
        executeInPage(inPageInitInlineEditing, true, inlineEditingInitId, inlineEditingInitId);

        let stop          = false,
            queue         = JSON.parse(store.queue              || '[]'),
            question_list = JSON.parse(store.question_list      || '[]');

        nodes.tagged           .value = store.tagged            || '';
        nodes.sort             .value = store.sort              || '';
        nodes.order            .value = store.order             || '';
        nodes.minclosevotes    .value = store.minclose          || '';
        nodes.maxclosevotes    .value = store.maxclose          || '';
        nodes.mindeletevotes   .value = store.mindelete         || '';
        nodes.maxdeletevotes   .value = store.maxdelete         || '';
        nodes.minreopenvotes   .value = store.minreopen         || '';
        nodes.maxreopenvotes   .value = store.maxreopen         || '';
        nodes.minanswers       .value = store.minanswers        || '';
        nodes.maxanswers       .value = store.maxanswers        || '';
        nodes.minscore         .value = store.minscore          || '';
        nodes.maxscore         .value = store.maxscore          || '';
        nodes.minviews         .value = store.minviews          || '';
        nodes.maxviews         .value = store.maxviews          || '';
        nodes.closedatestart   .value = store.closedatestart    || '';
        nodes.closedateend     .value = store.closedateend      || '';
        nodes.askeddatestart   .value = store.askeddatestart    || '';
        nodes.askeddateend     .value = store.askeddateend      || '';
        nodes.activitydatestart.value = store.activitydatestart || '';
        nodes.activitydateend  .value = store.activitydateend   || '';
        nodes.editdatestart    .value = store.editdatestart     || '';
        nodes.editdateend      .value = store.editdateend       || '';
        nodes.includestags     .value = store.includestags      || '';
        nodes.excludestags     .value = store.excludestags      || '';

        /** End Initialization **/

        /** Start Functions **/

        const reset = (q, f, c) => {
            if(q) {
                queue         = [];
                question_list = [];
                store.queue         = '[]';
                store.question_list = '[]';
                nodes.indicator_quota.textContent = '';
            }
            if(f) {
                nodes.tagged           .value = '';
                nodes.sort             .value = '';
                nodes.order            .value = '';
                nodes.minclosevotes    .value = '';
                nodes.maxclosevotes    .value = '';
                nodes.mindeletevotes   .value = '';
                nodes.maxdeletevotes   .value = '';
                nodes.minreopenvotes   .value = '';
                nodes.maxreopenvotes   .value = '';
                nodes.minanswers       .value = '';
                nodes.maxanswers       .value = '';
                nodes.minscore         .value = '';
                nodes.maxscore         .value = '';
                nodes.minviews         .value = '';
                nodes.maxviews         .value = '';
                nodes.closedatestart   .value = '';
                nodes.closedateend     .value = '';
                nodes.askeddatestart   .value = '';
                nodes.askeddateend     .value = '';
                nodes.activitydatestart.value = '';
                nodes.activitydateend  .value = '';
                nodes.editdatestart    .value = '';
                nodes.editdateend      .value = '';
                nodes.includestags     .value = '';
                nodes.excludestags     .value = '';
            }
            if(c) {
                store.current = 0;
            }

            $(document).off("click", ".post-menu a.short-link");
            nodes.task.style.display    = 'none';
            nodes.information.innerHTML = '';
            nodes.question.innerHTML    = '';
            nodes.title.href            = '';
            nodes.title.innerHTML       = '';
            nodes.fetch.disabled        = false;
            nodes.stop.disabled         = true;
            nodes.prev.disabled         = true;
            nodes.next.disabled         = true;
            nodes.indicator_progress.textContent  = '';
        };

        const retrieve = _ => new Promise(async (resolve, reject) => {
            if(!nodes.tagged.value) {
                nodes.indicator_progress.textContent = 'Tag is required';
                return;
            }
            
            store.tagged = nodes.tagged.value;
            store.sort   = nodes.sort  .value;
            store.order  = nodes.order .value;
            
            reset(1,0,1);
            
            nodes.fetch.disabled = true;
            nodes.stop .disabled = false;
            nodes.spinner.show();

            const result = { quota_remaining: 1, backoff: undefined };

            let page = 1, totalpages = 1, url;
        
            while(page <= totalpages && result.quota_remaining !== 0 && !result.backoff && stop === false) {
                nodes.indicator_progress.textContent = `Retrieving question list (page ${page} of ${(totalpages||1)})`;
                nodes.indicator_quota   .textContent = `API Quota remaining: ${result.quota_remaining}`;
                url = `${location.protocol}//api.stackexchange.com/2.2/questions?${[
                    `page=${page++}`,
                    'pagesize=100',
                    `order=${store.order}`,
                    `sort=${store.sort}`,
                    `site=${/\/([\w.]*)\.com/.exec(location.href)[1]}`,
                    'key=dwtLmAaEXumZlC5Nj0vDuw((',
                    'filter=!6C_(7U8z1Z.G(-FUAWXe3PUs*p6kip9BgZ*MrbbgvOQV*)k6GLjHx*p3_q6',
                    `tagged=${encodeURIComponent(store.tagged)}`
                ].join('&')}`;
                
                const response = await fetch(url);
                
                if(!response.ok) {
                    return reject(response);
                }
                
                Object.assign(result, await response.json());
                
                totalpages = Math.ceil(result.total / 100);
                
                question_list.push(...result.items);
                
                if(result.backoff) console.log('Backoff: ' + result.backoff);
            }
            store.question_list = JSON.stringify(question_list);
            
            nodes.spinner.hide();
            nodes.fetch.disabled = true;
            nodes.stop.disabled = true;
            nodes.indicator_progress.textContent = '';
            stop = false;
            
            delete result.items;
            console.log(result, url);
            
            if(result.quota_remaining === 0) {
                nodes.indicator_quota.textContent = "No requests left, wait until next UTC day.";
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
                    resolve([]);
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
                    resolve(`<h1>${xhr.status} - ${xhr.statusText}</h1><div>${url}</div>`);
                } else {
                    resolve(xhr.responseText);
                }
            });
            xhr.open('GET', `/posts/ajax-load-realtime/${post.question_id}`);
            xhr.send();
        });

        const inPageInitQuestionWithComments = (initInfo, questionInitId) => {
            //Direct SE to load what we need (SE.using), but wait to execute until we know it's available (SE.ready).
            //StackExchange.question.init is in "full.js", which is loaded for any of: "loggedIn", "inlineEditing", "beginEditEvent", "translation".
            StackExchange.using('inlineEditing', function () {
                StackExchange.ready(function () {
                    StackExchange.question.init(initInfo);
                    StackExchange.comments.loadAll($('.question'));
                    //Remove the <script> this was loaded in.
                    document.getElementById(questionInitId).remove();
                });
            });
        };

        const inPageInitSnippetRenderer = snippetInitId => {
            StackExchange.using("snippets", function () {
                StackExchange.snippets.initSnippetRenderer();
                document.getElementById(snippetInitId).remove();
            });
        };

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

                //Initialize the question, with comments
                //Get a unique ID for this execution of inPageInitQuestionWithComments.
                const questionInitId = 'magicTag2-initQuestion-' + performance.now();
                executeInPage(inPageInitQuestionWithComments, true, questionInitId , {
                    votesCast: await fetchVotes(post),
                    canViewVoteCounts: true,
                    questionId: post
                }, questionInitId);

                const prettyDate = time => {
                    if (time === null || time.length != 20) return;

                    // firefox requires ISO 8601 formated dates
                    time = time.substr(0, 10) + "T" + time.substr(11, 10);
                    console.log(time);
                    var date = new Date(time),
                        diff = (((new Date()).getTime() - date.getTime()) / 1000) + StackExchange.options.serverTimeOffsetSec,
                        day_diff = Math.floor(diff / 86400);

                    if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31)
                        return;

                    return day_diff == 0 && (
                        diff < 2 && "just now" ||
                        diff < 60 && (function(n){return n.seconds==1?n.seconds+" sec ago":n.seconds+" secs ago"})({seconds:Math.floor(diff)}) ||
                        diff < 120 && "1 min ago" ||
                        diff < 3600 && (function(n){return n.minutes==1?n.minutes+" min ago":n.minutes+" mins ago"})({minutes:Math.floor(diff/60)}) ||
                        diff < 7200 && "1 hour ago" ||
                        diff < 86400 && (function(n){return n.hours==1?n.hours+" hour ago":n.hours+" hours ago"})({hours:Math.floor(diff/3600)}));
                };

                const buildInfo = obj => {
                    const excludes = ['title'];
                    let str = '';
                    for(let [k, v] of Object.entries(obj)) {
                        if(excludes.includes(k)) continue;
                        if (k === 'tags') v = v.join(', ');
                        if (/Object/.test(v.toString())) {
                            if ("display_name" in v && "link" in v) 
                                 v = `<a href="${v.link}">${v.display_name}</a>`;
                            else v = buildInfo(v);
                        }
                        if (/date/.test(k)) {
                            const date = new Date(v * 1000).toISOString().replace(/T(.*)\..*/, ' $1Z');
                            v = `<span class="relativetime" title="${date}">${prettyDate(date) || date}</span>`;
                        }
                        let h = k.replace(/_/g, ' ');
                        h = h.charAt(0).toUpperCase() + h.slice(1);
                        str += `<div class="spacer review-info"><label class="left">${h}:</label> <span class="right">${v}</span></div>`;
                    }
                    return str;
                };
                
                nodes.information.insertAdjacentHTML('beforeend', buildInfo(post));
                const snippetInitId = 'magicTag2-initSnippetRenderer-' + performance.now();
                executeInPage(inPageInitSnippetRenderer, true, snippetInitId , snippetInitId);
                nodes.task.style.display="";
            }
            
            nodes.prev.disabled = !queue.length || current < 1;
            nodes.next.disabled = !queue.length || current === queue.length - 1;
            nodes.position.value = queue.length ? `${current + 1}/${queue.length}` : '0/0';
        });
        
        const filterQuestions = question_list => {
            reset(0,0,1);
        
            store.minclose          = nodes.minclosevotes    .value ? +nodes.minclosevotes   .value : '';
            store.maxclose          = nodes.maxclosevotes    .value ? +nodes.maxclosevotes   .value : '';
            store.minreopen         = nodes.minreopenvotes   .value ? +nodes.minreopenvotes  .value : '';
            store.maxreopen         = nodes.maxreopenvotes   .value ? +nodes.maxreopenvotes  .value : '';
            store.mindelete         = nodes.mindeletevotes   .value ? +nodes.mindeletevotes  .value : '';
            store.maxdelete         = nodes.maxdeletevotes   .value ? +nodes.maxdeletevotes  .value : '';
            store.minanswers        = nodes.minanswers       .value ? +nodes.minanswers      .value : '';
            store.maxanswers        = nodes.maxanswers       .value ? +nodes.maxanswers      .value : '';
            store.minscore          = nodes.minscore         .value ? +nodes.minscore        .value : '';
            store.maxscore          = nodes.maxscore         .value ? +nodes.maxscore        .value : '';
            store.minviews          = nodes.minviews         .value ? +nodes.minviews        .value : '';
            store.maxviews          = nodes.maxviews         .value ? +nodes.maxviews        .value : '';
            store.closedatestart    = nodes.closedatestart   .value ? nodes.closedatestart   .value : '';
            store.closedateend      = nodes.closedateend     .value ? nodes.closedateend     .value : '';
            store.askeddatestart    = nodes.askeddatestart   .value ? nodes.askeddatestart   .value : '';
            store.askeddateend      = nodes.askeddateend     .value ? nodes.askeddateend     .value : '';
            store.activitydatestart = nodes.activitydatestart.value ? nodes.activitydatestart.value : '';
            store.activitydateend   = nodes.activitydateend  .value ? nodes.activitydateend  .value : '';
            store.editdatestart     = nodes.editdatestart    .value ? nodes.editdatestart    .value : '';
            store.editdateend       = nodes.editdateend      .value ? nodes.editdateend      .value : '';
            store.includestags      = nodes.includestags     .value ? nodes.includestags     .value : '';
            store.excludestags      = nodes.excludestags     .value ? nodes.excludestags     .value : '';
            
            
            const closedatestart    = new Date(store.closedatestart   ).getTime() / 1000;
            const closedateend      = new Date(store.closedateend     ).getTime() / 1000;
            const askeddatestart    = new Date(store.askeddatestart   ).getTime() / 1000;
            const askeddateend      = new Date(store.askeddateend     ).getTime() / 1000;
            const activitydatestart = new Date(store.activitydatestart).getTime() / 1000;
            const activitydateend   = new Date(store.activitydateend  ).getTime() / 1000; 
            const editdatestart     = new Date(store.editdatestart    ).getTime() / 1000;
            const editdateend       = new Date(store.editdateend      ).getTime() / 1000; 
            const includestags      = store.includestags.split(/,\s+/g); 
            const excludestags      = store.excludestags.split(/,\s+/g); 
            
            const filters = {
                incloserange       : e => (store.minclose          !== '' ? store.minclose          <= e.close_vote_count   : true) &&
                                          (store.maxclose          !== '' ? store.maxclose          >= e.close_vote_count   : true) ,
                indeleterange      : e => (store.mindelete         !== '' ? store.mindelete         <= e.delete_vote_count  : true) &&
                                          (store.maxdelete         !== '' ? store.maxdelete         >= e.delete_vote_count  : true) ,
                inreopenrange      : e => (store.minreopen         !== '' ? store.minreopen         <= e.reopen_vote_count  : true) &&
                                          (store.maxreopen         !== '' ? store.maxreopen         >= e.reopen_vote_count  : true) ,
                inanswerrange      : e => (store.minanswers        !== '' ? store.minanswers        <= e.answer_count       : true) &&
                                          (store.maxanswers        !== '' ? store.maxanswers        >= e.answer_count       : true) ,
                inscorerange       : e => (store.minscore          !== '' ? store.minscore          <= e.score              : true) &&
                                          (store.maxscore          !== '' ? store.maxscore          >= e.score              : true) ,
                inviewsrange       : e => (store.minviews          !== '' ? store.minviews          <= e.view_count         : true) &&
                                          (store.maxviews          !== '' ? store.maxviews          >= e.view_count         : true) ,
                inclosedaterange   : e => (store.closedatestart    !== '' ?       closedatestart    <= e.closed_date        : true) &&
                                          (store.closedateend      !== '' ?       closedateend      >= e.closed_date        : true) ,
                inaskeddaterange   : e => (store.askeddatestart    !== '' ?       askeddatestart    <= e.creation_date      : true) &&
                                          (store.askeddateend      !== '' ?       askeddateend      >= e.creation_date      : true) ,
                inactivitydaterange: e => (store.activitydatestart !== '' ?       activitydatestart <= e.last_activity_date : true) &&
                                          (store.activitydateend   !== '' ?       activitydateend   >= e.last_activity_date : true) ,
                ineditdaterange    : e => (store.editdatestart     !== '' ?       editdatestart     <= e.last_edit_date     : true) &&
                                          (store.editdateend       !== '' ?       editdateend       >= e.last_edit_date     : true) ,
                includestags       : e =>  store.includestags      !== '' ? includestags.every(t =>  e.tags.includes(t))    : true  ,
                excludestags       : e =>  store.excludestags      !== '' ? excludestags.every(t => !e.tags.includes(t))    : true  
            };
            
            const filter = e => Object.entries(filters).reduce((m, [k, v]) => Object.assign(m, {[k]: v(e)}), {});
            
            const queue = question_list.filter(e => {
                
                const r = filter(e);
                
                if(!r.inanswerrange || !r.inscorerange || !r.inviewsrange || !r.inaskeddaterange || !r.inactivitydaterange || !r.ineditdaterange || !r.includestags || !r.excludestags) return false;
                
                if( ((store.minclose  !== '' || store.maxclose  !== '') && r.incloserange                                                                                     ) ||
                    ((store.mindelete !== '' || store.maxdelete !== '') && r.indeleterange && r.inreopenrange && r.inclosedaterange                                           ) ||
                    ((store.minreopen !== '' || store.maxreopen !== '') && r.inreopenrange && r.incloserange  && r.inclosedaterange                                           ) ||
                    ( store.mindelete === '' && store.maxdelete === ''  && store.minclose  === '' && store.maxclose  === ''  && store.minreopen === '' && store.maxreopen === '' && r.inclosedaterange) )  return true;
            });
            
            console.log(queue.map(post => ' - https://stackoverflow.com/q/' + post.question_id).join('\n'));
            
            return queue;
        };

        /** End Functions **/
        
        /** Start Event Listeners **/
        nodes.stop.addEventListener('click', _ => stop = true);

        nodes.form.addEventListener('submit', async event => {
            event.preventDefault();
            question_list = await retrieve();
            store.question_list = JSON.stringify(question_list);
            queue = filterQuestions(question_list);
            store.queue = JSON.stringify(queue);
            display(+store.current);
        });
        
        nodes.filtersForm.addEventListener('submit', event => {
            event.preventDefault();
            queue = filterQuestions(question_list);
            store.queue = JSON.stringify(queue);
            display(+store.current);
        }, false);

        nodes.prev.addEventListener('click', _ => {
            store.current = +store.current - 1;
            display(+store.current);
        }, false);

        nodes.next.addEventListener('click', _ => {
            store.current = +store.current + 1;
            display(+store.current);
        }, false);
        
        (_ => {
            let open = false;
            if(typeof store.filtersToggleOpen !== 'undefined') open = store.filtersToggleOpen;
            console.log(open);
            nodes.filters.style.display = open ? '' : 'none';
            nodes.filtersToggle.textContent = open ? `\u25B2` : `\u25BC`;
            nodes.filtersToggle.addEventListener('click', _ => {
                nodes.filters.style.display = open ? 'none' : '';
                nodes.filtersToggle.textContent = open ? `\u25BC` : `\u25B2`;
                open = !open;
                store.filtersToggleOpen = open;
            }, false);
        })();
        
        (_ => {
            let open = true;
            if(typeof store.filtersHelpOpen !== 'undefined') open = store.filtersHelpOpen;
            nodes.filtersHelp.style.display = open ? '' : 'none';
            nodes.filtersHelpHeader_toggleIndicator.textContent = open ? `?\u25BC` : `?\u25B6`;
            nodes.filtersHelpHeader.addEventListener('click', _  => {
                nodes.filtersHelp.style.display = open ? 'none' : '';
                nodes.filtersHelpHeader_toggleIndicator.textContent = open ? `?\u25B6` : `?\u25BC`;
                open = !open;
                store.filtersHelpOpen = open;
            }, false);
        })();
        /** End Event Listeners **/
        
        // Prevent reload on post state change, reload post instead.
        addXHRListener({
            regex: /close\/add/,
            get: data => {
                if(data.property === 'responseText') {
                    console.log(data.xhr.responseText);
                    const obj = JSON.parse(data.xhr.responseText);
                    if(!obj.Count) {
                        Object.assign(obj, {
                            "Message":"Your vote has been recorded",
                            "ResultChangedState":false,
                            "Count":4,
                            "CountNeededForStateChange":1
                        });
                        data.value = JSON.stringify(obj);
                        display(store.current);
                    }
                }
            }
        });
        
        display(+store.current);
    }
};
