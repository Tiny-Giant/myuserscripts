// ==UserScript==
// @name         NATO Enhancements
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.9
// @description  Includes the actual post on the new answers to old questions page of the 10k tools. 
// @author       @TinyGiant
// @include      /https?:\/\/(meta\.)?stackoverflow.com\/tools\/new-answers-old-questions.*/
// @grant        none
// ==/UserScript==
/* jshint -W097 */
/* jshint esnext: true */

'use strict';

const ScriptToInject = function()
{
    'use strict';
    const funcs = {};

    funcs.fetch = (url, complete) => new Promise((resolve, reject) =>
    {
        let xhr = new XMLHttpRequest();

        xhr.addEventListener('load', event =>
        {
            if (xhr.status !== 200)
            {
                reject(xhr);
            } 
            else 
            {
                if (typeof complete === 'function')
                {
                    complete(xhr.responseText);
                }

                resolve(xhr);
            }
        }, false);

        xhr.open('GET', url);

        xhr.send();
    });

    funcs.chunkArray = (array, length) =>
    {
        // Check arguments for validity
        if (!(array instanceof Array))
        {
            console.warn("chunkArray expects first argument to be an array, " + typeof(array) + " supplied");
            return array;
        }

        if (typeof(length) !== 'number')
        {
            console.warn("chunkArray expects second argument to be a number, " + typeof(length) + " supplied");
            return array;
        }

        // Create our new array
        const chunked = Array(Math.ceil(array.length / length));

        // Split the old array into chunks, then insert them into their positions in the new array
        var i,j,temparray,chunk = 10;
        for (let i = 0, j = array.length; i < j; i += length) {
            chunked[i / length] = array.slice(i, i + length);
        }

        // Return the new array
        return chunked;
    };

    funcs.iterateSlowly = (milliseconds, array, action, complete) => {
        if (typeof(milliseconds) !== 'number')
        {
            console.warn("interateSlowly expects first argument to be a number, " + typeof(milliseconds) + " supplied");
            return array;
        }

        if (!(array instanceof Array))
        {
            console.warn("interateSlowly expects second argument to be an array, " + typeof(array) + " supplied");
            return array;
        }

        if (!(action instanceof Function))
        {
            console.warn("interateSlowly expects third argument to be a function, " + typeof(array) + " supplied");
            return array;
        }

        if (complete !== undefined)
        {
            if (!(action instanceof Function))
            {
                console.warn("interateSlowly expects optional fourth argument to be a function, " + typeof(array) + " supplied");
                return array;
            }
        }

        if (!array.length)
        {
            return;
        }

        action(array.shift());

        if (!array.length)
        {
            complete();
            return;
        }

        setTimeout(funcs.iterateSlowly.bind(null, milliseconds, array, action, complete), milliseconds);
    };

    funcs.fetchPosts = posts =>
    {
        const fetches = [];

        const promises = [];

        const postvotes = [];

        for (let post of posts)
        {
            // Firefox is a bitch, and doesn't handle let in for...of loops properly.
            (post =>
            {
                 // Get posts
                fetches.push([
                    '/posts/ajax-load-realtime/' + post.questionid, 
                    html =>
                    {
                        post.nodes.question.innerHTML = html;
                    }
                ]);
                fetches.push([
                    '/posts/ajax-load-realtime/' + post.answerid, 
                    html =>
                    {
                        post.nodes.answer.innerHTML = html;
                    }
                ]);

                // Get votes
                fetches.push([
                    '/posts/' + post.questionid + '/votes', 
                    votes =>
                    {
                        votes = JSON.parse(votes);

                        for (let post of votes)
                        {
                            postvotes.push(post);
                        }
                    }
                ]);
            })(post);
        }

        const fetchChunks = funcs.chunkArray(fetches, 20);

        funcs.iterateSlowly(1000, fetchChunks, fetches => { 
            for(const fetch of fetches)
            {
                promises.push(funcs.fetch(fetch[0], fetch[1]));
            }
        }, () => {
            Promise.all(promises).then(xhr =>
            {
                funcs.addCSS();

                for (let post of posts)
                {
                    post.nodes.columns[0].innerHTML = '';
                    post.nodes.columns[1].innerHTML = '';
                    post.nodes.columns[0].appendChild(post.nodes.wrap);
                    post.nodes.wrap.style.display = '';
                }

                StackExchange.question.init(
                {
                    votesCast: postvotes,
                    canViewVoteCounts: true,
                    questionId: posts[0].questionid,
                    canOpenBounty: true
                });

                const commentLinks = Array.from(document.querySelectorAll('.js-show-link.comments-link'));

                for (let commentLink of commentLinks)
                {
                    commentLink.click();
                }

                for (let post of posts)
                {
                    StackExchange.realtime.subscribeToQuestion(StackExchange.options.site.id, post.questionid);
                }

                StackExchange.inlineTagEditing.init();
                
                StackExchange.helpers.removeSpinner(document.querySelector('.subheader h1'));
            }, xhr =>
            {
                console.log('Failed', xhr);
            });
        });
    };

    funcs.appendNodes = posts =>
    {
        for (let post of posts)
        {
            post.nodes.columns[0].appendChild(post.nodes.wrap);
        }
    };

    funcs.getPosts = () =>
    {
        const posts = [];
        const rows = Array.from(document.querySelectorAll('.default-view-post-table > tbody > tr'));

        for (let row of rows)
        {
            const nodes = {};

            nodes.scope = row;
            nodes.columns = Array.from(nodes.scope.children);
            nodes.wrap = document.createElement('div');
            nodes.wrap.style.display = 'none';

            nodes.old = {};

            nodes.old.answer = nodes.scope.querySelector('.post-text');
            nodes.old.title = nodes.scope.querySelector('.answer-hyperlink');

            const urlsections = /(\d+)\/(.*?)\/(\d+)/.exec(nodes.old.title.href);
            const questionid = urlsections[1];
            const titleslug = urlsections[2];
            const answerid = urlsections[3];

            nodes.title = document.createElement('h1');
            nodes.wrap.appendChild(nodes.title);

            nodes.link = document.createElement('a');
            nodes.link.href = window.location.protocol + '//' + window.location.host + '/questions/' + questionid + '/' + titleslug;
            nodes.link.textContent = nodes.old.title.textContent;
            nodes.title.appendChild(nodes.link);

            nodes.question = document.createElement('div');
            nodes.wrap.appendChild(nodes.question);

            nodes.answer = document.createElement('div');
            nodes.wrap.appendChild(nodes.answer);

            posts.push(
            {
                answerid: answerid,
                questionid: questionid,
                nodes: nodes
            });
        }

        return posts;
    };

    funcs.addCSS = () =>
    {
        const CSS = [
            '.question, .answer {',
            '    width: 730px !important',
            '}',
            'h1, h2, h3, h4, h5, h6 {',
            '    font-weight: normal',
            '}',
            '.answer {',
            '    background: RGBA(255,153,0, 0.1);',
            '    margin-top: 1em;',
            '}'
        ].join('\n');

        const style = document.createElement('style');
        document.body.appendChild(style);

        const text = document.createTextNode(CSS);
        style.appendChild(text);
    };

    funcs.init = () =>
    {
        const posts = funcs.getPosts();

        const title = document.querySelector('.subheader h1');

        StackExchange.helpers.addSpinner(title);

        StackExchange.using("inlineEditing", () =>
        {
            StackExchange.inlineEditing.init();
        });
        
        // This hack is to stop the inline tag editor from moving all tags on the page into the first question.
        // Shog9 knows about this, but decided not to fix it because no one using the site normally will ever
        // run into this problem. Thank the almighty Shog.
        StackExchange.using("inlineTagEditing", () => 
        {
            StackExchange.inlineTagEditing = (function () {
                var questions = $('div.question');
                var inits = {};

                questions.each(function(){
                    var question = $(this);
                    var jTagList;
                    var jEditTagsLink;
                    var jLinkWrapper;

                    var questionId;
                    var reviewTaskId;
                    var jCurrentTagsBuffer = $("<div></div>");

                    var bindWrapperHoverEvents = function () {
                        jLinkWrapper
                            .mouseover(function () { jEditTagsLink.show(); })
                            .mouseout(function () { jEditTagsLink.hide(); });
                    };

                    var bindEditTagsLinkClick = function () {
                        jEditTagsLink.unbind('click').one('click', function () {

                            jLinkWrapper.fadeOut('fast', function () {
                                // upon clicking "edit tags", save the current tags in case of cancel
                                jLinkWrapper.appendTo(jCurrentTagsBuffer);

                                // fetch our tag editor - will contain the latest tags, which could differ from what's loaded
                                StackExchange.helpers.addSpinner(jTagList);
                                $.ajax({
                                    type: 'GET',
                                    url: '/posts/' + questionId + '/edit-tags',
                                    data: { reviewTaskId: reviewTaskId },
                                    dataType: 'html',
                                    success: fetchSuccess,
                                    error: fetchError
                                });
                            });
                        });
                    };

                    var restoreCurrentTags = function (immediately) {
                        StackExchange.helpers.disableSubmitButton(jTagList);
                        StackExchange.helpers.removeMessages();
                        var doIt = function () {
                            jTagList.empty();
                            jLinkWrapper.appendTo(jTagList);
                            jLinkWrapper.show().find('a#edit-tags').parent().hide();
                            jTagList.fadeIn('fast');
                            bindEditTagsLinkClick();
                        };
                        if (immediately)
                            doIt();
                        else
                            jTagList.fadeOut('fast', doIt);
                    };

                    var fetchSuccess = function (html) {
                        // TODO: we could fetch newer tags - update jCurrentTagsBuffer's tags with latest

                        StackExchange.helpers.removeSpinner();

                        // we'll hide the container, then show it via animation (JOY)
                        var jHtml = $(html);

                        // only fetch tageditor.js if the autocomplete plugin isn't available
                        if (typeof $().autocomplete == 'function')
                            jHtml = jHtml.not('script[src*="tageditor.js"]');

                        var jForm = $('<form method="post" action="/posts/' + questionId + '/edit-tags"></form>');
                        jTagList.css('display', 'none').append(jForm);
                        jForm.append(jHtml);

                        // add submit and cancel
                        jTagList.find('div.form-item').append(
                            '<div class="form-submit">' +
                            '<input type="hidden" name="fkey" value="' + StackExchange.options.user.fkey + '" />' +
                            '<input type="hidden" name="reviewTaskId" value="' + reviewTaskId + '" />' +
                            $('<input>', { id: "edit-tags-submit", type: "submit", value: "Save Tag Edits", tabindex: "104" }).prop('outerHTML') +
                            '<a id="edit-tags-cancel" class="cancel-edit" style="margin-left:8px;" href="#" tabindex="105">' + "cancel" + '</a>' +
                            '</div>');

                        StackExchange.using("postValidation", function () {
                            StackExchange.postValidation.initOnBlurAndSubmit(jForm, 1, 'tags', false, function (data) {
                                // server sends down the saved tags as they are first rendered on the page - replace buffered tags and show
                                jLinkWrapper.find('a.post-tag').remove();
                                jLinkWrapper.prepend(data.html);
                                restoreCurrentTags();
                                $(document).trigger('retag', questionId);
                            });
                        });

                        jForm.find('.cancel-edit').click(function (e) {
                            restoreCurrentTags();
                            e.preventDefault();
                        });

                        jTagList.fadeIn('fast', function () {
                            $('#tagnames').focus();
                        });
                    };

                    var fetchError = function (response) {
                        // undo our styling and show what happened
                        StackExchange.helpers.removeSpinner();
                        restoreCurrentTags();
                        StackExchange.helpers.showErrorMessage(jLinkWrapper, (response.responseText && response.responseText.length < 300 ? response.responseText : "An error occurred when fetching the tag editor"));
                    };

                    // public methods
                    inits[questionId] = {
                        init: function () {
                            if (StackExchange.disableInlineTagEdits) return;
                            
                            questionId = question.find('div.vote > input[type="hidden"]').val();
                            jTagList = question.find('div.post-taglist');

                            // wrap our tags in a span to ease hover show/hide
                            jTagList.find('a.post-tag').wrapAll('<span class="edit-tags-wrapper"></span>');
                            jLinkWrapper = jTagList.find('span.edit-tags-wrapper');

                            // add an "edit tags" link upon hovering over tags
                            jEditTagsLink = $('<span class="dno">' + $('<a>', { id: "edit-tags", style: "", title: "edit only this question's tags", text: "edit tags" }).prop('outerHTML') + '</span>');
                            jLinkWrapper.append(jEditTagsLink);

                            bindWrapperHoverEvents();
                            bindEditTagsLinkClick();
                        },

                        initReviewRetag: function (currentReviewTaskId) {
                            if (StackExchange.disableInlineTagEdits) return;
                            
                            questionId = question.find('div.vote > input[type="hidden"]').val();
                            reviewTaskId = currentReviewTaskId;
                            jTagList = question.find('div.post-taglist');

                            // wrap our tags in a span to ease hover show/hide
                            jTagList.find('a.post-tag').wrapAll('<span class="edit-tags-wrapper"></span>');
                            jLinkWrapper = jTagList.find('span.edit-tags-wrapper');

                            jEditTagsLink = $('.retag-question:first');
                            jEditTagsLink.removeAttr('href');

                            bindEditTagsLinkClick();
                        }
                    };
                });
                return {
                    init: function () {
                        for(var i in inits)
                        {
                            inits[i].init();
                        }
                    },

                    initReviewRetag: function (currentReviewTaskId) {
                        for(var i in inits)
                        {
                            inits[i].initReviewRetag();
                        }
                    }
                };
            })();
        });

        funcs.appendNodes(posts);

        funcs.fetchPosts(posts);
    };

    funcs.init();
};

const ScriptToInjectNode = document.createElement('script');
document.body.appendChild(ScriptToInjectNode);

const ScriptToInjectContent = document.createTextNode('(' + ScriptToInject.toString() + ')()');
ScriptToInjectNode.appendChild(ScriptToInjectContent);
