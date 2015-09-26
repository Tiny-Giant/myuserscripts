// ==UserScript==
// @name         CV Request Archiver
// @namespace    http://your.homepage/
// @version      1.0.0.0
// @description  Scans the chat transcript and checks all cv requests for status, then moves the closed ones.
// @author       @TinyGiant
// @match        http://chat.stackoverflow.com/rooms/41570/*
// @grant        GM_xmlhttpRequest
// @run-at       context-menu
// ==/UserScript==

(function(){
    "use strict";
    
    $.ajax({
        type: 'POST',
        url: '/chats/41570/events',
        data: 'since=0&mode=Messages&msgCount=100&fkey=' + $('#fkey').val(),
        success: function(resp){
            var requests = [];
            for(var i in resp.events) {
                var test = /^.a href="(?:https?:)?..stackoverflow.com.questions.tagged.cv-pl(?:ease|s|z).+http:..stackoverflow.com.(?:q[^\/]*|posts)\/(\d+)/.exec(resp.events[i].content);
                if(test) {
                    requests.push({
                        msg: resp.events[i].message_id,
                        post: +test[1],
                        closed: false
                    });
                }
            }
            var num = requests.length - 1;
            if(num >= 0) {
                var postchk = setInterval(function(){
                    if(num === 0) clearInterval(postchk);
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: 'http://stackoverflow.com/flags/questions/' + requests[num].post + '/close/popup',
                        onload: function(resp){
                            requests[num].closed = /This question is now closed/.test(resp.response);
                            console.log(requests[num]);
                            if(num-- === 0) {
                                var ids = [];
                                for(var i in requests) if(requests[i].closed) ids.push(requests[i].msg);
                                $.ajax({
                                    data: 'ids=' + ids.join('%2C') + '&to=90230&fkey=' + $('#fkey').val(),
                                    type: 'POST',
                                    url: '/admin/movePosts/41570'
                                });
                            }
                        }
                    });
                }, 4000);
            }
        }
    });
})();
