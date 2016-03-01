// ==UserScript==
// @name         NATO Hide Questions
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.0
// @description  Hides the questions that are introduced by the NATO Enhancements script.
// @author       @TinyGiant
// @include      /https?:\/\/(meta\.)?stackoverflow.com\/tools\/new-answers-old-questions.*/
// @grant        none
// ==/UserScript==
/* jshint -W097 */
/* jshint esnext:true */
'use strict';

const CSS = [
    '.question {',
    '    display: none;',
    '}',
    '.answer {',
    '    background: rgba(0,0,0,0) !important;',
    '}',
    'table.default-view-post-table > tbody > tr > td {',
    '    border-bottom: 5px solid #ccc;',
    '    padding-top: 1em;',
    '}'
].join('\n');

const style = document.createElement('style');
document.body.appendChild(style);

const text = document.createTextNode(CSS);
style.appendChild(text);
