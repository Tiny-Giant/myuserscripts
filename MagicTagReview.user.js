// ==UserScript==
// @name         Magic™ Tag Review
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.2
// @description  Creates a fake queue which allows you to search a tag by a minimum number close votes or delete votes.
// @author       @TinyGiant
// @match        http://stackoverflow.com/review/custom*
// @match        http://stackoverflow.com/review
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/* jshint -W097 */
/* jshint esversion: 6 */
'use strict';

StackExchange.using("inlineEditing", function () {
    StackExchange.inlineEditing.init();
});

if(!/custom/.test(window.location.href)) {
    let nodes = {};

    nodes.before = document.querySelector('.dashboard-item');

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
    nodes.titleLink.href = '/review/custom';
    nodes.titleLink.textContent = 'Magic™ Tag Review';
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
    let queue       = JSON.parse(["{}",localStorage.SECUSTOMREVIEW_queue]      [+!!localStorage.SECUSTOMREVIEW_queue]), 
        current     =            [0,  +localStorage.SECUSTOMREVIEW_current]    [+!!localStorage.SECUSTOMREVIEW_current],
        page        =            [0,  +localStorage.SECUSTOMREVIEW_page]       [+!!localStorage.SECUSTOMREVIEW_page],
        firstload   =            [0,  +localStorage.SECUSTOMREVIEW_firstload]  [+!!localStorage.SECUSTOMREVIEW_firstload],
        tag         =            ['',  localStorage.SECUSTOMREVIEW_tag]        [+!!localStorage.SECUSTOMREVIEW_tag],
        closevotes  =            ['', +localStorage.SECUSTOMREVIEW_closevotes] [+!!localStorage.SECUSTOMREVIEW_closevotes],
        deletevotes =            ['', +localStorage.SECUSTOMREVIEW_deletevotes][+!!localStorage.SECUSTOMREVIEW_deletevotes],
        reset, retrieve, display, updatestats, logqueue;

    document.querySelector('title').textContent = 'Review Close Votes - Magic™ Edition';

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
        '}',
        '.review-bar input {',
        '    margin-left: 10px;',
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
        '.question-status {',
        '   width: 660px',
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
    nodes.form.style.display = 'inline-block';
    nodes.bar.appendChild(nodes.form);

    nodes.tagged = document.createElement('input');
    nodes.tagged.type = 'text';
    nodes.tagged.placeholder = 'tag';
    nodes.tagged.value = tag;
    nodes.form.appendChild(nodes.tagged);

    nodes.closevotes = document.createElement('input');
    nodes.closevotes.type = 'text';
    nodes.closevotes.placeholder = 'minimum close votes';
    nodes.closevotes.value = closevotes;
    nodes.form.appendChild(nodes.closevotes);

    nodes.deletevotes = document.createElement('input');
    nodes.deletevotes.type = 'text';
    nodes.deletevotes.placeholder = 'minimum delete votes';
    nodes.deletevotes.value = deletevotes;
    nodes.form.appendChild(nodes.deletevotes);

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

    nodes.indicator = document.createElement('span');
    nodes.indicator.style.display = 'none';
    nodes.indicator.className = 'review-indicator';
    nodes.indicator.textContent = '0';
    nodes.bar.appendChild(nodes.indicator);

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
        queue = JSON.parse(localStorage.SECUSTOMREVIEW_queue = "{}");
        localStorage.SECUSTOMREVIEW_current     = current     = 0;
        localStorage.SECUSTOMREVIEW_page        = page        = 0;
        localStorage.SECUSTOMREVIEW_firstload   = firstload   = 0;
        localStorage.SECUSTOMREVIEW_tag         = tag         = '';
        localStorage.SECUSTOMREVIEW_closevotes  = closevotes  = '';
        localStorage.SECUSTOMREVIEW_deletevotes = deletevotes = '';
        nodes.question.innerHTML = '';
        nodes.title.href = '';
        nodes.title.innerHTML = '';
        nodes.previous.style.display  = 'none';
        nodes.next.style.display      = 'none';
        nodes.indicator.style.display = 'none';
        nodes.indicator.textContent   = '';
    };

    retrieve = (tagged, callback) => {
        let xhr = new XMLHttpRequest();

        xhr.addEventListener("load", event => {
            if(xhr.status !== 200) {
                console.dir(xhr.responseText, xhr.status, xhr.statusText);

                return false;
            }

            let response = JSON.parse(xhr.responseText);

            console.dir(response);

            callback(response.items);

            if(!response.has_more) {
                logqueue();

                return false;
            }

            window.setTimeout(retrieve.bind(null, tagged, callback), response.backoff * 1000);
        });

        let url = 'http://api.stackexchange.com/2.2/questions?';

        localStorage.SECUSTOMREVIEW_page = ++page;

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

        xhr.open("GET", url);

        xhr.send();
    };

    display = current => {
        localStorage.SECUSTOMREVIEW_current = current;

        let post = Object.keys(queue)[current];

        if(!post) return false;

        let xhr = new XMLHttpRequest();

        xhr.addEventListener('load', event => {
            updatestats();
            nodes.question.innerHTML = xhr.responseText;

            let item = queue[post];

            nodes.title.href = 'http://stackoverflow.com/q/' + post;
            nodes.title.innerHTML = [item.title, ['open','closed'][+!!item.closed_date], item.close_vote_count, item.delete_vote_count ].join(' - ');
            
            StackExchange.question.init({
                votesCast: [],
                canViewVoteCounts: true,
                questionId: post
            });

            nodes.question.querySelector('.js-show-link.comments-link').click();

            if(document.querySelector('a[title^="You voted to close"]')) {
                nodes.title.textContent += ' - Voted';
            }

            if(xhr.status !== 200) {
                console.dir(xhr.status, xhr.statusText);

                return false;
            }
        }, false);

        xhr.open('GET', '/posts/ajax-load-realtime/' + post);

        xhr.send();
    };

    updatestats = () => {
        console.log('update stats');
        nodes.previous.style.display  = ['none',''][+(current > 0)];
        nodes.next.style.display      = ['none',''][+(current < Object.keys(queue).length - 1)];
        nodes.indicator.style.display = ['none',''][+(Object.keys(queue).length > 1)];
        nodes.indicator.textContent   = (current + 1) + ' / ' + Object.keys(queue).length;
    };

    logqueue = () => {
        let items = Object.keys(queue).map(item => {
            return ' - http://stackoverflow.com/q/' + item;
        });
        console.log(items.join('\n'));
    };

    nodes.previous.addEventListener('click', event => {
        event.preventDefault();

        display(--current);
    }, false);

    nodes.next.addEventListener('click', event => {
        event.preventDefault();

        display(++current);
    }, false);

    nodes.form.addEventListener('submit', event => {
        event.preventDefault();

        if(!nodes.tagged.value) return false; 

        reset();

        localStorage.SECUSTOMREVIEW_tag         = tag         = nodes.tagged.value;
        localStorage.SECUSTOMREVIEW_closevotes  = closevotes  = [0,+nodes.closevotes.value] [+(typeof(+nodes.closevotes.value)  === "number")];
        localStorage.SECUSTOMREVIEW_deletevotes = deletevotes = [0,+nodes.deletevotes.value][+(typeof(+nodes.deletevotes.value) === "number")];

        retrieve(tag, items => { 
            for(let item of items) {
                if(item.close_vote_count < closevotes) continue;
                if(item.delete_vote_count < deletevotes) continue;

                queue[item.question_id] = item;
            }

            localStorage.SECUSTOMREVIEW_queue = JSON.stringify(queue);

            updatestats();

            if(!firstload && Object.keys(queue).length) {
                localStorage.SECUSTOMREVIEW_firstload = firstload = 1;
                display(current);
            }
        });
    }, false);

    if(Object.keys(queue).length) {
        let interval = setInterval(() => {
            if(StackExchange.question) {
                clearInterval(interval);
                display(current);
            }
        }, 100);
    }
}
