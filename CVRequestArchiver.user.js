// ==UserScript==
// @name         CV Request Archiver
// @namespace    https://github.com/Tiny-Giant/
// @version      2.0.0.0
// @description  Scans the chat transcript and checks all cv requests for status, then moves the closed ones.
// @author       @TinyGiant @rene
// @include      /https?:\/\/chat(\.meta)?\.stack(overflow|exchange).com\/rooms\/.*/
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

var me = (/\d+/.exec($('#active-user').attr('class'))||[false])[0];
if(!me) return false;

var fkey = $('#fkey');
if(!fkey.length) return false;
fkey = fkey.val();

var room = (/chat.stackoverflow.com.rooms.(\d+)/.exec(window.location.href)||[false,false])[1];
if(!room) return false;

$.ajax({
    type: 'POST',
    url: '/user/info?ids=' + me + '&roomId=' + room,
    success: CVRequestArchiver
});

function CVRequestArchiver(info){
    if(!info.users[0].is_owner && !info.users[0].is_moderator) {
        return false;
    }
    
    var count = 0, total = 0, num = 0, rnum = 0, rlen = 0;
    var requests = [];
    var closed = [];
    var events = [];
    
    var target = 90230;
    var nodes = {};

    nodes.scope = document.querySelector('#chat-buttons');

    nodes.startbtn = document.createElement('button');
    nodes.startbtn.className = 'button archiver-startbtn';
    nodes.startbtn.textContent = 'archiver';
    nodes.scope.appendChild(nodes.startbtn);

    nodes.scope.appendChild(document.createElement('br'));

    nodes.form = document.createElement('form');
    nodes.form.className = 'archiver-form';
    nodes.scope.appendChild(nodes.form);

    nodes.count = document.createElement('input');
    nodes.count.className = 'button archiver-count';
    nodes.count.placeholder = '#';
    nodes.count.type = 'text';
    nodes.count.style.display = 'none';
    nodes.form.appendChild(nodes.count);

    nodes.gobtn = document.createElement('button');
    nodes.gobtn.className = 'button archiver-gobtn';
    nodes.gobtn.textContent = 'scan';
    nodes.gobtn.style.display = 'none';
    nodes.form.appendChild(nodes.gobtn);

    nodes.scope.appendChild(document.createTextNode(' '));

    nodes.cancel = document.createElement('button');
    nodes.cancel.className = 'button archiver-cancel';
    nodes.cancel.textContent = 'cancel';
    nodes.cancel.style.display = 'none';
    nodes.scope.appendChild(nodes.cancel);

    nodes.scope.appendChild(document.createElement('br'));

    nodes.indicator = document.createElement('input');
    nodes.indicator.className = 'button archiver-indicator';
    nodes.indicator.type = 'text';
    nodes.indicator.readonly = true;
    nodes.indicator.style.display = 'none';
    nodes.scope.appendChild(nodes.indicator);

    nodes.scope.appendChild(document.createTextNode(' '));

    nodes.movebtn = document.createElement('button');
    nodes.movebtn.className = 'button archiver-movebtn';
    nodes.movebtn.textContent = 'move';
    nodes.movebtn.style.display = 'none';
    nodes.scope.appendChild(nodes.movebtn);

    nodes.progresswrp = document.createElement('div');
    nodes.progresswrp.className = 'archive-progresswrp';
    nodes.progresswrp.style.display = 'none';
    nodes.scope.appendChild(nodes.progresswrp);

    nodes.progress = document.createElement('div');
    nodes.progress.className = 'archive-progress';
    nodes.progresswrp.appendChild(nodes.progress);

    nodes.style = document.createElement('style');
    nodes.style.type = 'text/css';
    nodes.style.textContent = [
        '#chat-buttons {',
        '    cursor: default;',
        '}',
        '.button {',
        '    margin: 1px !important;',
        '}',
        'button.button:disabled {',
        '    opacity: 0.8;',
        '}',
        'button.button:disabled:hover {',
        '   background: #ff7b18 !important;',
        '}',
        '.button:disabled {',
        '    cursor: default !important;',
        '}',
        '.archiver-count {',
        '    width: 78px;',
        '    border: 0px !important;',
        '    box-sizing: border-box;',
        '    margin-right: 0px !important;',
        '    border-top-right-radius: 0px;',
        '    border-bottom-right-radius: 0px;',
        '}',
        '.archiver-gobtn {',
        '    margin-left: 0px !important;',
        '    border-top-left-radius: 0px;',
        '    border-bottom-left-radius: 0px;',
        '}',
        '.archiver-count,',
        '.archiver-count:hover,',
        '.archiver-count:focus {',
        '    background: #eee;',
        '    outline: none;',
        '    color: #111;',
        '}',
        '.archiver-count:hover:not(:disabled),',
        '.archiver-count:focus:not(:disabled),',
        '.archiver-indicator:not(:disabled),',
        '.archiver-indicator:hover:not(:disabled),',
        '.archiver-indicator:focus:not(:disabled) {',
        '    color: #000;',
        '    outline: none;',
        '    background: #fff;',
        '    cursor: default;',
        '}',
        '.archiver-indicator {',
        '    width: 162px;',
        '}',
        '.archiver-form {',
        '    display: inline-block;',
        '}',
        '.archive-progresswrp {',
        '    margin-top: 2px;',
        '    width: 185px;',
        '    background: #eee;',
        '    height: 5px;',
        '}',
        '.archive-progress {',
        '    width: 0%;',
        '    background: #ff7b18;',
        '    height: 100%;',
        '    transition: width 1s linear;',
        '}'
    ].join('\n');
    nodes.scope.appendChild(nodes.style);

    var scanning = false;
    var stop = false;

    nodes.startbtn.addEventListener('click', function(){
        nodes.startbtn.disabled = true;
        nodes.count.style.display = '';
        nodes.gobtn.style.display = '';
        nodes.cancel.style.display = '';
        nodes.count.focus();
    }, false);

    nodes.cancel.addEventListener('click', reset, false);

    nodes.form.addEventListener('submit', function(e){
        e.preventDefault();
        total = count = +nodes.count.value;
        nodes.count.disabled = true;
        nodes.gobtn.disabled = true;
        nodes.indicator.style.display = '';
        nodes.indicator.value = 'getting events... (0 / ' + count + ')';
        nodes.progresswrp.style.display = '';
        getEvents(count);
    }, false);

    nodes.movebtn.addEventListener('click', movePosts, false);

    function reset() {
        rlen = 0;
        rnum = 0;
        total = 0;
        count = 0;
        num = 0;
        requests = [];
        closed = [];
        events = [];
        nodes.count.style.display = 'none';
        nodes.count.value = '';
        nodes.count.disabled = false;
        nodes.gobtn.style.display = 'none';
        nodes.gobtn.disabled = false;
        nodes.cancel.style.display = 'none';
        nodes.indicator.style.display = 'none';
        nodes.indicator.textContent = '';
        nodes.movebtn.style.display = 'none';
        nodes.startbtn.disabled = false;
        nodes.progresswrp.style.display = 'none';
        nodes.progress.style.width = '';
    }

    function getEvents(count, before) {
        nodes.indicator.value = 'getting events... (' + (total - count) + ' / ' + total + ')';
        nodes.progress.style.width = Math.ceil(((total - count) * 100) / total) + '%';
        if (count <= 0) {
            handleEvents(events);
            return false;
        }
        var data = {
            fkey: fkey,
            msgCount: count > 500 ? 500 : count,
            mode: 'Messages',
        };
        if (before) data.before = before;
        $.ajax({
            type: 'POST',
            url: '/chats/' + room + '/events',
            data: data,
            success: function(response) {
                events.push(response.events);

                if(!response.events[0]) {
                    console.log(response);
                    handleEvents();
                    return false;
                }

                getEvents(count - 500, response.events[0].message_id);
            }
        });
    };

    function handleEvents(){
        nodes.progress.style.transition = 'unset';
        nodes.progress.style.width = '';
        nodes.progress.style.transition = '';
        for(var i in events) for(var j in events[i]) checkEvent(events[i][j], i, events.length);
        nodes.progress.style.transition = 'unset';
        nodes.progress.style.width = '';
        nodes.progress.style.transition = '';

        if(!requests.length) {
            nodes.indicator.value = 'no requests found'
            return false;
        }

        nodes.indicator.value = 'chunking request array...';

        splitRequests();

        checkRequests();
    }

    function checkEvent(event, current, total) {
        nodes.indicator.value = 'checking events... (' + current + ' / ' + total + ')';
        nodes.progress.style.width = Math.ceil((current * 100) / total) + '%';
        var post = (/.a href="(?:https?:)?..stackoverflow.com.questions.tagged.cv-pl(?:ease|s|z).+https?:..stackoverflow.com.(?:q[^\/]*|posts)\/(\d+)/.exec(event.content)||[false,false])[1];
        if (!post) post = (/https?:..stackoverflow.com.(?:q[^\/]*|posts)\/(\d+).+a href="(?:https?:)?..stackoverflow.com.questions.tagged.cv-pl(?:ease|s|z)/.exec(event.content)||[false,false])[1];
        if (!post) return;
        requests.push({ msg: event.message_id, post: post });
    }

    function splitRequests() {
        var tmp = [];
        var num = Math.ceil(requests.length / 100);
        for(var i = 0; i < num; ++i) {
            tmp.push([]);
        }
        var ind = 0;
        for(var j in requests) {
            if(j > 0 && !(j % 100)) ++ind;
            tmp[ind].push(requests[j]);
        }
        rlen = requests.length;
        requests = tmp;
    }

    function checkRequests() {
        var currentreq = requests.pop();

        var left = [rlen,rlen - (requests.length * 100)][+(rlen > 100)];

        nodes.indicator.value = 'checking requests... (' + left + ' / ' + rlen + ')';
        nodes.progress.style.width = Math.ceil((left * 100) / rlen) + '%';

        var xhr = new XMLHttpRequest();

        xhr.addEventListener("load", function(){
            if(this.status !== 200) {
                console.log(this);
                checkDone();
                return false;
            }

            var response = JSON.parse(this.response);
            var items = response.items;

            for(var i in items) {
                if(!items[i].closed_date) {
                    for(var j in currentreq) {
                        if(currentreq[j].post == items[i].question_id) delete currentreq[j];
                    }
                }
            }

            for(var i in currentreq) closed.push(currentreq[i]);

            if(!requests.length) {
                checkDone();
                return false;
            }

            setTimeout(checkRequests, response.backoff * 1000);
        });

        var url = 'http://api.stackexchange.com/2.2/questions/' + formatPosts(currentreq) + '?' + [
            'pagesize=100',
            'site=stackoverflow',
            'key=qhq7Mdy8)4lSXLCjrzQFaQ((',
            'filter=!-MOiNm40DvA6mK_CVSV2rixF80rE7Pnkz'
        ].join('&');

        xhr.open("GET", url);

        xhr.send();
    }

    function checkDone() {
        if(!closed.length) {
            nodes.indicator.value = 'no closed requests found';
            return false;
        }

        nodes.indicator.value = closed.length + ' closed request' + ['','s'][+(closed.length > 1)] + ' found';
        nodes.movebtn.style.display = '';
        nodes.progresswrp.style.display = 'none';
        nodes.progress.style.transition = 'unset';
        nodes.progress.style.width = '';
        nodes.progress.style.transition = '';
    }

    function formatPosts(arr) {
        var ids = [];
        for(var i in arr) ids.push(arr[i].post);
        return ids.join(';');
    }

    function formatMsgs(arr) {
        var ids = [];
        for(var i in arr) ids.push(arr[i].msg);
        rnum = ids.length;
        return ids;
    }

    function shiftSlice(arr, l) {
        var ret = [],
            i;
        for(; l > 0; l--) {
            i = arr.shift();
            if (i !== undefined) {
                ret.push(i);
            } else {
                break;
            }
        }
        return { left: arr, curr: ret};
    }

    function movePosts() {
        var ids = formatMsgs(closed);

        if(rnum === 0) {
            nodes.indicator.value = 'no closed requests found';
            return false;
        }

        var rest = shiftSlice(ids, 100),
            bids = rest.curr;
        ids = rest.left;
        if(bids.length > 0) {
            rnum = bids.length;
            nodes.indicator.value = 'moving ' + bids.length + ' / ' + ids.length;
            nodes.progress.style.width = Math.ceil((bids.length * ids.length) / 100) + '%';
            $.ajax({
                type: 'POST',
                data: 'ids=' + bids.join('%2C') + '&to=' + target + '&fkey=' + fkey,
                url: '/admin/movePosts/' + room,
                success: setTimeout.bind(null, movePosts, 5000)
            }); 
        } else {
            nodes.progresswrp.style.display = 'none';
            nodes.progress.style.transition = 'unset';
            nodes.progress.style.width = '';
            nodes.progress.style.transition = '';
            nodes.indicator.value = 'done';
            nodes.movebtn.display = 'none';
        }
    }
}
