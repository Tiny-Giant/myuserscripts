// ==UserScript==
// @name         Inline Editing Everywhere
// @namespace    https://github.com/Tiny-Giant/
// @version      1.0.0.0
// @description  Enables inline editing on any site in the Stack Exchange network.
// @author       @TinyGiant
// @include      /^https?://(meta\.)?(stackoverflow|stackexchange|serverfault|superuser|askubuntu|stackapps)\.com/(questions|posts|review)/.*/
// @grant        none
// ==/UserScript==

// Do this to ditch the existing inline editor
$('.post-menu .edit-post').attr('class','suggest-edit-post');

// Enable inline editing everywhere, even if you don't have the privilege.
$('.post-menu .suggest-edit-post').live("click", function (evt) {
    if (evt.ctrlKey || evt.altKey || evt.metaKey || evt.shiftKey) return; // allow open new window etc
    var e = $(this), root = e.closest(".question, .answer");

    if (e.data('handling-event') == 1) return false;
    e.data('handling-event', 1);

    if (root.find("#edit-tags-cancel").length) { // inline tag editor is active
        StackExchange.inlineTagEditing.restoreCurrentTags(true);
    }

    var showEditorButton = $("#show-editor-button");
    var showEditorButtonWasHidden = showEditorButton.is(':visible');
    if (showEditorButtonWasHidden) {
        showEditorButton.hide();
    }
    e.addSpinner();

    var answer = "";
    var isAnswer = root.hasClass("answer");
    if (isAnswer) {
        answer = " class='answer'";
    }

    var existing = root.find('.postcell,.answercell');
    var toBeHidden = existing.find('> *');

    var div = $('<div class="inline-editor"/>').hide().appendTo(existing);

    // PostsController.InlineEdit: posts/{id:INT}/edit-inline
    div.load(e.attr('href') + '-inline', function (r, status, xhr) {
        var originalTitle;

        div.find("[tabindex]").each(function () {
            $(this).attr("tabindex", parseInt($(this).attr("tabindex") - 20));
        });
        StackExchange.helpers.removeSpinner();

        if (root.offset().top < $(window).scrollTop()) // don't scroll if the top of the post is visible
            $('html, body').animate({ scrollTop: $(root).offset().top - 55 }, 200);

        if (status == 'error') {
            StackExchange.helpers.showErrorMessage(existing, "The post could not be loaded");
            div.remove();
            e.data('handling-event', 0);
        } else {

            crossFade(toBeHidden, div, 300);

            var targetID = e.attr('href').match(/\d+/)[0];

            var cancelEdit = function (elem) {
                delete Apps[targetID];
                if (StackExchange.navPrevention) {
                    if (!StackExchange.navPrevention.confirm("You have started editing this post. Abandon this edit?"))
                        return false;
                    StackExchange.navPrevention.stop();
                }

                if (showEditorButtonWasHidden) {
                    showEditorButton.show();
                }
                e.data('handling-event', 0);
                crossFade(div, elem, 300, function () { div.remove(); });
                if (elem.offset().top < $(window).scrollTop()) // don't scroll if the top of the post is visible
                    $('html, body').animate({ scrollTop: $(root).offset().top - 55 }, 200);
                return false;
            };

            var updateTitleEvent = "input keyup";
            var resetTitle = function () {
                title.unbind(updateTitleEvent, updateTitle);
                setTitleDelayed.trigger(originalTitle);
            };

            var updateTitle = function (evt) {
                setTitleDelayed.trigger(title[0].value);
                return true;
            };

            div.find('.cancel-edit').click(function () { resetTitle(); cancelEdit(toBeHidden); });

            var saveNewDefaultDelayed = StackExchange.helpers.DelayedReaction(function (hide) {
                $.ajax({
                    type: "POST",
                    data: { hide: hide },
                    url: "/user/save-pref/hide-preview-for-inline-editing"
                });
            }, 1000, { sliding: true });

            var hidePreview = div.find('.hide-preview');
            hidePreview.click(function () {
                var preview = div.find(".wmd-preview");
                var visible = preview.is(":visible");
                if (visible) {
                    preview.slideUp();
                    hidePreview.text("show preview");
                } else {
                    preview.slideDown();
                    hidePreview.text("hide preview");
                }

                saveNewDefaultDelayed.trigger(visible);

                return false;
            });

            var btn = div.find('input[type="submit"]');
            var postfix = btn.attr('id').replace('submit-button', '');
            var form = div.find('form');

            var title = div.find('#title');
            var header = $("#question-header a");
            var originalTitleSuffix = title.data('question-state-suffix');
            originalTitleSuffix = originalTitleSuffix ? ' ' + originalTitleSuffix : '';
            originalTitle = title.val();

            var setTitleDelayed = StackExchange.helpers.DelayedReaction(function (text) {
                if (typeof text != 'undefined') {
                    header.text(text + originalTitleSuffix);
                    if (typeof MathJax != 'undefined')
                        MathJax.Hub.Queue(["Typeset", MathJax.Hub, header[0]]);
                }
            }, { sliding: true });

            title.bind(updateTitleEvent, updateTitle);

            div.find('#title,.wmd-input,#tagnames,.edit-comment').keydown(function (evt) {
                if (evt.ctrlKey === true && evt.keyCode == 13) {
                    form.submit();
                    return false;
                }
                if (evt.keyCode == 27) {
                    resetTitle();
                    cancelEdit(toBeHidden);
                    return false;
                }
            });

            StackExchange.using("postValidation", function () {
                StackExchange.postValidation.initOnBlurAndSubmit(form, isAnswer ? 2 : 1, 'edit', false, function (json) {
                    var html = json.html;
                    var elem = $(html).hide();
                    existing.replaceWith(elem);

                    if (!isAnswer) {
                        $("#question-header a").text(json.title);
                    }

                    $('html').trigger('inline-edit-complete', [elem, json.title]);

                    styleCode();

                    cancelEdit(elem); // reverts the UI
                });
            });
        }
    });
    return false;
});
