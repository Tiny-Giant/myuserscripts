// ==UserScript==
// @name        Natty Controls
// @namespace   http://tinygiant.io
// @description Adds quick links for [tp|fp|ne] to Natty reports.
// @include     http*://chat.stackoverflow.com/rooms/111347/sobotics
// @version     1.0.1
// @grant       none
// ==/UserScript==
/* jshint esnext: true */

function NattyControls() {
    const ready = CHAT.Hub.roomReady;

    CHAT.Hub.roomReady = {
        fire: function(...args) {
            ready.fire(...args);

            function eventHandler(event) {
                if(event.room_id !== CHAT.CURRENT_ROOM_ID || // event is not in this room
                   event.event_type !== 1                   || // event is not a message
                   event.user_id !== 6817005) return;        // event is not from NATOBot

                const content = document.createElement('div');
                content.innerHTML = event.content;

                if(!/^\[ Natty/.test(content.textContent.trim())) return; // event is not a report

                function send(message) {
                    $.ajax({
                        'type': 'POST',
                        'url': `/chats/${CHAT.CURRENT_ROOM_ID}/messages/new`,
                        'data': fkey({text: message}),
                        'dataType': 'json'
                    });
                }

                function clickHandler(message) {
                    return function(event) {
                        event.preventDefault();

                        send(message);
                    };
                }

                function createLink(message) {
                    const node = document.createElement('a');
                    node.href = "#";
                    node.textContent = message;
                    node.addEventListener('click', clickHandler(`:${event.message_id} ${message}`), false);
                    return node;
                }

                setTimeout(() => {
                    const message = document.querySelector(`#message-${event.message_id} .content`);

                    const wrap = document.createElement('span');
                    wrap.appendChild(document.createTextNode(' [ '));
                    wrap.appendChild(createLink('tp'));
                    wrap.appendChild(document.createTextNode(' | '));
                    wrap.appendChild(createLink('fp'));
                    wrap.appendChild(document.createTextNode(' | '));
                    wrap.appendChild(createLink('ne'));
                    wrap.appendChild(document.createTextNode(' ] '));
                    message.insertBefore(wrap, message.firstChild);
                }, 0);
            }

            function handleLoadedEvents(handler) {
                [...(document.querySelectorAll('.user-container') || [])].forEach(container => {
                    [...(container.querySelectorAll('.message') || [])].forEach(message => handler({
                        room_id: CHAT.CURRENT_ROOM_ID,
                        event_type: 1,
                        user_id: +(container.className.match(/user-(\d+)/) || [])[1],
                        message_id: +(message.id.match(/message-(\d+)/) || [])[1],
                        content: message.querySelector('.content').innerHTML
                    }));
                });
            }

            CHAT.addEventHandlerHook(eventHandler);

            handleLoadedEvents(eventHandler);
        }
    };
}

const script = document.createElement('script');
script.textContent = `(${ NattyControls.toString() })();`;
console.log(script.textContent);
document.body.appendChild(script);
