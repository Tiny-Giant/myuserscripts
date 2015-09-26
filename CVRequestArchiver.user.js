// ==UserScript==
// @name         CV Request Archiver
// @namespace    http://your.homepage/
// @version      1.0.0.1
// @description  Scans the chat transcript and checks all cv requests for status, then moves the closed ones.
// @author       @TinyGiant
// @match        http://chat.stackoverflow.com/rooms/*
// @grant        GM_xmlhttpRequest
// @run-at       context-menu
// ==/UserScript==

CVRequestArchiver();
function CVRequestArchiver() {
    
    var room = window.location.href;
    var test = /chat.stackoverflow.com.rooms.(\d+)/.exec(room);
    if(!test) return alert('We\'re not in a chat room...');
    room = test[1];
    
    $.ajax({
        data: 'ids=' + /\d+/.exec($('#active-user').attr('class'))[0] + '&roomId=' + room,
        type: 'POST',
        url: '/user/info',
        success: function(resp) {
            if(!resp.users[0].is_owner && !resp.users[0].is_moderator) return alert('You\'re not a room owner here.');
            
            var count = prompt('How many messages should I scan?');
            var test = /\d+/.exec(count);
            if(!test) return alert('The string you entered doesn\'t contain a number.');
            count = test[0];
            
            $.ajax({
                type: 'POST',
                url: '/chats/' + room + '/events',
                data: 'since=0&mode=Messages&msgCount=' + count + '&fkey=' + $('#fkey').val(),
                success: function(resp){
                    var requests = [];
                    for(var i in resp.events) {
                        var test = /^.a href="(?:https?:)?..stackoverflow.com.questions.tagged.cv-pl(?:ease|s|z).+http:..stackoverflow.com.(?:q[^\/]*|posts)\/(\d+)/.exec(resp.events[i].content);
                        if(test) requests.push({ msg: resp.events[i].message_id, post: +test[1], closed: false });
                    }
                    
                    if(!requests.length) return alert('No requests found.');
                    var num = requests.length - 1;
                    
                    var postchk = setInterval(function(){
                        if(num === 0) clearInterval(postchk);
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: 'http://stackoverflow.com/flags/questions/' + requests[num].post + '/close/popup',
                            onload: function(resp){
                                requests[num].closed = /This question is now closed/.test(resp.response);
                                console.log(requests[num]);
                                
                                if(num-- !== 0) return;
                                    
                                var ids = [];
                                for(var i in requests) if(requests[i].closed) ids.push(
                                    requests[i].msg);
                                if(!ids.length) return alert('No closed requests.');

                                var target = prompt('Where should I send ' + (ids.length === 1 ? 'this request' : 'these ' + ids.length + ' requests') + '?');
                                var test = /\d+/.exec(target);
                                if(!test) return alert('Invalid room supplied, failing.');
                                target = test[0];

                                $.ajax({
                                    data: 'ids=' + ids.join('%2C') + '&to=' + target + '&fkey=' + $('#fkey').val(),
                                    type: 'POST',
                                    url: '/admin/movePosts/' + room,
                                    success: function() {
                                        alert('I\'ve successfully moved ' + ids.length + ' question' + (ids.length === 1 ? '' : 's.'));
                                    }
                                });
                            }
                        });
                    }, 4000);
                }
            });
        }
    })
}
