// ==UserScript==
// @name         CV Request Archiver
// @namespace    https://github.com/Tiny-Giant/
// @version      1.0.0.4
// @description  Scans the chat transcript and checks all cv requests for status, then moves the closed ones.
// @author       @TinyGiant
// @match        http://chat.stackoverflow.com/rooms/*
// @grant        GM_xmlhttpRequest
// @run-at       context-menu
// ==/UserScript==

CVRequestArchiver();
function CVRequestArchiver() {
    var me, fkey, room, count, target, num, post, postchk, rnum;
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

    target = /\d+/.exec(prompt('Where should I send any requests I find?'));
    if(!target) return alert('Well that\'s not a valid room, I\'m going back to sleep.');
    target = target[0];
    
    init();
    
    function init() {
        $.ajax({
            type: 'POST',
            url: '/user/info?ids=' + me + '&roomId=' + room,
            success: getEvents
        });
    }
    function getEvents(resp) {
        if(!resp.users[0].is_owner && !resp.users[0].is_moderator) return alert('But... you\'re not a room owner here.');
        $.ajax({
            type: 'POST',
            url: '/chats/' + room + '/events',
            data: 'since=0&mode=Messages&msgCount=' + count + '&fkey=' + fkey,
            success: handleEvents
        });
    }
    function handleEvents(resp){
        for(var i in resp.events) checkEvent(resp.events[i]);
        checkRequests();
    }
    function checkEvent(event) {
        post = /^.a href="(?:https?:)?..stackoverflow.com.questions.tagged.cv-pl(?:ease|s|z).+http:..stackoverflow.com.(?:q[^\/]*|posts)\/(\d+)/.exec(event.content);
        if(!post) return;
        requests.push({ msg: event.message_id, post: post[1], closed: false });
    }
    function checkRequests() {
        if(!requests.length) return alert('I couldn\'t find any requests.');
        num = requests.length - 1;
        postchk = setInterval(getPopup, 4000);
    }
    function getPopup(){
        if(num === 0) clearInterval(postchk);
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'http://stackoverflow.com/flags/questions/' + requests[num].post + '/close/popup',
            onload: checkClosed
        });
    }
    function checkClosed(resp) {
        requests[num].closed = /This question is now closed/.test(resp.response);
        console.log(requests[num]);
        if(num-- === 0) movePosts();
    }
    function movePosts() {
        formatIds();
        if(!confirm('I found ' + rnum + ' closed request' + (rnum === 1 ? '' : 's') + ', should I move them?')) return alert('Fine then, I\'m going back to sleep.');
        $.ajax({
            type: 'POST',
            data: 'ids=' + ids + '&to=' + target + '&fkey=' + fkey,
            url: '/admin/movePosts/' + room,
            success: postsMoved
        });
    }
    function formatIds() {
        for(var i in requests) if(requests[i].closed) ids.push(requests[i].msg);
        if(!ids.length) return alert('None of the requests I found were closed.');
        rnum = ids.length;
        ids = ids.join('%2C');
    }
    function postsMoved() {
        alert('I\'ve successfully moved ' + rnum + ' request' + (rnum === 1 ? '' : 's'));
    }
}
