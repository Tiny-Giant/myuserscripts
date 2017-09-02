// ==UserScript==
// @name         Magic™ Tag Review
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.1.0
// @description  Creates a fake queue which allows you to search a tag by a minimum number close votes or delete votes.
// @author       @TinyGiant
// @contributor  @Makyen
// @include      /^https?:\/\/\w*.?stackoverflow\.com\/review*/
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/* jshint esnext: false */
/* jshint esversion: 6 */
/* jshint devel: true */
/* global StackExchange */

(function() {
    'use strict';

    //To do:
    //If you VtC and it closes the question, any fetching of questions is stopped. It is not resumed when the page reloads.
    //Presentation order is not preserved. This can result in questions being skipped.
    //Being closed is not considered as "voted" (i.e. skipable) when searching for questions to close.
    //Don't permit "Go" when numbers are invalid (notify?)
    //Display should show deleted instead of closed when that is the status.

    StackExchange.using("inlineEditing", function () {
        StackExchange.inlineEditing.init();
    });

    if(window.location.pathname !== '/review/magic-tag1-custom') {
        let nodes = {};

        nodes.before = document.querySelector('.dashboard-item');
        if(!nodes.before) {
            return;
        }

        nodes.item = document.createElement('div');
        nodes.item.className = 'dashboard-item';
        nodes.before.parentNode.insertBefore(nodes.item, nodes.before);

        nodes.count = document.createElement('div');
        nodes.count.className = 'dashboard-count';
        nodes.item.appendChild(nodes.count);

        nodes.summary = document.createElement('div');
        nodes.summary.className = 'dashboard-summary';
        nodes.item.appendChild(nodes.summary);

        nodes.title = document.createElement('div');
        nodes.title.className = 'dashboard-title';
        nodes.summary.appendChild(nodes.title);

        nodes.titleLink = document.createElement('a');
        nodes.titleLink.href = '/review/magic-tag1-custom';
        nodes.titleLink.textContent = 'Magic™ Tag Review 1';
        nodes.title.appendChild(nodes.titleLink);

        nodes.description = document.createElement('div');
        nodes.description.className = 'dashboard-description';
        nodes.description.textContent = 'Concentrated tag review with options to filter by close votes or delete votes.';
        nodes.summary.appendChild(nodes.description);

        nodes.cbt = document.createElement('br');
        nodes.cbt.className = 'cbt';
        nodes.item.appendChild(nodes.cbt);
    }
    else {
        let queue          = JSON.parse(['{"order":[]}',localStorage.SECUSTOMREVIEW_MagicTag1_queue] [+!!localStorage.SECUSTOMREVIEW_MagicTag1_queue]),
            current        =            [0,  +localStorage.SECUSTOMREVIEW_MagicTag1_current]         [+!!localStorage.SECUSTOMREVIEW_MagicTag1_current],
            page           =            [0,  +localStorage.SECUSTOMREVIEW_MagicTag1_page]            [+!!localStorage.SECUSTOMREVIEW_MagicTag1_page],
            firstload      =            [0,  +localStorage.SECUSTOMREVIEW_MagicTag1_firstload]       [+!!localStorage.SECUSTOMREVIEW_MagicTag1_firstload],
            tag            =            ['',  localStorage.SECUSTOMREVIEW_MagicTag1_tag]             [+!!localStorage.SECUSTOMREVIEW_MagicTag1_tag],
            closeVotesMin  =            [0,  +localStorage.SECUSTOMREVIEW_MagicTag1_closeVotesMin]   [+!!localStorage.SECUSTOMREVIEW_MagicTag1_closeVotesMin],
            closeVotesMax  =            [4,  +localStorage.SECUSTOMREVIEW_MagicTag1_closeVotesMax]   [+!!localStorage.SECUSTOMREVIEW_MagicTag1_closeVotesMax],
            deleteVotesMin =            [0,  +localStorage.SECUSTOMREVIEW_MagicTag1_deleteVotesMin]  [+!!localStorage.SECUSTOMREVIEW_MagicTag1_deleteVotesMin],
            deleteVotesMax =            [20, +localStorage.SECUSTOMREVIEW_MagicTag1_deleteVotesMax]  [+!!localStorage.SECUSTOMREVIEW_MagicTag1_deleteVotesMax],
            skipVoted      =            localStorage.SECUSTOMREVIEW_MagicTag1_skipVoted === 'true' ? true : false,
            autoNext       =            localStorage.SECUSTOMREVIEW_MagicTag1_autoNext  === 'true' ? true : false,
            voted          = false,
            stopFetching   = false,
            //functions:
            reset, retrieve, getVotes, display, updatestats, logqueue, skipIfSkippingVoted, getDeleteTooltip,
            votedObserver, startObservingVotes,
            skipIfAvailable, skipIfAutoNext, xhrGet, markInvalidVoteCriteria;
        if(!Array.isArray(queue.order) || ((queue.order.length + 1) !== Object.keys(queue).length) ) {
            //This creates the display order if if does not already exist. This is needed for the transition from this
            // code not keeping the order and the code keeping the queue's order consistent.
            //
            delete queue.order;
            queue.order = Object.keys(queue);
        }

        document.querySelector('title').textContent = 'Magic™ Tag Review';
        let voteObserver, deleteObserver;
        let nodes = {};

        nodes.scope = document.querySelector('#mainbar-full');
        nodes.scope.innerHTML = '';

        nodes.style = document.createElement('style');
        nodes.style.type = 'text/css';
        nodes.style.textContent = [
            '.review-bar {',
            '    position: static;',
            '    margin-top: 0px;',
            '    padding: 5px;',
            '    height: 4em;',
            '    display: block;',
            '}',
            '.review-bar input, .review-bar label, .review-bar > form > span {',
            '    margin-left: 10px;',
            '    vertical-align: inherit;',
            '}',
            '.review-bar form {',
            '    display: inline-block;',
            '    height: 4em;',
            '    top: 5px;',
            '    vertical-align: top;',
            '    position: relative;',
            '}',
            '.review-bar table {',
            '    display: inline-block;',
            '}',
            '.review-bar table td {',
            '    text-align: center;',
            '}',
            '.review-bar input[type="number"] {',
            '    width: 3.2em;',
            '}',
            '.review-bar #MagicTagCloseVoteTable input[type="number"] {',
            '    width: 2em;',
            '}',
            '.review-bar table input[type="number"] {',
            '    height: 0.7em;',
            '    padding: 5px 5px 5px 5px;',
            '    margin-top: 0px;',
            '}',
            '.review-indicator {',
            '    display: inline-block;',
            '    vertical-align: middle;',
            '    margin-left: 10px;',
            '    color: #424242;',
            '    background: #eee;',
            '    border-radius: 3px;',
            '    padding: 5px 7.5px;',
            '}',
            '.MagicTagNumberInvalid {',
            '    border-color: red !important;',
            '}',
            '.MagicTagCheckboxContainer {',
            '    display: inline-block;',
            '    position: relative;',
            '    top: 10px;',
            '}',
            'input[type="submit"].MagicTagStopButton {',
            '    background-color: #ff9500;',
            '    border-color: #c70;',
            '    box-shadow: inset 0 1px 0 #ffbf66;',
            '}',
            'input[type="submit"].MagicTagStopButton:hover {',
            '    background-color: #995900;',
            '    border-color: #c70;',
            '    box-shadow: inset 0 1px 0 #fa3;',
            '}',
            '#MagicTagVoteCriteriaContainer {',
            '    display: inline;',
            '    position: relative;',
            '    top: -8px;',
            '}',
            '#MagicTagVoteCriteriaContainer label {',
            '    display: block;',
            '}',
            '.MagicTagCheckboxContainer > * {',
            '    display: block;',
            '}',
            '.review-bar .MagicTagInfo {',
            '    margin-left: 1em;',
            '}',
            '.question-status {',
            '    width: 660px',
            '}',
            'h1, h2, h3, h4, h5, h6 {',
            '    font-weight: normal;',
            '}'
        ].join('\n');
        nodes.scope.appendChild(nodes.style);

        nodes.wrp = document.createElement('div');
        nodes.wrp.className = 'review-bar-container';
        nodes.scope.appendChild(nodes.wrp);

        nodes.anchor = document.createElement('div');
        nodes.anchor.className = 'review-bar-anchor';
        nodes.wrp.appendChild(nodes.anchor);

        nodes.bar = document.createElement('div');
        nodes.bar.className = 'review-bar';
        nodes.wrp.appendChild(nodes.bar);

        nodes.form = document.createElement('form');
        nodes.bar.appendChild(nodes.form);

        nodes.tagged = document.createElement('input');
        nodes.tagged.type = 'text';
        nodes.tagged.placeholder = 'tag';
        nodes.tagged.value = tag;
        nodes.form.appendChild(nodes.tagged);

        nodes.voteSpan = document.createElement('span');
        nodes.voteSpan.id = "MagicTagVoteCriteriaContainer";
        nodes.voteSpan.insertAdjacentHTML('afterbegin', [
            '  <table id="MagicTagCloseVoteTable">',
            '    <tbody>',
            '      <tr>',
            '        <td colspan="2">',
            '          Close votes',
            '        </td>',
            '      </tr>',
            '      <tr>',
            '        <td>',
            '          min',
            '        </td>',
            '        <td>',
            '          max',
            '        </td>',
            '      </tr>',
            '      <tr>',
            '      <td>',
            '        <input id="MagicTagCloseVotesMin" type="number" min="0" max="4">',
            '      </td>',
            '      <td>',
            '        <input id="MagicTagCloseVotesMax" type="number" min="0" max="4">',
            '      </td>',
            '    </tbody>',
            '  </table>',
            '  <table id="MagicTagDeleteVoteTable">',
            '    <tbody>',
            '      <tr>',
            '        <td colspan="2">',
            '          Delete votes',
            '        </td>',
            '      </tr>',
            '      <tr>',
            '        <td>',
            '          min',
            '        </td>',
            '        <td>',
            '          max',
            '        </td>',
            '      </tr>',
            '      <tr>',
            '      <td>',
            '        <input id="MagicTagDeleteVotesMin" type="number" min="0" max="999">',
            '      </td>',
            '      <td>',
            '        <input id="MagicTagDeleteVotesMax" type="number" min="0" max="999">',
            '      </td>',
            '    </tbody>',
            '  </table>',
        ''].join(''));

        nodes.closeVotesMin = nodes.voteSpan.querySelector('#MagicTagCloseVotesMin');
        nodes.closeVotesMin.value = closeVotesMin;
        nodes.closeVotesMax = nodes.voteSpan.querySelector('#MagicTagCloseVotesMax');
        nodes.closeVotesMax.value = closeVotesMax;
        nodes.deleteVotesMin = nodes.voteSpan.querySelector('#MagicTagDeleteVotesMin');
        nodes.deleteVotesMin.value = deleteVotesMin;
        nodes.deleteVotesMax = nodes.voteSpan.querySelector('#MagicTagDeleteVotesMax');
        nodes.deleteVotesMax.value = deleteVotesMax;
        nodes.form.appendChild(nodes.voteSpan);

        nodes.button = document.createElement('input');
        nodes.button.type = 'submit';
        nodes.button.value = 'Go';
        nodes.form.appendChild(nodes.button);

        nodes.previous = document.createElement('input');
        nodes.previous.style.display = 'none';
        nodes.previous.type = 'button';
        nodes.previous.value = 'Previous';
        nodes.bar.appendChild(nodes.previous);

        nodes.next = document.createElement('input');
        nodes.next.style.display = 'none';
        nodes.next.type = 'button';
        nodes.next.value = 'Next';
        nodes.bar.appendChild(nodes.next);
        let priorAction = nodes.next;

        nodes.indicator = document.createElement('span');
        nodes.indicator.style.display = 'none';
        nodes.indicator.className = 'review-indicator';
        nodes.indicator.textContent = '0';
        nodes.bar.appendChild(nodes.indicator);

        nodes.checkboxes = document.createElement('div');
        nodes.checkboxes.className = 'MagicTagCheckboxContainer';
        nodes.checkboxes.insertAdjacentHTML('afterbegin', [
            '<label id="MagicTagSkipLabel">',
            '    <input type="checkbox"/>',
            '    Skip voted',
            '</label>',
            '<label id="MagicTagAutoNextLabel">',
            '    <input type="checkbox"/>',
            '    Auto-next after vote',
            '</label>',
        ''].join(''));
        nodes.skipIfVotedLabel = nodes.checkboxes.querySelector('#MagicTagSkipLabel');
        nodes.skipIfVoted = nodes.skipIfVotedLabel.querySelector('input');
        nodes.skipIfVoted.checked = skipVoted;
        nodes.autoNextLabel = nodes.checkboxes.querySelector('#MagicTagAutoNextLabel');
        nodes.autoNext = nodes.autoNextLabel.querySelector('input');
        nodes.autoNext.checked = autoNext;
        nodes.bar.appendChild(nodes.checkboxes);
        nodes.checkboxes.insertAdjacentHTML('afterend', [
            '  <span class="MagicTagInfo" title="Reload the page to stop fetching question information. What you have so far will be kept. \r\nYou have total quota of 10,000/day/IP for SE API requests for all requests not using a per-app auth-token.">',
            '    Quota: ',
            '    <span id="MagicTagQuota">',
            '    </span>',
            '  </span>',
        ''].join(''));
        nodes.quota = nodes.bar.querySelector('#MagicTagQuota');
        nodes.header = document.createElement('div');
        nodes.header.id = 'question-header';
        nodes.scope.appendChild(nodes.header);

        nodes.h1 = document.createElement('h1');
        nodes.header.appendChild(nodes.h1);

        nodes.title = document.createElement('a');
        nodes.title.target = '_blank';
        nodes.h1.appendChild(nodes.title);

        nodes.question = document.createElement('div');
        nodes.scope.appendChild(nodes.question);

        reset = () => {
            console.log('Reset');
            queue = JSON.parse(localStorage.SECUSTOMREVIEW_MagicTag1_queue = '{"order":[]}');
            localStorage.SECUSTOMREVIEW_MagicTag1_current        = current        = 0;
            localStorage.SECUSTOMREVIEW_MagicTag1_page           = page           = 0;
            localStorage.SECUSTOMREVIEW_MagicTag1_firstload      = firstload      = 0;
            localStorage.SECUSTOMREVIEW_MagicTag1_tag            = tag            = '';
            localStorage.SECUSTOMREVIEW_MagicTag1_closeVotesMin  = closeVotesMin  = '';
            localStorage.SECUSTOMREVIEW_MagicTag1_closeVotesMax  = closeVotesMax  = '';
            localStorage.SECUSTOMREVIEW_MagicTag1_deleteVotesMin = deleteVotesMin = '';
            localStorage.SECUSTOMREVIEW_MagicTag1_deleteVotesMax = deleteVotesMax = '';
            nodes.question.innerHTML = '';
            nodes.title.href = '';
            nodes.title.innerHTML = '';
            nodes.previous.style.display  = 'none';
            nodes.next.style.display      = 'none';
            nodes.indicator.style.display = 'none';
            nodes.indicator.textContent   = '';
        };

        xhrGet = (url, callback) => {
            let xhr = new XMLHttpRequest();
            xhr.addEventListener("load", event => {
                if(xhr.status !== 200) {
                    console.dir(xhr.responseText, xhr.status, xhr.statusText);
                    return false;
                }
                callback(xhr);
            });
            xhr.open("GET", url);
            xhr.send();
        };

        retrieve = (tagged, callback, pageLastFoundQ) => {
            if(typeof pageLastFoundQ === 'undefined') {
                pageLastFoundQ = page;
            }
            let url = location.protocol + '//api.stackexchange.com/2.2/questions?';
            localStorage.SECUSTOMREVIEW_MagicTag1_page = ++page;
            let options = [
                'page=' + page,
                'pagesize=100',
                'order=asc',
                'sort=votes',
                'site=stackoverflow',
                'key=dwtLmAaEXumZlC5Nj0vDuw((',
                'filter=!OfZM.T6xJcUPn6R0ki)_O(0Zrma4OL58V1em26Na1(U'
            ];
            if(tagged) {
                options.unshift('tagged=' + encodeURIComponent(tagged));
            }
            url += options.join('&');

            xhrGet(url, xhr => {
                let response = JSON.parse(xhr.responseText);
                //console.log('response.backoff:', response.backoff,'::  response:', response);
                if(!response.items || response.items.length === 0) {
                    console.log('response.items:', response.items);
                    alert('NO Items!');
                    //Stop fetching data.
                    return;
                }
                if(callback(response.items)) {
                    pageLastFoundQ = page;
                }
                nodes.quota.textContent = response.quota_remaining;
                //XXX This needs a better way to handle large tags. A person does not have enough quota
                //  to look at all the questions in some tags in a single day.
                //  Currently, we will fetch 200 requests of questions beyond the last one which matched the
                //  criteria being used.  We *really* should be doing this another way. For example,
                //  fetching the questions, and then allowing multiple sorts.
                //  However, 200 pages (2000 questions) is really too many, as it doesn't stop in a reasonable time).
                if(stopFetching || !response.has_more || page > pageLastFoundQ + 200) {
                    stopFetching = false;
                    nodes.button.value = 'Go';
                    nodes.button.textContent = 'Go';
                    nodes.button.classList.remove('MagicTagStopButton');
                    logqueue();
                    return false;
                }
                if(response.backoff){
                    alert('Got backoff: ' + response.backoff+'s from SE API.\r\nThis means we were making too many requests too rapidly.\r\nThe backoff time will be added to whatever delay your clicking this alert takes. Even if we just obey the backoff timer, the SE API thinks requests are made too fast, and will sometimes lock this IP out from making *any* requests, even for normal SE/SO pages. This alert allows you to manually add additional delay. If you want to stop requesting questions, you can refresh the page. If you do, all posts in the queue will be kept.');
                }
                window.setTimeout(retrieve.bind(null, tagged, callback, pageLastFoundQ), response.backoff * 1000);
            });
        };

        getVotes = (post, callback) => {
            //callback([]);
            //* This appears to always return just [], even on questions where I did
            //    vote (all types).
            // When going through questions quickly (e.g.  either
            // manually or automatically skipping questions on which
            // the user has voted), it increases the likelyhood of
            // requests hitting the SE servers too quickly and SE
            // shutting down access to all of SE for a period of time
            // (rate-limit block).  But, there does not appear to be a
            // backoff notice in the response.
            // My personal choice was to comment this out for my use, but I
            // really need to do more testing to see if I can find a time this
            // returns something other than [].
            //
            //My testing with 1 question per second for auto-skip was with this Get disabled.
            //  With it enabled, it may be necessary to reduce that rate.
            xhrGet('/posts/' + post + '/votes', xhr => {
                //console.log('votes xhr:',xhr);
                //console.log('votes responseText:',xhr.responseText);
                //console.log('votes response:',JSON.parse(xhr.responseText));
                callback(JSON.parse(xhr.responseText));
            });
            //*/
        };

        getDeleteTooltip = (post, callback) => {
            xhrGet('/posts/' + post + '/delete-tooltip', xhr => {
                callback(xhr.responseText);
            });
        };

        display = displayIndex => {
            localStorage.SECUSTOMREVIEW_MagicTag1_current = displayIndex;

            let post = queue.order[displayIndex];

            if(!post) return false;

            xhrGet('/posts/ajax-load-realtime/' + post, xhr => {
                updatestats();
                getVotes(post, votes => {
                    function isQuestionClosed() {
                        // Determine if the displayed question is closed. 
                        // Needed because we may display questions for
                        // which we have stale item data.
                        // Question may have been re-opened, so item.closed_date's validity is unknown
                        //Code copied and modified from Roomba Forecaster by its author.
                        //closed/duplicate/locked
                        var isClosed = false;
                        var isDeleted = false;
                        var statusTextEls = document.querySelectorAll('.question .special-status .question-status H2 B');
                        [].slice.call(statusTextEls).forEach(function(el){
                            //There is a special status with at least one entry
                            var statusText = el.textContent;
                            if(statusText.search(/hold|closed|marked/i) > -1) {
                                //Question is closed, or on hold. API values do not distinguish.
                                isClosed = true;
                            } else if(statusText.search(/deleted/i) > -1) {
                                isDeleted = true;
                            }
                        });
                        return isClosed;
                    }
                    nodes.question.innerHTML = xhr.responseText;
                    StackExchange.question.init({
                        votesCast: votes,
                        canViewVoteCounts: true,
                        questionId: post
                    });
                    nodes.previous.disabled = false;
                    nodes.next.disabled = false;

                    var isClosed = isQuestionClosed();
                    (document.querySelector('.js-show-link.comments-link')||{click:()=>{}}).click();

                    let item = queue[post];

                    nodes.title.href = 'http://stackoverflow.com/q/' + post;
                    nodes.title.innerHTML = [item.title, ['open','closed'][+isClosed], item.close_vote_count, item.delete_vote_count ].join(' - ');

                    var didVote = () => {
                        voted = true;
                        nodes.title.textContent += ' - Voted';
                        skipIfSkippingVoted();
                    };

                    var didNotVote = () => {
                        if(localStorage.SECUSTOMREVIEW_MagicTag1_justVoted === 'True') {
                            //We are here after voting and the question was closed. Move to the next question, if we are to do so automatically.
                            // Only do this once.
                            localStorage.SECUSTOMREVIEW_MagicTag1_justVoted = 'false';
                            skipIfAutoNext();
                        }
                        voted = false;
                        startObservingVotes();
                    };

                    if(document.getElementById('delete-post-' + item.question_id)){
                        //For delete, the title saying if the user has voted is not valid when this runs, so fetch it.
                        getDeleteTooltip(item.question_id,tooltip => {
                            if(tooltip.indexOf("You voted") > -1){
                                didVote();
                            } else {
                                didNotVote();
                            }
                        });
                    } else {
                        if(document.querySelector('a[title^="You voted to"]')) {
                            didVote();
                        } else {
                            didNotVote();
                        }
                        if(isClosed && deleteVotesMin === 0 && deleteVotesMax === 0){
                            //When not searching for delete votes, being closed is considered skipable.
                            skipIfSkippingVoted();
                        }
                    }
                    if(document.querySelector('div.question.deleted-answer')) {
                        //Question is deleted. Can't vote.
                        skipIfSkippingVoted();
                    }
                });
            }, false);
        };

        votedObserver = (mutations,observer) => {
            mutations.forEach(mutation => {
                let nodes = mutation.addedNodes;
                for(let index =0; index<nodes.length;index++) {
                    let node = nodes[index];
                    if( (node.nodeName === 'DIV' && node.textContent.indexOf('vote has been recorded') > -1) || //voting recorded
                        (node.nodeName === '#text' && node.textContent === 'undelete') // delete vote deleted the question
                    ){
                        //Forget that just voted, as it's handled here.
                        localStorage.SECUSTOMREVIEW_MagicTag1_justVoted   = 'false';
                        skipIfAutoNext();
                    }
                }
            });
        };

        //While this works, there is a more efficient way to accomplish this.
        //Supposedly, just having a MutationObserver tends to slow down the page (I did not notice).
        //See code in SE Close Vote Request Generator for an alternative, which is more complex, but
        //which detects the AJAX call for the vote.
        startObservingVotes = () => {
            if(voteObserver && typeof voteObserver.disconnect === 'function') {
                //Don't observe twice.
                voteObserver.disconnect();
            }
            voteObserver = new MutationObserver(votedObserver);
            voteObserver.observe(document.querySelector('div.post-menu'),{
                childList:true,
                subtree:true
            });
        };

        skipIfAvailable = (immediate) => {
            if(priorAction.style.display !== 'none'){
                //If the option to perform the action is unavailable, then the display style is 'none'
                //Normally delay 1000ms between displaying new questions. This is to prevent hitting the server
                //  with lots of rapid fire requests.
                // 2017-07-17 changed to 1000ms from 500ms, as was getting blocked by SE *every day*.
                let delay = immediate ? 0 : 1000;
                setTimeout(()=>{
                    window.scroll(0,0);
                    priorAction.click(); // This has to be in a function, it can't just be passed to setTimeout
                },delay);
            }
        };

        skipIfSkippingVoted = (immediate) => {
            if(skipVoted) {
                skipIfAvailable(immediate);
            }
        };

        skipIfAutoNext = (immediate) => {
            if(autoNext) {
                skipIfAvailable(immediate);
            }
        };

        updatestats = () => {
            if(queue.order.length && current > queue.order.length -1){
                current = queue.order.length -1;
            }
            nodes.previous.style.display  = ['none',''][+(current > 0)];
            nodes.next.style.display      = ['none',''][+(current < queue.order.length - 1)];
            nodes.indicator.style.display = ['none',''][+(queue.order.length > 1)];
            nodes.indicator.textContent   = (current + 1) + ' / ' + queue.order.length;
        };

        logqueue = () => {
            /*
            let items = Object.keys(queue).map(item => {
                if (item === 'order') {
                    return queue.order;
                }
                return ' - http://stackoverflow.com/q/' + item;
            });
            console.log(items.join('\n'));
            */
            console.log('queue:', queue);
            //console.log('queue.order:', queue.order);
        };

        markInvalidVoteCriteria = (event) => {
            let cvMin = +nodes.closeVotesMin.value;
            let cvMax = +nodes.closeVotesMax.value;
            let dvMin = +nodes.deleteVotesMin.value;
            let dvMax = +nodes.deleteVotesMax.value;
            nodes.closeVotesMin.classList.remove('MagicTagNumberInvalid');
            nodes.closeVotesMax.classList.remove('MagicTagNumberInvalid');
            nodes.deleteVotesMin.classList.remove('MagicTagNumberInvalid');
            nodes.deleteVotesMax.classList.remove('MagicTagNumberInvalid');
            if(cvMin > cvMax) {
                nodes.closeVotesMin.classList.add('MagicTagNumberInvalid');
                nodes.closeVotesMax.classList.add('MagicTagNumberInvalid');
            }
            if(dvMin > dvMax) {
                nodes.deleteVotesMin.classList.add('MagicTagNumberInvalid');
                nodes.deleteVotesMax.classList.add('MagicTagNumberInvalid');
            }
            if(cvMin > 0 && dvMin > 0) {
                nodes.closeVotesMin.classList.add('MagicTagNumberInvalid');
                nodes.deleteVotesMin.classList.add('MagicTagNumberInvalid');
            }
        };

        nodes.previous.addEventListener('click', event => {
            event.preventDefault();
            priorAction = nodes.previous;
            event.target.blur();
            event.target.disabled = true;
            display(--current);
        }, false);

        nodes.next.addEventListener('click', event => {
            event.preventDefault();
            priorAction = nodes.next;
            event.target.blur();
            event.target.disabled = true;
            display(++current);
        }, false);

        nodes.skipIfVotedLabel.addEventListener('click', event => {
            skipVoted = nodes.skipIfVoted.checked;
            localStorage.SECUSTOMREVIEW_MagicTag1_skipVoted   = skipVoted;
            if(skipVoted && voted) {
                skipIfSkippingVoted(true);
            }
        }, false);

        nodes.autoNextLabel.addEventListener('click', event => {
            autoNext = nodes.autoNext.checked;
            localStorage.SECUSTOMREVIEW_MagicTag1_autoNext   = autoNext;
        }, false);

        window.addEventListener('click', event => {
            //This lets us remember if we just voted when voting closes the question.
            let target = event.target;
            if(target.nodeName === "INPUT" && target.classList.contains('popup-submit') && target.value === 'Vote To Close') {
                //This assumes that once the user clicks on Vote To Close, then their vote is certainly recorded. This
                //  does not account for possible errors in SE communicating that vote.
                localStorage.SECUSTOMREVIEW_MagicTag1_justVoted   = 'True';
            }
        }, true);

        //Keep valid/invalid vote criteria updated.
        nodes.voteSpan.addEventListener('click', markInvalidVoteCriteria, true);
        nodes.voteSpan.addEventListener('mousedown', markInvalidVoteCriteria, true);
        nodes.voteSpan.addEventListener('mouseup', markInvalidVoteCriteria, true);
        nodes.voteSpan.addEventListener('mouseenter', markInvalidVoteCriteria, true);
        nodes.voteSpan.addEventListener('mouseleave', markInvalidVoteCriteria, true);
        nodes.voteSpan.addEventListener('keypress', markInvalidVoteCriteria, true);
        nodes.voteSpan.addEventListener('blur', markInvalidVoteCriteria, true);

        nodes.form.addEventListener('submit', event => {
            event.preventDefault();
            if(nodes.button.value === 'Stop') {
                stopFetching = true;
                return;
            }

            if(!nodes.tagged.value) return false;
            nodes.button.value = 'Stop';
            nodes.button.textContent = 'Stop';
            nodes.button.classList.add('MagicTagStopButton');

            reset();

            localStorage.SECUSTOMREVIEW_MagicTag1_tag            = tag            = nodes.tagged.value;
            localStorage.SECUSTOMREVIEW_MagicTag1_closeVotesMin  = closeVotesMin  = [0  ,+nodes.closeVotesMin.value] [+(typeof(+nodes.closeVotesMin.value)  === "number")];
            localStorage.SECUSTOMREVIEW_MagicTag1_closeVotesMax  = closeVotesMax  = [4  ,+nodes.closeVotesMax.value] [+(typeof(+nodes.closeVotesMax.value)  === "number")];
            localStorage.SECUSTOMREVIEW_MagicTag1_deleteVotesMin = deleteVotesMin = [0  ,+nodes.deleteVotesMin.value][+(typeof(+nodes.deleteVotesMin.value) === "number")];
            localStorage.SECUSTOMREVIEW_MagicTag1_deleteVotesMax = deleteVotesMax = [999,+nodes.deleteVotesMax.value][+(typeof(+nodes.deleteVotesMax.value) === "number")];
            localStorage.SECUSTOMREVIEW_MagicTag1_skipVoted      = nodes.skipIfVoted.checked;
            localStorage.SECUSTOMREVIEW_MagicTag1_autoNext       = nodes.autoNext.checked;

            retrieve(tag, items => {
                let foundAQuestion = false;
                for(let item of items) {
                    //Drop any questions which don't meet the close/delete vote criteria
                    if(item.close_vote_count < closeVotesMin) continue;
                    if(item.close_vote_count > closeVotesMax) continue;
                    if(item.delete_vote_count < deleteVotesMin) continue;
                    if(item.delete_vote_count > deleteVotesMax) continue;

                    queue[item.question_id] = item;
                    queue.order.push(item.question_id);
                    foundAQuestion = true;
                }

                localStorage.SECUSTOMREVIEW_MagicTag1_queue = JSON.stringify(queue);

                updatestats();

                if(!firstload && queue.order.length) {
                    localStorage.SECUSTOMREVIEW_MagicTag1_firstload = firstload = 1;
                    display(current);
                }
                return foundAQuestion;
            });
        }, false);

        if(queue.order.length) {
            let interval = setInterval(() => {
                if(StackExchange.question) {
                    clearInterval(interval);
                    display(current);
                }
            }, 100);
        }
    }
})();
