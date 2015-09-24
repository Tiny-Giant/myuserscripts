// ==UserScript==
// @name         Review Audit Finder
// @namespace    https://github.com/Tiny-Giant/
// @version      1.0.0.1
// @description  Finds real post scores in the review queues and puts it under the assumed score, also signals if it is an audit.
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

$('#hmenus').before($('<h2 id="isaudit"></h2>').css({'margin':'0','padding':'0','line-height':'75px'}));
$(document).ajaxComplete(function() { 
    if(/review.next\-task|review.task\-reviewed/.test(arguments[2].url)) {
        var postData = JSON.parse(arguments[1].responseText);
        if(!postData.postTypeId) return;
        $('#isaudit').text('Audit: ' + (postData.isAudit ? 'Yes' : 'No'));
        console.log(postData);
        getScores(postData);
    }
});
function getScores(postData){
    setTimeout(function(){
        var $score = $('.vote').clone(true).appendTo($('.vote').parent());
        var postId = postData.postId;
        console.log(postId);
        $.ajax({
            type: 'GET',
            url: '/posts/' + postId + '/vote-counts',
            dataType: "json",
            success: function (json) {
                StackExchange.helpers.removeMessages();

                var html =
                    '<div style="color:green">' + json.up + '</div>' +
                    '<div class="vote-count-separator"></div>' +
                    '<div style="color:maroon">' + json.down + '</div>';

                $score
                .html(html)
                .unbind('click')
                .data('bound', false)
                .css('cursor', 'default')
                .attr('title', (function(n){return n.upCount==1&&n.downCount==1?n.upCount+" up / "+n.downCount+" down":n.upCount==1?n.upCount+" up / "+n.downCount+" down":(n.downCount==1,n.upCount+" up / "+n.downCount+" down")})({upCount:Math.abs(+json.up),downCount:Math.abs(+json.down)}));
            }
        });
    }, 1000);
}
