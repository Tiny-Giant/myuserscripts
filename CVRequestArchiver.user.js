// ==UserScript==
// @name         CV Request Archiver
// @namespace    https://github.com/Tiny-Giant/
// @version      1.0.0.8
// @description  Scans the chat transcript and checks all cv requests for status, then moves the closed ones.
// @author       @TinyGiant @rene
// @match        *://chat.stackoverflow.com/rooms/*
// @grant        GM_xmlhttpRequest
// @run-at       context-menu
// ==/UserScript==

CVRequestArchiver();
function CVRequestArchiver() {
    var me, fkey, room, count, target, num, post, postchk, rnum, status, minId, maxloads = 200, pagesLoaded = 0, lid;
    var requests = [];
    var ids = [];
    
    me = /\d+/.exec($('#active-user').attr('class'));
    if(!me) return alert('I couldn\'t find your user id number.');
    me = me[0];

    fkey = $('#fkey');
    if(!fkey.length) return alert('I couldn\'t find your fkey.');
    fkey = fkey.val();

    room = /chat.stackoverflow.com.rooms.(\d+)/.exec(window.location.href);
    if(!room) return alert('But... we aren\'t in a chat room...');
    room = room[1];

    count = /\d+/.exec(prompt('How many messages should I scan?'));
    if(!count) return alert('Your response didn\'t contain a number, I\'m going back to sleep.');
    count = count[0];

    target = 90230;
    
    init();
    
    function init() {
        status = $('#chat-buttons div');
        if (status.length === 0) {
           status = $('<div></div>');
           $('#chat-buttons').append(status);
        }
        status.text('loading...');
        $.ajax({
            type: 'POST',
            url: '/user/info?ids=' + me + '&roomId=' + room,
            success: getInitialEvents
        });
    }
    function getInitialEvents(resp) {
        if(!resp.users[0].is_owner && !resp.users[0].is_moderator) return alert('But... you\'re not a room owner here.');
        status.text('Initial events');
        getEvents(count, handleEvents);
    }
    var getEvents = (function() {
        var events = [];
        status.text('Fetching events');
        return function get(count, callback, before) {
            if (count <= 0) return callback(events), false;
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
                    get(count - 500, callback, response.events[0].message_id);
                },
                error: function() {
                    brk = alert('Scanning messages failed. I don\'t know what would cause this yet.'), true;
                }
            });
        };
    })();
    function handleEvents(events){
        for(var i in events) for(var j in events[i]) checkEvent(events[i][j]);
        checkRequests();
    }
    function checkEvent(event) {
        post = (/.a href="(?:https?:)?..stackoverflow.com.questions.tagged.cv-pl(?:ease|s|z).+https?:..stackoverflow.com.(?:q[^\/]*|posts)\/(\d+)/.exec(event.content)||[false,false])[1];
        if (!post) post = (/https?:..stackoverflow.com.(?:q[^\/]*|posts)\/(\d+).+a href="(?:https?:)?..stackoverflow.com.questions.tagged.cv-pl(?:ease|s|z)/.exec(event.content)||[false,false])[1];
        if (!post) return;
        requests.push({ msg: event.message_id, post: post, closed: false });
    }
    function checkRequests() {
        if (!requests.length) return alert('I couldn\'t find any requests.');
        num = requests.length - 1;
        postchk = setInterval(getPopup, 4000);
    }
    function getPopup(){
        if(num === 0) clearInterval(postchk);
        status.text('Checking requests: ' + num);
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'http://stackoverflow.com/flags/questions/' + requests[num].post + '/close/popup',
            onload: checkClosed
        });
    }
    function checkClosed(resp) {
        var closed = /This question is now closed/.test(resp.response);
        if(!closed) GM_xmlhttpRequest({
            method: 'GET',
            url: 'http://stackoverflow.com/q/' + requests[num].post,
            onload: function(resp) {
                requests[num].closed = /Page Not Found/.test(resp.response);
                console.log(requests[num]);
                if(num-- === 0) movePosts();
            }
        });
        else {
            requests[num].closed = closed;
            console.log(requests[num]);
            if(num-- === 0) movePosts();
        }
    }
    function movePosts() {
        clearInterval(postchk);
        formatIds();
        if(!confirm('I found ' + rnum + ' closed request' + (rnum === 1 ? '' : 's') + ', should I move them?')) return alert('Fine then, I\'m going back to sleep.');
        console.log(ids);
        console.log(target);
        movePostsBatch();
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
    function movePostsBatch() {
        var rest = shiftSlice(ids, 100),
            bids = rest.curr;
        ids = rest.left;
        if(bids.length > 0) {
            rnum = bids.length;
            status.text('moving ' + bids.length + ', remaining ' + ids.length);
            $.ajax({
                type: 'POST',
                data: 'ids=' + bids.join('%2C') + '&to=' + target + '&fkey=' + fkey,
                url: '/admin/movePosts/' + room,
                success: postsMoved
            }); 
        } else {
            status.text('done');
        }
    }
    function formatIds() {
        for(var i in requests) if(requests[i].closed) ids.push(requests[i].msg);
        if(!ids.length) return alert('None of the requests I found were closed.');
        rnum = ids.length;
    }
    function postsMoved() {
        status.text('I\'ve successfully moved ' + rnum + ' request' + (rnum === 1 ? '' : 's'));
        setTimeout(movePostsBatch, 5000);
    }
}
