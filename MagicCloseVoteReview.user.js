// ==UserScript==
// @name         Review Close Votes - Magic™ Edition
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.0
// @description  Creates a fake queue which allows you to search by tag and close votes.
// @author       @TinyGiant
// @match        http://stackoverflow.com/review/custom*
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

var queue   = JSON.parse(["[]",localStorage.SECUSTOMREVIEW_queue][+!!localStorage.SECUSTOMREVIEW_queue]), 
    current = [0, +localStorage.SECUSTOMREVIEW_current][+!!localStorage.SECUSTOMREVIEW_current],
    total   = [0, +localStorage.SECUSTOMREVIEW_total][+!!localStorage.SECUSTOMREVIEW_total],
    tag     = ['', localStorage.SECUSTOMREVIEW_tag][+!!localStorage.SECUSTOMREVIEW_tag],
    pages   = ['', localStorage.SECUSTOMREVIEW_pages][+!!localStorage.SECUSTOMREVIEW_pages],
    minimum = ['',+localStorage.SECUSTOMREVIEW_minimum][+!!localStorage.SECUSTOMREVIEW_minimum];

var previousLength = queue.length, justloaded = true;

document.querySelector('title').textContent = 'Review Close Votes - Magic™ Edition';

var nodes = {};

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

nodes.pages = document.createElement('input');
nodes.pages.type = 'text';
nodes.pages.placeholder = 'pages';
nodes.pages.value = pages;
nodes.form.appendChild(nodes.pages);

nodes.tagged = document.createElement('input');
nodes.tagged.type = 'text';
nodes.tagged.placeholder = 'tag';
nodes.tagged.value = tag;
nodes.form.appendChild(nodes.tagged);

nodes.minimum = document.createElement('input');
nodes.minimum.type = 'text';
nodes.minimum.placeholder = 'minimum close votes';
nodes.minimum.value = minimum;
nodes.form.appendChild(nodes.minimum);

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
nodes.h1.appendChild(nodes.title);

nodes.question = document.createElement('div');
nodes.scope.appendChild(nodes.question);

var reset = function(){
    justloaded = true;
    localStorage.SECUSTOMREVIEW_queue = JSON.stringify(queue = []);
    localStorage.SECUSTOMREVIEW_current = current = 0;
    localStorage.SECUSTOMREVIEW_total = total = 0;
    localStorage.SECUSTOMREVIEW_pages = nodes.pages.value;
    localStorage.SECUSTOMREVIEW_tag = tag = nodes.tagged.value;
    localStorage.SECUSTOMREVIEW_minimum = minimum = (+nodes.minimum.value || 1);
};

var retrieve = function(){
    var count = 0;
    
    return function retrieve(pages, tagged, callback) {
        if(!pages) pages = 1;
        
        if(pages === count) {
            localStorage.SECUSTOMREVIEW_total = total = total + count;
            
            return false;
        }
        
        var xhr = new XMLHttpRequest();
        
        xhr.addEventListener("load", function(){
            if(this.status !== 200) {
                console.log(this.responseText, this.status, this.statusText);

                return false;
            }

            var response = JSON.parse(this.responseText);
            
            callback(response.items);
            
            delete response.items;
            
            console.log(response);

            window.setTimeout(retrieve.bind(null, pages, tagged, callback),response.backoff*1000);
        });

        var url = 'http://api.stackexchange.com/2.2/questions?';

        var page = total + ++count;
        
        var options = [
            'page=' + page,
            'pagesize=100',
            'order=asc',
            'sort=votes',
            'site=stackoverflow',
            'key=dwtLmAaEXumZlC5Nj0vDuw((',
            'filter=!*1SgQGDMkNp5Q5J5xfAEVlw9LQcyFwWIE8EnwCpEY'
        ];

        if(tagged) {
            options.unshift('tagged=' + tagged);
        }

        url += options.join('&');
        
        xhr.open("GET", url);
        
        xhr.send();
    };
};

var display = function(post) {
    if (!post) return false;
    
    previousLength = queue.length;
    
    localStorage.SECUSTOMREVIEW_current = current;
    
    var xhr = new XMLHttpRequest();
    
    xhr.addEventListener('load', function(){
        nodes.question.innerHTML = this.responseText;

        nodes.title.href = 'http://stackoverflow.com/q/' + post.question_id;
        nodes.title.innerHTML = post.title;
        
        StackExchange.question.init({
            votesCast: [],
            canViewVoteCounts: true,
            questionId: post.question_id
        });
        
        nodes.question.querySelector('.js-show-link.comments-link').click();
        
        nodes.previous.style.display  = ['none',''][+(current > 0)];
        nodes.next.style.display      = ['none',''][+(current < queue.length - 1)];
        nodes.indicator.style.display = ['none',''][+(queue.length > 1)];
        nodes.indicator.textContent   = (current + 1) + ' / ' + queue.length;

        if(this.status !== 200) {
            console.log(this.status, this.statusText);

            return false;
        }
    }, false);
    
    xhr.open('GET', '/posts/ajax-load-realtime/' + post.question_id);
    
    xhr.send();
};

nodes.previous.addEventListener('click', function(e){
    display(queue[--current]);
    return false;
}, false);

nodes.next.addEventListener('click', function(e){
    display(queue[++current]);
    return false;
}, false);

nodes.form.addEventListener('submit', function(e){
    e.preventDefault();
    
    localStorage.SECUSTOMREVIEW_pages = pages = +nodes.pages.value;
    
    if(tag !== nodes.tagged.value || minimum !== +nodes.minimum.value) reset();
    
    retrieve()(pages, tag, function(items){ 
        for(var i in items) {
            var item = items[i];

            if(item.closed_date) continue;

            if(item.close_vote_count < minimum) continue;

            queue.push(item);
        }
        
        localStorage.SECUSTOMREVIEW_queue = JSON.stringify(queue);
        
        nodes.previous.style.display  = ['none',''][+(current > 0)];
        nodes.next.style.display      = ['none',''][+(current < queue.length - 1)];
        nodes.indicator.style.display = ['none',''][+(queue.length > 1)];
        nodes.indicator.textContent   = (current + 1) + ' / ' + queue.length;
        
        if(queue.length === previousLength) return false;

        if(justloaded) {
            justloaded = false;
            display(queue[0]);
        }
    });
}, false);

if(queue.length) display(queue[current]);
