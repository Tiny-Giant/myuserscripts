// ==UserScript==
// @name         Hide Jobs
// @namespace    http://github.com/Tiny-Giant
// @version      1.0.0.1
// @description  Hides references to Stack Overflow Jobs
// @author       @TinyGiant
// @include      /https?:\/\/(meta\.)?stackoverflow\.com/.*/
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

document.body.appendChild(
	Object.assign(
		document.createElement('style'), 
		{
			type: 'text/css',
			textContent: `
			    #nav-jobs,
			    a[href^="/jobs"],
			    .careers-link,
			    .cv-connect,
			    .search-status,
			    #hireme {
			        display: none !important;
			    }
			`
		}
	)
);