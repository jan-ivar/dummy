const div = document.documentElement
.appendChild(document.createElement("body"))
.appendChild(document.createElement("div"));
div.style.whiteSpace = "pre";
const console = { log: msg => div.innerHTML += msg + "<br>" };

let chain = Promise.resolve();
const t = {
  step_timeout: setTimeout.bind(window),
  add_cleanup: () => {},
  step_func: f => f,
  step: f => f(),
  unreached_func: desc => () => assert_unreached(desc)
};
let passes = 0, total = 0;
async function promise_test(test, name) {
  chain = chain
    .then(() => test(t))
    .then(() => (total++, passes++, console.log(`PASS ${name}`)),
          e => (total++, console.log(`FAIL ${name}: ${e} failed`)));
}
const test = (...args) => promise_test(...args);
function async_test(func, name) {
  const t1 = Object.assign({}, t);
  const p = new Promise(r => t1.done = r);
  func(t1);
  return promise_test(() => p, name);
}

let msgCounter = 0;
function assert_equals(a, b, msg) {
  msg = `${msg || ""} - Expected ${b}, got ${a}`;
  if (a !== b) throw msg;
}
function assert_not_equals(a, b, msg) {
  if (a === b) throw msg;
}
const assert_true = (a, msg) => assert_equals(a, true, msg);
const assert_false = (a, msg) => assert_equals(a, false, msg);
const assert_unreached = (a, msg) => assert_equals(true, false, msg);
const assert_less_than = (val, limit)  => assert_true(val < limit, name);
const assert_greater_than = (val, limit)  => assert_true(val > limit, name);
function assert_between_inclusive(val, lower, upper, name) {
  assert_true(val >= lower, name);
  assert_true(val <= upper, name);
}

function assert_throws(errorname, f) {
  try {
    f();
  } catch (e) {
    return assert_equals(e.name, errorname);
  }
  assert_equals("failure", "success", "assert_throws failed");
}

const getNoiseStream = c => navigator.mediaDevices.getUserMedia(c);

async function getTrackFromUserMedia(kind) {
  const stream = await getNoiseStream({[kind]: true});
  const [track] = stream.getTracks();
  return [track, stream];
}

function exchangeIceCandidates(pc1, pc2) {
  pc1.onicecandidate = e => pc2.addIceCandidate(e.candidate);
  pc2.onicecandidate = e => pc1.addIceCandidate(e.candidate);
}

async function exchangeOfferAnswer(pc1, pc2) {
  await pc1.setLocalDescription(await pc1.createOffer());
  await pc2.setRemoteDescription(pc1.localDescription);
  await pc2.setLocalDescription(await pc2.createAnswer());
  await pc1.setRemoteDescription(pc2.localDescription);
}

const doSignalingHandshake = exchangeOfferAnswer;

setTimeout(() => promise_test(() => console.log(`${passes}/${total} tests passed`), "finished"), 100);

    function EventWatcher(test, watchedNode, eventTypes, timeoutPromise)
    {
        if (typeof eventTypes == 'string') {
            eventTypes = [eventTypes];
        }

        var waitingFor = null;

        // This is null unless we are recording all events, in which case it
        // will be an Array object.
        var recordedEvents = null;

        var eventHandler = test.step_func(function(evt) {
            assert_true(!!waitingFor,
                        'Not expecting event, but got ' + evt.type + ' event');
            assert_equals(evt.type, waitingFor.types[0],
                          'Expected ' + waitingFor.types[0] + ' event, but got ' +
                          evt.type + ' event instead');

            if (Array.isArray(recordedEvents)) {
                recordedEvents.push(evt);
            }

            if (waitingFor.types.length > 1) {
                // Pop first event from array
                waitingFor.types.shift();
                return;
            }
            // We need to null out waitingFor before calling the resolve function
            // since the Promise's resolve handlers may call wait_for() which will
            // need to set waitingFor.
            var resolveFunc = waitingFor.resolve;
            waitingFor = null;
            // Likewise, we should reset the state of recordedEvents.
            var result = recordedEvents || evt;
            recordedEvents = null;
            resolveFunc(result);
        });

        for (var i = 0; i < eventTypes.length; i++) {
            watchedNode.addEventListener(eventTypes[i], eventHandler, false);
        }

        /**
         * Returns a Promise that will resolve after the specified event or
         * series of events has occurred.
         *
         * @param {Object} options An optional options object. If the 'record' property
         *                 on this object has the value 'all', when the Promise
         *                 returned by this function is resolved,  *all* Event
         *                 objects that were waited for will be returned as an
         *                 array.
         *
         * @example
         * const watcher = new EventWatcher(t, div, [ 'animationstart',
         *                                            'animationiteration',
         *                                            'animationend' ]);
         * return watcher.wait_for([ 'animationstart', 'animationend' ],
         *                         { record: 'all' }).then(evts => {
         *   assert_equals(evts[0].elapsedTime, 0.0);
         *   assert_equals(evts[1].elapsedTime, 2.0);
         * });
         */
        this.wait_for = function(types, options) {
            if (waitingFor) {
                return Promise.reject('Already waiting for an event or events');
            }
            if (typeof types == 'string') {
                types = [types];
            }
            if (options && options.record && options.record === 'all') {
                recordedEvents = [];
            }
            return new Promise(function(resolve, reject) {
                var timeout = test.step_func(function() {
                    // If the timeout fires after the events have been received
                    // or during a subsequent call to wait_for, ignore it.
                    if (!waitingFor || waitingFor.resolve !== resolve)
                        return;

                    // This should always fail, otherwise we should have
                    // resolved the promise.
                    assert_true(waitingFor.types.length == 0,
                                'Timed out waiting for ' + waitingFor.types.join(', '));
                    var result = recordedEvents;
                    recordedEvents = null;
                    var resolveFunc = waitingFor.resolve;
                    waitingFor = null;
                    resolveFunc(result);
                });

                if (timeoutPromise) {
                    timeoutPromise().then(timeout);
                }

                waitingFor = {
                    types: types,
                    resolve: resolve,
                    reject: reject
                };
            });
        };

        /**
         * Stop listening for events
         */
        function stop_watching() {
            for (var i = 0; i < eventTypes.length; i++) {
                watchedNode.removeEventListener(eventTypes[i], eventHandler, false);
            }
        };

        test.add_cleanup(stop_watching);

        return this;
    }

    const assert = assert_true;
    const same_value = (a, b) => a === b;
    /**
     * Assert that ``actual`` and ``expected`` are both arrays, and that the array properties of
     * ``actual`` and ``expected`` are all the same value (as for :js:func:`assert_equals`).
     *
     * @param {Array} actual - Test array.
     * @param {Array} expected - Array that is expected to contain the same values as ``actual``.
     * @param {string} [description] - Description of the condition being tested.
     */
    function assert_array_equals(actual, expected, description)
    {
        const max_array_length = 20;
        function shorten_array(arr, offset = 0) {
            // Make ", …" only show up when it would likely reduce the length, not accounting for
            // fonts.
            if (arr.length < max_array_length + 2) {
                return arr;
            }
            // By default we want half the elements after the offset and half before
            // But if that takes us past the end of the array, we have more before, and
            // if it takes us before the start we have more after.
            const length_after_offset = Math.floor(max_array_length / 2);
            let upper_bound = Math.min(length_after_offset + offset, arr.length);
            const lower_bound = Math.max(upper_bound - max_array_length, 0);

            if (lower_bound === 0) {
                upper_bound = max_array_length;
            }

            const output = arr.slice(lower_bound, upper_bound);
            if (lower_bound > 0) {
                output.beginEllipsis = true;
            }
            if (upper_bound < arr.length) {
                output.endEllipsis = true;
            }
            return output;
        }

        assert(typeof actual === "object" && actual !== null && "length" in actual,
               "assert_array_equals", description,
               "value is ${actual}, expected array",
               {actual:actual});
        assert(actual.length === expected.length,
               "assert_array_equals", description,
               "lengths differ, expected array ${expected} length ${expectedLength}, got ${actual} length ${actualLength}",
               {expected:shorten_array(expected, expected.length - 1), expectedLength:expected.length,
                actual:shorten_array(actual, actual.length - 1), actualLength:actual.length
               });

        for (var i = 0; i < actual.length; i++) {
            assert(actual.hasOwnProperty(i) === expected.hasOwnProperty(i),
                   "assert_array_equals", description,
                   "expected property ${i} to be ${expected} but was ${actual} (expected array ${arrayExpected} got ${arrayActual})",
                   {i:i, expected:expected.hasOwnProperty(i) ? "present" : "missing",
                    actual:actual.hasOwnProperty(i) ? "present" : "missing",
                    arrayExpected:shorten_array(expected, i), arrayActual:shorten_array(actual, i)});
            assert(same_value(expected[i], actual[i]),
                   "assert_array_equals", description,
                   "expected property ${i} to be ${expected} but got ${actual} (expected array ${arrayExpected} got ${arrayActual})",
                   {i:i, expected:expected[i], actual:actual[i],
                    arrayExpected:shorten_array(expected, i), arrayActual:shorten_array(actual, i)});
        }
    }
