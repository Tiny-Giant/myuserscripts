// ==UserScript==
// @name         Review Audit Finder
// @namespace    https://github.com/Tiny-Giant/
// @version      1.0.0.0
// @description  Finds real post scores in the review queues and puts it under the assumed score
// @author       @TinyGiant
// @include      *://*.stackexchange.com/review/*
// @include      *://stackoverflow.com/review/*
// @include      *://meta.stackoverflow.com/review/*
// @include      *://serverfault.com/review/*
// @include      *://meta.serverfault.com/review/*
// @include      *://superuser.com/review/*
// @include      *://meta.superuser.com/review/*
// @include      *://askubuntu.com/review/*
// @include      *://meta.askubuntu.com/review/*
// @include      *://stackapps.com/review/*
// @grant        none
// ==/UserScript==

(function(){
    setTimeout(function(){
        var $score = $('.vote');
        var postId = $('.post-id').text();
        $.ajax({
            type: 'GET',
            url: '/posts/{postId}/vote-counts'.formatUnicorn({ postId: postId }),
            dataType: "json",
            success: function (json) {
                StackExchange.helpers.removeMessages();

                var html =
                    '<div style="color:green">' + json.up + '</div>' +
                    '<div class="vote-count-separator"></div>' +
                    '<div style="color:maroon">' + json.down + '</div>';

                $score
                .html($score.html() + html)
                .unbind('click')
                .data('bound', false)
                .css('cursor', 'default')
                .attr('title', (function(n){return n.upCount==1&&n.downCount==1?n.upCount+" up / "+n.downCount+" down":n.upCount==1?n.upCount+" up / "+n.downCount+" down":(n.downCount==1,n.upCount+" up / "+n.downCount+" down")})({upCount:Math.abs(+json.up),downCount:Math.abs(+json.down)}));
            }
        });
    }, 1000);
})();
