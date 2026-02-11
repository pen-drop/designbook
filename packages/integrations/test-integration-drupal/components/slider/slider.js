/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
function __values$1(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return {
        value: o && o[i++],
        done: !o
      };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read$1(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = {
      error
    };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}
function __spread$1() {
  for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read$1(arguments[i]));
  return ar;
}
var isUndefined = function(value) {
  return typeof value === "undefined";
};
var ComponentEvent = /* @__PURE__ */ (function() {
  function ComponentEvent2(eventType, props) {
    var e_1, _a;
    this._canceled = false;
    if (props) {
      try {
        for (var _b = __values$1(Object.keys(props)), _c = _b.next(); !_c.done; _c = _b.next()) {
          var key = _c.value;
          this[key] = props[key];
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
    }
    this.eventType = eventType;
  }
  var __proto = ComponentEvent2.prototype;
  __proto.stop = function() {
    this._canceled = true;
  };
  __proto.isCanceled = function() {
    return this._canceled;
  };
  return ComponentEvent2;
})();
var Component = /* @__PURE__ */ (function() {
  function Component2() {
    this._eventHandler = {};
  }
  var __proto = Component2.prototype;
  __proto.trigger = function(event) {
    var params = [];
    for (var _i = 1; _i < arguments.length; _i++) {
      params[_i - 1] = arguments[_i];
    }
    var eventName = event instanceof ComponentEvent ? event.eventType : event;
    var handlers = __spread$1(this._eventHandler[eventName] || []);
    if (handlers.length <= 0) {
      return this;
    }
    if (event instanceof ComponentEvent) {
      event.currentTarget = this;
      handlers.forEach(function(handler) {
        handler(event);
      });
    } else {
      handlers.forEach(function(handler) {
        handler.apply(void 0, __spread$1(params));
      });
    }
    return this;
  };
  __proto.once = function(eventName, handlerToAttach) {
    var _this = this;
    if (typeof eventName === "object" && isUndefined(handlerToAttach)) {
      var eventHash = eventName;
      for (var key in eventHash) {
        this.once(key, eventHash[key]);
      }
      return this;
    } else if (typeof eventName === "string" && typeof handlerToAttach === "function") {
      var listener_1 = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        handlerToAttach.apply(void 0, __spread$1(args));
        _this.off(eventName, listener_1);
      };
      this.on(eventName, listener_1);
    }
    return this;
  };
  __proto.hasOn = function(eventName) {
    return !!this._eventHandler[eventName];
  };
  __proto.on = function(eventName, handlerToAttach) {
    if (typeof eventName === "object" && isUndefined(handlerToAttach)) {
      var eventHash = eventName;
      for (var name in eventHash) {
        this.on(name, eventHash[name]);
      }
      return this;
    } else if (typeof eventName === "string" && typeof handlerToAttach === "function") {
      var handlerList = this._eventHandler[eventName];
      if (isUndefined(handlerList)) {
        this._eventHandler[eventName] = [];
        handlerList = this._eventHandler[eventName];
      }
      handlerList.push(handlerToAttach);
    }
    return this;
  };
  __proto.off = function(eventName, handlerToDetach) {
    if (isUndefined(eventName)) {
      this._eventHandler = {};
      return this;
    }
    if (isUndefined(handlerToDetach)) {
      if (typeof eventName === "string") {
        delete this._eventHandler[eventName];
        return this;
      } else {
        var eventHash = eventName;
        for (var name in eventHash) {
          this.off(name, eventHash[name]);
        }
        return this;
      }
    }
    var handlerList = this._eventHandler[eventName];
    if (handlerList) {
      var length = handlerList.length;
      for (var i = 0; i < length; ++i) {
        if (handlerList[i] === handlerToDetach) {
          handlerList.splice(i, 1);
          if (length <= 1) {
            delete this._eventHandler[eventName];
          }
          break;
        }
      }
    }
    return this;
  };
  Component2.VERSION = "3.0.5";
  return Component2;
})();
var ComponentEvent$1 = ComponentEvent;
function some(arr, callback) {
  var length = arr.length;
  for (var i = 0; i < length; ++i) {
    if (callback(arr[i], i)) {
      return true;
    }
  }
  return false;
}
function find$1(arr, callback) {
  var length = arr.length;
  for (var i = 0; i < length; ++i) {
    if (callback(arr[i], i)) {
      return arr[i];
    }
  }
  return null;
}
function getUserAgentString(agent2) {
  var userAgent = agent2;
  if (typeof userAgent === "undefined") {
    if (typeof navigator === "undefined" || !navigator) {
      return "";
    }
    userAgent = navigator.userAgent || "";
  }
  return userAgent.toLowerCase();
}
function execRegExp(pattern, text) {
  try {
    return new RegExp(pattern, "g").exec(text);
  } catch (e) {
    return null;
  }
}
function hasUserAgentData() {
  if (typeof navigator === "undefined" || !navigator || !navigator.userAgentData) {
    return false;
  }
  var userAgentData = navigator.userAgentData;
  var brands = userAgentData.brands || userAgentData.uaList;
  return !!(brands && brands.length);
}
function findVersion(versionTest, userAgent) {
  var result = execRegExp("(" + versionTest + ")((?:\\/|\\s|:)([0-9|\\.|_]+))", userAgent);
  return result ? result[3] : "";
}
function convertVersion(text) {
  return text.replace(/_/g, ".");
}
function findPreset(presets, userAgent) {
  var userPreset = null;
  var version = "-1";
  some(presets, function(preset) {
    var result = execRegExp("(" + preset.test + ")((?:\\/|\\s|:)([0-9|\\.|_]+))?", userAgent);
    if (!result || preset.brand) {
      return false;
    }
    userPreset = preset;
    version = result[3] || "-1";
    if (preset.versionAlias) {
      version = preset.versionAlias;
    } else if (preset.versionTest) {
      version = findVersion(preset.versionTest.toLowerCase(), userAgent) || version;
    }
    version = convertVersion(version);
    return true;
  });
  return {
    preset: userPreset,
    version
  };
}
function findPresetBrand(presets, brands) {
  var brandInfo = {
    brand: "",
    version: "-1"
  };
  some(presets, function(preset) {
    var result = findBrand(brands, preset);
    if (!result) {
      return false;
    }
    brandInfo.brand = preset.id;
    brandInfo.version = preset.versionAlias || result.version;
    return brandInfo.version !== "-1";
  });
  return brandInfo;
}
function findBrand(brands, preset) {
  return find$1(brands, function(_a) {
    var brand = _a.brand;
    return execRegExp("" + preset.test, brand.toLowerCase());
  });
}
var BROWSER_PRESETS = [{
  test: "phantomjs",
  id: "phantomjs"
}, {
  test: "whale",
  id: "whale"
}, {
  test: "edgios|edge|edg",
  id: "edge"
}, {
  test: "msie|trident|windows phone",
  id: "ie",
  versionTest: "iemobile|msie|rv"
}, {
  test: "miuibrowser",
  id: "miui browser"
}, {
  test: "samsungbrowser",
  id: "samsung internet"
}, {
  test: "samsung",
  id: "samsung internet",
  versionTest: "version"
}, {
  test: "chrome|crios",
  id: "chrome"
}, {
  test: "firefox|fxios",
  id: "firefox"
}, {
  test: "android",
  id: "android browser",
  versionTest: "version"
}, {
  test: "safari|iphone|ipad|ipod",
  id: "safari",
  versionTest: "version"
}];
var CHROMIUM_PRESETS = [{
  test: "(?=.*applewebkit/(53[0-7]|5[0-2]|[0-4]))(?=.*\\schrome)",
  id: "chrome",
  versionTest: "chrome"
}, {
  test: "chromium",
  id: "chrome"
}, {
  test: "whale",
  id: "chrome",
  versionAlias: "-1",
  brand: true
}];
var WEBKIT_PRESETS = [{
  test: "applewebkit",
  id: "webkit",
  versionTest: "applewebkit|safari"
}];
var WEBVIEW_PRESETS = [{
  test: "(?=(iphone|ipad))(?!(.*version))",
  id: "webview"
}, {
  test: "(?=(android|iphone|ipad))(?=.*(naver|daum|; wv))",
  id: "webview"
}, {
  // test webview
  test: "webview",
  id: "webview"
}];
var OS_PRESETS = [{
  test: "windows phone",
  id: "windows phone"
}, {
  test: "windows 2000",
  id: "window",
  versionAlias: "5.0"
}, {
  test: "windows nt",
  id: "window"
}, {
  test: "win32|windows",
  id: "window"
}, {
  test: "iphone|ipad|ipod",
  id: "ios",
  versionTest: "iphone os|cpu os"
}, {
  test: "macos|macintel|mac os x",
  id: "mac"
}, {
  test: "android|linux armv81",
  id: "android"
}, {
  test: "tizen",
  id: "tizen"
}, {
  test: "webos|web0s",
  id: "webos"
}];
function isWebView(userAgent) {
  return !!findPreset(WEBVIEW_PRESETS, userAgent).preset;
}
function getLegacyAgent(userAgent) {
  var nextAgent = getUserAgentString(userAgent);
  var isMobile = !!/mobi/g.exec(nextAgent);
  var browser = {
    name: "unknown",
    version: "-1",
    majorVersion: -1,
    webview: isWebView(nextAgent),
    chromium: false,
    chromiumVersion: "-1",
    webkit: false,
    webkitVersion: "-1"
  };
  var os = {
    name: "unknown",
    version: "-1",
    majorVersion: -1
  };
  var _a = findPreset(BROWSER_PRESETS, nextAgent), browserPreset = _a.preset, browserVersion = _a.version;
  var _b = findPreset(OS_PRESETS, nextAgent), osPreset = _b.preset, osVersion = _b.version;
  var chromiumPreset = findPreset(CHROMIUM_PRESETS, nextAgent);
  browser.chromium = !!chromiumPreset.preset;
  browser.chromiumVersion = chromiumPreset.version;
  if (!browser.chromium) {
    var webkitPreset = findPreset(WEBKIT_PRESETS, nextAgent);
    browser.webkit = !!webkitPreset.preset;
    browser.webkitVersion = webkitPreset.version;
  }
  if (osPreset) {
    os.name = osPreset.id;
    os.version = osVersion;
    os.majorVersion = parseInt(osVersion, 10);
  }
  if (browserPreset) {
    browser.name = browserPreset.id;
    browser.version = browserVersion;
    if (browser.webview && os.name === "ios" && browser.name !== "safari") {
      browser.webview = false;
    }
  }
  browser.majorVersion = parseInt(browser.version, 10);
  return {
    browser,
    os,
    isMobile,
    isHints: false
  };
}
function getClientHintsAgent(osData) {
  var userAgentData = navigator.userAgentData;
  var brands = (userAgentData.uaList || userAgentData.brands).slice();
  var isMobile = userAgentData.mobile || false;
  var firstBrand = brands[0];
  var platform = (userAgentData.platform || navigator.platform).toLowerCase();
  var browser = {
    name: firstBrand.brand,
    version: firstBrand.version,
    majorVersion: -1,
    webkit: false,
    webkitVersion: "-1",
    chromium: false,
    chromiumVersion: "-1",
    webview: !!findPresetBrand(WEBVIEW_PRESETS, brands).brand || isWebView(getUserAgentString())
  };
  var os = {
    name: "unknown",
    version: "-1",
    majorVersion: -1
  };
  browser.webkit = !browser.chromium && some(WEBKIT_PRESETS, function(preset) {
    return findBrand(brands, preset);
  });
  var chromiumBrand = findPresetBrand(CHROMIUM_PRESETS, brands);
  browser.chromium = !!chromiumBrand.brand;
  browser.chromiumVersion = chromiumBrand.version || "-1";
  if (!browser.chromium) {
    var webkitBrand = findPresetBrand(WEBKIT_PRESETS, brands);
    browser.webkit = !!webkitBrand.brand;
    browser.webkitVersion = webkitBrand.version || "-1";
  }
  var platfomResult = find$1(OS_PRESETS, function(preset) {
    return new RegExp("" + preset.test, "g").exec(platform);
  });
  os.name = platfomResult ? platfomResult.id : "";
  {
    var browserBrand = findPresetBrand(BROWSER_PRESETS, brands);
    browser.name = browserBrand.brand || browser.name;
    browser.version = browserBrand.brand && osData ? osData.uaFullVersion : browserBrand.version;
  }
  if (browser.webkit) {
    os.name = isMobile ? "ios" : "mac";
  }
  if (os.name === "ios" && browser.webview) {
    browser.version = "-1";
  }
  os.version = convertVersion(os.version);
  browser.version = convertVersion(browser.version);
  os.majorVersion = parseInt(os.version, 10);
  browser.majorVersion = parseInt(browser.version, 10);
  return {
    browser,
    os,
    isMobile,
    isHints: true
  };
}
function agent(userAgent) {
  if (hasUserAgentData()) {
    return getClientHintsAgent();
  } else {
    return getLegacyAgent(userAgent);
  }
}
function keys(obj) {
  return Object.keys(obj);
}
var OBSERVERS_PATH = "__observers__";
var COMPUTED_PATH = "__computed__";
var CFCS_DETECTED_DEPENDENCIES_VERSION = 1;
var CFCS_DETECTED_DEPENDENCIES = "__CFCS_DETECTED_DEPENDENCIES__";
var extendStatics$4 = function(d, b) {
  extendStatics$4 = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
  };
  return extendStatics$4(d, b);
};
function __extends$4(d, b) {
  if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics$4(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
function getDetectedStack() {
  Object[CFCS_DETECTED_DEPENDENCIES] = Object[CFCS_DETECTED_DEPENDENCIES] || {};
  var versionList = Object[CFCS_DETECTED_DEPENDENCIES];
  versionList[CFCS_DETECTED_DEPENDENCIES_VERSION] = versionList[CFCS_DETECTED_DEPENDENCIES_VERSION] || [];
  return versionList[CFCS_DETECTED_DEPENDENCIES_VERSION];
}
function getCurrentDetected() {
  var stack = getDetectedStack();
  return stack[stack.length - 1];
}
function detectDependencies(host) {
  var stack = getDetectedStack();
  var observers = [];
  var detected = {
    host,
    observers,
    push: function(observer) {
      if (host !== observer && observers.indexOf(observer) === -1) {
        observers.push(observer);
      }
    }
  };
  stack.push(detected);
  return detected;
}
function endDetectDependencies() {
  var stack = getDetectedStack();
  return stack.pop();
}
var Observer = /* @__PURE__ */ (function() {
  function Observer2(value) {
    this._emitter = new Component();
    this._current = value;
  }
  var __proto = Observer2.prototype;
  Object.defineProperty(__proto, "current", {
    /**
     * return the current value.
     */
    get: function() {
      var currentDetected = getCurrentDetected();
      currentDetected === null || currentDetected === void 0 ? void 0 : currentDetected.push(this);
      return this._current;
    },
    set: function(value) {
      this._setCurrent(value);
    },
    enumerable: false,
    configurable: true
  });
  __proto.subscribe = function(callback) {
    this.current;
    this._emitter.on("update", callback);
    return this;
  };
  __proto.unsubscribe = function(callback) {
    this._emitter.off("update", callback);
    return this;
  };
  __proto._setCurrent = function(value) {
    var prevValue = this._current;
    var isUpdate = value !== prevValue;
    this._current = value;
    if (isUpdate) {
      this._emitter.trigger("update", value, prevValue);
    }
  };
  __proto.toString = function() {
    return "".concat(this.current);
  };
  __proto.valueOf = function() {
    return this.current;
  };
  return Observer2;
})();
var ComputedObserver = /* @__PURE__ */ (function(_super) {
  __extends$4(ComputedObserver2, _super);
  function ComputedObserver2(_computedCallback) {
    var _this = _super.call(this) || this;
    _this._computedCallback = _computedCallback;
    _this._registered = [];
    _this._onCheckUpdate = function() {
      _this._setCurrent(_this.current);
    };
    _this._current = _this.current;
    return _this;
  }
  var __proto = ComputedObserver2.prototype;
  Object.defineProperty(__proto, "current", {
    get: function() {
      var _this = this;
      detectDependencies(this);
      var value = this._computedCallback();
      var results = endDetectDependencies();
      this._registered.forEach(function(observer) {
        observer.unsubscribe(_this._onCheckUpdate);
      });
      results.observers.forEach(function(observer) {
        observer.subscribe(_this._onCheckUpdate);
      });
      this._registered = results.observers;
      return value;
    },
    enumerable: false,
    configurable: true
  });
  return ComputedObserver2;
})(Observer);
function injectObserve(prototype, memberName, publicName) {
  if (publicName === void 0) {
    publicName = memberName;
  }
  var nextAttributes = {
    configurable: true,
    get: function() {
      return getObserver(this, publicName).current;
    },
    set: function(value) {
      getObserver(this, publicName, value).current = value;
    }
  };
  Object.defineProperty(prototype, memberName, nextAttributes);
  if (publicName !== memberName) {
    Object.defineProperty(prototype, publicName, {
      configurable: true,
      get: function() {
        return getObserver(this, publicName).current;
      }
    });
  }
}
function Observe() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  if (args.length > 1) {
    return injectObserve(args[0], args[1]);
  }
  return function(prototype, memberName) {
    return injectObserve(prototype, memberName, args[0]);
  };
}
function injectReactiveSubscribe(object) {
  object["subscribe"] = function(name, callback) {
    this[name];
    getObserver(this, name).subscribe(callback);
  };
  object["unsubscribe"] = function(name, callback) {
    var _this = this;
    if (!name) {
      keys(getObservers(this)).forEach(function(observerName) {
        _this.unsubscribe(observerName);
      });
      return;
    }
    if (!(name in this)) {
      return;
    }
    getObserver(this, name).unsubscribe(callback);
  };
}
function ReactiveSubscribe(Constructor) {
  var prototype = Constructor.prototype;
  injectReactiveSubscribe(prototype);
}
function observe(defaultValue) {
  return new Observer(defaultValue);
}
function computed(computedCallback) {
  return new ComputedObserver(computedCallback);
}
function defineObservers(instance) {
  var observers = {};
  Object.defineProperty(instance, OBSERVERS_PATH, {
    get: function() {
      return observers;
    }
  });
  return observers;
}
function getObservers(instance, isComputed) {
  var _a, _b;
  if (!instance[OBSERVERS_PATH]) {
    defineObservers(instance);
  }
  var observers = instance[OBSERVERS_PATH];
  if (!isComputed) {
    var computedList = (_b = (_a = instance === null || instance === void 0 ? void 0 : instance.constructor) === null || _a === void 0 ? void 0 : _a.prototype) === null || _b === void 0 ? void 0 : _b[COMPUTED_PATH];
    if (computedList) {
      computedList.forEach(function(name) {
        if (!(name in observers) && name in instance) {
          instance[name];
        }
      });
    }
  }
  return observers;
}
function getObserver(instance, name, defaultValue) {
  var observers = getObservers(instance);
  if (!observers[name]) {
    observers[name] = observe(defaultValue);
  }
  return observers[name];
}
function Computed(prototype, memberName, attributes) {
  var get = attributes.get;
  function getComputed() {
    var observers = getObservers(this, true);
    if (!(memberName in observers)) {
      observers[memberName] = computed(get.bind(this));
    }
    return getObserver(this, memberName).current;
  }
  var nextAttributes = {
    configurable: true,
    get: getComputed
  };
  prototype[COMPUTED_PATH] || (prototype[COMPUTED_PATH] = []);
  var computedList = prototype[COMPUTED_PATH];
  if (computedList.indexOf(memberName) === -1) {
    computedList.push(memberName);
  }
  Object.defineProperty(prototype, memberName, nextAttributes);
  return nextAttributes;
}
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var extendStatics$3 = function(d, b) {
  extendStatics$3 = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
  };
  return extendStatics$3(d, b);
};
function __extends$3(d, b) {
  extendStatics$3(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign$2 = function() {
  __assign$2 = Object.assign || function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign$2.apply(this, arguments);
};
function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
var win;
if (typeof window === "undefined") {
  win = {
    navigator: {
      userAgent: ""
    }
  };
} else {
  win = window;
}
var DIRECTION_NONE = 1;
var DIRECTION_LEFT = 2;
var DIRECTION_RIGHT = 4;
var DIRECTION_HORIZONTAL = 2 | 4;
var DIRECTION_UP = 8;
var DIRECTION_DOWN = 16;
var DIRECTION_VERTICAL = 8 | 16;
var DIRECTION_ALL = 2 | 4 | 8 | 16;
var MOUSE_LEFT = "left";
var MOUSE_RIGHT = "right";
var MOUSE_MIDDLE = "middle";
var MOUSE_BUTTON_CODE_MAP = {
  1: MOUSE_LEFT,
  2: MOUSE_MIDDLE,
  3: MOUSE_RIGHT
};
var ANY = "any";
var NONE = "none";
var SHIFT = "shift";
var CTRL = "ctrl";
var ALT = "alt";
var META = "meta";
var VELOCITY_INTERVAL = 16;
var IOS_EDGE_THRESHOLD = 30;
var IS_IOS_SAFARI = "ontouchstart" in win && agent().browser.name === "safari";
var TRANSFORM = (function() {
  if (typeof document === "undefined") {
    return "";
  }
  var bodyStyle = (document.head || document.getElementsByTagName("head")[0]).style;
  var target = ["transform", "webkitTransform", "msTransform", "mozTransform"];
  for (var i = 0, len = target.length; i < len; i++) {
    if (target[i] in bodyStyle) {
      return target[i];
    }
  }
  return "";
})();
var PREVENT_DRAG_CSSPROPS = {
  "-webkit-user-select": "none",
  "-ms-user-select": "none",
  "-moz-user-select": "none",
  "user-select": "none",
  "-webkit-user-drag": "none"
};
var toArray$2 = function(nodes) {
  var el = [];
  for (var i = 0, len = nodes.length; i < len; i++) {
    el.push(nodes[i]);
  }
  return el;
};
var $ = function(param, multi) {
  if (multi === void 0) {
    multi = false;
  }
  var el;
  if (typeof param === "string") {
    var match = param.match(/^<([a-z]+)\s*([^>]*)>/);
    if (match) {
      var dummy = document.createElement("div");
      dummy.innerHTML = param;
      el = toArray$2(dummy.childNodes);
    } else {
      el = toArray$2(document.querySelectorAll(param));
    }
    if (!multi) {
      el = el.length >= 1 ? el[0] : void 0;
    }
  } else if (param === win) {
    el = param;
  } else if ("value" in param || "current" in param) {
    el = param.value || param.current;
  } else if (param.nodeName && (param.nodeType === 1 || param.nodeType === 9)) {
    el = param;
  } else if ("jQuery" in win && param instanceof jQuery || param.constructor.prototype.jquery) {
    el = multi ? param.toArray() : param.get(0);
  } else if (Array.isArray(param)) {
    el = param.map(function(v) {
      return $(v);
    });
    if (!multi) {
      el = el.length >= 1 ? el[0] : void 0;
    }
  }
  return el;
};
var raf = win.requestAnimationFrame || win.webkitRequestAnimationFrame;
var caf = win.cancelAnimationFrame || win.webkitCancelAnimationFrame;
if (raf && !caf) {
  var keyInfo_1 = {};
  var oldraf_1 = raf;
  raf = function(callback) {
    var wrapCallback = function(timestamp) {
      if (keyInfo_1[key]) {
        callback(timestamp);
      }
    };
    var key = oldraf_1(wrapCallback);
    keyInfo_1[key] = true;
    return key;
  };
  caf = function(key) {
    delete keyInfo_1[key];
  };
} else if (!(raf && caf)) {
  raf = function(callback) {
    return win.setTimeout(function() {
      callback(win.performance && win.performance.now && win.performance.now() || (/* @__PURE__ */ new Date()).getTime());
    }, 16);
  };
  caf = win.clearTimeout;
}
var requestAnimationFrame = function(fp) {
  return raf(fp);
};
var cancelAnimationFrame = function(key) {
  caf(key);
};
var map = function(obj, callback) {
  var tranformed = {};
  for (var k in obj) {
    if (k) {
      tranformed[k] = callback(obj[k], k);
    }
  }
  return tranformed;
};
var filter = function(obj, callback) {
  var filtered = {};
  for (var k in obj) {
    if (k && callback(obj[k], k)) {
      filtered[k] = obj[k];
    }
  }
  return filtered;
};
var every = function(obj, callback) {
  for (var k in obj) {
    if (k && !callback(obj[k], k)) {
      return false;
    }
  }
  return true;
};
var equal = function(target, base) {
  return every(target, function(v, k) {
    return v === base[k];
  });
};
var roundNumFunc = {};
var roundNumber = function(num, roundUnit) {
  if (!roundNumFunc[roundUnit]) {
    roundNumFunc[roundUnit] = getRoundFunc(roundUnit);
  }
  return roundNumFunc[roundUnit](num);
};
var roundNumbers = function(num, roundUnit) {
  if (!num || !roundUnit) {
    return num;
  }
  return map(num, function(value, key) {
    return roundNumber(value, typeof roundUnit === "number" ? roundUnit : roundUnit[key]);
  });
};
var getDecimalPlace = function(val) {
  if (!isFinite(val)) {
    return 0;
  }
  var v = "".concat(val);
  if (v.indexOf("e") >= 0) {
    var p = 0;
    var e = 1;
    while (Math.round(val * e) / e !== val) {
      e *= 10;
      p++;
    }
    return p;
  }
  return v.indexOf(".") >= 0 ? v.length - v.indexOf(".") - 1 : 0;
};
var inversePow = function(n) {
  return 1 / Math.pow(10, n);
};
var getRoundFunc = function(v) {
  var p = v < 1 ? Math.pow(10, getDecimalPlace(v)) : 1;
  return function(n) {
    if (v === 0) {
      return 0;
    }
    return Math.round(Math.round(n / v) * v * p) / p;
  };
};
var getAngle = function(posX, posY) {
  return Math.atan2(posY, posX) * 180 / Math.PI;
};
var isCssPropsFromAxes = function(originalCssProps) {
  var same = true;
  Object.keys(PREVENT_DRAG_CSSPROPS).forEach(function(prop) {
    if (!originalCssProps || originalCssProps[prop] !== PREVENT_DRAG_CSSPROPS[prop]) {
      same = false;
    }
  });
  return same;
};
var getDirection$1 = function(useHorizontal, useVertical) {
  if (useHorizontal && useVertical) {
    return DIRECTION_ALL;
  } else if (useHorizontal) {
    return DIRECTION_HORIZONTAL;
  } else if (useVertical) {
    return DIRECTION_VERTICAL;
  } else {
    return DIRECTION_NONE;
  }
};
var useDirection = function(checkType, direction, userDirection) {
  if (userDirection) {
    return !!(direction === DIRECTION_ALL || direction & checkType && userDirection & checkType);
  } else {
    return !!(direction & checkType);
  }
};
var setCssProps = function(element, option, direction) {
  var _a;
  var touchActionMap = (_a = {}, _a[DIRECTION_NONE] = "auto", _a[DIRECTION_ALL] = "none", _a[DIRECTION_VERTICAL] = "pan-x", _a[DIRECTION_HORIZONTAL] = "pan-y", _a);
  var oldCssProps = {};
  if (element && element.style) {
    var touchAction = option.touchAction ? option.touchAction : touchActionMap[direction];
    var newCssProps_1 = __assign$2(__assign$2({}, PREVENT_DRAG_CSSPROPS), {
      "touch-action": element.style["touch-action"] === "none" ? "none" : touchAction
    });
    Object.keys(newCssProps_1).forEach(function(prop) {
      oldCssProps[prop] = element.style[prop];
    });
    Object.keys(newCssProps_1).forEach(function(prop) {
      element.style[prop] = newCssProps_1[prop];
    });
  }
  return oldCssProps;
};
var revertCssProps = function(element, originalCssProps) {
  if (element && element.style && originalCssProps) {
    Object.keys(originalCssProps).forEach(function(prop) {
      element.style[prop] = originalCssProps[prop];
    });
  }
  return;
};
var EventManager = /* @__PURE__ */ (function() {
  function EventManager2(_axes) {
    this._axes = _axes;
    this.holdingCount = 0;
  }
  var __proto = EventManager2.prototype;
  __proto.hold = function(pos, option) {
    var roundPos = this._getRoundPos(pos).roundPos;
    this._axes.trigger(new ComponentEvent$1("hold", {
      pos: roundPos,
      input: option.input || null,
      inputEvent: option.event || null,
      isTrusted: true
    }));
  };
  __proto.triggerRelease = function(param) {
    var _a = this._getRoundPos(param.destPos, param.depaPos), roundPos = _a.roundPos, roundDepa = _a.roundDepa;
    param.destPos = roundPos;
    param.depaPos = roundDepa;
    param.setTo = this._createUserControll(param.destPos, param.duration);
    this._axes.trigger(new ComponentEvent$1("release", __assign$2(__assign$2({}, param), {
      bounceRatio: this._getBounceRatio(roundPos)
    })));
  };
  __proto.triggerChange = function(pos, depaPos, option, holding) {
    var _this = this;
    if (holding === void 0) {
      holding = false;
    }
    var animationManager = this.animationManager;
    var axisManager = animationManager.axisManager;
    var eventInfo = animationManager.getEventInfo();
    var _a = this._getRoundPos(pos, depaPos), roundPos = _a.roundPos, roundDepa = _a.roundDepa;
    var moveTo = axisManager.moveTo(roundPos, roundDepa);
    var inputEvent = (option === null || option === void 0 ? void 0 : option.event) || (eventInfo === null || eventInfo === void 0 ? void 0 : eventInfo.event) || null;
    var param = {
      pos: moveTo.pos,
      delta: moveTo.delta,
      bounceRatio: this._getBounceRatio(moveTo.pos),
      holding,
      inputEvent,
      isTrusted: !!inputEvent,
      input: (option === null || option === void 0 ? void 0 : option.input) || (eventInfo === null || eventInfo === void 0 ? void 0 : eventInfo.input) || null,
      set: inputEvent ? this._createUserControll(moveTo.pos) : function() {
      }
      // eslint-disable-line @typescript-eslint/no-empty-function
    };
    var event = new ComponentEvent$1("change", param);
    this._axes.trigger(event);
    Object.keys(moveTo.pos).forEach(function(axis) {
      var p = moveTo.pos[axis];
      getObserver(_this._axes, axis, p).current = p;
    });
    if (inputEvent) {
      axisManager.set(param.set().destPos);
    }
    return !event.isCanceled();
  };
  __proto.triggerAnimationStart = function(param) {
    var _a = this._getRoundPos(param.destPos, param.depaPos), roundPos = _a.roundPos, roundDepa = _a.roundDepa;
    param.destPos = roundPos;
    param.depaPos = roundDepa;
    param.setTo = this._createUserControll(param.destPos, param.duration);
    var event = new ComponentEvent$1("animationStart", param);
    this._axes.trigger(event);
    return !event.isCanceled();
  };
  __proto.triggerAnimationEnd = function(isTrusted) {
    if (isTrusted === void 0) {
      isTrusted = false;
    }
    this._axes.trigger(new ComponentEvent$1("animationEnd", {
      isTrusted
    }));
  };
  __proto.triggerFinish = function(isTrusted) {
    if (isTrusted === void 0) {
      isTrusted = false;
    }
    this._axes.trigger(new ComponentEvent$1("finish", {
      isTrusted
    }));
  };
  __proto.setAnimationManager = function(animationManager) {
    this.animationManager = animationManager;
  };
  __proto.destroy = function() {
    this._axes.off();
  };
  __proto._createUserControll = function(pos, duration) {
    if (duration === void 0) {
      duration = 0;
    }
    var userControl = {
      destPos: __assign$2({}, pos),
      duration
    };
    return function(toPos, userDuration) {
      if (toPos) {
        userControl.destPos = __assign$2({}, toPos);
      }
      if (userDuration !== void 0) {
        userControl.duration = userDuration;
      }
      return userControl;
    };
  };
  __proto._getRoundPos = function(pos, depaPos) {
    var roundUnit = this._axes.options.round;
    return {
      roundPos: roundNumbers(pos, roundUnit),
      roundDepa: roundNumbers(depaPos, roundUnit)
    };
  };
  __proto._getBounceRatio = function(pos) {
    return this._axes.axisManager.map(pos, function(v, opt) {
      if (v < opt.range[0] && opt.bounce[0] !== 0) {
        return (opt.range[0] - v) / opt.bounce[0];
      } else if (v > opt.range[1] && opt.bounce[1] !== 0) {
        return (v - opt.range[1]) / opt.bounce[1];
      } else {
        return 0;
      }
    });
  };
  __decorate([Observe], EventManager2.prototype, "holdingCount", void 0);
  return EventManager2;
})();
var InterruptManager = /* @__PURE__ */ (function() {
  function InterruptManager2(_options) {
    this._options = _options;
    this._prevented = false;
  }
  var __proto = InterruptManager2.prototype;
  __proto.isInterrupting = function() {
    return this._options.interruptable || this._prevented;
  };
  __proto.isInterrupted = function() {
    return !this._options.interruptable && this._prevented;
  };
  __proto.setInterrupt = function(prevented) {
    if (!this._options.interruptable) {
      this._prevented = prevented;
    }
  };
  return InterruptManager2;
})();
var getInsidePosition = function(destPos, range2, circular, bounce) {
  var toDestPos = destPos;
  var targetRange = [circular[0] ? range2[0] : bounce ? range2[0] - bounce[0] : range2[0], circular[1] ? range2[1] : bounce ? range2[1] + bounce[1] : range2[1]];
  toDestPos = Math.max(targetRange[0], toDestPos);
  toDestPos = Math.min(targetRange[1], toDestPos);
  return toDestPos;
};
var isOutside = function(pos, range2) {
  return pos < range2[0] || pos > range2[1];
};
var isEndofBounce = function(pos, range2, bounce, circular) {
  return !circular[0] && pos === range2[0] - bounce[0] || !circular[1] && pos === range2[1] + bounce[1];
};
var getDuration = function(distance, deceleration) {
  var duration = Math.sqrt(distance / deceleration * 2);
  return duration < 100 ? 0 : duration;
};
var isCircularable = function(destPos, range2, circular) {
  return circular[1] && destPos > range2[1] || circular[0] && destPos < range2[0];
};
var getCirculatedPos = function(pos, range2, circular) {
  var toPos = pos;
  var min = range2[0];
  var max = range2[1];
  var length = max - min;
  if (circular[1] && pos > max) {
    toPos = (toPos - max) % length + min;
  }
  if (circular[0] && pos < min) {
    toPos = (toPos - min) % length + max;
  }
  return toPos;
};
var AxisManager = /* @__PURE__ */ (function() {
  function AxisManager2(_axis) {
    var _this = this;
    this._axis = _axis;
    this._complementOptions();
    this._pos = Object.keys(this._axis).reduce(function(pos, v) {
      pos[v] = _this._axis[v].startPos;
      return pos;
    }, {});
  }
  var __proto = AxisManager2.prototype;
  __proto.getDelta = function(depaPos, destPos) {
    var fullDepaPos = this.get(depaPos);
    return map(this.get(destPos), function(v, k) {
      return v - fullDepaPos[k];
    });
  };
  __proto.get = function(axes) {
    var _this = this;
    if (axes && Array.isArray(axes)) {
      return axes.reduce(function(acc, v) {
        if (v && v in _this._pos) {
          acc[v] = _this._pos[v];
        }
        return acc;
      }, {});
    } else {
      return __assign$2(__assign$2({}, this._pos), axes || {});
    }
  };
  __proto.moveTo = function(pos, depaPos) {
    if (depaPos === void 0) {
      depaPos = this._pos;
    }
    var delta = map(this._pos, function(v, key) {
      return key in pos && key in depaPos ? pos[key] - depaPos[key] : 0;
    });
    this.set(this.map(pos, function(v, opt) {
      return opt ? getCirculatedPos(v, opt.range, opt.circular) : 0;
    }));
    return {
      pos: __assign$2({}, this._pos),
      delta
    };
  };
  __proto.set = function(pos) {
    for (var k in pos) {
      if (k && k in this._pos) {
        this._pos[k] = pos[k];
      }
    }
  };
  __proto.every = function(pos, callback) {
    var axisOptions = this._axis;
    return every(pos, function(value, key) {
      return callback(value, axisOptions[key], key);
    });
  };
  __proto.filter = function(pos, callback) {
    var axisOptions = this._axis;
    return filter(pos, function(value, key) {
      return callback(value, axisOptions[key], key);
    });
  };
  __proto.map = function(pos, callback) {
    var axisOptions = this._axis;
    return map(pos, function(value, key) {
      return callback(value, axisOptions[key], key);
    });
  };
  __proto.isOutside = function(axes) {
    return !this.every(axes ? this.get(axes) : this._pos, function(v, opt) {
      return !isOutside(v, opt.range);
    });
  };
  __proto.getAxisOptions = function(key) {
    return this._axis[key];
  };
  __proto.setAxis = function(axis) {
    var _this = this;
    Object.keys(axis).forEach(function(key) {
      if (!_this._axis[key]) {
        throw new Error("Axis ".concat(key, " does not exist in Axes instance"));
      }
      _this._axis[key] = __assign$2(__assign$2({}, _this._axis[key]), axis[key]);
    });
    this._complementOptions();
  };
  __proto._complementOptions = function() {
    var _this = this;
    Object.keys(this._axis).forEach(function(axis) {
      _this._axis[axis] = __assign$2({
        range: [0, 100],
        startPos: _this._axis[axis].range[0],
        bounce: [0, 0],
        circular: [false, false]
      }, _this._axis[axis]);
      ["bounce", "circular"].forEach(function(v) {
        var axisOption = _this._axis;
        var key = axisOption[axis][v];
        if (/string|number|boolean/.test(typeof key)) {
          axisOption[axis][v] = [key, key];
        }
      });
    });
  };
  return AxisManager2;
})();
var SUPPORT_TOUCH = "ontouchstart" in win;
var SUPPORT_POINTER = "PointerEvent" in win;
var SUPPORT_MSPOINTER = "MSPointerEvent" in win;
var SUPPORT_POINTER_EVENTS = SUPPORT_POINTER || SUPPORT_MSPOINTER;
var isValidKey = function(event, inputKey) {
  if (!inputKey || inputKey.indexOf(ANY) > -1 || inputKey.indexOf(NONE) > -1 && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey || inputKey.indexOf(SHIFT) > -1 && event.shiftKey || inputKey.indexOf(CTRL) > -1 && event.ctrlKey || inputKey.indexOf(ALT) > -1 && event.altKey || inputKey.indexOf(META) > -1 && event.metaKey) {
    return true;
  }
  return false;
};
var EventInput = /* @__PURE__ */ (function() {
  function EventInput2() {
    var _this = this;
    this._stopContextMenu = function(event) {
      event.preventDefault();
      win.removeEventListener("contextmenu", _this._stopContextMenu);
    };
  }
  var __proto = EventInput2.prototype;
  __proto.extendEvent = function(event) {
    var _a;
    var prevEvent = this.prevEvent;
    var center = this._getCenter(event);
    var movement = prevEvent ? this._getMovement(event) : {
      x: 0,
      y: 0
    };
    var scale = prevEvent ? this._getScale(event) : 1;
    var angle = prevEvent ? getAngle(center.x - prevEvent.center.x, center.y - prevEvent.center.y) : 0;
    var deltaX = prevEvent ? prevEvent.deltaX + movement.x : movement.x;
    var deltaY = prevEvent ? prevEvent.deltaY + movement.y : movement.y;
    var offsetX = movement.x;
    var offsetY = movement.y;
    var latestInterval = this._latestInterval;
    var timeStamp = Date.now();
    var deltaTime = latestInterval ? timeStamp - latestInterval.timestamp : 0;
    var velocityX = prevEvent ? prevEvent.velocityX : 0;
    var velocityY = prevEvent ? prevEvent.velocityY : 0;
    var directionX = prevEvent ? prevEvent.directionX : 1;
    var directionY = prevEvent ? prevEvent.directionY : 1;
    if (offsetX > 0) {
      directionX = 1;
    } else if (offsetX < 0) {
      directionX = -1;
    }
    if (offsetY > 0) {
      directionY = 1;
    } else if (offsetY < 0) {
      directionY = -1;
    }
    if (!latestInterval || deltaTime >= VELOCITY_INTERVAL) {
      if (latestInterval) {
        _a = [(deltaX - latestInterval.deltaX) / deltaTime, (deltaY - latestInterval.deltaY) / deltaTime], velocityX = _a[0], velocityY = _a[1];
      }
      this._latestInterval = {
        timestamp: timeStamp,
        deltaX,
        deltaY
      };
    }
    return {
      srcEvent: event,
      scale,
      angle,
      center,
      deltaX,
      deltaY,
      offsetX,
      offsetY,
      directionX,
      directionY,
      velocityX,
      velocityY,
      preventSystemEvent: true
    };
  };
  __proto._getDistance = function(start, end) {
    var x = end.clientX - start.clientX;
    var y = end.clientY - start.clientY;
    return Math.sqrt(x * x + y * y);
  };
  __proto._getButton = function(event) {
    var buttonCodeMap = {
      1: MOUSE_LEFT,
      2: MOUSE_RIGHT,
      4: MOUSE_MIDDLE
    };
    var button = this._isTouchEvent(event) ? MOUSE_LEFT : buttonCodeMap[event.buttons];
    return button ? button : null;
  };
  __proto._isTouchEvent = function(event) {
    return event.type && event.type.indexOf("touch") > -1;
  };
  __proto._isValidButton = function(button, inputButton) {
    return inputButton.indexOf(button) > -1;
  };
  __proto._isValidEvent = function(event, inputKey, inputButton) {
    return (!inputKey || isValidKey(event, inputKey)) && (!inputButton || this._isValidButton(this._getButton(event), inputButton));
  };
  __proto._preventMouseButton = function(event, button) {
    if (button === MOUSE_RIGHT) {
      win.addEventListener("contextmenu", this._stopContextMenu);
    } else if (button === MOUSE_MIDDLE) {
      event.preventDefault();
    }
  };
  return EventInput2;
})();
var MouseEventInput = /* @__PURE__ */ (function(_super) {
  __extends$3(MouseEventInput2, _super);
  function MouseEventInput2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.start = ["mousedown"];
    _this.move = ["mousemove"];
    _this.end = ["mouseup"];
    return _this;
  }
  var __proto = MouseEventInput2.prototype;
  __proto.onEventStart = function(event, inputKey, inputButton) {
    var button = this._getButton(event);
    if (!this._isValidEvent(event, inputKey, inputButton)) {
      return null;
    }
    this._preventMouseButton(event, button);
    return this.extendEvent(event);
  };
  __proto.onEventMove = function(event, inputKey, inputButton) {
    if (!this._isValidEvent(event, inputKey, inputButton)) {
      return null;
    }
    return this.extendEvent(event);
  };
  __proto.onEventEnd = function() {
    return;
  };
  __proto.onRelease = function() {
    this.prevEvent = null;
    return;
  };
  __proto.getTouches = function(event, inputButton) {
    if (inputButton) {
      return this._isValidButton(MOUSE_BUTTON_CODE_MAP[event.which], inputButton) && this.end.indexOf(event.type) === -1 ? 1 : 0;
    }
    return 0;
  };
  __proto._getScale = function() {
    return 1;
  };
  __proto._getCenter = function(event) {
    return {
      x: event.clientX,
      y: event.clientY
    };
  };
  __proto._getMovement = function(event) {
    var prev = this.prevEvent.srcEvent;
    return {
      x: event.clientX - prev.clientX,
      y: event.clientY - prev.clientY
    };
  };
  return MouseEventInput2;
})(EventInput);
var TouchEventInput = /* @__PURE__ */ (function(_super) {
  __extends$3(TouchEventInput2, _super);
  function TouchEventInput2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.start = ["touchstart"];
    _this.move = ["touchmove"];
    _this.end = ["touchend", "touchcancel"];
    return _this;
  }
  var __proto = TouchEventInput2.prototype;
  __proto.onEventStart = function(event, inputKey) {
    this._baseTouches = event.touches;
    if (!this._isValidEvent(event, inputKey)) {
      return null;
    }
    return this.extendEvent(event);
  };
  __proto.onEventMove = function(event, inputKey) {
    if (!this._isValidEvent(event, inputKey)) {
      return null;
    }
    return this.extendEvent(event);
  };
  __proto.onEventEnd = function(event) {
    this._baseTouches = event.touches;
    return;
  };
  __proto.onRelease = function() {
    this.prevEvent = null;
    this._baseTouches = null;
    return;
  };
  __proto.getTouches = function(event) {
    return event.touches.length;
  };
  __proto._getScale = function(event) {
    if (event.touches.length !== 2 || this._baseTouches.length < 2) {
      return null;
    }
    return this._getDistance(event.touches[0], event.touches[1]) / this._getDistance(this._baseTouches[0], this._baseTouches[1]);
  };
  __proto._getCenter = function(event) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  };
  __proto._getMovement = function(event) {
    var prev = this.prevEvent.srcEvent;
    if (event.touches[0].identifier !== prev.touches[0].identifier) {
      return {
        x: 0,
        y: 0
      };
    }
    return {
      x: event.touches[0].clientX - prev.touches[0].clientX,
      y: event.touches[0].clientY - prev.touches[0].clientY
    };
  };
  return TouchEventInput2;
})(EventInput);
var PointerEventInput = /* @__PURE__ */ (function(_super) {
  __extends$3(PointerEventInput2, _super);
  function PointerEventInput2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.start = SUPPORT_POINTER ? ["pointerdown"] : ["MSPointerDown"];
    _this.move = SUPPORT_POINTER ? ["pointermove"] : ["MSPointerMove"];
    _this.end = SUPPORT_POINTER ? ["pointerup", "pointercancel"] : ["MSPointerUp", "MSPointerCancel"];
    _this._firstInputs = [];
    _this._recentInputs = [];
    return _this;
  }
  var __proto = PointerEventInput2.prototype;
  __proto.onEventStart = function(event, inputKey, inputButton) {
    var button = this._getButton(event);
    if (!this._isValidEvent(event, inputKey, inputButton)) {
      return null;
    }
    this._preventMouseButton(event, button);
    this._updatePointerEvent(event);
    return this.extendEvent(event);
  };
  __proto.onEventMove = function(event, inputKey, inputButton) {
    if (!this._isValidEvent(event, inputKey, inputButton)) {
      return null;
    }
    this._updatePointerEvent(event);
    return this.extendEvent(event);
  };
  __proto.onEventEnd = function(event) {
    this._removePointerEvent(event);
  };
  __proto.onRelease = function() {
    this.prevEvent = null;
    this._firstInputs = [];
    this._recentInputs = [];
    return;
  };
  __proto.getTouches = function() {
    return this._recentInputs.length;
  };
  __proto._getScale = function() {
    if (this._recentInputs.length !== 2) {
      return null;
    }
    return this._getDistance(this._recentInputs[0], this._recentInputs[1]) / this._getDistance(this._firstInputs[0], this._firstInputs[1]);
  };
  __proto._getCenter = function(event) {
    return {
      x: event.clientX,
      y: event.clientY
    };
  };
  __proto._getMovement = function(event) {
    var prev = this.prevEvent.srcEvent;
    if (event.pointerId !== prev.pointerId) {
      return {
        x: 0,
        y: 0
      };
    }
    return {
      x: event.clientX - prev.clientX,
      y: event.clientY - prev.clientY
    };
  };
  __proto._updatePointerEvent = function(event) {
    var _this = this;
    var addFlag = false;
    this._recentInputs.forEach(function(e, i) {
      if (e.pointerId === event.pointerId) {
        addFlag = true;
        _this._recentInputs[i] = event;
      }
    });
    if (!addFlag) {
      this._firstInputs.push(event);
      this._recentInputs.push(event);
    }
  };
  __proto._removePointerEvent = function(event) {
    this._firstInputs = this._firstInputs.filter(function(x) {
      return x.pointerId !== event.pointerId;
    });
    this._recentInputs = this._recentInputs.filter(function(x) {
      return x.pointerId !== event.pointerId;
    });
  };
  return PointerEventInput2;
})(EventInput);
var TouchMouseEventInput = /* @__PURE__ */ (function(_super) {
  __extends$3(TouchMouseEventInput2, _super);
  function TouchMouseEventInput2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.start = ["mousedown", "touchstart"];
    _this.move = ["mousemove", "touchmove"];
    _this.end = ["mouseup", "touchend", "touchcancel"];
    return _this;
  }
  var __proto = TouchMouseEventInput2.prototype;
  __proto.onEventStart = function(event, inputKey, inputButton) {
    var button = this._getButton(event);
    if (this._isTouchEvent(event)) {
      this._baseTouches = event.touches;
    }
    if (!this._isValidEvent(event, inputKey, inputButton)) {
      return null;
    }
    this._preventMouseButton(event, button);
    return this.extendEvent(event);
  };
  __proto.onEventMove = function(event, inputKey, inputButton) {
    if (!this._isValidEvent(event, inputKey, inputButton)) {
      return null;
    }
    return this.extendEvent(event);
  };
  __proto.onEventEnd = function(event) {
    if (this._isTouchEvent(event)) {
      this._baseTouches = event.touches;
    }
    return;
  };
  __proto.onRelease = function() {
    this.prevEvent = null;
    this._baseTouches = null;
    return;
  };
  __proto.getTouches = function(event, inputButton) {
    if (this._isTouchEvent(event)) {
      return event.touches.length;
    } else {
      return this._isValidButton(MOUSE_BUTTON_CODE_MAP[event.which], inputButton) && this.end.indexOf(event.type) === -1 ? 1 : 0;
    }
  };
  __proto._getScale = function(event) {
    if (this._isTouchEvent(event)) {
      if (event.touches.length !== 2 || this._baseTouches.length < 2) {
        return 1;
      }
      return this._getDistance(event.touches[0], event.touches[1]) / this._getDistance(this._baseTouches[0], this._baseTouches[1]);
    }
    return this.prevEvent.scale;
  };
  __proto._getCenter = function(event) {
    if (this._isTouchEvent(event)) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
    return {
      x: event.clientX,
      y: event.clientY
    };
  };
  __proto._getMovement = function(event) {
    var _this = this;
    var prev = this.prevEvent.srcEvent;
    var _a = [event, prev].map(function(e) {
      if (_this._isTouchEvent(e)) {
        return {
          id: e.touches[0].identifier,
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
      return {
        id: null,
        x: e.clientX,
        y: e.clientY
      };
    }), nextSpot = _a[0], prevSpot = _a[1];
    return nextSpot.id === prevSpot.id ? {
      x: nextSpot.x - prevSpot.x,
      y: nextSpot.y - prevSpot.y
    } : {
      x: 0,
      y: 0
    };
  };
  return TouchMouseEventInput2;
})(EventInput);
var toAxis = function(source, offset) {
  return offset.reduce(function(acc, v, i) {
    if (source[i]) {
      acc[source[i]] = v;
    }
    return acc;
  }, {});
};
var convertInputType = function(inputType) {
  if (inputType === void 0) {
    inputType = [];
  }
  var hasTouch = false;
  var hasMouse = false;
  var hasPointer = false;
  inputType.forEach(function(v) {
    switch (v) {
      case "mouse":
        hasMouse = true;
        break;
      case "touch":
        hasTouch = SUPPORT_TOUCH;
        break;
      case "pointer":
        hasPointer = SUPPORT_POINTER_EVENTS;
    }
  });
  if (hasPointer) {
    return new PointerEventInput();
  } else if (hasTouch && hasMouse) {
    return new TouchMouseEventInput();
  } else if (hasTouch) {
    return new TouchEventInput();
  } else if (hasMouse) {
    return new MouseEventInput();
  }
  return null;
};
function getAddEventOptions(eventName) {
  return eventName.indexOf("touch") > -1 ? {
    passive: false
  } : false;
}
var InputObserver = /* @__PURE__ */ (function() {
  function InputObserver2(_a) {
    var options = _a.options, interruptManager = _a.interruptManager, eventManager = _a.eventManager, axisManager = _a.axisManager, animationManager = _a.animationManager;
    this._isOutside = false;
    this._moveDistance = null;
    this._isStopped = false;
    this.options = options;
    this._interruptManager = interruptManager;
    this._eventManager = eventManager;
    this._axisManager = axisManager;
    this._animationManager = animationManager;
  }
  var __proto = InputObserver2.prototype;
  __proto.get = function(input) {
    return this._axisManager.get(input.axes);
  };
  __proto.hold = function(input, event) {
    if (this._interruptManager.isInterrupted() || !input.axes.length) {
      return;
    }
    var changeOption = {
      input,
      event
    };
    this._isStopped = false;
    this._interruptManager.setInterrupt(true);
    this._animationManager.stopAnimation(changeOption);
    ++this._eventManager.holdingCount;
    if (!this._moveDistance) {
      this._eventManager.hold(this._axisManager.get(), changeOption);
    }
    this._isOutside = this._axisManager.isOutside(input.axes);
    this._moveDistance = this._axisManager.get(input.axes);
  };
  __proto.change = function(input, event, offset, useAnimation) {
    if (this._isStopped || !this._interruptManager.isInterrupting() || this._axisManager.every(offset, function(v) {
      return v === 0;
    })) {
      return;
    }
    var nativeEvent = event.srcEvent ? event.srcEvent : event;
    if (nativeEvent.__childrenAxesAlreadyChanged) {
      return;
    }
    var depaPos = this._moveDistance || this._axisManager.get(input.axes);
    var destPos;
    destPos = map(depaPos, function(v, k) {
      return v + (offset[k] || 0);
    });
    if (this._moveDistance) {
      this._moveDistance = this._axisManager.map(destPos, function(v, _a) {
        var circular = _a.circular, range2 = _a.range;
        return circular && (circular[0] || circular[1]) ? getCirculatedPos(v, range2, circular) : v;
      });
    }
    if (this._isOutside && this._axisManager.every(depaPos, function(v, opt) {
      return !isOutside(v, opt.range);
    })) {
      this._isOutside = false;
    }
    depaPos = this._atOutside(depaPos);
    destPos = this._atOutside(destPos);
    if (!this.options.nested || !this._isEndofAxis(offset, depaPos, destPos)) {
      nativeEvent.__childrenAxesAlreadyChanged = true;
    }
    var changeOption = {
      input,
      event
    };
    if (useAnimation) {
      var duration = this._animationManager.getDuration(destPos, depaPos);
      this._animationManager.animateTo(destPos, duration, changeOption);
    } else {
      var isCanceled = !this._eventManager.triggerChange(destPos, depaPos, changeOption, true);
      if (isCanceled) {
        this._isStopped = true;
        this._moveDistance = null;
        this._animationManager.finish(false);
      }
    }
  };
  __proto.release = function(input, event, velocity, inputDuration) {
    if (this._isStopped || !this._interruptManager.isInterrupting() || !this._moveDistance) {
      return;
    }
    var nativeEvent = event.srcEvent ? event.srcEvent : event;
    if (nativeEvent.__childrenAxesAlreadyReleased) {
      velocity = velocity.map(function() {
        return 0;
      });
    }
    var pos = this._axisManager.get(input.axes);
    var depaPos = this._axisManager.get();
    var displacement = this._animationManager.getDisplacement(velocity);
    var offset = toAxis(input.axes, displacement);
    var destPos = this._axisManager.get(this._axisManager.map(offset, function(v, opt, k) {
      if (opt.circular && (opt.circular[0] || opt.circular[1])) {
        return pos[k] + v;
      } else {
        return getInsidePosition(pos[k] + v, opt.range, opt.circular, opt.bounce);
      }
    }));
    nativeEvent.__childrenAxesAlreadyReleased = true;
    var duration = this._animationManager.getDuration(destPos, pos, inputDuration);
    if (duration === 0) {
      destPos = __assign$2({}, depaPos);
    }
    var param = {
      depaPos,
      destPos,
      duration,
      delta: this._axisManager.getDelta(depaPos, destPos),
      inputEvent: event,
      input,
      isTrusted: true
    };
    --this._eventManager.holdingCount;
    this._eventManager.triggerRelease(param);
    if (this._eventManager.holdingCount === 0) {
      this._moveDistance = null;
    }
    var userWish = this._animationManager.getUserControl(param);
    var isEqual = equal(userWish.destPos, depaPos);
    var changeOption = {
      input,
      event
    };
    if (isEqual || userWish.duration === 0) {
      if (!isEqual) {
        this._eventManager.triggerChange(userWish.destPos, depaPos, changeOption, true);
      }
      this._interruptManager.setInterrupt(false);
      if (this._axisManager.isOutside()) {
        this._animationManager.restore(changeOption);
      } else {
        this._eventManager.triggerFinish(true);
      }
    } else {
      this._animationManager.animateTo(userWish.destPos, userWish.duration, changeOption);
    }
  };
  __proto._atOutside = function(pos) {
    var _this = this;
    if (this._isOutside) {
      return this._axisManager.map(pos, function(v, opt) {
        var tn = opt.range[0] - opt.bounce[0];
        var tx = opt.range[1] + opt.bounce[1];
        return v > tx ? tx : v < tn ? tn : v;
      });
    } else {
      return this._axisManager.map(pos, function(v, opt) {
        var min = opt.range[0];
        var max = opt.range[1];
        var out = opt.bounce;
        var circular = opt.circular;
        if (circular[0] && v < min || circular[1] && v > max) {
          return v;
        } else if (v < min) {
          return min - _this._animationManager.interpolate(min - v, out[0]);
        } else if (v > max) {
          return max + _this._animationManager.interpolate(v - max, out[1]);
        }
        return v;
      });
    }
  };
  __proto._isEndofAxis = function(offset, depaPos, destPos) {
    return this._axisManager.every(depaPos, function(value, option, key) {
      return offset[key] === 0 || depaPos[key] === destPos[key] && isEndofBounce(value, option.range, option.bounce, option.circular);
    });
  };
  return InputObserver2;
})();
var clamp$1 = function(value, min, max) {
  return Math.max(Math.min(value, max), min);
};
var AnimationManager = /* @__PURE__ */ (function() {
  function AnimationManager2(_a) {
    var options = _a.options, interruptManager = _a.interruptManager, eventManager = _a.eventManager, axisManager = _a.axisManager;
    this._options = options;
    this.interruptManager = interruptManager;
    this.eventManager = eventManager;
    this.axisManager = axisManager;
    this.animationEnd = this.animationEnd.bind(this);
  }
  var __proto = AnimationManager2.prototype;
  __proto.getDuration = function(depaPos, destPos, wishDuration) {
    var _this = this;
    var duration;
    if (typeof wishDuration !== "undefined") {
      duration = wishDuration;
    } else {
      var durations_1 = map(destPos, function(v, k) {
        return getDuration(Math.abs(v - depaPos[k]), _this._options.deceleration);
      });
      duration = Object.keys(durations_1).reduce(function(max, v) {
        return Math.max(max, durations_1[v]);
      }, -Infinity);
    }
    return clamp$1(duration, this._options.minimumDuration, this._options.maximumDuration);
  };
  __proto.getDisplacement = function(velocity) {
    var totalVelocity = Math.pow(velocity.reduce(function(total, v) {
      return total + v * v;
    }, 0), 1 / velocity.length);
    var duration = Math.abs(totalVelocity / -this._options.deceleration);
    return velocity.map(function(v) {
      return v / 2 * duration;
    });
  };
  __proto.stopAnimation = function(option) {
    if (this._animateParam) {
      var orgPos_1 = this.axisManager.get();
      var pos = this.axisManager.map(orgPos_1, function(v, opt) {
        return getCirculatedPos(v, opt.range, opt.circular);
      });
      if (!every(pos, function(v, k) {
        return orgPos_1[k] === v;
      })) {
        this.eventManager.triggerChange(pos, orgPos_1, option, !!option);
      }
      this._animateParam = null;
      if (this._raf) {
        cancelAnimationFrame(this._raf);
      }
      this._raf = null;
      this.eventManager.triggerAnimationEnd(!!(option === null || option === void 0 ? void 0 : option.event));
    }
  };
  __proto.getEventInfo = function() {
    if (this._animateParam && this._animateParam.input && this._animateParam.inputEvent) {
      return {
        input: this._animateParam.input,
        event: this._animateParam.inputEvent
      };
    } else {
      return null;
    }
  };
  __proto.restore = function(option) {
    var pos = this.axisManager.get();
    var destPos = this.axisManager.map(pos, function(v, opt) {
      return Math.min(opt.range[1], Math.max(opt.range[0], v));
    });
    this.stopAnimation();
    this.animateTo(destPos, this.getDuration(pos, destPos), option);
  };
  __proto.animationEnd = function() {
    var beforeParam = this.getEventInfo();
    this._animateParam = null;
    var circularTargets = this.axisManager.filter(this.axisManager.get(), function(v, opt) {
      return isCircularable(v, opt.range, opt.circular);
    });
    if (Object.keys(circularTargets).length > 0) {
      this.setTo(this.axisManager.map(circularTargets, function(v, opt) {
        return getCirculatedPos(v, opt.range, opt.circular);
      }));
    }
    this.interruptManager.setInterrupt(false);
    this.eventManager.triggerAnimationEnd(!!beforeParam);
    if (this.axisManager.isOutside()) {
      this.restore(beforeParam);
    } else {
      this.finish(!!beforeParam);
    }
  };
  __proto.finish = function(isTrusted) {
    this._animateParam = null;
    this.interruptManager.setInterrupt(false);
    this.eventManager.triggerFinish(isTrusted);
  };
  __proto.getUserControl = function(param) {
    var userWish = param.setTo();
    userWish.destPos = this.axisManager.get(userWish.destPos);
    userWish.duration = clamp$1(userWish.duration, this._options.minimumDuration, this._options.maximumDuration);
    return userWish;
  };
  __proto.animateTo = function(destPos, duration, option) {
    var _this = this;
    this.stopAnimation();
    var param = this._createAnimationParam(destPos, duration, option);
    var depaPos = __assign$2({}, param.depaPos);
    var retTrigger = this.eventManager.triggerAnimationStart(param);
    var userWish = this.getUserControl(param);
    if (!retTrigger && this.axisManager.every(userWish.destPos, function(v, opt) {
      return isCircularable(v, opt.range, opt.circular);
    })) {
      console.warn("You can't stop the 'animation' event when 'circular' is true.");
    }
    if (retTrigger && !equal(userWish.destPos, depaPos)) {
      var inputEvent = (option === null || option === void 0 ? void 0 : option.event) || null;
      this._animateLoop({
        depaPos,
        destPos: userWish.destPos,
        duration: userWish.duration,
        delta: this.axisManager.getDelta(depaPos, userWish.destPos),
        isTrusted: !!inputEvent,
        inputEvent,
        input: (option === null || option === void 0 ? void 0 : option.input) || null
      }, function() {
        return _this.animationEnd();
      });
    }
  };
  __proto.setTo = function(pos, duration) {
    if (duration === void 0) {
      duration = 0;
    }
    var axes = Object.keys(pos);
    var orgPos = this.axisManager.get(axes);
    if (equal(pos, orgPos)) {
      return this;
    }
    this.interruptManager.setInterrupt(true);
    var movedPos = filter(pos, function(v, k) {
      return orgPos[k] !== v;
    });
    if (!Object.keys(movedPos).length) {
      return this;
    }
    movedPos = this.axisManager.map(movedPos, function(v, opt) {
      var range2 = opt.range, circular = opt.circular;
      if (circular && (circular[0] || circular[1])) {
        return v;
      } else {
        return getInsidePosition(v, range2, circular);
      }
    });
    if (equal(movedPos, orgPos)) {
      return this;
    }
    if (duration > 0) {
      this.animateTo(movedPos, duration);
    } else {
      this.stopAnimation();
      this.eventManager.triggerChange(movedPos);
      this.finish(false);
    }
    return this;
  };
  __proto.setBy = function(pos, duration) {
    if (duration === void 0) {
      duration = 0;
    }
    return this.setTo(map(this.axisManager.get(Object.keys(pos)), function(v, k) {
      return v + pos[k];
    }), duration);
  };
  __proto.setOptions = function(options) {
    this._options = __assign$2(__assign$2({}, this._options), options);
  };
  __proto._createAnimationParam = function(pos, duration, option) {
    var depaPos = this.axisManager.get();
    var destPos = pos;
    var inputEvent = (option === null || option === void 0 ? void 0 : option.event) || null;
    return {
      depaPos,
      destPos,
      duration: clamp$1(duration, this._options.minimumDuration, this._options.maximumDuration),
      delta: this.axisManager.getDelta(depaPos, destPos),
      inputEvent,
      input: (option === null || option === void 0 ? void 0 : option.input) || null,
      isTrusted: !!inputEvent,
      done: this.animationEnd
    };
  };
  __proto._animateLoop = function(param, complete) {
    var _this = this;
    if (param.duration) {
      this._animateParam = __assign$2(__assign$2({}, param), {
        startTime: (/* @__PURE__ */ new Date()).getTime()
      });
      var originalIntendedPos_1 = map(param.destPos, function(v) {
        return v;
      });
      var state_1 = this._initState(this._animateParam);
      var loop_1 = function() {
        _this._raf = null;
        var animateParam = _this._animateParam;
        var nextState = _this._getNextState(state_1);
        var isCanceled = !_this.eventManager.triggerChange(nextState.pos, state_1.pos);
        state_1 = nextState;
        if (nextState.finished) {
          animateParam.destPos = _this._getFinalPos(animateParam.destPos, originalIntendedPos_1);
          if (!equal(animateParam.destPos, _this.axisManager.get(Object.keys(animateParam.destPos)))) {
            _this.eventManager.triggerChange(animateParam.destPos, nextState.pos);
          }
          complete();
          return;
        } else if (isCanceled) {
          _this.finish(false);
        } else {
          _this._raf = requestAnimationFrame(loop_1);
        }
      };
      loop_1();
    } else {
      this.eventManager.triggerChange(param.destPos);
      complete();
    }
  };
  __proto._getFinalPos = function(destPos, originalIntendedPos) {
    var _this = this;
    var ERROR_LIMIT = 1e-6;
    var finalPos = map(destPos, function(value, key) {
      if (value >= originalIntendedPos[key] - ERROR_LIMIT && value <= originalIntendedPos[key] + ERROR_LIMIT) {
        return originalIntendedPos[key];
      } else {
        var roundUnit = _this._getRoundUnit(value, key);
        var result = roundNumber(value, roundUnit);
        return result;
      }
    });
    return finalPos;
  };
  __proto._getRoundUnit = function(val, key) {
    var roundUnit = this._options.round;
    var minRoundUnit = null;
    if (!roundUnit) {
      var options = this.axisManager.getAxisOptions(key);
      minRoundUnit = inversePow(Math.max(getDecimalPlace(options.range[0]), getDecimalPlace(options.range[1]), getDecimalPlace(val)));
    }
    return minRoundUnit || roundUnit;
  };
  return AnimationManager2;
})();
var EasingManager = /* @__PURE__ */ (function(_super) {
  __extends$3(EasingManager2, _super);
  function EasingManager2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this._useDuration = true;
    return _this;
  }
  var __proto = EasingManager2.prototype;
  __proto.interpolate = function(displacement, threshold) {
    var initSlope = this._easing(1e-5) / 1e-5;
    return this._easing(displacement / (threshold * initSlope)) * threshold;
  };
  __proto.updateAnimation = function(options) {
    var _a;
    var animateParam = this._animateParam;
    if (!animateParam) {
      return;
    }
    var diffTime = (/* @__PURE__ */ new Date()).getTime() - animateParam.startTime;
    var pos = (options === null || options === void 0 ? void 0 : options.destPos) || animateParam.destPos;
    var duration = (_a = options === null || options === void 0 ? void 0 : options.duration) !== null && _a !== void 0 ? _a : animateParam.duration;
    if ((options === null || options === void 0 ? void 0 : options.restart) || duration <= diffTime) {
      this.setTo(pos, duration - diffTime);
      return;
    }
    if (options === null || options === void 0 ? void 0 : options.destPos) {
      var currentPos = this.axisManager.get();
      this._initialEasingPer = this._prevEasingPer;
      animateParam.delta = this.axisManager.getDelta(currentPos, pos);
      animateParam.destPos = pos;
    }
    if (options === null || options === void 0 ? void 0 : options.duration) {
      var ratio = (diffTime + this._durationOffset) / animateParam.duration;
      this._durationOffset = ratio * duration - diffTime;
      animateParam.duration = duration;
    }
  };
  __proto._initState = function(info) {
    this._initialEasingPer = 0;
    this._prevEasingPer = 0;
    this._durationOffset = 0;
    return {
      pos: info.depaPos,
      easingPer: 0,
      finished: false
    };
  };
  __proto._getNextState = function(prevState) {
    var _this = this;
    var animateParam = this._animateParam;
    var prevPos = prevState.pos;
    var destPos = animateParam.destPos;
    var directions = map(prevPos, function(value, key) {
      return value <= destPos[key] ? 1 : -1;
    });
    var diffTime = (/* @__PURE__ */ new Date()).getTime() - animateParam.startTime;
    var ratio = (diffTime + this._durationOffset) / animateParam.duration;
    var easingPer = this._easing(ratio);
    var toPos = this.axisManager.map(prevPos, function(pos, options, key) {
      var nextPos = ratio >= 1 ? destPos[key] : pos + animateParam.delta[key] * (easingPer - _this._prevEasingPer) / (1 - _this._initialEasingPer);
      var circulatedPos = getCirculatedPos(nextPos, options.range, options.circular);
      if (nextPos !== circulatedPos) {
        var rangeOffset = directions[key] * (options.range[1] - options.range[0]);
        destPos[key] -= rangeOffset;
        prevPos[key] -= rangeOffset;
      }
      return circulatedPos;
    });
    this._prevEasingPer = easingPer;
    return {
      pos: toPos,
      easingPer,
      finished: easingPer >= 1
    };
  };
  __proto._easing = function(p) {
    return p > 1 ? 1 : this._options.easing(p);
  };
  return EasingManager2;
})(AnimationManager);
var Axes = /* @__PURE__ */ (function(_super) {
  __extends$3(Axes2, _super);
  function Axes2(axis, options, startPos) {
    if (axis === void 0) {
      axis = {};
    }
    if (options === void 0) {
      options = {};
    }
    if (startPos === void 0) {
      startPos = {};
    }
    var _this = _super.call(this) || this;
    _this.axis = axis;
    _this._inputs = [];
    _this.options = __assign$2({
      easing: function(x) {
        return 1 - Math.pow(1 - x, 3);
      },
      interruptable: true,
      maximumDuration: Infinity,
      minimumDuration: 0,
      deceleration: 6e-4,
      round: null,
      nested: false
    }, options);
    Object.keys(startPos).forEach(function(key) {
      _this.axis[key].startPos = startPos[key];
    });
    _this.interruptManager = new InterruptManager(_this.options);
    _this.axisManager = new AxisManager(_this.axis);
    _this.eventManager = new EventManager(_this);
    _this.animationManager = new EasingManager(_this);
    _this.inputObserver = new InputObserver(_this);
    _this.eventManager.setAnimationManager(_this.animationManager);
    _this.eventManager.triggerChange(_this.axisManager.get());
    return _this;
  }
  var __proto = Axes2.prototype;
  Object.defineProperty(__proto, "holding", {
    /**
     * @name Axes#holding
     * @desc Returns true if at least one input is in progress.
     * @ko 입력이 하나 이상 진행 중인지 여부를 반환한다.
     *
     * @readonly
     * @type {boolean}
     * @example
     * ```js
     * const axes = new eg.Axes({
     *  x: {
     *    range: [0, 100],
     *  },
     * });
     *
     * axes.holding
     * ```
     */
    get: function() {
      return this.eventManager.holdingCount > 0;
    },
    enumerable: false,
    configurable: true
  });
  __proto.connect = function(axes, inputType) {
    var mapped;
    if (typeof axes === "string") {
      mapped = axes.split(" ");
    } else {
      mapped = axes.concat();
    }
    if (~this._inputs.indexOf(inputType)) {
      this.disconnect(inputType);
    }
    inputType.mapAxes(mapped);
    inputType.connect(this.inputObserver);
    this._inputs.push(inputType);
    return this;
  };
  __proto.disconnect = function(inputType) {
    if (inputType) {
      var index = this._inputs.indexOf(inputType);
      if (index >= 0) {
        this._inputs[index].disconnect();
        this._inputs.splice(index, 1);
      }
    } else {
      this._inputs.forEach(function(v) {
        return v.disconnect();
      });
      this._inputs = [];
    }
    return this;
  };
  __proto.get = function(axes) {
    return this.axisManager.get(axes);
  };
  __proto.setTo = function(pos, duration) {
    if (duration === void 0) {
      duration = 0;
    }
    this.animationManager.setTo(pos, duration);
    return this;
  };
  __proto.setBy = function(pos, duration) {
    if (duration === void 0) {
      duration = 0;
    }
    this.animationManager.setBy(pos, duration);
    return this;
  };
  __proto.setOptions = function(options) {
    this.options = __assign$2(__assign$2({}, this.options), options);
    this.animationManager.setOptions(options);
    return this;
  };
  __proto.setAxis = function(axis) {
    this.axisManager.setAxis(axis);
    return this;
  };
  __proto.stopAnimation = function() {
    this.animationManager.stopAnimation();
    this.animationManager.finish(false);
    return this;
  };
  __proto.updateAnimation = function(options) {
    this.animationManager.updateAnimation(options);
    return this;
  };
  __proto.isBounceArea = function(axes) {
    return this.axisManager.isOutside(axes);
  };
  __proto.destroy = function() {
    this.disconnect();
    this.eventManager.destroy();
  };
  Axes2.VERSION = "3.9.2";
  Axes2.TRANSFORM = TRANSFORM;
  Axes2.DIRECTION_NONE = DIRECTION_NONE;
  Axes2.DIRECTION_LEFT = DIRECTION_LEFT;
  Axes2.DIRECTION_RIGHT = DIRECTION_RIGHT;
  Axes2.DIRECTION_UP = DIRECTION_UP;
  Axes2.DIRECTION_DOWN = DIRECTION_DOWN;
  Axes2.DIRECTION_HORIZONTAL = DIRECTION_HORIZONTAL;
  Axes2.DIRECTION_VERTICAL = DIRECTION_VERTICAL;
  Axes2.DIRECTION_ALL = DIRECTION_ALL;
  __decorate([Computed], Axes2.prototype, "holding", null);
  Axes2 = __decorate([ReactiveSubscribe], Axes2);
  return Axes2;
})(Component);
var getDirectionByAngle = function(angle, thresholdAngle) {
  if (thresholdAngle < 0 || thresholdAngle > 90) {
    return DIRECTION_NONE;
  }
  var toAngle = Math.abs(angle);
  return toAngle > thresholdAngle && toAngle < 180 - thresholdAngle ? DIRECTION_VERTICAL : DIRECTION_HORIZONTAL;
};
var PanInput = /* @__PURE__ */ (function() {
  function PanInput2(el, options) {
    var _this = this;
    this.axes = [];
    this.element = null;
    this._enabled = false;
    this._activeEvent = null;
    this._atRightEdge = false;
    this._rightEdgeTimer = 0;
    this._dragged = false;
    this._isOverThreshold = false;
    this._preventClickWhenDragged = function(e) {
      if (_this._dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
      _this._dragged = false;
    };
    this._voidFunction = function() {
    };
    this.element = $(el);
    this.options = __assign$2({
      inputType: ["touch", "mouse", "pointer"],
      inputKey: [ANY],
      inputButton: [MOUSE_LEFT],
      scale: [1, 1],
      thresholdAngle: 45,
      threshold: 0,
      preventClickOnDrag: false,
      preventDefaultOnDrag: false,
      iOSEdgeSwipeThreshold: IOS_EDGE_THRESHOLD,
      releaseOnScroll: false,
      touchAction: null
    }, options);
    this._onPanstart = this._onPanstart.bind(this);
    this._onPanmove = this._onPanmove.bind(this);
    this._onPanend = this._onPanend.bind(this);
  }
  var __proto = PanInput2.prototype;
  __proto.mapAxes = function(axes) {
    this._direction = getDirection$1(!!axes[0], !!axes[1]);
    this.axes = axes;
  };
  __proto.connect = function(observer) {
    if (this._activeEvent) {
      this._detachElementEvent();
      this._detachWindowEvent(this._activeEvent);
    }
    this._attachElementEvent(observer);
    return this;
  };
  __proto.disconnect = function() {
    this._detachElementEvent();
    this._detachWindowEvent(this._activeEvent);
    this._direction = DIRECTION_NONE;
    return this;
  };
  __proto.destroy = function() {
    this.disconnect();
    this.element = null;
  };
  __proto.enable = function() {
    var activeEvent = convertInputType(this.options.inputType);
    if (!activeEvent) {
      throw new Error("PanInput cannot be enabled if there is no available input event.");
    } else if (!this._enabled) {
      this._enabled = true;
      this._originalCssProps = setCssProps(this.element, this.options, this._direction);
    }
    return this;
  };
  __proto.disable = function() {
    if (this._enabled) {
      this._enabled = false;
      if (!isCssPropsFromAxes(this._originalCssProps)) {
        revertCssProps(this.element, this._originalCssProps);
      }
    }
    return this;
  };
  __proto.isEnabled = function() {
    return this._enabled;
  };
  __proto.release = function() {
    var activeEvent = this._activeEvent;
    var prevEvent = activeEvent.prevEvent;
    activeEvent.onRelease();
    this._observer.release(this, prevEvent, [0, 0]);
    this._detachWindowEvent(activeEvent);
    return this;
  };
  __proto._onPanstart = function(event) {
    var _a = this.options, inputKey = _a.inputKey, inputButton = _a.inputButton, preventDefaultOnDrag = _a.preventDefaultOnDrag;
    var activeEvent = this._activeEvent;
    var panEvent = activeEvent.onEventStart(event, inputKey, inputButton);
    if (!panEvent || !this._enabled || activeEvent.getTouches(event, inputButton) > 1) {
      return;
    }
    if (panEvent.srcEvent.cancelable !== false) {
      var edgeThreshold = this.options.iOSEdgeSwipeThreshold;
      this._dragged = false;
      this._isOverThreshold = false;
      this._observer.hold(this, panEvent);
      this._atRightEdge = IS_IOS_SAFARI && panEvent.center.x > window.innerWidth - edgeThreshold;
      this._attachWindowEvent(activeEvent);
      preventDefaultOnDrag && panEvent.srcEvent.type !== "touchstart" && panEvent.srcEvent.preventDefault();
      activeEvent.prevEvent = panEvent;
    }
  };
  __proto._onPanmove = function(event) {
    var _this = this;
    var _a = this.options, iOSEdgeSwipeThreshold = _a.iOSEdgeSwipeThreshold, preventClickOnDrag = _a.preventClickOnDrag, releaseOnScroll = _a.releaseOnScroll, inputKey = _a.inputKey, inputButton = _a.inputButton, threshold = _a.threshold, thresholdAngle = _a.thresholdAngle;
    var activeEvent = this._activeEvent;
    var panEvent = activeEvent.onEventMove(event, inputKey, inputButton);
    var touches = activeEvent.getTouches(event, inputButton);
    if (touches === 0 || releaseOnScroll && panEvent && !panEvent.srcEvent.cancelable) {
      this._onPanend(event);
      return;
    }
    if (!panEvent || !this._enabled || touches > 1) {
      return;
    }
    var userDirection = getDirectionByAngle(panEvent.angle, thresholdAngle);
    var useHorizontal = useDirection(DIRECTION_HORIZONTAL, this._direction, userDirection);
    var useVertical = useDirection(DIRECTION_VERTICAL, this._direction, userDirection);
    if (activeEvent.prevEvent && IS_IOS_SAFARI) {
      var swipeLeftToRight = panEvent.center.x < 0;
      if (swipeLeftToRight) {
        this.release();
        return;
      } else if (this._atRightEdge) {
        clearTimeout(this._rightEdgeTimer);
        var swipeRightToLeft = panEvent.deltaX < -iOSEdgeSwipeThreshold;
        if (swipeRightToLeft) {
          this._atRightEdge = false;
        } else {
          this._rightEdgeTimer = window.setTimeout(function() {
            return _this.release();
          }, 100);
        }
      }
    }
    var distance = this._getDistance([panEvent.deltaX, panEvent.deltaY], [useHorizontal, useVertical]);
    var offset = this._getOffset([panEvent.offsetX, panEvent.offsetY], [useHorizontal, useVertical]);
    var prevent = offset.some(function(v) {
      return v !== 0;
    });
    if (prevent) {
      if (panEvent.srcEvent.cancelable !== false) {
        panEvent.srcEvent.preventDefault();
      }
      panEvent.srcEvent.stopPropagation();
    }
    panEvent.preventSystemEvent = prevent;
    if (prevent && (this._isOverThreshold || distance >= threshold)) {
      this._dragged = preventClickOnDrag;
      this._isOverThreshold = true;
      this._observer.change(this, panEvent, toAxis(this.axes, offset));
    }
    activeEvent.prevEvent = panEvent;
  };
  __proto._onPanend = function(event) {
    var inputButton = this.options.inputButton;
    var activeEvent = this._activeEvent;
    activeEvent.onEventEnd(event);
    if (!this._enabled || activeEvent.getTouches(event, inputButton) !== 0) {
      return;
    }
    this._detachWindowEvent(activeEvent);
    clearTimeout(this._rightEdgeTimer);
    var prevEvent = activeEvent.prevEvent;
    var velocity = this._isOverThreshold ? this._getOffset([Math.abs(prevEvent.velocityX) * prevEvent.directionX, Math.abs(prevEvent.velocityY) * prevEvent.directionY], [useDirection(DIRECTION_HORIZONTAL, this._direction), useDirection(DIRECTION_VERTICAL, this._direction)]) : [0, 0];
    activeEvent.onRelease();
    this._observer.release(this, prevEvent, velocity);
  };
  __proto._attachWindowEvent = function(activeEvent) {
    var _this = this;
    activeEvent === null || activeEvent === void 0 ? void 0 : activeEvent.move.forEach(function(event) {
      window.addEventListener(event, _this._onPanmove, getAddEventOptions(event));
    });
    activeEvent === null || activeEvent === void 0 ? void 0 : activeEvent.end.forEach(function(event) {
      window.addEventListener(event, _this._onPanend, getAddEventOptions(event));
    });
  };
  __proto._detachWindowEvent = function(activeEvent) {
    var _this = this;
    activeEvent === null || activeEvent === void 0 ? void 0 : activeEvent.move.forEach(function(event) {
      window.removeEventListener(event, _this._onPanmove);
    });
    activeEvent === null || activeEvent === void 0 ? void 0 : activeEvent.end.forEach(function(event) {
      window.removeEventListener(event, _this._onPanend);
    });
  };
  __proto._getOffset = function(properties, direction) {
    var scale = this.options.scale;
    return [direction[0] ? properties[0] * scale[0] : 0, direction[1] ? properties[1] * scale[1] : 0];
  };
  __proto._getDistance = function(delta, direction) {
    return Math.sqrt(Number(direction[0]) * Math.pow(delta[0], 2) + Number(direction[1]) * Math.pow(delta[1], 2));
  };
  __proto._attachElementEvent = function(observer) {
    var _this = this;
    var activeEvent = convertInputType(this.options.inputType);
    var element = this.element;
    if (!activeEvent) {
      return;
    }
    if (!element) {
      throw new Error("Element to connect input does not exist.");
    }
    this._observer = observer;
    this.enable();
    this._activeEvent = activeEvent;
    element.addEventListener("click", this._preventClickWhenDragged, true);
    activeEvent.start.forEach(function(event) {
      element.addEventListener(event, _this._onPanstart);
    });
    activeEvent.move.forEach(function(event) {
      element.addEventListener(event, _this._voidFunction);
    });
  };
  __proto._detachElementEvent = function() {
    var _this = this;
    var activeEvent = this._activeEvent;
    var element = this.element;
    if (element) {
      element.removeEventListener("click", this._preventClickWhenDragged, true);
      activeEvent === null || activeEvent === void 0 ? void 0 : activeEvent.start.forEach(function(event) {
        element.removeEventListener(event, _this._onPanstart);
      });
      activeEvent === null || activeEvent === void 0 ? void 0 : activeEvent.move.forEach(function(event) {
        element.removeEventListener(event, _this._voidFunction);
      });
    }
    this.disable();
    this._observer = null;
  };
  return PanInput2;
})();
var extendStatics$2 = function(d, b) {
  extendStatics$2 = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
  };
  return extendStatics$2(d, b);
};
function __extends$2(d, b) {
  if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics$2(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign$1 = function() {
  __assign$1 = Object.assign || function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign$1.apply(this, arguments);
};
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++) for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) r[k] = a[j];
  return r;
}
var isWindow = typeof window !== "undefined";
var ua = isWindow ? window.navigator.userAgent : "";
var SUPPORT_COMPUTEDSTYLE = isWindow ? !!("getComputedStyle" in window) : false;
var IS_IE = /MSIE|Trident|Windows Phone|Edge/.test(ua);
var SUPPORT_ADDEVENTLISTENER = isWindow ? !!("addEventListener" in document) : false;
var WIDTH = "width";
var HEIGHT = "height";
function getAttribute(el, name) {
  return el.getAttribute(name) || "";
}
function toArray$1(arr) {
  return [].slice.call(arr);
}
function hasSizeAttribute(target, prefix) {
  if (prefix === void 0) {
    prefix = "data-";
  }
  return !!target.getAttribute(prefix + "width");
}
function hasLoadingAttribute(target, prefix) {
  if (prefix === void 0) {
    prefix = "data-";
  }
  return "loading" in target && target.getAttribute("loading") === "lazy" || !!target.getAttribute(prefix + "lazy");
}
function hasSkipAttribute(target, prefix) {
  if (prefix === void 0) {
    prefix = "data-";
  }
  return !!target.getAttribute(prefix + "skip");
}
function addEvent(element, type, handler) {
  if (SUPPORT_ADDEVENTLISTENER) {
    element.addEventListener(type, handler, false);
  } else if (element.attachEvent) {
    element.attachEvent("on" + type, handler);
  } else {
    element["on" + type] = handler;
  }
}
function removeEvent(element, type, handler) {
  if (element.removeEventListener) {
    element.removeEventListener(type, handler, false);
  } else if (element.detachEvent) {
    element.detachEvent("on" + type, handler);
  } else {
    element["on" + type] = null;
  }
}
function innerWidth(el) {
  return getSize(el, "Width");
}
function innerHeight(el) {
  return getSize(el, "Height");
}
function getStyles(el) {
  return (SUPPORT_COMPUTEDSTYLE ? window.getComputedStyle(el) : el.currentStyle) || {};
}
function getSize(el, name) {
  var size = el["client" + name] || el["offset" + name];
  return parseFloat(size || getStyles(el)[name.toLowerCase()]) || 0;
}
function getContentElements(element, tags, prefix) {
  var skipElements = toArray$1(element.querySelectorAll(__spreadArrays(["[" + prefix + "skip] [" + prefix + "width]"], tags.map(function(tag) {
    return ["[" + prefix + "skip] " + tag, tag + "[" + prefix + "skip]", "[" + prefix + "width] " + tag].join(", ");
  })).join(", ")));
  return toArray$1(element.querySelectorAll("[" + prefix + "width], " + tags.join(", "))).filter(function(el) {
    return skipElements.indexOf(el) === -1;
  });
}
var elements = [];
function addAutoSizer(element, prefix) {
  !elements.length && addEvent(window, "resize", resizeAllAutoSizers);
  element.__PREFIX__ = prefix;
  elements.push(element);
  resize(element);
}
function removeAutoSizer(element, prefix) {
  var index = elements.indexOf(element);
  if (index < 0) {
    return;
  }
  var fixed = getAttribute(element, prefix + "fixed");
  delete element.__PREFIX__;
  element.style[fixed === HEIGHT ? WIDTH : HEIGHT] = "";
  elements.splice(index, 1);
  !elements.length && removeEvent(window, "resize", resizeAllAutoSizers);
}
function resize(element, prefix) {
  if (prefix === void 0) {
    prefix = "data-";
  }
  var elementPrefix = element.__PREFIX__ || prefix;
  var dataWidth = parseInt(getAttribute(element, "" + elementPrefix + WIDTH), 10) || 0;
  var dataHeight = parseInt(getAttribute(element, "" + elementPrefix + HEIGHT), 10) || 0;
  var fixed = getAttribute(element, elementPrefix + "fixed");
  if (fixed === HEIGHT) {
    var size = innerHeight(element) || dataHeight;
    element.style[WIDTH] = dataWidth / dataHeight * size + "px";
  } else {
    var size = innerWidth(element) || dataWidth;
    element.style[HEIGHT] = dataHeight / dataWidth * size + "px";
  }
}
function resizeAllAutoSizers() {
  elements.forEach(function(element) {
    resize(element);
  });
}
var Loader = /* @__PURE__ */ (function(_super) {
  __extends$2(Loader2, _super);
  function Loader2(element, options) {
    if (options === void 0) {
      options = {};
    }
    var _this = _super.call(this) || this;
    _this.isReady = false;
    _this.isPreReady = false;
    _this.hasDataSize = false;
    _this.hasLoading = false;
    _this.isSkip = false;
    _this.onCheck = function(e) {
      _this.clear();
      if (e && e.type === "error") {
        _this.onError(_this.element);
      }
      if (_this.hasLoading && _this.checkElement()) {
        return;
      }
      _this.onReady();
    };
    _this.options = __assign$1({
      prefix: "data-"
    }, options);
    _this.element = element;
    var prefix = _this.options.prefix;
    _this.hasDataSize = hasSizeAttribute(element, prefix);
    _this.isSkip = hasSkipAttribute(element, prefix);
    _this.hasLoading = hasLoadingAttribute(element, prefix);
    return _this;
  }
  var __proto = Loader2.prototype;
  __proto.check = function() {
    if (this.isSkip || !this.checkElement()) {
      this.onAlreadyReady();
      return false;
    }
    if (this.hasDataSize) {
      addAutoSizer(this.element, this.options.prefix);
    }
    if (this.hasDataSize || this.hasLoading) {
      this.onAlreadyPreReady();
    }
    return true;
  };
  __proto.addEvents = function() {
    var _this = this;
    var element = this.element;
    this.constructor.EVENTS.forEach(function(name) {
      addEvent(element, name, _this.onCheck);
    });
  };
  __proto.clear = function() {
    var _this = this;
    var element = this.element;
    this.constructor.EVENTS.forEach(function(name) {
      removeEvent(element, name, _this.onCheck);
    });
    this.removeAutoSizer();
  };
  __proto.destroy = function() {
    this.clear();
    this.off();
  };
  __proto.removeAutoSizer = function() {
    if (this.hasDataSize) {
      var prefix = this.options.prefix;
      removeAutoSizer(this.element, prefix);
    }
  };
  __proto.onError = function(target) {
    this.trigger("error", {
      element: this.element,
      target
    });
  };
  __proto.onPreReady = function() {
    if (this.isPreReady) {
      return;
    }
    this.isPreReady = true;
    this.trigger("preReady", {
      element: this.element,
      hasLoading: this.hasLoading,
      isSkip: this.isSkip
    });
  };
  __proto.onReady = function() {
    var isPreReady = this.isPreReady;
    this.isPreReady = true;
    if (this.isReady) {
      return;
    }
    this.removeAutoSizer();
    this.isReady = true;
    this.trigger("ready", {
      element: this.element,
      withPreReady: !isPreReady,
      hasLoading: this.hasLoading,
      isSkip: this.isSkip
    });
  };
  __proto.onAlreadyError = function(target) {
    var _this = this;
    setTimeout(function() {
      _this.onError(target);
    });
  };
  __proto.onAlreadyPreReady = function() {
    var _this = this;
    setTimeout(function() {
      _this.onPreReady();
    });
  };
  __proto.onAlreadyReady = function() {
    var _this = this;
    setTimeout(function() {
      _this.onReady();
    });
  };
  Loader2.EVENTS = [];
  return Loader2;
})(Component);
var ElementLoader = /* @__PURE__ */ (function(_super) {
  __extends$2(ElementLoader2, _super);
  function ElementLoader2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  var __proto = ElementLoader2.prototype;
  __proto.setHasLoading = function(hasLoading) {
    this.hasLoading = hasLoading;
  };
  __proto.check = function() {
    if (this.isSkip) {
      this.onAlreadyReady();
      return false;
    }
    if (this.hasDataSize) {
      addAutoSizer(this.element, this.options.prefix);
      this.onAlreadyPreReady();
    } else {
      this.trigger("requestChildren");
    }
    return true;
  };
  __proto.checkElement = function() {
    return true;
  };
  __proto.destroy = function() {
    this.clear();
    this.trigger("requestDestroy");
    this.off();
  };
  __proto.onAlreadyPreReady = function() {
    _super.prototype.onAlreadyPreReady.call(this);
    this.trigger("reqeustReadyChildren");
  };
  ElementLoader2.EVENTS = [];
  return ElementLoader2;
})(Loader);
var ImReadyManager = /* @__PURE__ */ (function(_super) {
  __extends$2(ImReadyManager2, _super);
  function ImReadyManager2(options) {
    if (options === void 0) {
      options = {};
    }
    var _this = _super.call(this) || this;
    _this.readyCount = 0;
    _this.preReadyCount = 0;
    _this.totalCount = 0;
    _this.totalErrorCount = 0;
    _this.isPreReadyOver = true;
    _this.elementInfos = [];
    _this.options = __assign$1({
      loaders: {},
      prefix: "data-"
    }, options);
    return _this;
  }
  var __proto = ImReadyManager2.prototype;
  __proto.check = function(elements2) {
    var _this = this;
    var prefix = this.options.prefix;
    this.clear();
    this.elementInfos = toArray$1(elements2).map(function(element, index) {
      var loader = _this.getLoader(element, {
        prefix
      });
      loader.check();
      loader.on("error", function(e) {
        _this.onError(index, e.target);
      }).on("preReady", function(e) {
        var info = _this.elementInfos[index];
        info.hasLoading = e.hasLoading;
        info.isSkip = e.isSkip;
        var isPreReady = _this.checkPreReady(index);
        _this.onPreReadyElement(index);
        isPreReady && _this.onPreReady();
      }).on("ready", function(_a) {
        var withPreReady = _a.withPreReady, hasLoading = _a.hasLoading, isSkip = _a.isSkip;
        var info = _this.elementInfos[index];
        info.hasLoading = hasLoading;
        info.isSkip = isSkip;
        var isPreReady = withPreReady && _this.checkPreReady(index);
        var isReady = _this.checkReady(index);
        withPreReady && _this.onPreReadyElement(index);
        _this.onReadyElement(index);
        isPreReady && _this.onPreReady();
        isReady && _this.onReady();
      });
      return {
        loader,
        element,
        hasLoading: false,
        hasError: false,
        isPreReady: false,
        isReady: false,
        isSkip: false
      };
    });
    var length = this.elementInfos.length;
    this.totalCount = length;
    if (!length) {
      setTimeout(function() {
        _this.onPreReady();
        _this.onReady();
      });
    }
    return this;
  };
  __proto.getTotalCount = function() {
    return this.totalCount;
  };
  __proto.isPreReady = function() {
    return this.elementInfos.every(function(info) {
      return info.isPreReady;
    });
  };
  __proto.isReady = function() {
    return this.elementInfos.every(function(info) {
      return info.isReady;
    });
  };
  __proto.hasError = function() {
    return this.totalErrorCount > 0;
  };
  __proto.clear = function() {
    this.isPreReadyOver = false;
    this.totalCount = 0;
    this.preReadyCount = 0;
    this.readyCount = 0;
    this.totalErrorCount = 0;
    this.elementInfos.forEach(function(info) {
      if (info.loader) {
        info.loader.destroy();
      }
    });
    this.elementInfos = [];
  };
  __proto.destroy = function() {
    this.clear();
    this.off();
  };
  __proto.getLoader = function(element, options) {
    var _this = this;
    var tagName = element.tagName.toLowerCase();
    var loaders = this.options.loaders;
    var prefix = options.prefix;
    var tags = Object.keys(loaders);
    if (loaders[tagName]) {
      return new loaders[tagName](element, options);
    }
    var loader = new ElementLoader(element, options);
    var children = toArray$1(element.querySelectorAll(tags.join(", ")));
    loader.setHasLoading(children.some(function(el) {
      return hasLoadingAttribute(el, prefix);
    }));
    var childrenImReady = this.clone().on("error", function(e) {
      loader.onError(e.target);
    }).on("ready", function() {
      loader.onReady();
    });
    loader.on("requestChildren", function() {
      var contentElements = getContentElements(element, tags, _this.options.prefix);
      childrenImReady.check(contentElements).on("preReady", function(e) {
        if (!e.isReady) {
          loader.onPreReady();
        }
      });
    }).on("reqeustReadyChildren", function() {
      childrenImReady.check(children);
    }).on("requestDestroy", function() {
      childrenImReady.destroy();
    });
    return loader;
  };
  __proto.clone = function() {
    return new ImReadyManager2(__assign$1({}, this.options));
  };
  __proto.checkPreReady = function(index) {
    this.elementInfos[index].isPreReady = true;
    ++this.preReadyCount;
    if (this.preReadyCount < this.totalCount) {
      return false;
    }
    return true;
  };
  __proto.checkReady = function(index) {
    this.elementInfos[index].isReady = true;
    ++this.readyCount;
    if (this.readyCount < this.totalCount) {
      return false;
    }
    return true;
  };
  __proto.onError = function(index, target) {
    var info = this.elementInfos[index];
    info.hasError = true;
    this.trigger(new ComponentEvent$1("error", {
      element: info.element,
      index,
      target,
      errorCount: this.getErrorCount(),
      totalErrorCount: ++this.totalErrorCount
    }));
  };
  __proto.onPreReadyElement = function(index) {
    var info = this.elementInfos[index];
    this.trigger(new ComponentEvent$1("preReadyElement", {
      element: info.element,
      index,
      preReadyCount: this.preReadyCount,
      readyCount: this.readyCount,
      totalCount: this.totalCount,
      isPreReady: this.isPreReady(),
      isReady: this.isReady(),
      hasLoading: info.hasLoading,
      isSkip: info.isSkip
    }));
  };
  __proto.onPreReady = function() {
    this.isPreReadyOver = true;
    this.trigger(new ComponentEvent$1("preReady", {
      readyCount: this.readyCount,
      totalCount: this.totalCount,
      isReady: this.isReady(),
      hasLoading: this.hasLoading()
    }));
  };
  __proto.onReadyElement = function(index) {
    var info = this.elementInfos[index];
    this.trigger(new ComponentEvent$1("readyElement", {
      index,
      element: info.element,
      hasError: info.hasError,
      errorCount: this.getErrorCount(),
      totalErrorCount: this.totalErrorCount,
      preReadyCount: this.preReadyCount,
      readyCount: this.readyCount,
      totalCount: this.totalCount,
      isPreReady: this.isPreReady(),
      isReady: this.isReady(),
      hasLoading: info.hasLoading,
      isPreReadyOver: this.isPreReadyOver,
      isSkip: info.isSkip
    }));
  };
  __proto.onReady = function() {
    this.trigger(new ComponentEvent$1("ready", {
      errorCount: this.getErrorCount(),
      totalErrorCount: this.totalErrorCount,
      totalCount: this.totalCount
    }));
  };
  __proto.getErrorCount = function() {
    return this.elementInfos.filter(function(info) {
      return info.hasError;
    }).length;
  };
  __proto.hasLoading = function() {
    return this.elementInfos.some(function(info) {
      return info.hasLoading;
    });
  };
  return ImReadyManager2;
})(Component);
var ImageLoader = /* @__PURE__ */ (function(_super) {
  __extends$2(ImageLoader2, _super);
  function ImageLoader2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  var __proto = ImageLoader2.prototype;
  __proto.checkElement = function() {
    var element = this.element;
    var src = element.getAttribute("src");
    if (element.complete) {
      if (src) {
        if (!element.naturalWidth) {
          this.onAlreadyError(element);
        }
        return false;
      } else {
        this.onAlreadyPreReady();
      }
    }
    this.addEvents();
    IS_IE && element.setAttribute("src", src);
    return true;
  };
  ImageLoader2.EVENTS = ["load", "error"];
  return ImageLoader2;
})(Loader);
var VideoLoader = /* @__PURE__ */ (function(_super) {
  __extends$2(VideoLoader2, _super);
  function VideoLoader2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  var __proto = VideoLoader2.prototype;
  __proto.checkElement = function() {
    var element = this.element;
    if (element.readyState >= 1) {
      return false;
    }
    if (element.error) {
      this.onAlreadyError(element);
      return false;
    }
    this.addEvents();
    return true;
  };
  VideoLoader2.EVENTS = ["loadedmetadata", "error"];
  return VideoLoader2;
})(Loader);
var ImReady = /* @__PURE__ */ (function(_super) {
  __extends$2(ImReady2, _super);
  function ImReady2(options) {
    if (options === void 0) {
      options = {};
    }
    return _super.call(this, __assign$1({
      loaders: {
        img: ImageLoader,
        video: VideoLoader
      }
    }, options)) || this;
  }
  return ImReady2;
})(ImReadyManager);
var extendStatics$1 = function(d, b) {
  extendStatics$1 = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
  };
  return extendStatics$1(d, b);
};
function __extends$1(d, b) {
  if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics$1(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function() {
  __assign = Object.assign || function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = {
    label: 0,
    sent: function() {
      if (t[0] & 1) throw t[1];
      return t[1];
    },
    trys: [],
    ops: []
  }, f, y, t, g;
  return g = {
    next: verb(0),
    "throw": verb(1),
    "return": verb(2)
  }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return {
            value: op[1],
            done: false
          };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return {
      value: op[0] ? op[1] : void 0,
      done: true
    };
  }
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return {
        value: o && o[i++],
        done: !o
      };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = {
      error
    };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
  return ar;
}
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
var CODE = {
  WRONG_TYPE: 0,
  ELEMENT_NOT_FOUND: 1,
  VAL_MUST_NOT_NULL: 2,
  NOT_ATTACHED_TO_FLICKING: 3,
  WRONG_OPTION: 4,
  INDEX_OUT_OF_RANGE: 5,
  POSITION_NOT_REACHABLE: 6,
  TRANSFORM_NOT_SUPPORTED: 7,
  STOP_CALLED_BY_USER: 8,
  ANIMATION_INTERRUPTED: 9,
  ANIMATION_ALREADY_PLAYING: 10,
  NOT_ALLOWED_IN_FRAMEWORK: 11,
  NOT_INITIALIZED: 12
};
var MESSAGE = {
  WRONG_TYPE: function(wrongVal, correctTypes) {
    return wrongVal + "(" + typeof wrongVal + ") is not a " + correctTypes.map(function(type) {
      return '"' + type + '"';
    }).join(" or ") + ".";
  },
  ELEMENT_NOT_FOUND: function(selector) {
    return 'Element with selector "' + selector + '" not found.';
  },
  VAL_MUST_NOT_NULL: function(val, name) {
    return name + " should be provided. Given: " + val;
  },
  NOT_ATTACHED_TO_FLICKING: 'This module is not attached to the Flicking instance. "init()" should be called first.',
  WRONG_OPTION: function(optionName, val) {
    return 'Option "' + optionName + '" is not in correct format, given: ' + val;
  },
  INDEX_OUT_OF_RANGE: function(val, min, max) {
    return 'Index "' + val + '" is out of range: should be between ' + min + " and " + max + ".";
  },
  POSITION_NOT_REACHABLE: function(position) {
    return 'Position "' + position + '" is not reachable.';
  },
  TRANSFORM_NOT_SUPPORTED: "Browser does not support CSS transform.",
  STOP_CALLED_BY_USER: "Event stop() is called by user.",
  ANIMATION_INTERRUPTED: "Animation is interrupted by user input.",
  ANIMATION_ALREADY_PLAYING: "Animation is already playing.",
  NOT_ALLOWED_IN_FRAMEWORK: "This behavior is not allowed in the frameworks like React, Vue, or Angular.",
  NOT_INITIALIZED: "Flicking is not initialized yet, call init() first.",
  NO_ACTIVE: "There's no active panel that Flicking has selected. This may be due to the absence of any panels.",
  NOT_ALLOWED_IN_VIRTUAL: "This behavior is not allowed when the virtual option is enabled"
};
var EVENTS = {
  READY: "ready",
  BEFORE_RESIZE: "beforeResize",
  AFTER_RESIZE: "afterResize",
  HOLD_START: "holdStart",
  HOLD_END: "holdEnd",
  MOVE_START: "moveStart",
  MOVE: "move",
  MOVE_END: "moveEnd",
  WILL_CHANGE: "willChange",
  CHANGED: "changed",
  WILL_RESTORE: "willRestore",
  RESTORED: "restored",
  SELECT: "select",
  NEED_PANEL: "needPanel",
  VISIBLE_CHANGE: "visibleChange",
  REACH_EDGE: "reachEdge",
  PANEL_CHANGE: "panelChange"
};
var ALIGN = {
  PREV: "prev",
  CENTER: "center",
  NEXT: "next"
};
var DIRECTION = {
  PREV: "PREV",
  NEXT: "NEXT",
  NONE: null
};
var MOVE_TYPE = {
  SNAP: "snap",
  FREE_SCROLL: "freeScroll",
  STRICT: "strict"
};
var CLASS = {
  DEFAULT_VIRTUAL: "flicking-panel"
};
var CIRCULAR_FALLBACK = {
  LINEAR: "linear",
  BOUND: "bound"
};
var ORDER = {
  LTR: "ltr",
  RTL: "rtl"
};
var getElement$1 = function(el, parent) {
  var targetEl = null;
  if (isString(el)) {
    var parentEl = document;
    var queryResult = parentEl.querySelector(el);
    if (!queryResult) {
      throw new FlickingError(MESSAGE.ELEMENT_NOT_FOUND(el), CODE.ELEMENT_NOT_FOUND);
    }
    targetEl = queryResult;
  } else if (el && el.nodeType === Node.ELEMENT_NODE) {
    targetEl = el;
  }
  if (!targetEl) {
    throw new FlickingError(MESSAGE.WRONG_TYPE(el, ["HTMLElement", "string"]), CODE.WRONG_TYPE);
  }
  return targetEl;
};
var checkExistence = function(value, nameOnErrMsg) {
  if (value == null) {
    throw new FlickingError(MESSAGE.VAL_MUST_NOT_NULL(value, nameOnErrMsg), CODE.VAL_MUST_NOT_NULL);
  }
};
var clamp = function(x, min, max) {
  return Math.max(Math.min(x, max), min);
};
var getFlickingAttached = function(val) {
  if (!val) {
    throw new FlickingError(MESSAGE.NOT_ATTACHED_TO_FLICKING, CODE.NOT_ATTACHED_TO_FLICKING);
  }
  return val;
};
var toArray = function(iterable) {
  return [].slice.call(iterable);
};
var parseAlign$1 = function(align, size) {
  var alignPoint;
  if (isString(align)) {
    switch (align) {
      case ALIGN.PREV:
        alignPoint = 0;
        break;
      case ALIGN.CENTER:
        alignPoint = 0.5 * size;
        break;
      case ALIGN.NEXT:
        alignPoint = size;
        break;
      default:
        alignPoint = parseArithmeticSize(align, size);
        if (alignPoint == null) {
          throw new FlickingError(MESSAGE.WRONG_OPTION("align", align), CODE.WRONG_OPTION);
        }
    }
  } else {
    alignPoint = align;
  }
  return alignPoint;
};
var parseBounce = function(bounce, size) {
  var parsedBounce;
  if (Array.isArray(bounce)) {
    parsedBounce = bounce.map(function(val) {
      return parseArithmeticSize(val, size);
    });
  } else {
    var parsedVal = parseArithmeticSize(bounce, size);
    parsedBounce = [parsedVal, parsedVal];
  }
  return parsedBounce.map(function(val) {
    if (val == null) {
      throw new FlickingError(MESSAGE.WRONG_OPTION("bounce", bounce), CODE.WRONG_OPTION);
    }
    return val;
  });
};
var parseArithmeticSize = function(cssValue, base) {
  var parsed = parseArithmeticExpression(cssValue);
  if (parsed == null) return null;
  return parsed.percentage * base + parsed.absolute;
};
var parseArithmeticExpression = function(cssValue) {
  var cssRegex = /(?:(\+|\-)\s*)?(\d+(?:\.\d+)?(%|px)?)/g;
  if (typeof cssValue === "number") {
    return {
      percentage: 0,
      absolute: cssValue
    };
  }
  var parsed = {
    percentage: 0,
    absolute: 0
  };
  var idx = 0;
  var matchResult = cssRegex.exec(cssValue);
  while (matchResult != null) {
    var sign = matchResult[1];
    var value = matchResult[2];
    var unit = matchResult[3];
    var parsedValue = parseFloat(value);
    if (idx <= 0) {
      sign = sign || "+";
    }
    if (!sign) {
      return null;
    }
    var signMultiplier = sign === "+" ? 1 : -1;
    if (unit === "%") {
      parsed.percentage += signMultiplier * (parsedValue / 100);
    } else {
      parsed.absolute += signMultiplier * parsedValue;
    }
    ++idx;
    matchResult = cssRegex.exec(cssValue);
  }
  if (idx === 0) {
    return null;
  }
  return parsed;
};
var parsePanelAlign = function(align) {
  return typeof align === "object" ? align.panel : align;
};
var getDirection = function(start, end) {
  if (start === end) return DIRECTION.NONE;
  return start < end ? DIRECTION.NEXT : DIRECTION.PREV;
};
var parseElement = function(element) {
  if (!Array.isArray(element)) {
    element = [element];
  }
  var elements2 = [];
  element.forEach(function(el) {
    if (isString(el)) {
      var tempDiv = document.createElement("div");
      tempDiv.innerHTML = el;
      elements2.push.apply(elements2, __spread(toArray(tempDiv.children)));
      while (tempDiv.firstChild) {
        tempDiv.removeChild(tempDiv.firstChild);
      }
    } else if (el && el.nodeType === Node.ELEMENT_NODE) {
      elements2.push(el);
    } else {
      throw new FlickingError(MESSAGE.WRONG_TYPE(el, ["HTMLElement", "string"]), CODE.WRONG_TYPE);
    }
  });
  return elements2;
};
var getMinusCompensatedIndex = function(idx, max) {
  return idx < 0 ? clamp(idx + max, 0, max) : clamp(idx, 0, max);
};
var includes = function(array, target) {
  var e_1, _a;
  try {
    for (var array_1 = __values(array), array_1_1 = array_1.next(); !array_1_1.done; array_1_1 = array_1.next()) {
      var val = array_1_1.value;
      if (val === target) return true;
    }
  } catch (e_1_1) {
    e_1 = {
      error: e_1_1
    };
  } finally {
    try {
      if (array_1_1 && !array_1_1.done && (_a = array_1.return)) _a.call(array_1);
    } finally {
      if (e_1) throw e_1.error;
    }
  }
  return false;
};
var isString = function(val) {
  return typeof val === "string";
};
var circulatePosition = function(pos, min, max) {
  var size = max - min;
  if (pos < min) {
    var offset = (min - pos) % size;
    pos = max - offset;
  } else if (pos > max) {
    var offset = (pos - max) % size;
    pos = min + offset;
  }
  return pos;
};
var find = function(array, checker) {
  var e_2, _a;
  try {
    for (var array_2 = __values(array), array_2_1 = array_2.next(); !array_2_1.done; array_2_1 = array_2.next()) {
      var val = array_2_1.value;
      if (checker(val)) {
        return val;
      }
    }
  } catch (e_2_1) {
    e_2 = {
      error: e_2_1
    };
  } finally {
    try {
      if (array_2_1 && !array_2_1.done && (_a = array_2.return)) _a.call(array_2);
    } finally {
      if (e_2) throw e_2.error;
    }
  }
  return null;
};
var findIndex = function(array, checker) {
  for (var idx = 0; idx < array.length; idx++) {
    if (checker(array[idx])) {
      return idx;
    }
  }
  return -1;
};
var getProgress$1 = function(pos, prev, next) {
  return (pos - prev) / (next - prev);
};
var getStyle = function(el) {
  if (!el) {
    return {};
  }
  return window.getComputedStyle(el) || el.currentStyle;
};
var setSize = function(el, _a) {
  var width = _a.width, height = _a.height;
  if (!el) {
    return;
  }
  if (width != null) {
    if (isString(width)) {
      el.style.width = width;
    } else {
      el.style.width = width + "px";
    }
  }
  if (height != null) {
    if (isString(height)) {
      el.style.height = height;
    } else {
      el.style.height = height + "px";
    }
  }
};
var isBetween = function(val, min, max) {
  return val >= min && val <= max;
};
var circulateIndex = function(index, max) {
  if (index >= max) {
    return index % max;
  } else if (index < 0) {
    return getMinusCompensatedIndex((index + 1) % max - 1, max);
  } else {
    return index;
  }
};
var range = function(end) {
  var arr = new Array(end);
  for (var i = 0; i < end; i++) {
    arr[i] = i;
  }
  return arr;
};
var getElementSize = function(_a) {
  var el = _a.el, horizontal = _a.horizontal, useFractionalSize = _a.useFractionalSize, useOffset = _a.useOffset, style = _a.style;
  var size = 0;
  if (useFractionalSize) {
    var baseSize = parseFloat(horizontal ? style.width : style.height) || 0;
    var isBorderBoxSizing = style.boxSizing === "border-box";
    var border = horizontal ? parseFloat(style.borderLeftWidth || "0") + parseFloat(style.borderRightWidth || "0") : parseFloat(style.borderTopWidth || "0") + parseFloat(style.borderBottomWidth || "0");
    if (isBorderBoxSizing) {
      size = useOffset ? baseSize : baseSize - border;
    } else {
      var padding = horizontal ? parseFloat(style.paddingLeft || "0") + parseFloat(style.paddingRight || "0") : parseFloat(style.paddingTop || "0") + parseFloat(style.paddingBottom || "0");
      size = useOffset ? baseSize + padding + border : baseSize + padding;
    }
  } else {
    var sizeStr = horizontal ? "Width" : "Height";
    size = useOffset ? el["offset" + sizeStr] : el["client" + sizeStr];
  }
  return Math.max(size, 0);
};
var setPrototypeOf = Object.setPrototypeOf || function(obj, proto) {
  obj.__proto__ = proto;
  return obj;
};
var FlickingError = /* @__PURE__ */ (function(_super) {
  __extends$1(FlickingError2, _super);
  function FlickingError2(message, code) {
    var _this = _super.call(this, message) || this;
    setPrototypeOf(_this, FlickingError2.prototype);
    _this.name = "FlickingError";
    _this.code = code;
    return _this;
  }
  return FlickingError2;
})(Error);
var Viewport = /* @__PURE__ */ (function() {
  function Viewport2(flicking, el) {
    this._flicking = flicking;
    this._el = el;
    this._width = 0;
    this._height = 0;
    this._padding = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    };
    this._isBorderBoxSizing = false;
  }
  var __proto = Viewport2.prototype;
  Object.defineProperty(__proto, "element", {
    /**
     * A viewport(root) element
     * @ko 뷰포트(root) 엘리먼트
     * @type {HTMLElement}
     * @readonly
     */
    get: function() {
      return this._el;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "width", {
    /**
     * Viewport width, without paddings
     * @ko 뷰포트 너비
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._width - this._padding.left - this._padding.right;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "height", {
    /**
     * Viewport height, without paddings
     * @ko 뷰포트 높이
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._height - this._padding.top - this._padding.bottom;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "padding", {
    /**
     * Viewport paddings
     * @ko 뷰포트 CSS padding 값
     * @type {object}
     * @property {number} left CSS `padding-left`
     * @property {number} right CSS `padding-right`
     * @property {number} top CSS `padding-top`
     * @property {number} bottom CSS `padding-bottom`
     * @readonly
     */
    get: function() {
      return this._padding;
    },
    enumerable: false,
    configurable: true
  });
  __proto.setSize = function(_a) {
    var width = _a.width, height = _a.height;
    var el = this._el;
    var padding = this._padding;
    var isBorderBoxSizing = this._isBorderBoxSizing;
    if (width != null) {
      if (isString(width)) {
        el.style.width = width;
      } else {
        var newWidth = isBorderBoxSizing ? width + padding.left + padding.right : width;
        el.style.width = newWidth + "px";
      }
    }
    if (height != null) {
      if (isString(height)) {
        el.style.height = height;
      } else {
        var newHeight = isBorderBoxSizing ? height + padding.top + padding.bottom : height;
        el.style.height = newHeight + "px";
      }
    }
    this.resize();
  };
  __proto.resize = function() {
    var el = this._el;
    var elStyle = getStyle(el);
    var useFractionalSize = this._flicking.useFractionalSize;
    this._width = getElementSize({
      el,
      horizontal: true,
      useFractionalSize,
      useOffset: false,
      style: elStyle
    });
    this._height = getElementSize({
      el,
      horizontal: false,
      useFractionalSize,
      useOffset: false,
      style: elStyle
    });
    this._padding = {
      left: elStyle.paddingLeft ? parseFloat(elStyle.paddingLeft) : 0,
      right: elStyle.paddingRight ? parseFloat(elStyle.paddingRight) : 0,
      top: elStyle.paddingTop ? parseFloat(elStyle.paddingTop) : 0,
      bottom: elStyle.paddingBottom ? parseFloat(elStyle.paddingBottom) : 0
    };
    this._isBorderBoxSizing = elStyle.boxSizing === "border-box";
  };
  return Viewport2;
})();
var AutoResizer = /* @__PURE__ */ (function() {
  function AutoResizer2(flicking) {
    var _this = this;
    this._onResizeWrapper = function() {
      _this._onResize([]);
    };
    this._onResize = function(entries) {
      var flicking2 = _this._flicking;
      var resizeDebounce = flicking2.resizeDebounce;
      var maxResizeDebounce = flicking2.maxResizeDebounce;
      var resizedViewportElement = flicking2.element;
      var isResizedViewportOnly = entries.find(function(e) {
        return e.target === flicking2.element;
      }) && entries.length === 1;
      if (isResizedViewportOnly) {
        var beforeSize = {
          width: flicking2.viewport.width,
          height: flicking2.viewport.height
        };
        var afterSize = {
          width: getElementSize({
            el: resizedViewportElement,
            horizontal: true,
            useFractionalSize: _this._flicking.useFractionalSize,
            useOffset: false,
            style: getStyle(resizedViewportElement)
          }),
          height: getElementSize({
            el: resizedViewportElement,
            horizontal: false,
            useFractionalSize: _this._flicking.useFractionalSize,
            useOffset: false,
            style: getStyle(resizedViewportElement)
          })
        };
        if (beforeSize.height === afterSize.height && beforeSize.width === afterSize.width) {
          return;
        }
      }
      if (resizeDebounce <= 0) {
        void flicking2.resize();
      } else {
        if (_this._maxResizeDebounceTimer <= 0) {
          if (maxResizeDebounce > 0 && maxResizeDebounce >= resizeDebounce) {
            _this._maxResizeDebounceTimer = window.setTimeout(_this._doScheduledResize, maxResizeDebounce);
          }
        }
        if (_this._resizeTimer > 0) {
          clearTimeout(_this._resizeTimer);
          _this._resizeTimer = 0;
        }
        _this._resizeTimer = window.setTimeout(_this._doScheduledResize, resizeDebounce);
      }
    };
    this._doScheduledResize = function() {
      clearTimeout(_this._resizeTimer);
      clearTimeout(_this._maxResizeDebounceTimer);
      _this._maxResizeDebounceTimer = -1;
      _this._resizeTimer = -1;
      void _this._flicking.resize();
    };
    this._skipFirstResize = /* @__PURE__ */ (function() {
      var isFirstResize = true;
      return function(entries) {
        if (isFirstResize) {
          isFirstResize = false;
          return;
        }
        _this._onResize(entries);
      };
    })();
    this._flicking = flicking;
    this._enabled = false;
    this._resizeObserver = null;
    this._resizeTimer = -1;
    this._maxResizeDebounceTimer = -1;
  }
  var __proto = AutoResizer2.prototype;
  Object.defineProperty(__proto, "enabled", {
    get: function() {
      return this._enabled;
    },
    enumerable: false,
    configurable: true
  });
  __proto.enable = function() {
    var flicking = this._flicking;
    var viewport = flicking.viewport;
    if (this._enabled) {
      this.disable();
    }
    if (flicking.useResizeObserver && !!window.ResizeObserver) {
      var viewportSizeNot0 = viewport.width !== 0 || viewport.height !== 0;
      var resizeObserver = viewportSizeNot0 ? new ResizeObserver(this._skipFirstResize) : new ResizeObserver(this._onResize);
      this._resizeObserver = resizeObserver;
      this.observe(flicking.viewport.element);
      if (flicking.observePanelResize) {
        this.observePanels();
      }
    } else {
      window.addEventListener("resize", this._onResizeWrapper);
    }
    this._enabled = true;
    return this;
  };
  __proto.observePanels = function() {
    var _this = this;
    this._flicking.panels.forEach(function(panel) {
      _this.observe(panel.element);
    });
    return this;
  };
  __proto.unobservePanels = function() {
    var _this = this;
    this._flicking.panels.forEach(function(panel) {
      _this.unobserve(panel.element);
    });
    return this;
  };
  __proto.observe = function(element) {
    var resizeObserver = this._resizeObserver;
    if (!resizeObserver) return this;
    resizeObserver.observe(element);
    return this;
  };
  __proto.unobserve = function(element) {
    var resizeObserver = this._resizeObserver;
    if (!resizeObserver) return this;
    resizeObserver.unobserve(element);
    if (this._flicking.observePanelResize) {
      this.unobservePanels();
    }
    return this;
  };
  __proto.disable = function() {
    if (!this._enabled) return this;
    var resizeObserver = this._resizeObserver;
    if (resizeObserver) {
      resizeObserver.disconnect();
      this._resizeObserver = null;
    } else {
      window.removeEventListener("resize", this._onResizeWrapper);
    }
    this._enabled = false;
    return this;
  };
  return AutoResizer2;
})();
var VanillaElementProvider = /* @__PURE__ */ (function() {
  function VanillaElementProvider2(element) {
    this._element = element;
    this._rendered = true;
  }
  var __proto = VanillaElementProvider2.prototype;
  Object.defineProperty(__proto, "element", {
    get: function() {
      return this._element;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "rendered", {
    get: function() {
      return this._rendered;
    },
    enumerable: false,
    configurable: true
  });
  __proto.show = function(flicking) {
    var el = this.element;
    var cameraEl = flicking.camera.element;
    if (el.parentElement !== cameraEl) {
      cameraEl.appendChild(el);
      this._rendered = true;
    }
  };
  __proto.hide = function(flicking) {
    var el = this.element;
    var cameraEl = flicking.camera.element;
    if (el.parentElement === cameraEl) {
      cameraEl.removeChild(el);
      this._rendered = false;
    }
  };
  return VanillaElementProvider2;
})();
var VirtualElementProvider = /* @__PURE__ */ (function() {
  function VirtualElementProvider2(flicking) {
    this._flicking = flicking;
  }
  var __proto = VirtualElementProvider2.prototype;
  Object.defineProperty(__proto, "element", {
    get: function() {
      return this._virtualElement.nativeElement;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "rendered", {
    get: function() {
      return this._virtualElement.visible;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "_virtualElement", {
    get: function() {
      var flicking = this._flicking;
      var elIndex = this._panel.elementIndex;
      var virtualElements = flicking.virtual.elements;
      return virtualElements[elIndex];
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function(panel) {
    this._panel = panel;
  };
  __proto.show = function() {
  };
  __proto.hide = function() {
  };
  return VirtualElementProvider2;
})();
var VirtualManager = /* @__PURE__ */ (function() {
  function VirtualManager2(flicking, options) {
    var _a, _b, _c, _d;
    this._flicking = flicking;
    this._renderPanel = (_a = options === null || options === void 0 ? void 0 : options.renderPanel) !== null && _a !== void 0 ? _a : function() {
      return "";
    };
    this._initialPanelCount = (_b = options === null || options === void 0 ? void 0 : options.initialPanelCount) !== null && _b !== void 0 ? _b : -1;
    this._cache = (_c = options === null || options === void 0 ? void 0 : options.cache) !== null && _c !== void 0 ? _c : false;
    this._panelClass = (_d = options === null || options === void 0 ? void 0 : options.panelClass) !== null && _d !== void 0 ? _d : CLASS.DEFAULT_VIRTUAL;
    this._elements = [];
  }
  var __proto = VirtualManager2.prototype;
  Object.defineProperty(__proto, "elements", {
    get: function() {
      return this._elements;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "renderPanel", {
    // Options
    /**
     * A rendering function for the panel element's innerHTML
     * @ko 패널 엘리먼트의 innerHTML을 렌더링하는 함수
     * @type {function}
     * @param {VirtualPanel} panel Instance of the panel<ko>패널 인스턴스</ko>
     * @param {number} index Index of the panel<ko>패널 인덱스</ko>
     * @default "() => {}"
     */
    get: function() {
      return this._renderPanel;
    },
    set: function(val) {
      this._renderPanel = val;
      this._flicking.renderer.panels.forEach(function(panel) {
        return panel.uncacheRenderResult();
      });
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "initialPanelCount", {
    /**
     * Initial panel count to render
     * @ko 최초로 렌더링할 패널의 개수
     * @readonly
     * @type {number}
     * @default -1
     */
    get: function() {
      return this._initialPanelCount;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "cache", {
    /**
     * Whether to cache rendered panel's innerHTML
     * @ko 렌더링된 패널의 innerHTML 정보를 캐시할지 여부
     * @type {boolean}
     * @default false
     */
    get: function() {
      return this._cache;
    },
    set: function(val) {
      this._cache = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "panelClass", {
    /**
     * The class name that will be applied to rendered panel elements
     * @ko 렌더링되는 패널 엘리먼트에 적용될 클래스 이름
     * @type {string}
     * @default "flicking-panel"
     */
    get: function() {
      return this._panelClass;
    },
    set: function(val) {
      this._panelClass = val;
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function() {
    var flicking = this._flicking;
    if (!flicking.virtualEnabled) return;
    if (!flicking.externalRenderer && !flicking.renderExternal) {
      this._initVirtualElements();
    }
    var virtualElements = flicking.camera.children;
    this._elements = virtualElements.map(function(el) {
      return {
        nativeElement: el,
        visible: true
      };
    });
  };
  __proto.show = function(index) {
    var el = this._elements[index];
    var nativeEl = el.nativeElement;
    el.visible = true;
    if (nativeEl.style.display) {
      nativeEl.style.display = "";
    }
  };
  __proto.hide = function(index) {
    var el = this._elements[index];
    var nativeEl = el.nativeElement;
    el.visible = false;
    nativeEl.style.display = "none";
  };
  __proto.append = function(count) {
    if (count === void 0) {
      count = 1;
    }
    var flicking = this._flicking;
    return this.insert(flicking.panels.length, count);
  };
  __proto.prepend = function(count) {
    if (count === void 0) {
      count = 1;
    }
    return this.insert(0, count);
  };
  __proto.insert = function(index, count) {
    if (count === void 0) {
      count = 1;
    }
    if (count <= 0) return [];
    var flicking = this._flicking;
    return flicking.renderer.batchInsert({
      index,
      elements: range(count),
      hasDOMInElements: false
    });
  };
  __proto.remove = function(index, count) {
    if (count <= 0) return [];
    var flicking = this._flicking;
    return flicking.renderer.batchRemove({
      index,
      deleteCount: count,
      hasDOMInElements: false
    });
  };
  __proto._initVirtualElements = function() {
    var _this = this;
    var flicking = this._flicking;
    var cameraElement = flicking.camera.element;
    var panelsPerView = flicking.panelsPerView;
    var fragment = document.createDocumentFragment();
    var newElements = range(panelsPerView + 1).map(function(idx) {
      var panelEl = document.createElement("div");
      panelEl.className = _this._panelClass;
      panelEl.dataset.elementIndex = idx.toString();
      return panelEl;
    });
    newElements.forEach(function(el) {
      fragment.appendChild(el);
    });
    cameraElement.appendChild(fragment);
  };
  return VirtualManager2;
})();
var EVENT = {
  HOLD: "hold",
  CHANGE: "change",
  RELEASE: "release",
  ANIMATION_END: "animationEnd",
  FINISH: "finish"
};
var POSITION_KEY = "flick";
var STATE_TYPE;
(function(STATE_TYPE2) {
  STATE_TYPE2[STATE_TYPE2["IDLE"] = 0] = "IDLE";
  STATE_TYPE2[STATE_TYPE2["HOLDING"] = 1] = "HOLDING";
  STATE_TYPE2[STATE_TYPE2["DRAGGING"] = 2] = "DRAGGING";
  STATE_TYPE2[STATE_TYPE2["ANIMATING"] = 3] = "ANIMATING";
  STATE_TYPE2[STATE_TYPE2["DISABLED"] = 4] = "DISABLED";
})(STATE_TYPE || (STATE_TYPE = {}));
var State = /* @__PURE__ */ (function() {
  function State2() {
    this._delta = 0;
    this._targetPanel = null;
  }
  var __proto = State2.prototype;
  Object.defineProperty(__proto, "delta", {
    /**
     * A sum of delta values of change events from the last hold event of Axes
     * @ko 이전 hold이벤트부터 change에 의해 발생한 이동 delta값의 합산
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._delta;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "targetPanel", {
    /**
     * A panel to set as {@link Control#activePanel} after the animation is finished
     * @ko 애니메이션 종료시 {@link Control#activePanel}로 설정할 패널
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._targetPanel;
    },
    set: function(val) {
      this._targetPanel = val;
    },
    enumerable: false,
    configurable: true
  });
  __proto.onEnter = function(prevState) {
    this._delta = prevState._delta;
    this._targetPanel = prevState._targetPanel;
  };
  __proto.onHold = function(ctx) {
  };
  __proto.onChange = function(ctx) {
  };
  __proto.onRelease = function(ctx) {
  };
  __proto.onAnimationEnd = function(ctx) {
  };
  __proto.onFinish = function(ctx) {
  };
  __proto._moveToChangedPosition = function(ctx) {
    var flicking = ctx.flicking, axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    var delta = axesEvent.delta[POSITION_KEY];
    if (!delta) {
      return;
    }
    this._delta += delta;
    var camera = flicking.camera;
    var prevPosition = camera.position;
    var position = axesEvent.pos[POSITION_KEY];
    var newPosition = flicking.circularEnabled ? circulatePosition(position, camera.range.min, camera.range.max) : position;
    camera.lookAt(newPosition);
    var moveEvent = new ComponentEvent$1(EVENTS.MOVE, {
      isTrusted: axesEvent.isTrusted,
      holding: this.holding,
      direction: getDirection(0, axesEvent.delta[POSITION_KEY]),
      axesEvent
    });
    flicking.trigger(moveEvent);
    if (moveEvent.isCanceled()) {
      camera.lookAt(prevPosition);
      transitTo(STATE_TYPE.DISABLED);
    }
  };
  return State2;
})();
var IdleState = /* @__PURE__ */ (function(_super) {
  __extends$1(IdleState2, _super);
  function IdleState2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.holding = false;
    _this.animating = false;
    return _this;
  }
  var __proto = IdleState2.prototype;
  __proto.onEnter = function() {
    this._delta = 0;
    this._targetPanel = null;
  };
  __proto.onHold = function(ctx) {
    var flicking = ctx.flicking, axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    if (flicking.renderer.panelCount <= 0) {
      transitTo(STATE_TYPE.DISABLED);
      return;
    }
    var holdStartEvent = new ComponentEvent$1(EVENTS.HOLD_START, {
      axesEvent
    });
    flicking.trigger(holdStartEvent);
    if (holdStartEvent.isCanceled()) {
      transitTo(STATE_TYPE.DISABLED);
    } else {
      transitTo(STATE_TYPE.HOLDING);
    }
  };
  __proto.onChange = function(ctx) {
    var flicking = ctx.flicking, axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    var controller = flicking.control.controller;
    var animatingContext = controller.animatingContext;
    var moveStartEvent = new ComponentEvent$1(EVENTS.MOVE_START, {
      isTrusted: axesEvent.isTrusted,
      holding: this.holding,
      direction: getDirection(animatingContext.start, animatingContext.end),
      axesEvent
    });
    flicking.trigger(moveStartEvent);
    if (moveStartEvent.isCanceled()) {
      transitTo(STATE_TYPE.DISABLED);
    } else {
      transitTo(STATE_TYPE.ANIMATING).onChange(ctx);
    }
  };
  return IdleState2;
})(State);
var HoldingState = /* @__PURE__ */ (function(_super) {
  __extends$1(HoldingState2, _super);
  function HoldingState2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.holding = true;
    _this.animating = false;
    _this._releaseEvent = null;
    return _this;
  }
  var __proto = HoldingState2.prototype;
  __proto.onChange = function(ctx) {
    var flicking = ctx.flicking, axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    var inputEvent = axesEvent.inputEvent;
    if (!inputEvent) {
      return;
    }
    var offset = flicking.horizontal ? inputEvent.offsetX : inputEvent.offsetY;
    var moveStartEvent = new ComponentEvent$1(EVENTS.MOVE_START, {
      isTrusted: axesEvent.isTrusted,
      holding: this.holding,
      direction: getDirection(0, -offset),
      axesEvent
    });
    flicking.trigger(moveStartEvent);
    if (moveStartEvent.isCanceled()) {
      transitTo(STATE_TYPE.DISABLED);
    } else {
      transitTo(STATE_TYPE.DRAGGING).onChange(ctx);
    }
  };
  __proto.onRelease = function(ctx) {
    var flicking = ctx.flicking, axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    flicking.trigger(new ComponentEvent$1(EVENTS.HOLD_END, {
      axesEvent
    }));
    if (axesEvent.delta.flick !== 0) {
      axesEvent.setTo({
        flick: flicking.camera.position
      }, 0);
      transitTo(STATE_TYPE.IDLE);
      return;
    }
    this._releaseEvent = axesEvent;
  };
  __proto.onFinish = function(ctx) {
    var e_1, _a;
    var flicking = ctx.flicking, transitTo = ctx.transitTo;
    transitTo(STATE_TYPE.IDLE);
    if (!this._releaseEvent) {
      return;
    }
    var releaseEvent = this._releaseEvent;
    var srcEvent = releaseEvent.inputEvent.srcEvent;
    var clickedElement;
    if (srcEvent.type === "touchend") {
      var touchEvent = srcEvent;
      var touch = touchEvent.changedTouches[0];
      clickedElement = document.elementFromPoint(touch.clientX, touch.clientY);
    } else {
      clickedElement = srcEvent.target;
    }
    var panels = flicking.renderer.panels;
    var clickedPanel = null;
    try {
      for (var panels_1 = __values(panels), panels_1_1 = panels_1.next(); !panels_1_1.done; panels_1_1 = panels_1.next()) {
        var panel = panels_1_1.value;
        if (panel.contains(clickedElement)) {
          clickedPanel = panel;
          break;
        }
      }
    } catch (e_1_1) {
      e_1 = {
        error: e_1_1
      };
    } finally {
      try {
        if (panels_1_1 && !panels_1_1.done && (_a = panels_1.return)) _a.call(panels_1);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    if (clickedPanel) {
      var cameraPosition = flicking.camera.position;
      var clickedPanelPosition = clickedPanel.position;
      flicking.trigger(new ComponentEvent$1(EVENTS.SELECT, {
        index: clickedPanel.index,
        panel: clickedPanel,
        // Direction to the clicked panel
        direction: getDirection(cameraPosition, clickedPanelPosition)
      }));
    }
  };
  return HoldingState2;
})(State);
var DraggingState = /* @__PURE__ */ (function(_super) {
  __extends$1(DraggingState2, _super);
  function DraggingState2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.holding = true;
    _this.animating = true;
    return _this;
  }
  var __proto = DraggingState2.prototype;
  __proto.onChange = function(ctx) {
    this._moveToChangedPosition(ctx);
  };
  __proto.onRelease = function(ctx) {
    var _a;
    var flicking = ctx.flicking, axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    flicking.trigger(new ComponentEvent$1(EVENTS.HOLD_END, {
      axesEvent
    }));
    if (flicking.renderer.panelCount <= 0) {
      transitTo(STATE_TYPE.IDLE);
      return;
    }
    transitTo(STATE_TYPE.ANIMATING);
    var control = flicking.control;
    var position = axesEvent.destPos[POSITION_KEY];
    var duration = Math.max(axesEvent.duration, flicking.duration);
    try {
      void control.moveToPosition(position, duration, axesEvent);
    } catch (err) {
      transitTo(STATE_TYPE.IDLE);
      axesEvent.setTo((_a = {}, _a[POSITION_KEY] = flicking.camera.position, _a), 0);
    }
  };
  return DraggingState2;
})(State);
var AnimatingState = /* @__PURE__ */ (function(_super) {
  __extends$1(AnimatingState2, _super);
  function AnimatingState2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.holding = false;
    _this.animating = true;
    return _this;
  }
  var __proto = AnimatingState2.prototype;
  __proto.onHold = function(ctx) {
    var flicking = ctx.flicking, axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    var targetPanel = this._targetPanel;
    var control = flicking.control;
    this._delta = 0;
    flicking.control.updateInput();
    if (flicking.changeOnHold && targetPanel) {
      control.setActive(targetPanel, control.activePanel, axesEvent.isTrusted);
    }
    var holdStartEvent = new ComponentEvent$1(EVENTS.HOLD_START, {
      axesEvent
    });
    flicking.trigger(holdStartEvent);
    if (holdStartEvent.isCanceled()) {
      transitTo(STATE_TYPE.DISABLED);
    } else {
      transitTo(STATE_TYPE.DRAGGING);
    }
  };
  __proto.onChange = function(ctx) {
    this._moveToChangedPosition(ctx);
  };
  __proto.onFinish = function(ctx) {
    var flicking = ctx.flicking, axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    var control = flicking.control;
    var controller = control.controller;
    var animatingContext = controller.animatingContext;
    transitTo(STATE_TYPE.IDLE);
    flicking.trigger(new ComponentEvent$1(EVENTS.MOVE_END, {
      isTrusted: axesEvent.isTrusted,
      direction: getDirection(animatingContext.start, animatingContext.end),
      axesEvent
    }));
    var targetPanel = this._targetPanel;
    if (targetPanel) {
      control.setActive(targetPanel, control.activePanel, axesEvent.isTrusted);
    }
  };
  return AnimatingState2;
})(State);
var DisabledState = /* @__PURE__ */ (function(_super) {
  __extends$1(DisabledState2, _super);
  function DisabledState2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.holding = false;
    _this.animating = true;
    return _this;
  }
  var __proto = DisabledState2.prototype;
  __proto.onAnimationEnd = function(ctx) {
    var transitTo = ctx.transitTo;
    transitTo(STATE_TYPE.IDLE);
  };
  __proto.onChange = function(ctx) {
    var axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    axesEvent.stop();
    transitTo(STATE_TYPE.IDLE);
  };
  __proto.onRelease = function(ctx) {
    var axesEvent = ctx.axesEvent, transitTo = ctx.transitTo;
    if (axesEvent.delta.flick === 0) {
      transitTo(STATE_TYPE.IDLE);
    }
  };
  return DisabledState2;
})(State);
var StateMachine = /* @__PURE__ */ (function() {
  function StateMachine2() {
    var _this = this;
    this.transitTo = function(nextStateType) {
      var nextState;
      switch (nextStateType) {
        case STATE_TYPE.IDLE:
          nextState = new IdleState();
          break;
        case STATE_TYPE.HOLDING:
          nextState = new HoldingState();
          break;
        case STATE_TYPE.DRAGGING:
          nextState = new DraggingState();
          break;
        case STATE_TYPE.ANIMATING:
          nextState = new AnimatingState();
          break;
        case STATE_TYPE.DISABLED:
          nextState = new DisabledState();
          break;
      }
      nextState.onEnter(_this._state);
      _this._state = nextState;
      return _this._state;
    };
    this._state = new IdleState();
  }
  var __proto = StateMachine2.prototype;
  Object.defineProperty(__proto, "state", {
    get: function() {
      return this._state;
    },
    enumerable: false,
    configurable: true
  });
  __proto.fire = function(eventType, externalCtx) {
    var currentState = this._state;
    var ctx = __assign(__assign({}, externalCtx), {
      transitTo: this.transitTo
    });
    switch (eventType) {
      case EVENT.HOLD:
        currentState.onHold(ctx);
        break;
      case EVENT.CHANGE:
        currentState.onChange(ctx);
        break;
      case EVENT.RELEASE:
        currentState.onRelease(ctx);
        break;
      case EVENT.ANIMATION_END:
        currentState.onAnimationEnd(ctx);
        break;
      case EVENT.FINISH:
        currentState.onFinish(ctx);
        break;
    }
  };
  return StateMachine2;
})();
var AxesController = /* @__PURE__ */ (function() {
  function AxesController2() {
    var _this = this;
    this._onAxesHold = function() {
      _this._dragged = false;
    };
    this._onAxesChange = function() {
      var _a;
      _this._dragged = !!((_a = _this._panInput) === null || _a === void 0 ? void 0 : _a.isEnabled());
    };
    this._preventClickWhenDragged = function(e) {
      if (_this._dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
      _this._dragged = false;
    };
    this._resetInternalValues();
    this._stateMachine = new StateMachine();
  }
  var __proto = AxesController2.prototype;
  Object.defineProperty(__proto, "axes", {
    /**
     * An {@link https://naver.github.io/egjs-axes/docs/api/Axes Axes} instance
     * @ko {@link https://naver.github.io/egjs-axes/docs/api/Axes Axes}의 인스턴스
     * @type {Axes | null}
     * @see https://naver.github.io/egjs-axes/docs/api/Axes
     * @readonly
     */
    get: function() {
      return this._axes;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "panInput", {
    /**
     * An {@link https://naver.github.io/egjs-axes/docs/api/PanInput PanInput} instance
     * @ko {@link https://naver.github.io/egjs-axes/docs/api/PanInput PanInput}의 인스턴스
     * @type {PanInput | null}
     * @see https://naver.github.io/egjs-axes/docs/api/PanInput
     * @readonly
     */
    get: function() {
      return this._panInput;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "stateMachine", {
    /**
     * @internal
     */
    get: function() {
      return this._stateMachine;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "state", {
    /**
     * A activated {@link State} that shows the current status of the user input or the animation
     * @ko 현재 활성화된 {@link State} 인스턴스로 사용자 입력 또는 애니메이션 상태를 나타냅니다
     * @type {State}
     */
    get: function() {
      return this._stateMachine.state;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "animatingContext", {
    /**
     * A context of the current animation playing
     * @ko 현재 재생중인 애니메이션 정보
     * @type {object}
     * @property {number} start A start position of the animation<ko>애니메이션 시작 지점</ko>
     * @property {number} end A end position of the animation<ko>애니메이션 끝 지점</ko>
     * @property {number} offset camera offset<ko>카메라 오프셋</ko>
     * @readonly
     */
    get: function() {
      return this._animatingContext;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "controlParams", {
    /**
     * A current control parameters of the Axes instance
     * @ko 활성화된 현재 Axes 패러미터들
     * @type {ControlParams}
     */
    get: function() {
      var axes = this._axes;
      if (!axes) {
        return {
          range: {
            min: 0,
            max: 0
          },
          position: 0,
          circular: false
        };
      }
      var axis = axes.axis[POSITION_KEY];
      return {
        range: {
          min: axis.range[0],
          max: axis.range[1]
        },
        circular: axis.circular[0],
        position: this.position
      };
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "enabled", {
    /**
     * A Boolean indicating whether the user input is enabled
     * @ko 현재 사용자 입력이 활성화되었는지를 나타내는 값
     * @type {boolean}
     * @readonly
     */
    get: function() {
      var _a, _b;
      return (_b = (_a = this._panInput) === null || _a === void 0 ? void 0 : _a.isEnabled()) !== null && _b !== void 0 ? _b : false;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "position", {
    /**
     * Current position value in {@link https://naver.github.io/egjs-axes/release/latest/doc/eg.Axes.html Axes} instance
     * @ko {@link https://naver.github.io/egjs-axes/release/latest/doc/eg.Axes.html Axes} 인스턴스 내부의 현재 좌표 값
     * @type {number}
     * @readonly
     */
    get: function() {
      var _a, _b;
      return (_b = (_a = this._axes) === null || _a === void 0 ? void 0 : _a.get([POSITION_KEY])[POSITION_KEY]) !== null && _b !== void 0 ? _b : 0;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "range", {
    /**
     * Current range value in {@link https://naver.github.io/egjs-axes/release/latest/doc/eg.Axes.html Axes} instance
     * @ko {@link https://naver.github.io/egjs-axes/release/latest/doc/eg.Axes.html Axes} 인스턴스 내부의 현재 이동 범위 값
     * @type {number[]}
     * @readonly
     */
    get: function() {
      var _a, _b;
      return (_b = (_a = this._axes) === null || _a === void 0 ? void 0 : _a.axis[POSITION_KEY].range) !== null && _b !== void 0 ? _b : [0, 0];
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "bounce", {
    /**
     * Actual bounce size(px)
     * @ko 적용된 bounce 크기(px 단위)
     * @type {number[]}
     * @readonly
     */
    get: function() {
      var _a;
      return (_a = this._axes) === null || _a === void 0 ? void 0 : _a.axis[POSITION_KEY].bounce;
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function(flicking) {
    var _a;
    var _this = this;
    this._flicking = flicking;
    this._axes = new Axes((_a = {}, _a[POSITION_KEY] = {
      range: [0, 0],
      circular: false,
      bounce: [0, 0]
    }, _a), {
      deceleration: flicking.deceleration,
      interruptable: flicking.interruptable,
      nested: flicking.nested,
      easing: flicking.easing
    });
    this._panInput = new PanInput(flicking.viewport.element, {
      inputType: flicking.inputType,
      threshold: flicking.dragThreshold,
      iOSEdgeSwipeThreshold: flicking.iOSEdgeSwipeThreshold,
      preventDefaultOnDrag: flicking.preventDefaultOnDrag,
      scale: flicking.horizontal ? [flicking.camera.panelOrder === ORDER.RTL ? 1 : -1, 0] : [0, -1],
      releaseOnScroll: true
    });
    var axes = this._axes;
    axes.connect(flicking.horizontal ? [POSITION_KEY, ""] : ["", POSITION_KEY], this._panInput);
    var _loop_1 = function(key2) {
      var eventType = EVENT[key2];
      axes.on(eventType, function(e) {
        _this._stateMachine.fire(eventType, {
          flicking,
          axesEvent: e
        });
      });
    };
    for (var key in EVENT) {
      _loop_1(key);
    }
    return this;
  };
  __proto.destroy = function() {
    var _a;
    if (this._axes) {
      this.removePreventClickHandler();
      this._axes.destroy();
    }
    (_a = this._panInput) === null || _a === void 0 ? void 0 : _a.destroy();
    this._resetInternalValues();
  };
  __proto.enable = function() {
    var _a;
    (_a = this._panInput) === null || _a === void 0 ? void 0 : _a.enable();
    return this;
  };
  __proto.disable = function() {
    var _a;
    (_a = this._panInput) === null || _a === void 0 ? void 0 : _a.disable();
    return this;
  };
  __proto.release = function() {
    var _a;
    (_a = this._panInput) === null || _a === void 0 ? void 0 : _a.release();
    return this;
  };
  __proto.updateAnimation = function(position, duration) {
    var _a;
    var _b;
    this._animatingContext = __assign(__assign({}, this._animatingContext), {
      end: position
    });
    (_b = this._axes) === null || _b === void 0 ? void 0 : _b.updateAnimation({
      destPos: (_a = {}, _a[POSITION_KEY] = position, _a),
      duration
    });
    return this;
  };
  __proto.stopAnimation = function() {
    var _a;
    (_a = this._axes) === null || _a === void 0 ? void 0 : _a.stopAnimation();
    return this;
  };
  __proto.update = function(controlParams) {
    var _a;
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var axes = this._axes;
    var axis = axes.axis[POSITION_KEY];
    axis.circular = [controlParams.circular, controlParams.circular];
    axis.range = [controlParams.range.min, controlParams.range.max];
    axis.bounce = parseBounce(flicking.bounce, camera.size);
    axes.axisManager.set((_a = {}, _a[POSITION_KEY] = controlParams.position, _a));
    return this;
  };
  __proto.addPreventClickHandler = function() {
    var flicking = getFlickingAttached(this._flicking);
    var axes = this._axes;
    var cameraEl = flicking.camera.element;
    axes.on(EVENT.HOLD, this._onAxesHold);
    axes.on(EVENT.CHANGE, this._onAxesChange);
    cameraEl.addEventListener("click", this._preventClickWhenDragged, true);
    return this;
  };
  __proto.removePreventClickHandler = function() {
    var flicking = getFlickingAttached(this._flicking);
    var axes = this._axes;
    var cameraEl = flicking.camera.element;
    axes.off(EVENT.HOLD, this._onAxesHold);
    axes.off(EVENT.CHANGE, this._onAxesChange);
    cameraEl.removeEventListener("click", this._preventClickWhenDragged, true);
    return this;
  };
  __proto.animateTo = function(position, duration, axesEvent) {
    var _this = this;
    var _a;
    var axes = this._axes;
    var state = this._stateMachine.state;
    if (!axes) {
      return Promise.reject(new FlickingError(MESSAGE.NOT_ATTACHED_TO_FLICKING, CODE.NOT_ATTACHED_TO_FLICKING));
    }
    var startPos = this.getCurrentPosition();
    if (startPos === position) {
      var flicking = getFlickingAttached(this._flicking);
      flicking.camera.lookAt(position);
      if (state.targetPanel) {
        flicking.control.setActive(state.targetPanel, flicking.control.activePanel, (_a = axesEvent === null || axesEvent === void 0 ? void 0 : axesEvent.isTrusted) !== null && _a !== void 0 ? _a : false);
      }
      return Promise.resolve();
    }
    this._animatingContext = {
      start: startPos,
      end: position,
      offset: 0
    };
    var animate = function() {
      var _a2, _b;
      var resetContext = function() {
        _this._animatingContext = {
          start: 0,
          end: 0,
          offset: 0
        };
      };
      axes.once(EVENT.FINISH, resetContext);
      if (axesEvent) {
        axesEvent.setTo((_a2 = {}, _a2[POSITION_KEY] = position, _a2), duration);
      } else {
        axes.setTo((_b = {}, _b[POSITION_KEY] = position, _b), duration);
      }
    };
    return new Promise(function(resolve, reject) {
      var animationFinishHandler = function() {
        axes.off(EVENT.HOLD, interruptionHandler);
        resolve();
      };
      var interruptionHandler = function() {
        axes.off(EVENT.FINISH, animationFinishHandler);
        reject(new FlickingError(MESSAGE.ANIMATION_INTERRUPTED, CODE.ANIMATION_INTERRUPTED));
      };
      axes.once(EVENT.FINISH, animationFinishHandler);
      axes.once(EVENT.HOLD, interruptionHandler);
      animate();
    });
  };
  __proto.getCurrentPosition = function() {
    var _a, _b;
    return (_b = (_a = this._axes) === null || _a === void 0 ? void 0 : _a.get([POSITION_KEY])[POSITION_KEY]) !== null && _b !== void 0 ? _b : 0;
  };
  __proto.updateDirection = function() {
    var flicking = getFlickingAttached(this._flicking);
    var axes = this._axes;
    var panInput = this._panInput;
    axes.disconnect(panInput);
    axes.connect(flicking.horizontal ? [POSITION_KEY, ""] : ["", POSITION_KEY], panInput);
    panInput.options.scale = flicking.horizontal ? [flicking.camera.panelOrder === ORDER.RTL ? 1 : -1, 0] : [0, -1];
  };
  __proto._resetInternalValues = function() {
    this._flicking = null;
    this._axes = null;
    this._panInput = null;
    this._animatingContext = {
      start: 0,
      end: 0,
      offset: 0
    };
    this._dragged = false;
  };
  return AxesController2;
})();
var Control = /* @__PURE__ */ (function() {
  function Control2() {
    this._flicking = null;
    this._controller = new AxesController();
    this._activePanel = null;
  }
  var __proto = Control2.prototype;
  Object.defineProperty(__proto, "controller", {
    /**
     * A controller that handles the {@link https://naver.github.io/egjs-axes/ @egjs/axes} events
     * @ko {@link https://naver.github.io/egjs-axes/ @egjs/axes}의 이벤트를 처리하는 컨트롤러 컴포넌트
     * @type {AxesController}
     * @readonly
     */
    get: function() {
      return this._controller;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "activeIndex", {
    /**
     * Index number of the {@link Flicking#currentPanel currentPanel}
     * @ko {@link Flicking#currentPanel currentPanel}의 인덱스 번호
     * @type {number}
     * @default 0
     * @readonly
     */
    get: function() {
      var _a, _b;
      return (_b = (_a = this._activePanel) === null || _a === void 0 ? void 0 : _a.index) !== null && _b !== void 0 ? _b : -1;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "activePanel", {
    /**
     * An active panel
     * @ko 현재 선택된 패널
     * @type {Panel | null}
     * @readonly
     */
    get: function() {
      return this._activePanel;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "animating", {
    /**
     * Whether Flicking's animating
     * @ko 현재 애니메이션 동작 여부
     * @type {boolean}
     * @readonly
     */
    get: function() {
      return this._controller.state.animating;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "holding", {
    /**
     * Whether user is clicking or touching
     * @ko 현재 사용자가 클릭/터치중인지 여부
     * @type {boolean}
     * @readonly
     */
    get: function() {
      return this._controller.state.holding;
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function(flicking) {
    this._flicking = flicking;
    this._controller.init(flicking);
    return this;
  };
  __proto.destroy = function() {
    this._controller.destroy();
    this._flicking = null;
    this._activePanel = null;
  };
  __proto.enable = function() {
    this._controller.enable();
    return this;
  };
  __proto.disable = function() {
    this._controller.disable();
    return this;
  };
  __proto.release = function() {
    this._controller.release();
    return this;
  };
  __proto.updateAnimation = function(panel, duration, direction) {
    var state = this._controller.state;
    var position = this._getPosition(panel, direction !== null && direction !== void 0 ? direction : DIRECTION.NONE);
    state.targetPanel = panel;
    this._controller.updateAnimation(position, duration);
    return this;
  };
  __proto.stopAnimation = function() {
    var state = this._controller.state;
    state.targetPanel = null;
    this._controller.stopAnimation();
    return this;
  };
  __proto.updatePosition = function(progressInPanel) {
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var activePanel = this._activePanel;
    if (activePanel) {
      camera.lookAt(camera.clampToReachablePosition(activePanel.position));
    }
  };
  __proto.updateInput = function() {
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    this._controller.update(camera.controlParams);
    return this;
  };
  __proto.resetActive = function() {
    this._activePanel = null;
    return this;
  };
  __proto.moveToPanel = function(panel, _a) {
    var duration = _a.duration, _b = _a.direction, direction = _b === void 0 ? DIRECTION.NONE : _b, axesEvent = _a.axesEvent;
    return __awaiter(this, void 0, void 0, function() {
      var position;
      return __generator(this, function(_c) {
        position = this._getPosition(panel, direction);
        this._triggerIndexChangeEvent(panel, panel.position, axesEvent, direction);
        return [2, this._animateToPosition({
          position,
          duration,
          newActivePanel: panel,
          axesEvent
        })];
      });
    });
  };
  __proto.setActive = function(newActivePanel, prevActivePanel, isTrusted) {
    var _a;
    var flicking = getFlickingAttached(this._flicking);
    this._activePanel = newActivePanel;
    this._nextPanel = null;
    flicking.camera.updateAdaptiveHeight();
    if (newActivePanel !== prevActivePanel) {
      flicking.trigger(new ComponentEvent$1(EVENTS.CHANGED, {
        index: newActivePanel.index,
        panel: newActivePanel,
        prevIndex: (_a = prevActivePanel === null || prevActivePanel === void 0 ? void 0 : prevActivePanel.index) !== null && _a !== void 0 ? _a : -1,
        prevPanel: prevActivePanel,
        isTrusted,
        direction: prevActivePanel ? getDirection(prevActivePanel.position, newActivePanel.position) : DIRECTION.NONE
      }));
    } else {
      flicking.trigger(new ComponentEvent$1(EVENTS.RESTORED, {
        isTrusted
      }));
    }
  };
  __proto.copy = function(control) {
    this._flicking = control._flicking;
    this._activePanel = control._activePanel;
    this._controller = control._controller;
  };
  __proto._triggerIndexChangeEvent = function(panel, position, axesEvent, direction) {
    var _a;
    var flicking = getFlickingAttached(this._flicking);
    var triggeringEvent = panel !== this._activePanel ? EVENTS.WILL_CHANGE : EVENTS.WILL_RESTORE;
    var camera = flicking.camera;
    var activePanel = this._activePanel;
    var event = new ComponentEvent$1(triggeringEvent, {
      index: panel.index,
      panel,
      isTrusted: (axesEvent === null || axesEvent === void 0 ? void 0 : axesEvent.isTrusted) || false,
      direction: direction !== null && direction !== void 0 ? direction : getDirection((_a = activePanel === null || activePanel === void 0 ? void 0 : activePanel.position) !== null && _a !== void 0 ? _a : camera.position, position)
    });
    this._nextPanel = panel;
    flicking.trigger(event);
    if (event.isCanceled()) {
      throw new FlickingError(MESSAGE.STOP_CALLED_BY_USER, CODE.STOP_CALLED_BY_USER);
    }
  };
  __proto._animateToPosition = function(_a) {
    var position = _a.position, duration = _a.duration, newActivePanel = _a.newActivePanel, axesEvent = _a.axesEvent;
    return __awaiter(this, void 0, void 0, function() {
      var flicking, nextDuration, animate, state;
      var _this = this;
      return __generator(this, function(_b) {
        flicking = getFlickingAttached(this._flicking);
        nextDuration = duration;
        if (Math.abs(nextDuration - position) < flicking.animationThreshold) {
          nextDuration = 0;
        }
        animate = function() {
          return _this._controller.animateTo(position, nextDuration, axesEvent);
        };
        state = this._controller.state;
        state.targetPanel = newActivePanel;
        if (nextDuration <= 0) {
          return [2, animate()];
        } else {
          return [2, animate().then(function() {
            return __awaiter(_this, void 0, void 0, function() {
              return __generator(this, function(_a2) {
                switch (_a2.label) {
                  case 0:
                    if (!flicking.initialized) return [3, 2];
                    return [4, flicking.renderer.render()];
                  case 1:
                    _a2.sent();
                    _a2.label = 2;
                  case 2:
                    return [
                      2
                      /*return*/
                    ];
                }
              });
            });
          }).catch(function(err) {
            if (axesEvent && err instanceof FlickingError && err.code === CODE.ANIMATION_INTERRUPTED) return;
            throw err;
          })];
        }
      });
    });
  };
  __proto._getPosition = function(panel, direction) {
    if (direction === void 0) {
      direction = DIRECTION.NONE;
    }
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var position = panel.position;
    var nearestAnchor = camera.findNearestAnchor(position);
    if (panel.removed || !nearestAnchor) {
      throw new FlickingError(MESSAGE.POSITION_NOT_REACHABLE(panel.position), CODE.POSITION_NOT_REACHABLE);
    }
    if (!camera.canReach(panel)) {
      position = nearestAnchor.position;
      panel = nearestAnchor.panel;
    } else if (flicking.circularEnabled) {
      var camPos_1 = this._controller.position;
      var camRangeDiff = camera.rangeDiff;
      var possiblePositions = [position, position + camRangeDiff, position - camRangeDiff].filter(function(pos) {
        if (direction === DIRECTION.NONE) return true;
        return direction === DIRECTION.PREV ? pos <= camPos_1 : pos >= camPos_1;
      });
      position = possiblePositions.reduce(function(nearestPosition, pos) {
        if (Math.abs(camPos_1 - pos) < Math.abs(camPos_1 - nearestPosition)) {
          return pos;
        } else {
          return nearestPosition;
        }
      }, Infinity);
    }
    return position;
  };
  return Control2;
})();
var AnchorPoint = /* @__PURE__ */ (function() {
  function AnchorPoint2(_a) {
    var index = _a.index, position = _a.position, panel = _a.panel;
    this._index = index;
    this._pos = position;
    this._panel = panel;
  }
  var __proto = AnchorPoint2.prototype;
  Object.defineProperty(__proto, "index", {
    /**
     * Index of AnchorPoint
     * @ko AnchorPoint의 인덱스
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._index;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "position", {
    /**
     * Position of AnchorPoint
     * @ko AnchorPoint의 좌표
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._pos;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "panel", {
    /**
     * A {@link Panel} instance AnchorPoint is referencing to
     * @ko AnchorPoint가 참조하고 있는 {@link Panel}
     * @type {Panel}
     * @readonly
     */
    get: function() {
      return this._panel;
    },
    enumerable: false,
    configurable: true
  });
  return AnchorPoint2;
})();
var SnapControl = /* @__PURE__ */ (function(_super) {
  __extends$1(SnapControl2, _super);
  function SnapControl2(_a) {
    var _b = (_a === void 0 ? {} : _a).count, count = _b === void 0 ? Infinity : _b;
    var _this = _super.call(this) || this;
    _this._count = count;
    return _this;
  }
  var __proto = SnapControl2.prototype;
  Object.defineProperty(__proto, "count", {
    /**
     * Maximum number of panels can go after release
     * @ko 입력 중단 이후 통과하여 이동할 수 있는 패널의 최대 갯수
     * @type {number}
     * @default Infinity
     */
    get: function() {
      return this._count;
    },
    set: function(val) {
      this._count = val;
    },
    enumerable: false,
    configurable: true
  });
  __proto.moveToPosition = function(position, duration, axesEvent) {
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var activeAnchor = camera.findActiveAnchor();
    var anchorAtCamera = camera.findNearestAnchor(camera.position);
    var state = this._controller.state;
    if (!activeAnchor || !anchorAtCamera) {
      return Promise.reject(new FlickingError(MESSAGE.POSITION_NOT_REACHABLE(position), CODE.POSITION_NOT_REACHABLE));
    }
    var snapThreshold = this._calcSnapThreshold(flicking.threshold, position, activeAnchor);
    var posDelta = flicking.animating ? state.delta : position - camera.position;
    var absPosDelta = Math.abs(posDelta);
    var snapDelta = axesEvent && axesEvent.delta[POSITION_KEY] !== 0 ? Math.abs(axesEvent.delta[POSITION_KEY]) : absPosDelta;
    var targetAnchor;
    if (snapDelta >= snapThreshold && snapDelta > 0) {
      targetAnchor = this._findSnappedAnchor(position, anchorAtCamera);
    } else if (absPosDelta >= flicking.threshold && absPosDelta > 0) {
      targetAnchor = this._findAdjacentAnchor(position, posDelta, anchorAtCamera);
    } else {
      return this.moveToPanel(anchorAtCamera.panel, {
        duration,
        axesEvent
      });
    }
    this._triggerIndexChangeEvent(targetAnchor.panel, position, axesEvent);
    return this._animateToPosition({
      position: camera.clampToReachablePosition(targetAnchor.position),
      duration,
      newActivePanel: targetAnchor.panel,
      axesEvent
    });
  };
  __proto._findSnappedAnchor = function(position, anchorAtCamera) {
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var count = this._count;
    var currentPos = camera.position;
    var clampedPosition = camera.clampToReachablePosition(position);
    var anchorAtPosition = camera.findAnchorIncludePosition(clampedPosition);
    if (!anchorAtCamera || !anchorAtPosition) {
      throw new FlickingError(MESSAGE.POSITION_NOT_REACHABLE(position), CODE.POSITION_NOT_REACHABLE);
    }
    if (!isFinite(count)) {
      return anchorAtPosition;
    }
    var panelCount = flicking.panelCount;
    var anchors = camera.anchorPoints;
    var loopCount = Math.sign(position - currentPos) * Math.floor(Math.abs(position - currentPos) / camera.rangeDiff);
    if (position > currentPos && anchorAtPosition.index < anchorAtCamera.index || anchorAtPosition.position > anchorAtCamera.position && anchorAtPosition.index === anchorAtCamera.index) {
      loopCount += 1;
    } else if (position < currentPos && anchorAtPosition.index > anchorAtCamera.index || anchorAtPosition.position < anchorAtCamera.position && anchorAtPosition.index === anchorAtCamera.index) {
      loopCount -= 1;
    }
    var circularIndexOffset = loopCount * panelCount;
    var anchorAtPositionIndex = anchorAtPosition.index + circularIndexOffset;
    if (Math.abs(anchorAtPositionIndex - anchorAtCamera.index) <= count) {
      var anchor = anchors[anchorAtPosition.index];
      return new AnchorPoint({
        index: anchor.index,
        position: anchor.position + loopCount * camera.rangeDiff,
        panel: anchor.panel
      });
    }
    if (flicking.circularEnabled) {
      var targetAnchor = anchors[circulateIndex(anchorAtCamera.index + Math.sign(position - currentPos) * count, panelCount)];
      var loop = Math.floor(count / panelCount);
      if (position > currentPos && targetAnchor.index < anchorAtCamera.index) {
        loop += 1;
      } else if (position < currentPos && targetAnchor.index > anchorAtCamera.index) {
        loop -= 1;
      }
      return new AnchorPoint({
        index: targetAnchor.index,
        position: targetAnchor.position + loop * camera.rangeDiff,
        panel: targetAnchor.panel
      });
    } else {
      return anchors[clamp(anchorAtCamera.index + Math.sign(position - currentPos) * count, 0, anchors.length - 1)];
    }
  };
  __proto._findAdjacentAnchor = function(position, posDelta, anchorAtCamera) {
    var _a;
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    if (camera.circularEnabled) {
      var anchorIncludePosition = camera.findAnchorIncludePosition(position);
      if (anchorIncludePosition && anchorIncludePosition.position !== anchorAtCamera.position) {
        return anchorIncludePosition;
      }
    }
    var adjacentAnchor = (_a = posDelta > 0 ? camera.getNextAnchor(anchorAtCamera) : camera.getPrevAnchor(anchorAtCamera)) !== null && _a !== void 0 ? _a : anchorAtCamera;
    return adjacentAnchor;
  };
  __proto._calcSnapThreshold = function(threshold, position, activeAnchor) {
    var isNextDirection = position > activeAnchor.position;
    var panel = activeAnchor.panel;
    var panelSize = panel.size;
    var alignPos = panel.alignPosition;
    return Math.max(threshold, isNextDirection ? panelSize - alignPos + panel.margin.next : alignPos + panel.margin.prev);
  };
  return SnapControl2;
})(Control);
var FreeControl = /* @__PURE__ */ (function(_super) {
  __extends$1(FreeControl2, _super);
  function FreeControl2(_a) {
    var _b = (_a === void 0 ? {} : _a).stopAtEdge, stopAtEdge = _b === void 0 ? true : _b;
    var _this = _super.call(this) || this;
    _this._stopAtEdge = stopAtEdge;
    return _this;
  }
  var __proto = FreeControl2.prototype;
  Object.defineProperty(__proto, "stopAtEdge", {
    /**
     * Make scroll animation to stop at the start/end of the scroll area, not going out the bounce area
     * @ko 스크롤 애니메이션을 스크롤 영역의 시작과 끝부분에서 멈추도록 하여, 바운스 영역을 넘어가지 않도록 합니다
     * @type {boolean}
     * @default true
     */
    get: function() {
      return this._stopAtEdge;
    },
    set: function(val) {
      this._stopAtEdge = val;
    },
    enumerable: false,
    configurable: true
  });
  __proto.updatePosition = function(progressInPanel) {
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var activePanel = this._activePanel;
    if (activePanel) {
      var panelRange = activePanel.range;
      var newPosition = panelRange.min + (panelRange.max - panelRange.min) * progressInPanel;
      camera.lookAt(camera.clampToReachablePosition(newPosition));
    }
  };
  __proto.moveToPosition = function(position, duration, axesEvent) {
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var targetPos = camera.clampToReachablePosition(position);
    var anchorAtPosition = camera.findAnchorIncludePosition(targetPos);
    if (!anchorAtPosition) {
      return Promise.reject(new FlickingError(MESSAGE.POSITION_NOT_REACHABLE(position), CODE.POSITION_NOT_REACHABLE));
    }
    var targetPanel = anchorAtPosition.panel;
    if (targetPanel !== this._activePanel) {
      this._triggerIndexChangeEvent(targetPanel, position, axesEvent);
    }
    return this._animateToPosition({
      position: this._stopAtEdge ? targetPos : position,
      duration,
      newActivePanel: targetPanel,
      axesEvent
    });
  };
  return FreeControl2;
})(Control);
var StrictControl = /* @__PURE__ */ (function(_super) {
  __extends$1(StrictControl2, _super);
  function StrictControl2(_a) {
    var _b = (_a === void 0 ? {} : _a).count, count = _b === void 0 ? 1 : _b;
    var _this = _super.call(this) || this;
    _this.setActive = function(newActivePanel, prevActivePanel, isTrusted) {
      _super.prototype.setActive.call(_this, newActivePanel, prevActivePanel, isTrusted);
      _this.updateInput();
    };
    _this._count = count;
    _this._resetIndexRange();
    return _this;
  }
  var __proto = StrictControl2.prototype;
  Object.defineProperty(__proto, "count", {
    /**
     * Maximum number of panels that can be moved at a time
     * @ko 최대로 움직일 수 있는 패널의 개수
     * @type {number}
     * @default 1
     */
    get: function() {
      return this._count;
    },
    set: function(val) {
      this._count = val;
    },
    enumerable: false,
    configurable: true
  });
  __proto.destroy = function() {
    _super.prototype.destroy.call(this);
    this._resetIndexRange();
  };
  __proto.updateInput = function() {
    var _a;
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var renderer = flicking.renderer;
    var controller = this._controller;
    var controlParams = camera.controlParams;
    var count = this._count;
    var activePanel = controller.state.animating ? (_a = camera.findNearestAnchor(camera.position)) === null || _a === void 0 ? void 0 : _a.panel : this._activePanel;
    if (!activePanel) {
      controller.update(controlParams);
      this._resetIndexRange();
      return this;
    }
    var cameraRange = controlParams.range;
    var currentPos = activePanel.position;
    var currentIndex = activePanel.index;
    var panelCount = renderer.panelCount;
    var prevPanelIndex = currentIndex - count;
    var nextPanelIndex = currentIndex + count;
    if (prevPanelIndex < 0) {
      prevPanelIndex = flicking.circularEnabled ? getMinusCompensatedIndex((prevPanelIndex + 1) % panelCount - 1, panelCount) : clamp(prevPanelIndex, 0, panelCount - 1);
    }
    if (nextPanelIndex >= panelCount) {
      nextPanelIndex = flicking.circularEnabled ? nextPanelIndex % panelCount : clamp(nextPanelIndex, 0, panelCount - 1);
    }
    var prevPanel = renderer.panels[prevPanelIndex];
    var nextPanel = renderer.panels[nextPanelIndex];
    var prevPos = Math.max(prevPanel.position, cameraRange.min);
    var nextPos = Math.min(nextPanel.position, cameraRange.max);
    if (prevPos > currentPos) {
      prevPos -= camera.rangeDiff;
    }
    if (nextPos < currentPos) {
      nextPos += camera.rangeDiff;
    }
    controlParams.range = {
      min: prevPos,
      max: nextPos
    };
    if (controlParams.circular) {
      if (controlParams.position < prevPos) {
        controlParams.position += camera.rangeDiff;
      }
      if (controlParams.position > nextPos) {
        controlParams.position -= camera.rangeDiff;
      }
    }
    controlParams.circular = false;
    controller.update(controlParams);
    this._indexRange = {
      min: prevPanel.index,
      max: nextPanel.index
    };
    return this;
  };
  __proto.moveToPanel = function(panel, options) {
    return __awaiter(this, void 0, void 0, function() {
      var flicking, camera, controller;
      return __generator(this, function(_a) {
        flicking = getFlickingAttached(this._flicking);
        camera = flicking.camera;
        controller = this._controller;
        controller.update(camera.controlParams);
        return [2, _super.prototype.moveToPanel.call(this, panel, options)];
      });
    });
  };
  __proto.moveToPosition = function(position, duration, axesEvent) {
    var _a;
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var currentPanel = (_a = this._nextPanel) !== null && _a !== void 0 ? _a : this._activePanel;
    var axesRange = this._controller.range;
    var indexRange = this._indexRange;
    var cameraRange = camera.range;
    var state = this._controller.state;
    var clampedPosition = clamp(camera.clampToReachablePosition(position), axesRange[0], axesRange[1]);
    var anchorAtPosition = camera.findAnchorIncludePosition(clampedPosition);
    if (!anchorAtPosition || !currentPanel) {
      return Promise.reject(new FlickingError(MESSAGE.POSITION_NOT_REACHABLE(position), CODE.POSITION_NOT_REACHABLE));
    }
    var prevPos = currentPanel.position;
    var posDelta = flicking.animating ? state.delta : position - camera.position;
    var isOverThreshold = Math.abs(posDelta) >= flicking.threshold;
    var adjacentAnchor = position > prevPos ? camera.getNextAnchor(anchorAtPosition) : camera.getPrevAnchor(anchorAtPosition);
    var targetPos;
    var targetPanel;
    var anchors = camera.anchorPoints;
    var firstAnchor = anchors[0];
    var lastAnchor = anchors[anchors.length - 1];
    var shouldBounceToFirst = position < cameraRange.min && isBetween(firstAnchor.panel.index, indexRange.min, indexRange.max);
    var shouldBounceToLast = position > cameraRange.max && isBetween(lastAnchor.panel.index, indexRange.min, indexRange.max);
    var isAdjacent = adjacentAnchor && (indexRange.min <= indexRange.max ? isBetween(adjacentAnchor.index, indexRange.min, indexRange.max) : adjacentAnchor.index >= indexRange.min || adjacentAnchor.index <= indexRange.max);
    if (shouldBounceToFirst || shouldBounceToLast) {
      var targetAnchor = position < cameraRange.min ? firstAnchor : lastAnchor;
      targetPanel = targetAnchor.panel;
      targetPos = targetAnchor.position;
    } else if (isOverThreshold && anchorAtPosition.position !== currentPanel.position) {
      targetPanel = anchorAtPosition.panel;
      targetPos = anchorAtPosition.position;
    } else if (isOverThreshold && isAdjacent) {
      targetPanel = adjacentAnchor.panel;
      targetPos = adjacentAnchor.position;
    } else {
      var anchorAtCamera = camera.findNearestAnchor(camera.position);
      if (!anchorAtCamera) {
        return Promise.reject(new FlickingError(MESSAGE.POSITION_NOT_REACHABLE(position), CODE.POSITION_NOT_REACHABLE));
      }
      return this.moveToPanel(anchorAtCamera.panel, {
        duration,
        axesEvent
      });
    }
    this._triggerIndexChangeEvent(targetPanel, position, axesEvent);
    return this._animateToPosition({
      position: targetPos,
      duration,
      newActivePanel: targetPanel,
      axesEvent
    });
  };
  __proto._resetIndexRange = function() {
    this._indexRange = {
      min: 0,
      max: 0
    };
  };
  return StrictControl2;
})(Control);
var CameraMode = /* @__PURE__ */ (function() {
  function CameraMode2(flicking) {
    this._flicking = flicking;
  }
  var __proto = CameraMode2.prototype;
  __proto.getAnchors = function() {
    var panels = this._flicking.renderer.panels;
    return panels.map(function(panel, index) {
      return new AnchorPoint({
        index,
        position: panel.position,
        panel
      });
    });
  };
  __proto.findAnchorIncludePosition = function(position) {
    var anchors = this._flicking.camera.anchorPoints;
    var anchorsIncludingPosition = anchors.filter(function(anchor) {
      return anchor.panel.includePosition(position, true);
    });
    return anchorsIncludingPosition.reduce(function(nearest, anchor) {
      if (!nearest) return anchor;
      return Math.abs(nearest.position - position) < Math.abs(anchor.position - position) ? nearest : anchor;
    }, null);
  };
  __proto.findNearestAnchor = function(position) {
    var anchors = this._flicking.camera.anchorPoints;
    if (anchors.length <= 0) return null;
    var prevDist = Infinity;
    for (var anchorIdx = 0; anchorIdx < anchors.length; anchorIdx++) {
      var anchor = anchors[anchorIdx];
      var dist = Math.abs(anchor.position - position);
      if (dist > prevDist) {
        return anchors[anchorIdx - 1];
      }
      prevDist = dist;
    }
    return anchors[anchors.length - 1];
  };
  __proto.clampToReachablePosition = function(position) {
    var camera = this._flicking.camera;
    var range2 = camera.range;
    return clamp(position, range2.min, range2.max);
  };
  __proto.getCircularOffset = function() {
    return 0;
  };
  __proto.canReach = function(panel) {
    var camera = this._flicking.camera;
    var range2 = camera.range;
    if (panel.removed) return false;
    var panelPos = panel.position;
    return panelPos >= range2.min && panelPos <= range2.max;
  };
  __proto.canSee = function(panel) {
    var camera = this._flicking.camera;
    var visibleRange = camera.visibleRange;
    return panel.isVisibleOnRange(visibleRange.min, visibleRange.max);
  };
  return CameraMode2;
})();
var LinearCameraMode = /* @__PURE__ */ (function(_super) {
  __extends$1(LinearCameraMode2, _super);
  function LinearCameraMode2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  var __proto = LinearCameraMode2.prototype;
  __proto.checkAvailability = function() {
    return true;
  };
  __proto.getRange = function() {
    var _a, _b;
    var renderer = this._flicking.renderer;
    var firstPanel = renderer.getPanel(0);
    var lastPanel = renderer.getPanel(renderer.panelCount - 1);
    return {
      min: (_a = firstPanel === null || firstPanel === void 0 ? void 0 : firstPanel.position) !== null && _a !== void 0 ? _a : 0,
      max: (_b = lastPanel === null || lastPanel === void 0 ? void 0 : lastPanel.position) !== null && _b !== void 0 ? _b : 0
    };
  };
  return LinearCameraMode2;
})(CameraMode);
var CircularCameraMode = /* @__PURE__ */ (function(_super) {
  __extends$1(CircularCameraMode2, _super);
  function CircularCameraMode2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  var __proto = CircularCameraMode2.prototype;
  __proto.checkAvailability = function() {
    var flicking = this._flicking;
    var renderer = flicking.renderer;
    var panels = renderer.panels;
    if (panels.length <= 0) {
      return false;
    }
    var firstPanel = panels[0];
    var lastPanel = panels[panels.length - 1];
    var firstPanelPrev = firstPanel.range.min - firstPanel.margin.prev;
    var lastPanelNext = lastPanel.range.max + lastPanel.margin.next;
    var visibleSize = flicking.camera.size;
    var panelSizeSum = lastPanelNext - firstPanelPrev;
    var canSetCircularMode = panels.every(function(panel) {
      return panelSizeSum - panel.size >= visibleSize;
    });
    return canSetCircularMode;
  };
  __proto.getRange = function() {
    var flicking = this._flicking;
    var panels = flicking.renderer.panels;
    if (panels.length <= 0) {
      return {
        min: 0,
        max: 0
      };
    }
    var firstPanel = panels[0];
    var lastPanel = panels[panels.length - 1];
    var firstPanelPrev = firstPanel.range.min - firstPanel.margin.prev;
    var lastPanelNext = lastPanel.range.max + lastPanel.margin.next;
    return {
      min: firstPanelPrev,
      max: lastPanelNext
    };
  };
  __proto.getAnchors = function() {
    var flicking = this._flicking;
    var panels = flicking.renderer.panels;
    return panels.map(function(panel, index) {
      return new AnchorPoint({
        index,
        position: panel.position,
        panel
      });
    });
  };
  __proto.findNearestAnchor = function(position) {
    var camera = this._flicking.camera;
    var anchors = camera.anchorPoints;
    if (anchors.length <= 0) return null;
    var camRange = camera.range;
    var minDist = Infinity;
    var minDistIndex = -1;
    for (var anchorIdx = 0; anchorIdx < anchors.length; anchorIdx++) {
      var anchor = anchors[anchorIdx];
      var dist = Math.min(Math.abs(anchor.position - position), Math.abs(anchor.position - camRange.min + camRange.max - position), Math.abs(position - camRange.min + camRange.max - anchor.position));
      if (dist < minDist) {
        minDist = dist;
        minDistIndex = anchorIdx;
      }
    }
    return anchors[minDistIndex];
  };
  __proto.findAnchorIncludePosition = function(position) {
    var camera = this._flicking.camera;
    var range2 = camera.range;
    var anchors = camera.anchorPoints;
    var rangeDiff = camera.rangeDiff;
    var anchorCount = anchors.length;
    var positionInRange = circulatePosition(position, range2.min, range2.max);
    var anchorInRange = _super.prototype.findAnchorIncludePosition.call(this, positionInRange);
    if (anchorCount > 0 && (position === range2.min || position === range2.max)) {
      var possibleAnchors = [anchorInRange, new AnchorPoint({
        index: 0,
        position: anchors[0].position + rangeDiff,
        panel: anchors[0].panel
      }), new AnchorPoint({
        index: anchorCount - 1,
        position: anchors[anchorCount - 1].position - rangeDiff,
        panel: anchors[anchorCount - 1].panel
      })].filter(function(anchor) {
        return !!anchor;
      });
      anchorInRange = possibleAnchors.reduce(function(nearest, anchor) {
        if (!nearest) return anchor;
        return Math.abs(nearest.position - position) < Math.abs(anchor.position - position) ? nearest : anchor;
      }, null);
    }
    if (!anchorInRange) return null;
    if (position < range2.min) {
      var loopCount = -Math.floor((range2.min - position) / rangeDiff) - 1;
      return new AnchorPoint({
        index: anchorInRange.index,
        position: anchorInRange.position + rangeDiff * loopCount,
        panel: anchorInRange.panel
      });
    } else if (position > range2.max) {
      var loopCount = Math.floor((position - range2.max) / rangeDiff) + 1;
      return new AnchorPoint({
        index: anchorInRange.index,
        position: anchorInRange.position + rangeDiff * loopCount,
        panel: anchorInRange.panel
      });
    }
    return anchorInRange;
  };
  __proto.getCircularOffset = function() {
    var flicking = this._flicking;
    var camera = flicking.camera;
    if (!camera.circularEnabled) return 0;
    var toggled = flicking.panels.filter(function(panel) {
      return panel.toggled;
    });
    var toggledPrev = toggled.filter(function(panel) {
      return panel.toggleDirection === DIRECTION.PREV;
    });
    var toggledNext = toggled.filter(function(panel) {
      return panel.toggleDirection === DIRECTION.NEXT;
    });
    return this._calcPanelAreaSum(toggledPrev) - this._calcPanelAreaSum(toggledNext);
  };
  __proto.clampToReachablePosition = function(position) {
    return position;
  };
  __proto.canReach = function(panel) {
    if (panel.removed) return false;
    return true;
  };
  __proto.canSee = function(panel) {
    var camera = this._flicking.camera;
    var range2 = camera.range;
    var rangeDiff = camera.rangeDiff;
    var visibleRange = camera.visibleRange;
    var visibleInCurrentRange = _super.prototype.canSee.call(this, panel);
    if (visibleRange.min < range2.min) {
      return visibleInCurrentRange || panel.isVisibleOnRange(visibleRange.min + rangeDiff, visibleRange.max + rangeDiff);
    } else if (visibleRange.max > range2.max) {
      return visibleInCurrentRange || panel.isVisibleOnRange(visibleRange.min - rangeDiff, visibleRange.max - rangeDiff);
    }
    return visibleInCurrentRange;
  };
  __proto._calcPanelAreaSum = function(panels) {
    return panels.reduce(function(sum, panel) {
      return sum + panel.sizeIncludingMargin;
    }, 0);
  };
  return CircularCameraMode2;
})(CameraMode);
var BoundCameraMode = /* @__PURE__ */ (function(_super) {
  __extends$1(BoundCameraMode2, _super);
  function BoundCameraMode2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  var __proto = BoundCameraMode2.prototype;
  __proto.checkAvailability = function() {
    var flicking = this._flicking;
    var renderer = flicking.renderer;
    var firstPanel = renderer.getPanel(0);
    var lastPanel = renderer.getPanel(renderer.panelCount - 1);
    if (!firstPanel || !lastPanel) {
      return false;
    }
    var viewportSize = flicking.camera.size;
    var firstPanelPrev = firstPanel.range.min;
    var lastPanelNext = lastPanel.range.max;
    var panelAreaSize = lastPanelNext - firstPanelPrev;
    var isBiggerThanViewport = viewportSize < panelAreaSize;
    return isBiggerThanViewport;
  };
  __proto.getRange = function() {
    var flicking = this._flicking;
    var renderer = flicking.renderer;
    var alignPos = flicking.camera.alignPosition;
    var firstPanel = renderer.getPanel(0);
    var lastPanel = renderer.getPanel(renderer.panelCount - 1);
    if (!firstPanel || !lastPanel) {
      return {
        min: 0,
        max: 0
      };
    }
    var viewportSize = flicking.camera.size;
    var firstPanelPrev = firstPanel.range.min;
    var lastPanelNext = lastPanel.range.max;
    var panelAreaSize = lastPanelNext - firstPanelPrev;
    var isBiggerThanViewport = viewportSize < panelAreaSize;
    var firstPos = firstPanelPrev + alignPos;
    var lastPos = lastPanelNext - viewportSize + alignPos;
    if (isBiggerThanViewport) {
      return {
        min: firstPos,
        max: lastPos
      };
    } else {
      var align = flicking.camera.align;
      var alignVal = typeof align === "object" ? align.camera : align;
      var pos = firstPos + parseAlign$1(alignVal, lastPos - firstPos);
      return {
        min: pos,
        max: pos
      };
    }
  };
  __proto.getAnchors = function() {
    var flicking = this._flicking;
    var camera = flicking.camera;
    var panels = flicking.renderer.panels;
    if (panels.length <= 0) {
      return [];
    }
    var range2 = flicking.camera.range;
    var reachablePanels = panels.filter(function(panel) {
      return camera.canReach(panel);
    });
    if (reachablePanels.length > 0) {
      var shouldPrependBoundAnchor = reachablePanels[0].position !== range2.min;
      var shouldAppendBoundAnchor = reachablePanels[reachablePanels.length - 1].position !== range2.max;
      var indexOffset_1 = shouldPrependBoundAnchor ? 1 : 0;
      var newAnchors = reachablePanels.map(function(panel, idx) {
        return new AnchorPoint({
          index: idx + indexOffset_1,
          position: panel.position,
          panel
        });
      });
      if (shouldPrependBoundAnchor) {
        newAnchors.splice(0, 0, new AnchorPoint({
          index: 0,
          position: range2.min,
          panel: panels[reachablePanels[0].index - 1]
        }));
      }
      if (shouldAppendBoundAnchor) {
        newAnchors.push(new AnchorPoint({
          index: newAnchors.length,
          position: range2.max,
          panel: panels[reachablePanels[reachablePanels.length - 1].index + 1]
        }));
      }
      return newAnchors;
    } else if (range2.min !== range2.max) {
      var nearestPanelAtMin = this._findNearestPanel(range2.min, panels);
      var panelAtMin = nearestPanelAtMin.index === panels.length - 1 ? nearestPanelAtMin.prev() : nearestPanelAtMin;
      var panelAtMax = panelAtMin.next();
      return [new AnchorPoint({
        index: 0,
        position: range2.min,
        panel: panelAtMin
      }), new AnchorPoint({
        index: 1,
        position: range2.max,
        panel: panelAtMax
      })];
    } else {
      return [new AnchorPoint({
        index: 0,
        position: range2.min,
        panel: this._findNearestPanel(range2.min, panels)
      })];
    }
  };
  __proto.findAnchorIncludePosition = function(position) {
    var camera = this._flicking.camera;
    var range2 = camera.range;
    var anchors = camera.anchorPoints;
    if (anchors.length <= 0) return null;
    if (position <= range2.min) {
      return anchors[0];
    } else if (position >= range2.max) {
      return anchors[anchors.length - 1];
    } else {
      return _super.prototype.findAnchorIncludePosition.call(this, position);
    }
  };
  __proto._findNearestPanel = function(pos, panels) {
    var prevDist = Infinity;
    for (var panelIdx = 0; panelIdx < panels.length; panelIdx++) {
      var panel = panels[panelIdx];
      var dist = Math.abs(panel.position - pos);
      if (dist > prevDist) {
        return panels[panelIdx - 1];
      }
      prevDist = dist;
    }
    return panels[panels.length - 1];
  };
  return BoundCameraMode2;
})(CameraMode);
var Camera = /* @__PURE__ */ (function() {
  function Camera2(flicking, _a) {
    var _this = this;
    var _b = (_a === void 0 ? {} : _a).align, align = _b === void 0 ? ALIGN.CENTER : _b;
    this._lookedOffset = 0;
    this._checkTranslateSupport = function() {
      var e_1, _a2;
      var transforms = ["webkitTransform", "msTransform", "MozTransform", "OTransform", "transform"];
      var supportedStyle = document.documentElement.style;
      var transformName = "";
      try {
        for (var transforms_1 = __values(transforms), transforms_1_1 = transforms_1.next(); !transforms_1_1.done; transforms_1_1 = transforms_1.next()) {
          var prefixedTransform = transforms_1_1.value;
          if (prefixedTransform in supportedStyle) {
            transformName = prefixedTransform;
          }
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (transforms_1_1 && !transforms_1_1.done && (_a2 = transforms_1.return)) _a2.call(transforms_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      if (!transformName) {
        throw new FlickingError(MESSAGE.TRANSFORM_NOT_SUPPORTED, CODE.TRANSFORM_NOT_SUPPORTED);
      }
      _this._transform = transformName;
    };
    this._flicking = flicking;
    this._resetInternalValues();
    this._align = align;
  }
  var __proto = Camera2.prototype;
  Object.defineProperty(__proto, "element", {
    // Internal states getter
    /**
     * The camera element(`.flicking-camera`)
     * @ko 카메라 엘리먼트(`.flicking-camera`)
     * @type {HTMLElement}
     * @readonly
     */
    get: function() {
      return this._el;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "children", {
    /**
     * An array of the child elements of the camera element(`.flicking-camera`)
     * @ko 카메라 엘리먼트(`.flicking-camera`)의 자식 엘리먼트 배열
     * @type {HTMLElement[]}
     * @readonly
     */
    get: function() {
      return toArray(this._el.children);
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "position", {
    /**
     * Current position of the camera
     * @ko Camera의 현재 좌표
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._position;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "alignPosition", {
    /**
     * Align position inside the viewport where {@link Panel}'s {@link Panel#alignPosition alignPosition} should be located at
     * @ko 패널의 정렬 기준 위치. 뷰포트 내에서 {@link Panel}의 {@link Panel#alignPosition alignPosition}이 위치해야 하는 곳입니다
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._alignPos;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "offset", {
    /**
     * Position offset, used for the {@link Flicking#renderOnlyVisible renderOnlyVisible} option
     * @ko Camera의 좌표 오프셋. {@link Flicking#renderOnlyVisible renderOnlyVisible} 옵션을 위해 사용됩니다.
     * @type {number}
     * @default 0
     * @readonly
     */
    get: function() {
      return this._offset - this._circularOffset;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "circularEnabled", {
    /**
     * Whether the `circular` option is enabled.
     * The {@link Flicking#circular circular} option can't be enabled when sum of the panel sizes are too small.
     * @ko {@link Flicking#circular circular} 옵션이 활성화되었는지 여부를 나타내는 멤버 변수.
     * {@link Flicking#circular circular} 옵션은 패널의 크기의 합이 충분하지 않을 경우 비활성화됩니다.
     * @type {boolean}
     * @default false
     * @readonly
     */
    get: function() {
      return this._circularEnabled;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "mode", {
    /**
     * A current camera mode
     * @type {CameraMode}
     * @readonly
     */
    get: function() {
      return this._mode;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "range", {
    /**
     * A range that Camera's {@link Camera#position position} can reach
     * @ko Camera의 {@link Camera#position position}이 도달 가능한 범위
     * @type {object}
     * @property {number} min A minimum position<ko>최소 위치</ko>
     * @property {number} max A maximum position<ko>최대 위치</ko>
     * @readonly
     */
    get: function() {
      return this._range;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "rangeDiff", {
    /**
     * A difference between Camera's minimum and maximum position that can reach
     * @ko Camera가 도달 가능한 최소/최대 좌표의 차이
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._range.max - this._range.min;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "visiblePanels", {
    /**
     * An array of visible panels from the current position
     * @ko 현재 보이는 패널들의 배열
     * @type {Panel[]}
     * @readonly
     */
    get: function() {
      return this._visiblePanels;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "visibleRange", {
    /**
     * A range of the visible area from the current position
     * @ko 현재 위치에서 보이는 범위
     * @type {object}
     * @property {number} min A minimum position<ko>최소 위치</ko>
     * @property {number} min A maximum position<ko>최대 위치</ko>
     * @readonly
     */
    get: function() {
      return {
        min: this._position - this._alignPos,
        max: this._position - this._alignPos + this.size
      };
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "anchorPoints", {
    /**
     * An array of {@link AnchorPoint}s that Camera can be stopped at
     * @ko 카메라가 도달 가능한 {@link AnchorPoint}의 목록
     * @type {AnchorPoint[]}
     * @readonly
     */
    get: function() {
      return this._anchors;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "controlParams", {
    /**
     * A current parameters of the Camera for updating {@link AxesController}
     * @ko {@link AxesController}를 업데이트하기 위한 현재 Camera 패러미터들
     * @type {ControlParams}
     * @readonly
     */
    get: function() {
      return {
        range: this._range,
        position: this._position,
        circular: this._circularEnabled
      };
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "atEdge", {
    /**
     * A Boolean value indicating whether Camera's over the minimum or maximum position reachable
     * @ko 현재 카메라가 도달 가능한 범위의 최소 혹은 최대점을 넘어섰는지를 나타냅니다
     * @type {boolean}
     * @readonly
     */
    get: function() {
      return this._position <= this._range.min || this._position >= this._range.max;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "size", {
    /**
     * Return the size of the viewport
     * @ko 뷰포트 크기를 반환합니다
     * @type {number}
     * @readonly
     */
    get: function() {
      var flicking = this._flicking;
      return flicking ? flicking.horizontal ? flicking.viewport.width : flicking.viewport.height : 0;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "progress", {
    /**
     * Return the camera's position progress from the first panel to last panel
     * Range is from 0 to last panel's index
     * @ko 첫번째 패널로부터 마지막 패널까지의 카메라 위치의 진행도를 반환합니다
     * 범위는 0부터 마지막 패널의 인덱스까지입니다
     * @type {number}
     * @readonly
     */
    get: function() {
      var flicking = this._flicking;
      var position = this._position + this._offset;
      var nearestAnchor = this.findNearestAnchor(this._position);
      if (!flicking || !nearestAnchor) {
        return NaN;
      }
      var nearestPanel = nearestAnchor.panel;
      var panelPos = nearestPanel.position + nearestPanel.offset;
      var bounceSize = flicking.control.controller.bounce;
      var _a = this.range, prevRange = _a.min, nextRange = _a.max;
      var rangeDiff = this.rangeDiff;
      if (position === panelPos) {
        return nearestPanel.index;
      }
      if (position < panelPos) {
        var prevPanel = nearestPanel.prev();
        var prevPosition = prevPanel ? prevPanel.position + prevPanel.offset : prevRange - bounceSize[0];
        if (prevPosition > panelPos) {
          prevPosition -= rangeDiff;
        }
        return nearestPanel.index - 1 + getProgress$1(position, prevPosition, panelPos);
      } else {
        var nextPanel = nearestPanel.next();
        var nextPosition = nextPanel ? nextPanel.position + nextPanel.offset : nextRange + bounceSize[1];
        if (nextPosition < panelPos) {
          nextPosition += rangeDiff;
        }
        return nearestPanel.index + getProgress$1(position, panelPos, nextPosition);
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "panelOrder", {
    /**
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/direction direction} CSS property applied to the camera element(`.flicking-camera`)
     * @ko 카메라 엘리먼트(`.flicking-camera`)에 적용된 {@link https://developer.mozilla.org/en-US/docs/Web/CSS/direction direction} CSS 속성
     * @type {string}
     * @readonly
     */
    get: function() {
      return this._panelOrder;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "align", {
    // Options Getter
    /**
     * A value indicating where the {@link Camera#alignPosition alignPosition} should be located at inside the viewport element
     * @ko {@link Camera#alignPosition alignPosition}이 뷰포트 엘리먼트 내의 어디에 위치해야 하는지를 나타내는 값
     * @type {ALIGN | string | number}
     */
    get: function() {
      return this._align;
    },
    // Options Setter
    set: function(val) {
      this._align = val;
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function() {
    var viewportEl = this._flicking.viewport.element;
    checkExistence(viewportEl.firstElementChild, "First element child of the viewport element");
    this._el = viewportEl.firstElementChild;
    this._checkTranslateSupport();
    this._updateMode();
    this.updatePanelOrder();
    return this;
  };
  __proto.destroy = function() {
    this._resetInternalValues();
    return this;
  };
  __proto.lookAt = function(pos) {
    var _this = this;
    var prevOffset = this._offset;
    var isChangedOffset = this._lookedOffset !== prevOffset;
    var flicking = getFlickingAttached(this._flicking);
    var prevPos = this._position;
    this._position = pos;
    var toggled = this._togglePanels(prevPos, pos);
    this._refreshVisiblePanels();
    this._checkNeedPanel();
    this._checkReachEnd(prevPos, pos);
    if (toggled) {
      void flicking.renderer.render().then(function() {
        _this.updateOffset();
        _this._lookedOffset = _this._offset;
      });
    } else if (isChangedOffset) {
      this.updateOffset();
      this._lookedOffset = this._offset;
    } else {
      this.applyTransform();
    }
  };
  __proto.getPrevAnchor = function(anchor) {
    if (!this._circularEnabled || anchor.index !== 0) {
      return this._anchors[anchor.index - 1] || null;
    } else {
      var anchors = this._anchors;
      var rangeDiff = this.rangeDiff;
      var lastAnchor = anchors[anchors.length - 1];
      return new AnchorPoint({
        index: lastAnchor.index,
        position: lastAnchor.position - rangeDiff,
        panel: lastAnchor.panel
      });
    }
  };
  __proto.getNextAnchor = function(anchor) {
    var anchors = this._anchors;
    if (!this._circularEnabled || anchor.index !== anchors.length - 1) {
      return anchors[anchor.index + 1] || null;
    } else {
      var rangeDiff = this.rangeDiff;
      var firstAnchor = anchors[0];
      return new AnchorPoint({
        index: firstAnchor.index,
        position: firstAnchor.position + rangeDiff,
        panel: firstAnchor.panel
      });
    }
  };
  __proto.getProgressInPanel = function(panel) {
    var panelRange = panel.range;
    return (this._position - panelRange.min) / (panelRange.max - panelRange.min);
  };
  __proto.findAnchorIncludePosition = function(position) {
    return this._mode.findAnchorIncludePosition(position);
  };
  __proto.findNearestAnchor = function(position) {
    return this._mode.findNearestAnchor(position);
  };
  __proto.findActiveAnchor = function() {
    var _a;
    var flicking = getFlickingAttached(this._flicking);
    var activePanel = flicking.control.activePanel;
    if (!activePanel) return null;
    return (_a = find(this._anchors, function(anchor) {
      return anchor.panel.index === activePanel.index;
    })) !== null && _a !== void 0 ? _a : this.findNearestAnchor(activePanel.position);
  };
  __proto.clampToReachablePosition = function(position) {
    return this._mode.clampToReachablePosition(position);
  };
  __proto.canReach = function(panel) {
    return this._mode.canReach(panel);
  };
  __proto.canSee = function(panel) {
    return this._mode.canSee(panel);
  };
  __proto.updateRange = function() {
    var flicking = getFlickingAttached(this._flicking);
    var renderer = flicking.renderer;
    var panels = renderer.panels;
    this._updateMode();
    this._range = this._mode.getRange();
    panels.forEach(function(panel) {
      return panel.updateCircularToggleDirection();
    });
    return this;
  };
  __proto.updateAlignPos = function() {
    var align = this._align;
    var alignVal = typeof align === "object" ? align.camera : align;
    this._alignPos = parseAlign$1(alignVal, this.size);
    return this;
  };
  __proto.updateAnchors = function() {
    this._anchors = this._mode.getAnchors();
    return this;
  };
  __proto.updateAdaptiveHeight = function() {
    var flicking = getFlickingAttached(this._flicking);
    var activePanel = flicking.control.activePanel;
    var visiblePanels = flicking.visiblePanels;
    var selectedPanels = __spread(visiblePanels);
    if (activePanel) {
      selectedPanels.push(activePanel);
    }
    if (!flicking.horizontal || !flicking.adaptive || !selectedPanels.length) return;
    var maxHeight = Math.max.apply(Math, __spread(selectedPanels.map(function(panel) {
      return panel.height;
    })));
    flicking.viewport.setSize({
      height: maxHeight
    });
  };
  __proto.updateOffset = function() {
    var flicking = getFlickingAttached(this._flicking);
    var position = this._position;
    var unRenderedPanels = flicking.panels.filter(function(panel) {
      return !panel.rendered;
    });
    this._offset = unRenderedPanels.filter(function(panel) {
      return panel.position + panel.offset < position;
    }).reduce(function(offset, panel) {
      return offset + panel.sizeIncludingMargin;
    }, 0);
    this._circularOffset = this._mode.getCircularOffset();
    this.applyTransform();
    return this;
  };
  __proto.updatePanelOrder = function() {
    var flicking = getFlickingAttached(this._flicking);
    if (!flicking.horizontal) return this;
    var el = this._el;
    var direction = getStyle(el).direction;
    if (direction !== this._panelOrder) {
      this._panelOrder = direction === ORDER.RTL ? ORDER.RTL : ORDER.LTR;
      if (flicking.initialized) {
        flicking.control.controller.updateDirection();
      }
    }
    return this;
  };
  __proto.resetNeedPanelHistory = function() {
    this._needPanelTriggered = {
      prev: false,
      next: false
    };
    return this;
  };
  __proto.applyTransform = function() {
    var el = this._el;
    var flicking = getFlickingAttached(this._flicking);
    var renderer = flicking.renderer;
    if (renderer.rendering || !flicking.initialized) return this;
    var actualPosition = this._position - this._alignPos - this._offset + this._circularOffset;
    el.style[this._transform] = flicking.horizontal ? "translate(" + (this._panelOrder === ORDER.RTL ? actualPosition : -actualPosition) + "px)" : "translate(0, " + -actualPosition + "px)";
    return this;
  };
  __proto._resetInternalValues = function() {
    this._position = 0;
    this._lookedOffset = 0;
    this._alignPos = 0;
    this._offset = 0;
    this._circularOffset = 0;
    this._circularEnabled = false;
    this._range = {
      min: 0,
      max: 0
    };
    this._visiblePanels = [];
    this._anchors = [];
    this._needPanelTriggered = {
      prev: false,
      next: false
    };
  };
  __proto._refreshVisiblePanels = function() {
    var _this = this;
    var flicking = getFlickingAttached(this._flicking);
    var panels = flicking.renderer.panels;
    var newVisiblePanels = panels.filter(function(panel) {
      return _this.canSee(panel);
    });
    var prevVisiblePanels = this._visiblePanels;
    this._visiblePanels = newVisiblePanels;
    var added = newVisiblePanels.filter(function(panel) {
      return !includes(prevVisiblePanels, panel);
    });
    var removed = prevVisiblePanels.filter(function(panel) {
      return !includes(newVisiblePanels, panel);
    });
    if (added.length > 0 || removed.length > 0) {
      void flicking.renderer.render().then(function() {
        flicking.trigger(new ComponentEvent$1(EVENTS.VISIBLE_CHANGE, {
          added,
          removed,
          visiblePanels: newVisiblePanels
        }));
      });
    }
  };
  __proto._checkNeedPanel = function() {
    var needPanelTriggered = this._needPanelTriggered;
    if (needPanelTriggered.prev && needPanelTriggered.next) return;
    var flicking = getFlickingAttached(this._flicking);
    var panels = flicking.renderer.panels;
    if (panels.length <= 0) {
      if (!needPanelTriggered.prev) {
        flicking.trigger(new ComponentEvent$1(EVENTS.NEED_PANEL, {
          direction: DIRECTION.PREV
        }));
        needPanelTriggered.prev = true;
      }
      if (!needPanelTriggered.next) {
        flicking.trigger(new ComponentEvent$1(EVENTS.NEED_PANEL, {
          direction: DIRECTION.NEXT
        }));
        needPanelTriggered.next = true;
      }
      return;
    }
    var cameraPosition = this._position;
    var cameraSize = this.size;
    var cameraRange = this._range;
    var needPanelThreshold = flicking.needPanelThreshold;
    var cameraPrev = cameraPosition - this._alignPos;
    var cameraNext = cameraPrev + cameraSize;
    var firstPanel = panels[0];
    var lastPanel = panels[panels.length - 1];
    if (!needPanelTriggered.prev) {
      var firstPanelPrev = firstPanel.range.min;
      if (cameraPrev <= firstPanelPrev + needPanelThreshold || cameraPosition <= cameraRange.min + needPanelThreshold) {
        flicking.trigger(new ComponentEvent$1(EVENTS.NEED_PANEL, {
          direction: DIRECTION.PREV
        }));
        needPanelTriggered.prev = true;
      }
    }
    if (!needPanelTriggered.next) {
      var lastPanelNext = lastPanel.range.max;
      if (cameraNext >= lastPanelNext - needPanelThreshold || cameraPosition >= cameraRange.max - needPanelThreshold) {
        flicking.trigger(new ComponentEvent$1(EVENTS.NEED_PANEL, {
          direction: DIRECTION.NEXT
        }));
        needPanelTriggered.next = true;
      }
    }
  };
  __proto._checkReachEnd = function(prevPos, newPos) {
    var flicking = getFlickingAttached(this._flicking);
    var range2 = this._range;
    var wasBetweenRange = prevPos > range2.min && prevPos < range2.max;
    var isBetweenRange = newPos > range2.min && newPos < range2.max;
    if (!wasBetweenRange || isBetweenRange) return;
    var direction = newPos <= range2.min ? DIRECTION.PREV : DIRECTION.NEXT;
    flicking.trigger(new ComponentEvent$1(EVENTS.REACH_EDGE, {
      direction
    }));
  };
  __proto._updateMode = function() {
    var flicking = getFlickingAttached(this._flicking);
    if (flicking.circular) {
      var circularMode = new CircularCameraMode(flicking);
      var canSetCircularMode = circularMode.checkAvailability();
      if (canSetCircularMode) {
        this._mode = circularMode;
      } else {
        var fallbackMode = flicking.circularFallback;
        this._mode = fallbackMode === CIRCULAR_FALLBACK.BOUND ? new BoundCameraMode(flicking) : new LinearCameraMode(flicking);
      }
      this._circularEnabled = canSetCircularMode;
    } else {
      this._mode = flicking.bound ? new BoundCameraMode(flicking) : new LinearCameraMode(flicking);
      this._circularEnabled = false;
    }
  };
  __proto._togglePanels = function(prevPos, pos) {
    if (pos === prevPos) return false;
    var flicking = getFlickingAttached(this._flicking);
    var panels = flicking.renderer.panels;
    var toggled = panels.map(function(panel) {
      return panel.toggle(prevPos, pos);
    });
    return toggled.some(function(isToggled) {
      return isToggled;
    });
  };
  return Camera2;
})();
var Renderer$1 = /* @__PURE__ */ (function() {
  function Renderer2(_a) {
    var _b = _a.align, align = _b === void 0 ? ALIGN.CENTER : _b, strategy = _a.strategy;
    this._flicking = null;
    this._panels = [];
    this._rendering = false;
    this._align = align;
    this._strategy = strategy;
  }
  var __proto = Renderer2.prototype;
  Object.defineProperty(__proto, "panels", {
    // Internal states Getter
    /**
     * Array of panels
     * @ko 전체 패널들의 배열
     * @type {Panel[]}
     * @readonly
     * @see Panel
     */
    get: function() {
      return this._panels;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "rendering", {
    /**
     * A boolean value indicating whether rendering is in progress
     * @ko 현재 렌더링이 시작되어 끝나기 전까지의 상태인지의 여부
     * @type {boolean}
     * @readonly
     * @internal
     */
    get: function() {
      return this._rendering;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "panelCount", {
    /**
     * Count of panels
     * @ko 전체 패널의 개수
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._panels.length;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "strategy", {
    /**
     * @internal
     */
    get: function() {
      return this._strategy;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "align", {
    // Options Getter
    /**
     * A {@link Panel}'s {@link Panel#align align} value that applied to all panels
     * @ko {@link Panel}에 공통적으로 적용할 {@link Panel#align align} 값
     * @type {Constants.ALIGN | string | number}
     */
    get: function() {
      return this._align;
    },
    // Options Setter
    set: function(val) {
      this._align = val;
      var panelAlign = parsePanelAlign(val);
      this._panels.forEach(function(panel) {
        panel.align = panelAlign;
      });
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function(flicking) {
    this._flicking = flicking;
    this._collectPanels();
    return this;
  };
  __proto.destroy = function() {
    this._flicking = null;
    this._panels = [];
  };
  __proto.getPanel = function(index) {
    return this._panels[index] || null;
  };
  __proto.forceRenderAllPanels = function() {
    this._panels.forEach(function(panel) {
      return panel.markForShow();
    });
    return Promise.resolve();
  };
  __proto.getRenderedPanels = function() {
    var flicking = getFlickingAttached(this._flicking);
    return flicking.renderer.panels.filter(function(panel) {
      return panel.rendered;
    });
  };
  __proto.updatePanelSize = function() {
    var flicking = getFlickingAttached(this._flicking);
    var panels = this._panels;
    if (panels.length <= 0) return this;
    if (flicking.panelsPerView > 0) {
      var firstPanel = panels[0];
      firstPanel.resize();
      this._updatePanelSizeByGrid(firstPanel, panels);
    } else {
      flicking.panels.forEach(function(panel) {
        return panel.resize();
      });
    }
    return this;
  };
  __proto.batchInsert = function() {
    var items = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      items[_i] = arguments[_i];
    }
    var allPanelsInserted = this.batchInsertDefer.apply(this, __spread(items));
    if (allPanelsInserted.length <= 0) return [];
    this.updateAfterPanelChange(allPanelsInserted, []);
    return allPanelsInserted;
  };
  __proto.batchInsertDefer = function() {
    var _this = this;
    var items = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      items[_i] = arguments[_i];
    }
    var panels = this._panels;
    var flicking = getFlickingAttached(this._flicking);
    var prevFirstPanel = panels[0];
    var align = parsePanelAlign(this._align);
    var allPanelsInserted = items.reduce(function(addedPanels, item) {
      var _a;
      var insertingIdx = getMinusCompensatedIndex(item.index, panels.length);
      var panelsPushed = panels.slice(insertingIdx);
      var panelsInserted = item.elements.map(function(el, idx) {
        return _this._createPanel(el, {
          index: insertingIdx + idx,
          align,
          flicking
        });
      });
      panels.splice.apply(panels, __spread([insertingIdx, 0], panelsInserted));
      if (item.hasDOMInElements) {
        _this._insertPanelElements(panelsInserted, (_a = panelsPushed[0]) !== null && _a !== void 0 ? _a : null);
      }
      if (flicking.panelsPerView > 0) {
        var firstPanel = prevFirstPanel || panelsInserted[0].resize();
        _this._updatePanelSizeByGrid(firstPanel, panelsInserted);
      } else {
        panelsInserted.forEach(function(panel) {
          return panel.resize();
        });
      }
      panelsPushed.forEach(function(panel) {
        panel.increaseIndex(panelsInserted.length);
        panel.updatePosition();
      });
      return __spread(addedPanels, panelsInserted);
    }, []);
    return allPanelsInserted;
  };
  __proto.batchRemove = function() {
    var items = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      items[_i] = arguments[_i];
    }
    var allPanelsRemoved = this.batchRemoveDefer.apply(this, __spread(items));
    if (allPanelsRemoved.length <= 0) return [];
    this.updateAfterPanelChange([], allPanelsRemoved);
    return allPanelsRemoved;
  };
  __proto.batchRemoveDefer = function() {
    var _this = this;
    var items = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      items[_i] = arguments[_i];
    }
    var panels = this._panels;
    var flicking = getFlickingAttached(this._flicking);
    var control = flicking.control;
    var activePanel = control.activePanel;
    var allPanelsRemoved = items.reduce(function(removed, item) {
      var index = item.index, deleteCount = item.deleteCount;
      var removingIdx = getMinusCompensatedIndex(index, panels.length);
      var panelsPulled = panels.slice(removingIdx + deleteCount);
      var panelsRemoved = panels.splice(removingIdx, deleteCount);
      if (panelsRemoved.length <= 0) return [];
      panelsPulled.forEach(function(panel) {
        panel.decreaseIndex(panelsRemoved.length);
        panel.updatePosition();
      });
      if (item.hasDOMInElements) {
        _this._removePanelElements(panelsRemoved);
      }
      panelsRemoved.forEach(function(panel) {
        return panel.destroy();
      });
      if (includes(panelsRemoved, activePanel)) {
        control.resetActive();
      }
      return __spread(removed, panelsRemoved);
    }, []);
    return allPanelsRemoved;
  };
  __proto.updateAfterPanelChange = function(panelsAdded, panelsRemoved) {
    var _a;
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera, control = flicking.control;
    var panels = this._panels;
    var activePanel = control.activePanel;
    this._updateCameraAndControl();
    if (flicking.autoResize && flicking.useResizeObserver) {
      panelsAdded.forEach(function(panel) {
        if (panel.element) {
          flicking.autoResizer.observe(panel.element);
        }
      });
      panelsRemoved.forEach(function(panel) {
        if (panel.element) {
          flicking.autoResizer.unobserve(panel.element);
        }
      });
    }
    void this.render();
    if (!flicking.animating) {
      if (!activePanel || activePanel.removed) {
        if (panels.length <= 0) {
          camera.lookAt(0);
        } else {
          var targetIndex = (_a = activePanel === null || activePanel === void 0 ? void 0 : activePanel.index) !== null && _a !== void 0 ? _a : 0;
          if (targetIndex > panels.length - 1) {
            targetIndex = panels.length - 1;
          }
          void control.moveToPanel(panels[targetIndex], {
            duration: 0
          }).catch(function() {
            return void 0;
          });
        }
      } else {
        void control.moveToPanel(activePanel, {
          duration: 0
        }).catch(function() {
          return void 0;
        });
      }
    }
    flicking.camera.updateOffset();
    if (panelsAdded.length > 0 || panelsRemoved.length > 0) {
      flicking.trigger(new ComponentEvent$1(EVENTS.PANEL_CHANGE, {
        added: panelsAdded,
        removed: panelsRemoved
      }));
      this.checkPanelContentsReady(__spread(panelsAdded, panelsRemoved));
    }
  };
  __proto.checkPanelContentsReady = function(checkingPanels) {
    var _this = this;
    var flicking = getFlickingAttached(this._flicking);
    var resizeOnContentsReady = flicking.resizeOnContentsReady;
    var panels = this._panels;
    if (!resizeOnContentsReady || flicking.virtualEnabled) return;
    var hasContents = function(panel) {
      return panel.element && !!panel.element.querySelector("img, video");
    };
    checkingPanels = checkingPanels.filter(function(panel) {
      return hasContents(panel);
    });
    if (checkingPanels.length <= 0) return;
    var contentsReadyChecker = new ImReady();
    checkingPanels.forEach(function(panel) {
      panel.loading = true;
    });
    contentsReadyChecker.on("readyElement", function(e) {
      if (!_this._flicking) {
        contentsReadyChecker.destroy();
        return;
      }
      var panel = checkingPanels[e.index];
      var camera = flicking.camera;
      var control = flicking.control;
      var prevProgressInPanel = control.activePanel ? camera.getProgressInPanel(control.activePanel) : 0;
      panel.loading = false;
      panel.resize();
      panels.slice(panel.index + 1).forEach(function(panelBehind) {
        return panelBehind.updatePosition();
      });
      if (!flicking.initialized) return;
      camera.updateRange();
      camera.updateOffset();
      camera.updateAnchors();
      if (control.animating) ;
      else {
        control.updatePosition(prevProgressInPanel);
        control.updateInput();
      }
    });
    contentsReadyChecker.on("preReady", function(e) {
      if (_this._flicking) {
        void _this.render();
      }
      if (e.readyCount === e.totalCount) {
        contentsReadyChecker.destroy();
      }
    });
    contentsReadyChecker.on("ready", function() {
      if (_this._flicking) {
        void _this.render();
      }
      contentsReadyChecker.destroy();
    });
    contentsReadyChecker.check(checkingPanels.map(function(panel) {
      return panel.element;
    }));
  };
  __proto._updateCameraAndControl = function() {
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera, control = flicking.control;
    camera.updateRange();
    camera.updateOffset();
    camera.updateAnchors();
    camera.resetNeedPanelHistory();
    control.updateInput();
  };
  __proto._showOnlyVisiblePanels = function(flicking) {
    var panels = flicking.renderer.panels;
    var camera = flicking.camera;
    var visibleIndexes = camera.visiblePanels.reduce(function(visibles, panel) {
      visibles[panel.index] = true;
      return visibles;
    }, {});
    panels.forEach(function(panel) {
      if (panel.index in visibleIndexes || panel.loading) {
        panel.markForShow();
      } else if (!flicking.holding) {
        panel.markForHide();
      }
    });
  };
  __proto._updatePanelSizeByGrid = function(referencePanel, panels) {
    var flicking = getFlickingAttached(this._flicking);
    var panelsPerView = flicking.panelsPerView;
    if (panelsPerView <= 0) {
      throw new FlickingError(MESSAGE.WRONG_OPTION("panelsPerView", panelsPerView), CODE.WRONG_OPTION);
    }
    if (panels.length <= 0) return;
    var viewportSize = flicking.camera.size;
    var gap = referencePanel.margin.prev + referencePanel.margin.next;
    var panelSize = (viewportSize - gap * (panelsPerView - 1)) / panelsPerView;
    var panelSizeObj = flicking.horizontal ? {
      width: panelSize
    } : {
      height: panelSize
    };
    var firstPanelSizeObj = __assign({
      size: panelSize,
      margin: referencePanel.margin
    }, !flicking.horizontal && {
      height: referencePanel.height
    });
    if (!flicking.noPanelStyleOverride) {
      this._strategy.updatePanelSizes(flicking, panelSizeObj);
    }
    flicking.panels.forEach(function(panel) {
      return panel.resize(firstPanelSizeObj);
    });
  };
  __proto._removeAllChildsFromCamera = function() {
    var flicking = getFlickingAttached(this._flicking);
    var cameraElement = flicking.camera.element;
    while (cameraElement.firstChild) {
      cameraElement.removeChild(cameraElement.firstChild);
    }
  };
  __proto._insertPanelElements = function(panels, nextSibling) {
    if (nextSibling === void 0) {
      nextSibling = null;
    }
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    var cameraElement = camera.element;
    var nextSiblingElement = (nextSibling === null || nextSibling === void 0 ? void 0 : nextSibling.element) || null;
    var fragment = document.createDocumentFragment();
    panels.forEach(function(panel) {
      return fragment.appendChild(panel.element);
    });
    cameraElement.insertBefore(fragment, nextSiblingElement);
  };
  __proto._removePanelElements = function(panels) {
    var flicking = getFlickingAttached(this._flicking);
    var cameraElement = flicking.camera.element;
    panels.forEach(function(panel) {
      cameraElement.removeChild(panel.element);
    });
  };
  __proto._afterRender = function() {
    var flicking = getFlickingAttached(this._flicking);
    flicking.camera.applyTransform();
    if (flicking.useCSSOrder) {
      var renderedPanels_1 = flicking.renderer.panels.filter(function(panel) {
        return panel.rendered;
      });
      this._strategy.getRenderingIndexesByOrder(flicking).forEach(function(domIndex, index) {
        if (renderedPanels_1[domIndex].element) {
          renderedPanels_1[domIndex].element.style.order = "" + index;
        }
      });
    }
  };
  return Renderer2;
})();
var VanillaRenderer = /* @__PURE__ */ (function(_super) {
  __extends$1(VanillaRenderer2, _super);
  function VanillaRenderer2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  var __proto = VanillaRenderer2.prototype;
  __proto.render = function() {
    return __awaiter(this, void 0, void 0, function() {
      var flicking, strategy;
      return __generator(this, function(_a) {
        flicking = getFlickingAttached(this._flicking);
        strategy = this._strategy;
        strategy.updateRenderingPanels(flicking);
        strategy.renderPanels(flicking);
        this._resetPanelElementOrder();
        this._afterRender();
        return [
          2
          /*return*/
        ];
      });
    });
  };
  __proto._collectPanels = function() {
    var flicking = getFlickingAttached(this._flicking);
    var camera = flicking.camera;
    this._removeAllTextNodes();
    this._panels = this._strategy.collectPanels(flicking, camera.children);
  };
  __proto._createPanel = function(el, options) {
    return this._strategy.createPanel(el, options);
  };
  __proto._resetPanelElementOrder = function() {
    var flicking = getFlickingAttached(this._flicking);
    var cameraEl = flicking.camera.element;
    var reversedElements = [];
    if (flicking.useCSSOrder) {
      reversedElements = this.getRenderedPanels().map(function(panel) {
        return panel.element;
      }).reverse();
    } else {
      reversedElements = this._strategy.getRenderingElementsByOrder(flicking).reverse();
    }
    reversedElements.forEach(function(el, idx) {
      var nextEl = reversedElements[idx - 1] ? reversedElements[idx - 1] : null;
      if (el.nextElementSibling !== nextEl) {
        cameraEl.insertBefore(el, nextEl);
      }
    });
  };
  __proto._removeAllTextNodes = function() {
    var flicking = getFlickingAttached(this._flicking);
    var cameraElement = flicking.camera.element;
    toArray(cameraElement.childNodes).forEach(function(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        cameraElement.removeChild(node);
      }
    });
  };
  return VanillaRenderer2;
})(Renderer$1);
var Panel = /* @__PURE__ */ (function() {
  function Panel2(_a) {
    var index = _a.index, align = _a.align, flicking = _a.flicking, elementProvider = _a.elementProvider;
    this._index = index;
    this._flicking = flicking;
    this._elProvider = elementProvider;
    this._align = align;
    this._removed = false;
    this._rendered = true;
    this._loading = false;
    this._resetInternalStates();
  }
  var __proto = Panel2.prototype;
  Object.defineProperty(__proto, "element", {
    // Internal States Getter
    /**
     * `HTMLElement` that panel's referencing
     * @ko 패널이 참조하고 있는 `HTMLElement`
     * @type {HTMLElement}
     * @readonly
     */
    get: function() {
      return this._elProvider.element;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "elementProvider", {
    /**
     * @internal
     * @readonly
     */
    get: function() {
      return this._elProvider;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "index", {
    /**
     * Index of the panel
     * @ko 패널의 인덱스
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._index;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "position", {
    /**
     * Position of the panel, including {@link Panel#alignPosition alignPosition}
     * @ko 패널의 현재 좌표, {@link Panel#alignPosition alignPosition}을 포함하고 있습니다
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._pos + this._alignPos;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "size", {
    /**
     * Cached size of the panel element
     * This is equal to {@link Panel#element element}'s `offsetWidth` if {@link Flicking#horizontal horizontal} is `true`, and `offsetHeight` else
     * @ko 패널 엘리먼트의 캐시된 크기
     * 이 값은 {@link Flicking#horizontal horizontal}이 `true`일 경우 {@link Panel#element element}의 `offsetWidth`와 동일하고, `false`일 경우 `offsetHeight`와 동일합니다
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._size;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "sizeIncludingMargin", {
    /**
     * Panel's size including CSS `margin`
     * This value includes {@link Panel#element element}'s margin left/right if {@link Flicking#horizontal horizontal} is `true`, and margin top/bottom else
     * @ko CSS `margin`을 포함한 패널의 크기
     * 이 값은 {@link Flicking#horizontal horizontal}이 `true`일 경우 margin left/right을 포함하고, `false`일 경우 margin top/bottom을 포함합니다
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._size + this._margin.prev + this._margin.next;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "height", {
    /**
     * Height of the panel element
     * @ko 패널 엘리먼트의 높이
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._height;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "margin", {
    /**
     * Cached CSS `margin` value of the panel element
     * @ko 패널 엘리먼트의 CSS `margin` 값
     * @type {object}
     * @property {number} prev CSS `margin-left` when the {@link Flicking#horizontal horizontal} is `true`, and `margin-top` else
     * <ko>{@link Flicking#horizontal horizontal}이 `true`일 경우 `margin-left`, `false`일 경우 `margin-top`에 해당하는 값</ko>
     * @property {number} next CSS `margin-right` when the {@link Flicking#horizontal horizontal} is `true`, and `margin-bottom` else
     * <ko>{@link Flicking#horizontal horizontal}이 `true`일 경우 `margin-right`, `false`일 경우 `margin-bottom`에 해당하는 값</ko>
     * @readonly
     */
    get: function() {
      return this._margin;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "alignPosition", {
    /**
     * Align position inside the panel where {@link Camera}'s {@link Camera#alignPosition alignPosition} inside viewport should be located at
     * @ko 패널의 정렬 기준 위치. {@link Camera}의 뷰포트 내에서의 {@link Camera#alignPosition alignPosition}이 위치해야 하는 곳입니다
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._alignPos;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "removed", {
    /**
     * A value indicating whether the panel's {@link Flicking#remove remove}d
     * @ko 패널이 {@link Flicking#remove remove}되었는지 여부를 나타내는 값
     * @type {boolean}
     * @readonly
     */
    get: function() {
      return this._removed;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "rendered", {
    /**
     * A value indicating whether the panel's element is being rendered on the screen
     * @ko 패널의 엘리먼트가 화면상에 렌더링되고있는지 여부를 나타내는 값
     * @type {boolean}
     * @readonly
     */
    get: function() {
      return this._rendered;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "loading", {
    /**
     * A value indicating whether the panel's image/video is not loaded and waiting for resize
     * @ko 패널 내부의 이미지/비디오가 아직 로드되지 않아 {@link Panel#resize resize}될 것인지를 나타내는 값
     * @type {boolean}
     * @readonly
     */
    get: function() {
      return this._loading;
    },
    set: function(val) {
      this._loading = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "range", {
    /**
     * Panel element's range of the bounding box
     * @ko 패널 엘리먼트의 Bounding box 범위
     * @type {object}
     * @property {number} [min] Bounding box's left({@link Flicking#horizontal horizontal}: true) / top({@link Flicking#horizontal horizontal}: false)
     * @property {number} [max] Bounding box's right({@link Flicking#horizontal horizontal}: true) / bottom({@link Flicking#horizontal horizontal}: false)
     * @readonly
     */
    get: function() {
      return {
        min: this._pos,
        max: this._pos + this._size
      };
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "toggled", {
    /**
     * A value indicating whether the panel's position is toggled by circular behavior
     * @ko 패널의 위치가 circular 동작에 의해 토글되었는지 여부를 나타내는 값
     * @type {boolean}
     * @readonly
     */
    get: function() {
      return this._toggled;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "toggleDirection", {
    /**
     * A direction where the panel's position is toggled
     * @ko 패널의 위치가 circular 동작에 의해 토글되는 방향
     * @type {DIRECTION}
     * @readonly
     */
    get: function() {
      return this._toggleDirection;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "offset", {
    /**
     * Actual position offset determined by {@link Panel#order}
     * @ko {@link Panel#order}에 의한 실제 위치 변경값
     * @type {number}
     * @readonly
     */
    get: function() {
      var toggleDirection = this._toggleDirection;
      var cameraRangeDiff = this._flicking.camera.rangeDiff;
      return toggleDirection === DIRECTION.NONE || !this._toggled ? 0 : toggleDirection === DIRECTION.PREV ? -cameraRangeDiff : cameraRangeDiff;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "progress", {
    /**
     * Progress of movement between previous or next panel relative to current panel
     * @ko 이 패널로부터 이전/다음 패널으로의 이동 진행률
     * @type {number}
     * @readonly
     */
    get: function() {
      var flicking = this._flicking;
      return this.index - flicking.camera.progress;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "outsetProgress", {
    /**
     * Progress of movement between points that panel is completely invisible outside of viewport(prev direction: -1, selected point: 0, next direction: 1)
     * @ko 현재 패널이 뷰포트 영역 밖으로 완전히 사라지는 지점을 기준으로 하는 진행도(prev방향: -1, 선택 지점: 0, next방향: 1)
     * @type {number}
     * @readonly
     */
    get: function() {
      var position = this.position + this.offset;
      var alignPosition = this._alignPos;
      var camera = this._flicking.camera;
      var camPos = camera.position;
      if (camPos === position) {
        return 0;
      }
      if (camPos < position) {
        var disappearPosNext = position + (camera.size - camera.alignPosition) + alignPosition;
        return -getProgress$1(camPos, position, disappearPosNext);
      } else {
        var disappearPosPrev = position - (camera.alignPosition + this._size - alignPosition);
        return 1 - getProgress$1(camPos, disappearPosPrev, position);
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "visibleRatio", {
    /**
     * Percentage of area where panel is visible in the viewport
     * @ko 뷰포트 안에서 패널이 보이는 영역의 비율
     * @type {number}
     * @readonly
     */
    get: function() {
      var range2 = this.range;
      var size = this._size;
      var offset = this.offset;
      var visibleRange = this._flicking.camera.visibleRange;
      var checkingRange = {
        min: range2.min + offset,
        max: range2.max + offset
      };
      if (checkingRange.max <= visibleRange.min || checkingRange.min >= visibleRange.max) {
        return 0;
      }
      var visibleSize = size;
      if (visibleRange.min > checkingRange.min) {
        visibleSize -= visibleRange.min - checkingRange.min;
      }
      if (visibleRange.max < checkingRange.max) {
        visibleSize -= checkingRange.max - visibleRange.max;
      }
      return visibleSize / size;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "align", {
    // Options Getter
    /**
     * A value indicating where the {@link Panel#alignPosition alignPosition} should be located at inside the panel element
     * @ko {@link Panel#alignPosition alignPosition}이 패널 내의 어디에 위치해야 하는지를 나타내는 값
     * @type {Constants.ALIGN | string | number}
     */
    get: function() {
      return this._align;
    },
    // Options Setter
    set: function(val) {
      this._align = val;
      this._updateAlignPos();
    },
    enumerable: false,
    configurable: true
  });
  __proto.markForShow = function() {
    this._rendered = true;
    this._elProvider.show(this._flicking);
  };
  __proto.markForHide = function() {
    this._rendered = false;
    this._elProvider.hide(this._flicking);
  };
  __proto.resize = function(cached) {
    var _a;
    var el = this.element;
    var flicking = this._flicking;
    var horizontal = flicking.horizontal, useFractionalSize = flicking.useFractionalSize;
    if (!el) {
      return this;
    }
    if (cached) {
      this._size = cached.size;
      this._margin = __assign({}, cached.margin);
      this._height = (_a = cached.height) !== null && _a !== void 0 ? _a : getElementSize({
        el,
        horizontal: false,
        useFractionalSize,
        useOffset: true,
        style: getStyle(el)
      });
    } else {
      var elStyle = getStyle(el);
      this._size = getElementSize({
        el,
        horizontal,
        useFractionalSize,
        useOffset: true,
        style: elStyle
      });
      this._margin = horizontal ? {
        prev: parseFloat(elStyle.marginLeft || "0"),
        next: parseFloat(elStyle.marginRight || "0")
      } : {
        prev: parseFloat(elStyle.marginTop || "0"),
        next: parseFloat(elStyle.marginBottom || "0")
      };
      this._height = horizontal ? getElementSize({
        el,
        horizontal: false,
        useFractionalSize,
        useOffset: true,
        style: elStyle
      }) : this._size;
    }
    this.updatePosition();
    this._updateAlignPos();
    return this;
  };
  __proto.setSize = function(size) {
    setSize(this.element, size);
    return this;
  };
  __proto.contains = function(element) {
    var _a;
    return !!((_a = this.element) === null || _a === void 0 ? void 0 : _a.contains(element));
  };
  __proto.destroy = function() {
    this._resetInternalStates();
    this._removed = true;
  };
  __proto.includePosition = function(pos, includeMargin) {
    if (includeMargin === void 0) {
      includeMargin = false;
    }
    return this.includeRange(pos, pos, includeMargin);
  };
  __proto.includeRange = function(min, max, includeMargin) {
    if (includeMargin === void 0) {
      includeMargin = false;
    }
    var margin = this._margin;
    var panelRange = this.range;
    if (includeMargin) {
      panelRange.min -= margin.prev;
      panelRange.max += margin.next;
    }
    return max >= panelRange.min && min <= panelRange.max;
  };
  __proto.isVisibleOnRange = function(min, max) {
    var panelRange = this.range;
    return max > panelRange.min && min < panelRange.max;
  };
  __proto.focus = function(duration) {
    return this._flicking.moveTo(this._index, duration);
  };
  __proto.prev = function() {
    var index = this._index;
    var flicking = this._flicking;
    var renderer = flicking.renderer;
    var panelCount = renderer.panelCount;
    if (panelCount === 1) return null;
    return flicking.circularEnabled ? renderer.getPanel(index === 0 ? panelCount - 1 : index - 1) : renderer.getPanel(index - 1);
  };
  __proto.next = function() {
    var index = this._index;
    var flicking = this._flicking;
    var renderer = flicking.renderer;
    var panelCount = renderer.panelCount;
    if (panelCount === 1) return null;
    return flicking.circularEnabled ? renderer.getPanel(index === panelCount - 1 ? 0 : index + 1) : renderer.getPanel(index + 1);
  };
  __proto.increaseIndex = function(val) {
    this._index += Math.max(val, 0);
    return this;
  };
  __proto.decreaseIndex = function(val) {
    this._index -= Math.max(val, 0);
    return this;
  };
  __proto.updatePosition = function() {
    var prevPanel = this._flicking.renderer.panels[this._index - 1];
    this._pos = prevPanel ? prevPanel.range.max + prevPanel.margin.next + this._margin.prev : this._margin.prev;
    return this;
  };
  __proto.toggle = function(prevPos, newPos) {
    var toggleDirection = this._toggleDirection;
    var togglePosition = this._togglePosition;
    if (toggleDirection === DIRECTION.NONE || newPos === prevPos) return false;
    var prevToggled = this._toggled;
    if (newPos > prevPos) {
      if (togglePosition >= prevPos && togglePosition <= newPos) {
        this._toggled = toggleDirection === DIRECTION.NEXT;
      }
    } else {
      if (togglePosition <= prevPos && togglePosition >= newPos) {
        this._toggled = toggleDirection !== DIRECTION.NEXT;
      }
    }
    return prevToggled !== this._toggled;
  };
  __proto.updateCircularToggleDirection = function() {
    var flicking = this._flicking;
    if (!flicking.circularEnabled) {
      this._toggleDirection = DIRECTION.NONE;
      this._togglePosition = 0;
      this._toggled = false;
      return this;
    }
    var camera = flicking.camera;
    var camRange = camera.range;
    var camAlignPosition = camera.alignPosition;
    var camVisibleRange = camera.visibleRange;
    var camVisibleSize = camVisibleRange.max - camVisibleRange.min;
    var minimumVisible = camRange.min - camAlignPosition;
    var maximumVisible = camRange.max - camAlignPosition + camVisibleSize;
    var shouldBeVisibleAtMin = this.includeRange(maximumVisible - camVisibleSize, maximumVisible, false);
    var shouldBeVisibleAtMax = this.includeRange(minimumVisible, minimumVisible + camVisibleSize, false);
    this._toggled = false;
    if (shouldBeVisibleAtMin) {
      this._toggleDirection = DIRECTION.PREV;
      this._togglePosition = this.range.max + camRange.min - camRange.max + camAlignPosition;
      this.toggle(Infinity, camera.position);
    } else if (shouldBeVisibleAtMax) {
      this._toggleDirection = DIRECTION.NEXT;
      this._togglePosition = this.range.min + camRange.max - camVisibleSize + camAlignPosition;
      this.toggle(-Infinity, camera.position);
    } else {
      this._toggleDirection = DIRECTION.NONE;
      this._togglePosition = 0;
    }
    return this;
  };
  __proto._updateAlignPos = function() {
    this._alignPos = parseAlign$1(this._align, this._size);
  };
  __proto._resetInternalStates = function() {
    this._size = 0;
    this._pos = 0;
    this._margin = {
      prev: 0,
      next: 0
    };
    this._height = 0;
    this._alignPos = 0;
    this._toggled = false;
    this._togglePosition = 0;
    this._toggleDirection = DIRECTION.NONE;
  };
  return Panel2;
})();
var NormalRenderingStrategy = /* @__PURE__ */ (function() {
  function NormalRenderingStrategy2(_a) {
    var providerCtor = _a.providerCtor;
    this._providerCtor = providerCtor;
  }
  var __proto = NormalRenderingStrategy2.prototype;
  __proto.renderPanels = function() {
  };
  __proto.getRenderingIndexesByOrder = function(flicking) {
    var renderedPanels = flicking.renderer.panels.filter(function(panel) {
      return panel.rendered;
    });
    var toggledPrev = renderedPanels.filter(function(panel) {
      return panel.toggled && panel.toggleDirection === DIRECTION.PREV;
    });
    var toggledNext = renderedPanels.filter(function(panel) {
      return panel.toggled && panel.toggleDirection === DIRECTION.NEXT;
    });
    var notToggled = renderedPanels.filter(function(panel) {
      return !panel.toggled;
    });
    return __spread(toggledPrev, notToggled, toggledNext).map(function(panel) {
      return panel.index;
    });
  };
  __proto.getRenderingElementsByOrder = function(flicking) {
    var panels = flicking.panels;
    return this.getRenderingIndexesByOrder(flicking).map(function(index) {
      return panels[index].element;
    });
  };
  __proto.updateRenderingPanels = function(flicking) {
    if (flicking.renderOnlyVisible) {
      this._showOnlyVisiblePanels(flicking);
    } else {
      flicking.panels.forEach(function(panel) {
        return panel.markForShow();
      });
    }
  };
  __proto.collectPanels = function(flicking, elements2) {
    var _this = this;
    var align = parsePanelAlign(flicking.renderer.align);
    return elements2.map(function(el, index) {
      return new Panel({
        index,
        elementProvider: new _this._providerCtor(el),
        align,
        flicking
      });
    });
  };
  __proto.createPanel = function(element, options) {
    return new Panel(__assign(__assign({}, options), {
      elementProvider: new this._providerCtor(element)
    }));
  };
  __proto.updatePanelSizes = function(flicking, size) {
    flicking.panels.forEach(function(panel) {
      return panel.setSize(size);
    });
  };
  __proto._showOnlyVisiblePanels = function(flicking) {
    var panels = flicking.renderer.panels;
    var camera = flicking.camera;
    var visibleIndexes = camera.visiblePanels.reduce(function(visibles, panel) {
      visibles[panel.index] = true;
      return visibles;
    }, {});
    panels.forEach(function(panel) {
      if (panel.index in visibleIndexes || panel.loading) {
        panel.markForShow();
      } else if (!flicking.holding) {
        panel.markForHide();
      }
    });
    camera.updateOffset();
  };
  return NormalRenderingStrategy2;
})();
var VirtualPanel = /* @__PURE__ */ (function(_super) {
  __extends$1(VirtualPanel2, _super);
  function VirtualPanel2(options) {
    var _this = _super.call(this, options) || this;
    options.elementProvider.init(_this);
    _this._elProvider = options.elementProvider;
    _this._cachedInnerHTML = null;
    return _this;
  }
  var __proto = VirtualPanel2.prototype;
  Object.defineProperty(__proto, "element", {
    /**
     * `HTMLElement` that panel's referencing
     * @ko 패널이 참조하고 있는 `HTMLElement`
     * @type {HTMLElement}
     * @readonly
     */
    get: function() {
      return this._elProvider.element;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "cachedInnerHTML", {
    /**
     * Cached innerHTML by the previous render function
     * @ko 이전 렌더링에서 캐시된 innerHTML 정보
     * @type {string|null}
     * @readonly
     */
    get: function() {
      return this._cachedInnerHTML;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "elementIndex", {
    /**
     * An number for indexing which element it will be rendered on
     * @ko 몇 번째 엘리먼트에 렌더링될 것인지를 나타내는 숫자
     * @type {number}
     * @readonly
     */
    get: function() {
      var flicking = this._flicking;
      var virtualElCount = flicking.panelsPerView + 1;
      var panelCount = flicking.panelCount;
      var index = this._index;
      if (this._toggled) {
        index = this._toggleDirection === DIRECTION.NEXT ? index + panelCount : index - panelCount;
      }
      return circulateIndex(index, virtualElCount);
    },
    enumerable: false,
    configurable: true
  });
  __proto.cacheRenderResult = function(result) {
    this._cachedInnerHTML = result;
  };
  __proto.uncacheRenderResult = function() {
    this._cachedInnerHTML = null;
  };
  __proto.render = function() {
    var flicking = this._flicking;
    var _a = flicking.virtual, renderPanel = _a.renderPanel, cache = _a.cache;
    var element = this._elProvider.element;
    var newInnerHTML = this._cachedInnerHTML || renderPanel(this, this._index);
    if (newInnerHTML === element.innerHTML) return;
    element.innerHTML = newInnerHTML;
    if (cache) {
      this.cacheRenderResult(newInnerHTML);
    }
  };
  __proto.increaseIndex = function(val) {
    this.uncacheRenderResult();
    return _super.prototype.increaseIndex.call(this, val);
  };
  __proto.decreaseIndex = function(val) {
    this.uncacheRenderResult();
    return _super.prototype.decreaseIndex.call(this, val);
  };
  return VirtualPanel2;
})(Panel);
var VirtualRenderingStrategy = /* @__PURE__ */ (function() {
  function VirtualRenderingStrategy2() {
  }
  var __proto = VirtualRenderingStrategy2.prototype;
  __proto.renderPanels = function(flicking) {
    var virtualManager = flicking.virtual;
    var visiblePanels = flicking.visiblePanels;
    var invisibleIndexes = range(flicking.panelsPerView + 1);
    visiblePanels.forEach(function(panel) {
      var elementIndex = panel.elementIndex;
      panel.render();
      virtualManager.show(elementIndex);
      invisibleIndexes[elementIndex] = -1;
    });
    invisibleIndexes.filter(function(val) {
      return val >= 0;
    }).forEach(function(idx) {
      virtualManager.hide(idx);
    });
  };
  __proto.getRenderingIndexesByOrder = function(flicking) {
    var virtualManager = flicking.virtual;
    var visiblePanels = __spread(flicking.visiblePanels).filter(function(panel) {
      return panel.rendered;
    }).sort(function(panel1, panel2) {
      return panel1.position + panel1.offset - (panel2.position + panel2.offset);
    });
    if (visiblePanels.length <= 0) return virtualManager.elements.map(function(_, idx) {
      return idx;
    });
    var visibleIndexes = visiblePanels.map(function(panel) {
      return panel.elementIndex;
    });
    var invisibleIndexes = virtualManager.elements.map(function(el, idx) {
      return __assign(__assign({}, el), {
        idx
      });
    }).filter(function(el) {
      return !el.visible;
    }).map(function(el) {
      return el.idx;
    });
    return __spread(visibleIndexes, invisibleIndexes);
  };
  __proto.getRenderingElementsByOrder = function(flicking) {
    var virtualManager = flicking.virtual;
    var elements2 = virtualManager.elements;
    return this.getRenderingIndexesByOrder(flicking).map(function(index) {
      return elements2[index].nativeElement;
    });
  };
  __proto.updateRenderingPanels = function(flicking) {
    var panels = flicking.renderer.panels;
    var camera = flicking.camera;
    var visibleIndexes = camera.visiblePanels.reduce(function(visibles, panel) {
      visibles[panel.index] = true;
      return visibles;
    }, {});
    panels.forEach(function(panel) {
      if (panel.index in visibleIndexes || panel.loading) {
        panel.markForShow();
      } else {
        panel.markForHide();
      }
    });
    camera.updateOffset();
  };
  __proto.collectPanels = function(flicking) {
    var align = parsePanelAlign(flicking.renderer.align);
    return range(flicking.virtual.initialPanelCount).map(function(index) {
      return new VirtualPanel({
        index,
        elementProvider: new VirtualElementProvider(flicking),
        align,
        flicking
      });
    });
  };
  __proto.createPanel = function(_el, options) {
    return new VirtualPanel(__assign(__assign({}, options), {
      elementProvider: new VirtualElementProvider(options.flicking)
    }));
  };
  __proto.updatePanelSizes = function(flicking, size) {
    flicking.virtual.elements.forEach(function(el) {
      setSize(el.nativeElement, size);
    });
    flicking.panels.forEach(function(panel) {
      return panel.setSize(size);
    });
  };
  return VirtualRenderingStrategy2;
})();
var Flicking = /* @__PURE__ */ (function(_super) {
  __extends$1(Flicking2, _super);
  function Flicking2(root, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.align, align = _c === void 0 ? ALIGN.CENTER : _c, _d = _b.defaultIndex, defaultIndex = _d === void 0 ? 0 : _d, _e = _b.horizontal, horizontal = _e === void 0 ? true : _e, _f = _b.circular, circular = _f === void 0 ? false : _f, _g = _b.circularFallback, circularFallback = _g === void 0 ? CIRCULAR_FALLBACK.LINEAR : _g, _h = _b.bound, bound = _h === void 0 ? false : _h, _j = _b.adaptive, adaptive = _j === void 0 ? false : _j, _k = _b.panelsPerView, panelsPerView = _k === void 0 ? -1 : _k, _l = _b.noPanelStyleOverride, noPanelStyleOverride = _l === void 0 ? false : _l, _m = _b.resizeOnContentsReady, resizeOnContentsReady = _m === void 0 ? false : _m, _o = _b.nested, nested = _o === void 0 ? false : _o, _p = _b.needPanelThreshold, needPanelThreshold = _p === void 0 ? 0 : _p, _q = _b.preventEventsBeforeInit, preventEventsBeforeInit = _q === void 0 ? true : _q, _r = _b.deceleration, deceleration = _r === void 0 ? 75e-4 : _r, _s = _b.duration, duration = _s === void 0 ? 500 : _s, _t = _b.easing, easing = _t === void 0 ? function(x) {
      return 1 - Math.pow(1 - x, 3);
    } : _t, _u = _b.inputType, inputType = _u === void 0 ? ["mouse", "touch"] : _u, _v = _b.moveType, moveType = _v === void 0 ? "snap" : _v, _w = _b.threshold, threshold = _w === void 0 ? 40 : _w, _x = _b.dragThreshold, dragThreshold = _x === void 0 ? 1 : _x, _y = _b.interruptable, interruptable = _y === void 0 ? true : _y, _z = _b.bounce, bounce = _z === void 0 ? "20%" : _z, _0 = _b.iOSEdgeSwipeThreshold, iOSEdgeSwipeThreshold = _0 === void 0 ? 30 : _0, _1 = _b.preventClickOnDrag, preventClickOnDrag = _1 === void 0 ? true : _1, _2 = _b.preventDefaultOnDrag, preventDefaultOnDrag = _2 === void 0 ? false : _2, _3 = _b.disableOnInit, disableOnInit = _3 === void 0 ? false : _3, _4 = _b.changeOnHold, changeOnHold = _4 === void 0 ? false : _4, _5 = _b.renderOnlyVisible, renderOnlyVisible = _5 === void 0 ? false : _5, _6 = _b.virtual, virtual = _6 === void 0 ? null : _6, _7 = _b.autoInit, autoInit = _7 === void 0 ? true : _7, _8 = _b.autoResize, autoResize = _8 === void 0 ? true : _8, _9 = _b.useResizeObserver, useResizeObserver = _9 === void 0 ? true : _9, _10 = _b.resizeDebounce, resizeDebounce = _10 === void 0 ? 0 : _10, _11 = _b.observePanelResize, observePanelResize = _11 === void 0 ? false : _11, _12 = _b.maxResizeDebounce, maxResizeDebounce = _12 === void 0 ? 100 : _12, _13 = _b.useFractionalSize, useFractionalSize = _13 === void 0 ? false : _13, _14 = _b.externalRenderer, externalRenderer = _14 === void 0 ? null : _14, _15 = _b.renderExternal, renderExternal = _15 === void 0 ? null : _15, _16 = _b.optimizeSizeUpdate, optimizeSizeUpdate = _16 === void 0 ? false : _16, _17 = _b.animationThreshold, animationThreshold = _17 === void 0 ? 0.5 : _17, _18 = _b.useCSSOrder, useCSSOrder = _18 === void 0 ? false : _18;
    var _this = _super.call(this) || this;
    _this._scheduleResize = false;
    _this._initialized = false;
    _this._plugins = [];
    _this._isResizing = false;
    _this._align = align;
    _this._defaultIndex = defaultIndex;
    _this._horizontal = horizontal;
    _this._circular = circular;
    _this._circularFallback = circularFallback;
    _this._bound = bound;
    _this._adaptive = adaptive;
    _this._panelsPerView = panelsPerView;
    _this._noPanelStyleOverride = noPanelStyleOverride;
    _this._resizeOnContentsReady = resizeOnContentsReady;
    _this._nested = nested;
    _this._virtual = virtual;
    _this._needPanelThreshold = needPanelThreshold;
    _this._preventEventsBeforeInit = preventEventsBeforeInit;
    _this._deceleration = deceleration;
    _this._duration = duration;
    _this._easing = easing;
    _this._inputType = inputType;
    _this._moveType = moveType;
    _this._threshold = threshold;
    _this._dragThreshold = dragThreshold;
    _this._interruptable = interruptable;
    _this._bounce = bounce;
    _this._iOSEdgeSwipeThreshold = iOSEdgeSwipeThreshold;
    _this._preventClickOnDrag = preventClickOnDrag;
    _this._preventDefaultOnDrag = preventDefaultOnDrag;
    _this._disableOnInit = disableOnInit;
    _this._changeOnHold = changeOnHold;
    _this._renderOnlyVisible = renderOnlyVisible;
    _this._autoInit = autoInit;
    _this._autoResize = autoResize;
    _this._useResizeObserver = useResizeObserver;
    _this._resizeDebounce = resizeDebounce;
    _this._maxResizeDebounce = maxResizeDebounce;
    _this._observePanelResize = observePanelResize;
    _this._useFractionalSize = useFractionalSize;
    _this._externalRenderer = externalRenderer;
    _this._renderExternal = renderExternal;
    _this._optimizeSizeUpdate = optimizeSizeUpdate;
    _this._animationThreshold = animationThreshold;
    _this._useCSSOrder = useCSSOrder;
    _this._viewport = new Viewport(_this, getElement$1(root));
    _this._autoResizer = new AutoResizer(_this);
    _this._renderer = _this._createRenderer();
    _this._camera = _this._createCamera();
    _this._control = _this._createControl();
    _this._virtualManager = new VirtualManager(_this, virtual);
    if (_this._autoInit) {
      void _this.init();
    }
    return _this;
  }
  var __proto = Flicking2.prototype;
  Object.defineProperty(__proto, "control", {
    // Components
    /**
     * {@link Control} instance of the Flicking
     * @ko 현재 Flicking에 활성화된 {@link Control} 인스턴스
     * @type {Control}
     * @default SnapControl
     * @readonly
     * @see Control
     * @see SnapControl
     * @see FreeControl
     */
    get: function() {
      return this._control;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "camera", {
    /**
     * {@link Camera} instance of the Flicking
     * @ko 현재 Flicking에 활성화된 {@link Camera} 인스턴스
     * @type {Camera}
     * @default LinearCamera
     * @readonly
     * @see Camera
     * @see LinearCamera
     * @see BoundCamera
     * @see CircularCamera
     */
    get: function() {
      return this._camera;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "renderer", {
    /**
     * {@link Renderer} instance of the Flicking
     * @ko 현재 Flicking에 활성화된 {@link Renderer} 인스턴스
     * @type {Renderer}
     * @default VanillaRenderer
     * @readonly
     * @see Renderer
     * @see VanillaRenderer
     * @see ExternalRenderer
     */
    get: function() {
      return this._renderer;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "viewport", {
    /**
     * A component that manages viewport size
     * @ko 뷰포트 크기 정보를 담당하는 컴포넌트
     * @type {Viewport}
     * @readonly
     * @see Viewport
     */
    get: function() {
      return this._viewport;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "autoResizer", {
    /**
     * {@link AutoResizer} instance of the Flicking
     * @ko 현재 Flicking에 활성화된 {@link AutoResizer} 인스턴스
     * @internal
     * @readonly
     */
    get: function() {
      return this._autoResizer;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "initialized", {
    // Internal States
    /**
     * Whether Flicking's {@link Flicking#init init()} is called.
     * This is `true` when {@link Flicking#init init()} is called, and is `false` after calling {@link Flicking#destroy destroy()}.
     * @ko Flicking의 {@link Flicking#init init()}이 호출되었는지를 나타내는 멤버 변수.
     * 이 값은 {@link Flicking#init init()}이 호출되었으면 `true`로 변하고, {@link Flicking#destroy destroy()}호출 이후에 다시 `false`로 변경됩니다.
     * @type {boolean}
     * @default false
     * @readonly
     */
    get: function() {
      return this._initialized;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "circularEnabled", {
    /**
     * Whether the `circular` option is enabled.
     * The {@link Flicking#circular circular} option can't be enabled when sum of the panel sizes are too small.
     * @ko {@link Flicking#circular circular} 옵션이 활성화되었는지 여부를 나타내는 멤버 변수.
     * {@link Flicking#circular circular} 옵션은 패널의 크기의 합이 충분하지 않을 경우 비활성화됩니다.
     * @type {boolean}
     * @default false
     * @readonly
     */
    get: function() {
      return this._camera.circularEnabled;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "virtualEnabled", {
    /**
     * Whether the `virtual` option is enabled.
     * The {@link Flicking#virtual virtual} option can't be enabled when  {@link Flicking#panelsPerView panelsPerView} is less or equal than zero.
     * @ko {@link Flicking#virtual virtual} 옵션이 활성화되었는지 여부를 나타내는 멤버 변수.
     * {@link Flicking#virtual virtual} 옵션은 {@link Flicking#panelsPerView panelsPerView} 옵션의 값이 0보다 같거나 작으면 비활성화됩니다.
     * @type {boolean}
     * @default false
     * @readonly
     */
    get: function() {
      return this._panelsPerView > 0 && this._virtual != null;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "index", {
    /**
     * Index number of the {@link Flicking#currentPanel currentPanel}
     * @ko {@link Flicking#currentPanel currentPanel}의 인덱스 번호
     * @type {number}
     * @default 0
     * @readonly
     */
    get: function() {
      return this._control.activeIndex;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "element", {
    /**
     * The root(`.flicking-viewport`) element
     * @ko root(`.flicking-viewport`) 엘리먼트
     * @type {HTMLElement}
     * @readonly
     */
    get: function() {
      return this._viewport.element;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "currentPanel", {
    /**
     * Currently active panel
     * @ko 현재 선택된 패널
     * @type {Panel}
     * @readonly
     * @see Panel
     */
    get: function() {
      return this._control.activePanel;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "panels", {
    /**
     * Array of panels
     * @ko 전체 패널들의 배열
     * @type {Panel[]}
     * @readonly
     * @see Panel
     */
    get: function() {
      return this._renderer.panels;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "panelCount", {
    /**
     * Count of panels
     * @ko 전체 패널의 개수
     * @type {number}
     * @readonly
     */
    get: function() {
      return this._renderer.panelCount;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "visiblePanels", {
    /**
     * Array of panels that is visible at the current position
     * @ko 현재 보이는 패널의 배열
     * @type {Panel[]}
     * @readonly
     * @see Panel
     */
    get: function() {
      return this._camera.visiblePanels;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "animating", {
    /**
     * Whether Flicking's animating
     * @ko 현재 애니메이션 동작 여부
     * @type {boolean}
     * @readonly
     */
    get: function() {
      return this._control.animating;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "holding", {
    /**
     * Whether user is clicking or touching
     * @ko 현재 사용자가 클릭/터치중인지 여부
     * @type {boolean}
     * @readonly
     */
    get: function() {
      return this._control.holding;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "activePlugins", {
    /**
     * A current list of activated plugins
     * @ko 현재 활성화된 플러그인 목록
     * @type {Plugin[]}
     * @readonly
     */
    get: function() {
      return this._plugins;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "align", {
    // Options Getter
    // UI / LAYOUT
    /**
     * Align position of the panels within viewport. You can set different values each for the panel and camera
     * @ko 뷰포트 내에서 패널 정렬방식을 설정하는 옵션. 카메라와 패널 개별로 옵션을 설정할 수도 있습니다
     * @type {ALIGN | string | number | { panel: string | number, camera: string | number }}
     * @property {ALIGN | string | number} panel The align value for each {@link Panel}s<ko>개개의 {@link Panel}에 적용할 값</ko>
     * @property {ALIGN | string | number} camera The align value for {@link Camera}<ko>{@link Camera}에 적용할 값</ko>
     * @default "center"
     * @see {@link https://naver.github.io/egjs-flicking/Options#align align ( Options )}
     * @example
     * ```ts
     * const possibleOptions = [
     *   // Literal strings
     *   "prev", "center", "next",
     *   // % values, applied to both panel & camera
     *   "0%", "25%", "42%",
     *   // px values, arithmetic calculation with (+/-) is also allowed.
     *   "0px", "100px", "50% - 25px",
     *   // numbers, same to number + px ("0px", "100px")
     *   0, 100, 1000,
     *   // Setting a different value for panel & camera
     *   { panel: "10%", camera: "25%" }
     * ];
     *
     * possibleOptions.forEach(align => {
     *   new Flicking("#el", { align });
     * });
     * ```
     */
    get: function() {
      return this._align;
    },
    // Options Setter
    // UI / LAYOUT
    set: function(val) {
      this._align = val;
      this._renderer.align = val;
      this._camera.align = val;
      void this.resize();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "defaultIndex", {
    /**
     * Index of the panel to move when Flicking's {@link Flicking#init init()} is called. A zero-based integer
     * @ko Flicking의 {@link Flicking#init init()}이 호출될 때 이동할 디폴트 패널의 인덱스로, 0부터 시작하는 정수입니다.
     * @type {number}
     * @default 0
     * @see {@link https://naver.github.io/egjs-flicking/Options#defaultindex defaultIndex ( Options )}
     */
    get: function() {
      return this._defaultIndex;
    },
    set: function(val) {
      this._defaultIndex = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "horizontal", {
    /**
     * Direction of panel movement (true: horizontal, false: vertical)
     * @ko 패널 이동 방향 (true: 가로방향, false: 세로방향)
     * @type {boolean}
     * @default true
     * @see {@link https://naver.github.io/egjs-flicking/Options#horizontal horizontal ( Options )}
     */
    get: function() {
      return this._horizontal;
    },
    set: function(val) {
      this._horizontal = val;
      this._control.controller.updateDirection();
      void this.resize();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "circular", {
    /**
     * Enables circular(continuous loop) mode, which connects first/last panel for continuous scrolling.
     * @ko 순환 모드를 활성화합니다. 순환 모드에서는 양 끝의 패널이 서로 연결되어 끊김없는 스크롤이 가능합니다.
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#circular circular ( Options )}
     */
    get: function() {
      return this._circular;
    },
    set: function(val) {
      this._circular = val;
      void this.resize();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "circularFallback", {
    /**
     * Set panel control mode for the case when circular cannot be enabled.
     * "linear" will set the view's range from the top of the first panel to the top of the last panel.
     * "bound" will prevent the view from going out of the first/last panel, so it won't show empty spaces before/after the first/last panel.
     * @ko 순환 모드 사용 불가능시 사용할 패널 조작 범위 설정 방식을 변경합니다.
     * "linear" 사용시 시점이 첫번째 엘리먼트 위에서부터 마지막 엘리먼트 위까지 움직일 수 있도록 설정합니다.
     * "bound" 사용시 시점이 첫번째 엘리먼트와 마지막 엘리먼트의 끝과 끝 사이에서 움직일 수 있도록 설정합니다.
     * @see CIRCULAR_FALLBACK
     * @type {string}
     * @default "linear"
     * @see {@link https://naver.github.io/egjs-flicking/Options#circularfallback circularFallback ( Options )}
     */
    get: function() {
      return this._circularFallback;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "bound", {
    /**
     * Prevent the view(camera element) from going out of the first/last panel, so it won't show empty spaces before/after the first/last panel
     * Only can be enabled when `circular=false`
     * @ko 뷰(카메라 엘리먼트)가 첫번째와 마지막 패널 밖으로 넘어가지 못하게 하여, 첫번째/마지막 패널 전/후의 빈 공간을 보이지 않도록 하는 옵션입니다
     * `circular=false`인 경우에만 사용할 수 있습니다
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#bound bound ( Options )}
     */
    get: function() {
      return this._bound;
    },
    set: function(val) {
      this._bound = val;
      void this.resize();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "adaptive", {
    /**
     * Update height of the viewport element after movement same to the height of the panel below. This can be only enabled when `horizontal=true`
     * @ko 이동한 후 뷰포트 엘리먼트의 크기를 현재 패널의 높이와 동일하게 설정합니다. `horizontal=true`인 경우에만 사용할 수 있습니다.
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#adaptive adaptive ( Options )}
     */
    get: function() {
      return this._adaptive;
    },
    set: function(val) {
      this._adaptive = val;
      void this.resize();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "panelsPerView", {
    /**
     * A visible number of panels on viewport. Enabling this option will automatically resize panel size
     * @ko 한 화면에 보이는 패널의 개수. 이 옵션을 활성화할 경우 패널의 크기를 강제로 재조정합니다
     * @type {number}
     * @default -1
     * @see {@link https://naver.github.io/egjs-flicking/Options#panelsperview panelsPerView ( Options )}
     */
    get: function() {
      return this._panelsPerView;
    },
    set: function(val) {
      this._panelsPerView = val;
      void this.resize();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "noPanelStyleOverride", {
    /**
     * Enabling this option will not change `width/height` style of the panels if {@link Flicking#panelsPerView} is enabled.
     * This behavior can be useful in terms of performance when you're manually managing all panel sizes
     * @ko 이 옵션을 활성화할 경우, {@link Flicking#panelsPerView} 옵션이 활성화되었을 때 패널의 `width/height` 스타일을 변경하지 않도록 설정합니다.
     * 모든 패널들의 크기를 직접 관리하고 있을 경우, 이 옵션을 활성화하면 성능면에서 유리할 수 있습니다
     * @type {boolean}
     * @default false
     */
    get: function() {
      return this._noPanelStyleOverride;
    },
    set: function(val) {
      this._noPanelStyleOverride = val;
      void this.resize();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "resizeOnContentsReady", {
    /**
     * Enabling this option will automatically call {@link Flicking#resize} when all image/video inside panels are loaded.
     * This can be useful when you have contents inside Flicking that changes its size when it's loaded
     * @ko 이 옵션을 활성화할 경우, Flicking 패널 내부의 이미지/비디오들이 로드되었을 때 자동으로 {@link Flicking#resize}를 호출합니다.
     * 이 동작은 Flicking 내부에 로드 전/후로 크기가 변하는 콘텐츠를 포함하고 있을 때 유용하게 사용하실 수 있습니다.
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#resizeOnContentsReady resizeOnContentsReady ( Options )}
     */
    get: function() {
      return this._resizeOnContentsReady;
    },
    set: function(val) {
      this._resizeOnContentsReady = val;
      if (val) {
        this._renderer.checkPanelContentsReady(this._renderer.panels);
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "nested", {
    /**
     * If you enable this option on child Flicking when the Flicking is placed inside the Flicking, the parent Flicking will move in the same direction after the child Flicking reaches the first/last panel.
     * If the parent Flicking and child Flicking have different horizontal option, you do not need to set this option.
     * @ko Flicking 내부에 Flicking이 배치될 때 하위 Flicking에서 이 옵션을 활성화하면 하위 Flicking이 첫/마지막 패널에 도달한 뒤부터 같은 방향으로 상위 Flicking이 움직입니다.
     * 만약 상위 Flicking과 하위 Flicking이 서로 다른 horizontal 옵션을 가지고 있다면 이 옵션을 설정할 필요가 없습니다.
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#nested nested ( Options )}
     */
    get: function() {
      return this._nested;
    },
    set: function(val) {
      this._nested = val;
      var axes = this._control.controller.axes;
      if (axes) {
        axes.options.nested = val;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "needPanelThreshold", {
    // EVENTS
    /**
     * A Threshold from viewport edge before triggering `needPanel` event
     * @ko `needPanel`이벤트가 발생하기 위한 뷰포트 끝으로부터의 최대 거리
     * @type {number}
     * @default 0
     * @see {@link https://naver.github.io/egjs-flicking/Options#needpanelthreshold needPanelThreshold ( Options )}
     */
    get: function() {
      return this._needPanelThreshold;
    },
    // EVENTS
    set: function(val) {
      this._needPanelThreshold = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "preventEventsBeforeInit", {
    /**
     * When enabled, events are not triggered before `ready` when initializing
     * @ko 활성화할 경우 초기화시 `ready` 이벤트 이전의 이벤트가 발생하지 않습니다.
     * @type {boolean}
     * @default true
     * @see {@link https://naver.github.io/egjs-flicking/Options#preventeventsbeforeinit preventEventsBeforeInit ( Options )}
     */
    get: function() {
      return this._preventEventsBeforeInit;
    },
    set: function(val) {
      this._preventEventsBeforeInit = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "deceleration", {
    // ANIMATION
    /**
     * Deceleration value for panel movement animation which is triggered by user input. A higher value means a shorter animation time
     * @ko 사용자의 동작으로 가속도가 적용된 패널 이동 애니메이션의 감속도. 값이 높을수록 애니메이션 실행 시간이 짧아집니다
     * @type {number}
     * @default 0.0075
     * @see {@link https://naver.github.io/egjs-flicking/Options#deceleration deceleration ( Options )}
     */
    get: function() {
      return this._deceleration;
    },
    // ANIMATION
    set: function(val) {
      this._deceleration = val;
      var axes = this._control.controller.axes;
      if (axes) {
        axes.options.deceleration = val;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "easing", {
    /**
     * An easing function applied to the panel movement animation. Default value is `easeOutCubic`
     * @ko 패널 이동 애니메이션에 적용할 easing 함수. 기본값은 `easeOutCubic`이다
     * @type {function}
     * @default x => 1 - Math.pow(1 - x, 3)
     * @see Easing Functions Cheat Sheet {@link http://easings.net/} <ko>이징 함수 Cheat Sheet {@link http://easings.net/}</ko>
     * @see {@link https://naver.github.io/egjs-flicking/Options#easing Easing ( Options )}
     */
    get: function() {
      return this._easing;
    },
    set: function(val) {
      this._easing = val;
      var axes = this._control.controller.axes;
      if (axes) {
        axes.options.easing = val;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "duration", {
    /**
     * Default duration of the animation (ms)
     * @ko 디폴트 애니메이션 재생 시간 (ms)
     * @type {number}
     * @default 500
     * @see {@link https://naver.github.io/egjs-flicking/Options#duration duration ( Options )}
     */
    get: function() {
      return this._duration;
    },
    set: function(val) {
      this._duration = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "inputType", {
    // INPUT
    /**
     * Types of input devices to enable
     * @ko 활성화할 입력 장치 종류
     * @type {string[]}
     * @default ["touch", "mouse"]
     * @see {@link https://naver.github.io/egjs-axes/Options#paninput-options Possible values (PanInputOption#inputType)}
     * <ko>{@link https://naver.github.io/egjs-axes/Options#paninput-options 가능한 값들 (PanInputOption#inputType)}</ko>
     * @see {@link https://naver.github.io/egjs-flicking/Options#inputtype inputType ( Options )}
     */
    get: function() {
      return this._inputType;
    },
    // INPUT
    set: function(val) {
      this._inputType = val;
      var panInput = this._control.controller.panInput;
      if (panInput) {
        panInput.options.inputType = val;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "moveType", {
    /**
     * Movement style by user input. This will change instance type of {@link Flicking#control}
     * You can use the values of the constant {@link MOVE_TYPE}
     * @ko 사용자 입력에 의한 이동 방식. 이 값에 따라 {@link Flicking#control}의 인스턴스 타입이 결정됩니다
     * 상수 {@link MOVE_TYPE}에 정의된 값들을 이용할 수 있습니다
     * @type {MOVE_TYPE | Pair<string, object>}
     * @default "snap"
     * @see {@link https://naver.github.io/egjs-flicking/Options#movetype moveType ( Options )}
     * @example
     * |moveType|control|options|
     * |:---:|:---:|:---:|
     * |"snap"|{@link SnapControl}||
     * |"freeScroll"|{@link FreeControl}|{@link FreeControlOptions}|
     *
     * ```ts
     * import Flicking, { MOVE_TYPE } from "@egjs/flicking";
     *
     * const flicking = new Flicking({
     *   moveType: MOVE_TYPE.SNAP
     * });
     * ```
     *
     * ```ts
     * const flicking = new Flicking({
     *   // If you want more specific settings for the moveType
     *   // [moveType, options for that moveType]
     *   // In this case, it's ["freeScroll", FreeControlOptions]
     *   moveType: [MOVE_TYPE.FREE_SCROLL, { stopAtEdge: true }]
     * });
     * ```
     */
    get: function() {
      return this._moveType;
    },
    set: function(val) {
      this._moveType = val;
      var prevControl = this._control;
      var newControl = this._createControl();
      var activePanel = prevControl.activePanel;
      newControl.copy(prevControl);
      var prevProgressInPanel = activePanel ? this._camera.getProgressInPanel(activePanel) : 0;
      this._control = newControl;
      this._control.updatePosition(prevProgressInPanel);
      this._control.updateInput();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "threshold", {
    /**
     * Movement threshold to change panel (unit: px). It should be dragged above the threshold to change the current panel.
     * @ko 패널 변경을 위한 이동 임계값 (단위: px). 주어진 값 이상으로 스크롤해야만 패널 변경이 가능합니다.
     * @type {number}
     * @default 40
     * @see {@link https://naver.github.io/egjs-flicking/Options#threshold Threshold ( Options )}
     */
    get: function() {
      return this._threshold;
    },
    set: function(val) {
      this._threshold = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "dragThreshold", {
    /**
     * Minimal distance of user input before recognizing (unit: px). It should be dragged above the dragThreshold to move the panel.
     * @ko 사용자의 입력을 인식하기 위한 최소한의 거리 (단위: px). 주어진 값 이상으로 스크롤해야만 패널이 움직입니다.
     * @type {number}
     * @default 1
     * @see {@link https://naver.github.io/egjs-flicking/Options#dragThreshold dragThreshold ( Options )}
     */
    get: function() {
      return this._dragThreshold;
    },
    set: function(val) {
      this._dragThreshold = val;
      var panInput = this._control.controller.panInput;
      if (panInput) {
        panInput.options.threshold = val;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "animationThreshold", {
    /**
     * The minimum distance for animation to proceed. If the distance to be moved is less than `animationThreshold`, the movement proceeds immediately without animation (duration: 0).
     * @ko animation이 진행되기 위한 최소한의 거리. 이동하려는 거리가 `animationThreshold`보다 적으면 애니메이션 없이(duration: 0) 즉시 이동한다.
     * @type {number}
     * @default 0.5
     * @see {@link https://naver.github.io/egjs-flicking/Options#animationThreshold animationThreshold ( Options )}
     */
    get: function() {
      return this._animationThreshold;
    },
    set: function(val) {
      this._animationThreshold = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "useCSSOrder", {
    /**
     * Using `useCSSOrder` does not change the DOM order, but the `order` CSS property changes the order on the screen. (When `circular` is used, the DOM order changes depending on the position.)
     * When using `iframe`, you can prevent reloading when the DOM order changes.
     * In svelte, CSS order is always used.
     * @ko `useCSSOrder`를 사용하면 DOM의 순서는 변경되지 않지만 `order` css가 설정되면서 화면상 순서가 바뀐다. (`circular`를 사용한 경우 위치에 따라 DOM의 순서가 변경된다.)
     * `iframe`을 사용하는 경우 DOM의 순서가 변경되면서 reload가 되는 것을 막을 수 있다.
     * svelte에서는 css order를 무조건 사용한다.
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#useCSSOrder useCSSOrder ( Options )}
     */
    get: function() {
      return this._useCSSOrder;
    },
    set: function(val) {
      this._useCSSOrder = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "interruptable", {
    /**
     * Set animation to be interruptable by click/touch.
     * @ko 사용자의 클릭/터치로 인해 애니메이션을 도중에 멈출 수 있도록 설정합니다.
     * @type {boolean}
     * @default true
     * @see {@link https://naver.github.io/egjs-flicking/Options#interruptable Interruptable ( Options )}
     */
    get: function() {
      return this._interruptable;
    },
    set: function(val) {
      this._interruptable = val;
      var axes = this._control.controller.axes;
      if (axes) {
        axes.options.interruptable = val;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "bounce", {
    /**
     * The size value of the bounce area. Only can be enabled when `circular=false`.
     * You can set different bounce value for prev/next direction by using array.
     * `number` for px value, and `string` for px, and % value relative to viewport size.
     * You have to call {@link Control#updateInput} after changing this to take effect.
     * @ko Flicking이 최대 영역을 넘어서 갈 수 있는 최대 크기. `circular=false`인 경우에만 사용할 수 있습니다.
     * 배열을 통해 prev/next 방향에 대해 서로 다른 바운스 값을 지정할 수 있습니다.
     * `number`를 통해 px값을, `stirng`을 통해 px 혹은 뷰포트 크기 대비 %값을 사용할 수 있습니다.
     * 이 값을 변경시 {@link Control#updateInput}를 호출해야 합니다.
     * @type {string | number | Array<string | number>}
     * @default "20%"
     * @see {@link https://naver.github.io/egjs-flicking/Options#bounce bounce ( Options )}
     * @example
     * ```ts
     * const possibleOptions = [
     *   // % values, relative to viewport element(".flicking-viewport")'s size
     *   "0%", "25%", "42%",
     *   // px values, arithmetic calculation with (+/-) is also allowed.
     *   "0px", "100px", "50% - 25px",
     *   // numbers, same to number + px ("0px", "100px")
     *   0, 100, 1000
     * ];
     * ```
     *
     * @example
     * ```ts
     * const flicking = new Flicking("#el", { bounce: "20%" });
     *
     * flicking.bounce = "100%";
     * flicking.control.updateInput(); // Call this to update!
     * ```
     */
    get: function() {
      return this._bounce;
    },
    set: function(val) {
      this._bounce = val;
      this._control.updateInput();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "iOSEdgeSwipeThreshold", {
    /**
     * Size of the area from the right edge in iOS safari (in px) which enables swipe-back or swipe-forward
     * @ko iOS Safari에서 swipe를 통한 뒤로가기/앞으로가기를 활성화하는 오른쪽 끝으로부터의 영역의 크기 (px)
     * @type {number}
     * @default 30
     * @see {@link https://naver.github.io/egjs-flicking/Options#iosedgeswipethreshold iOSEdgeSwipeThreshold ( Options )}
     */
    get: function() {
      return this._iOSEdgeSwipeThreshold;
    },
    set: function(val) {
      this._iOSEdgeSwipeThreshold = val;
      var panInput = this._control.controller.panInput;
      if (panInput) {
        panInput.options.iOSEdgeSwipeThreshold = val;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "preventClickOnDrag", {
    /**
     * Automatically prevent `click` event if the user has dragged at least a single pixel on the viewport element
     * @ko 사용자가 뷰포트 영역을 1픽셀이라도 드래그했을 경우 자동으로 {@link https://developer.mozilla.org/ko/docs/Web/API/Element/click_event click} 이벤트를 취소합니다
     * @type {boolean}
     * @default true
     * @see {@link https://naver.github.io/egjs-flicking/Options#preventclickondrag preventClickOnDrag ( Options )}
     */
    get: function() {
      return this._preventClickOnDrag;
    },
    set: function(val) {
      var prevVal = this._preventClickOnDrag;
      if (val === prevVal) return;
      var controller = this._control.controller;
      if (val) {
        controller.addPreventClickHandler();
      } else {
        controller.removePreventClickHandler();
      }
      this._preventClickOnDrag = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "preventDefaultOnDrag", {
    /**
     * Whether to use the {@link https://developer.mozilla.org/ko/docs/Web/API/Event/preventDefault preventDefault} when the user starts dragging
     * @ko 사용자가 드래그를 시작할 때 {@link https://developer.mozilla.org/ko/docs/Web/API/Event/preventDefault preventDefault} 실행 여부
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#preventDefaultOnDrag preventDefaultOnDrag ( Options )}
     */
    get: function() {
      return this._preventDefaultOnDrag;
    },
    set: function(val) {
      this._preventDefaultOnDrag = val;
      var panInput = this._control.controller.panInput;
      if (panInput) {
        panInput.options.preventDefaultOnDrag = val;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "disableOnInit", {
    /**
     * Automatically call {@link Flicking#disableInput disableInput()} on initialization
     * @ko Flicking init시에 {@link Flicking#disableInput disableInput()}을 바로 호출합니다
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#disableoninit disableOnInit ( Options )}
     */
    get: function() {
      return this._disableOnInit;
    },
    set: function(val) {
      this._disableOnInit = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "changeOnHold", {
    /**
     * Change active panel index on mouse/touch hold while animating.
     * `index` of the `willChange`/`willRestore` event will be used as new index.
     * @ko 애니메이션 도중 마우스/터치 입력시 현재 활성화된 패널의 인덱스를 변경합니다.
     * `willChange`/`willRestore` 이벤트의 `index`값이 새로운 인덱스로 사용될 것입니다.
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#changeonhold changeOnHold ( Options )}
     */
    get: function() {
      return this._changeOnHold;
    },
    set: function(val) {
      this._changeOnHold = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "renderOnlyVisible", {
    // PERFORMANCE
    /**
     * Whether to render visible panels only. This can dramatically increase performance when there're many panels
     * @ko 보이는 패널만 렌더링할지 여부를 설정합니다. 패널이 많을 경우에 퍼포먼스를 크게 향상시킬 수 있습니다
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#renderonlyvisible renderOnlyVisible ( Options )}
     */
    get: function() {
      return this._renderOnlyVisible;
    },
    // PERFORMANCE
    set: function(val) {
      this._renderOnlyVisible = val;
      void this._renderer.render();
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "virtual", {
    /**
     * By enabling this option, it will reduce memory consumption by restricting the number of DOM elements to `panelsPerView + 1`
     * Must be used with `panelsPerview`.
     * After Flicking's initialized, this property can be used to add/remove the panel count.
     * @ko 이 옵션을 활성화할 경우 패널 엘리먼트의 개수를 `panelsPerView + 1` 개로 고정함으로써, 메모리 사용량을 줄일 수 있습니다.
     * `panelsPerView` 옵션과 함께 사용되어야만 합니다.
     * Flicking 초기화 이후에, 이 프로퍼티는 렌더링하는 패널의 개수를 추가/제거하기 위해 사용될 수 있습니다.
     * @type {VirtualManager}
     * @property {function} renderPanel A rendering function for the panel element's innerHTML<ko>패널 엘리먼트의 innerHTML을 렌더링하는 함수</ko>
     * @property {number} initialPanelCount Initial panel count to render<ko>최초로 렌더링할 패널의 개수</ko>
     * @property {boolean} [cache=false] Whether to cache rendered panel's innerHTML<ko>렌더링된 패널의 innerHTML 정보를 캐시할지 여부</ko>
     * @property {string} [panelClass="flicking-panel"] The class name that will be applied to rendered panel elements<ko>렌더링되는 패널 엘리먼트에 적용될 클래스 이름</ko>
     * @see {@link https://naver.github.io/egjs-flicking/Options#virtual virtual ( Options )}
     * @example
     * ```ts
     * import Flicking, { VirtualPanel } from "@egjs/flicking";
     *
     * const flicking = new Flicking("#some_el", {
     *   panelsPerView: 3,
     *   virtual: {
     *     renderPanel: (panel: VirtualPanel, index: number) => `Panel ${index}`,
     *     initialPanelCount: 100
     *   }
     * });
     *
     * // Add 100 virtual panels (at the end)
     * flicking.virtual.append(100);
     *
     * // Remove 100 virtual panels from 0 to 100
     * flicking.virtual.remove(0, 100);
     * ```
     */
    get: function() {
      return this._virtualManager;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "autoInit", {
    // OTHERS
    /**
     * Call {@link Flicking#init init()} automatically when creating Flicking's instance
     * @ko Flicking 인스턴스를 생성할 때 자동으로 {@link Flicking#init init()}를 호출합니다
     * @type {boolean}
     * @default true
     * @see {@link https://naver.github.io/egjs-flicking/Options#autoinit autoInit ( Options )}
     * @readonly
     */
    get: function() {
      return this._autoInit;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "autoResize", {
    /**
     * Whether to automatically call {@link Flicking#resize resize()} when the viewport element(.flicking-viewport)'s size is changed
     * @ko 뷰포트 엘리먼트(.flicking-viewport)의 크기 변경시 {@link Flicking#resize resize()} 메소드를 자동으로 호출할지 여부를 설정합니다
     * @type {boolean}
     * @default true
     */
    get: function() {
      return this._autoResize;
    },
    // OTHERS
    set: function(val) {
      this._autoResize = val;
      if (!this._initialized) {
        return;
      }
      if (val) {
        this._autoResizer.enable();
      } else {
        this._autoResizer.disable();
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "useResizeObserver", {
    /**
     * Whether to listen {@link https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver ResizeObserver}'s event instead of Window's {@link https://developer.mozilla.org/ko/docs/Web/API/Window/resize_event resize} event when using the `autoResize` option
     * @ko autoResize 옵션 사용시 {@link https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver ResizeObserver}의 이벤트를 Window객체의 {@link https://developer.mozilla.org/ko/docs/Web/API/Window/resize_event resize} 이벤트 대신 수신할지 여부를 설정합니다
     * @type {boolean}
     * @default true
     * @see {@link https://naver.github.io/egjs-flicking/Options#useresizeobserver useResizeObserver ( Options )}
     */
    get: function() {
      return this._useResizeObserver;
    },
    set: function(val) {
      this._useResizeObserver = val;
      if (this._initialized && this._autoResize) {
        this._autoResizer.enable();
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "observePanelResize", {
    /**
     * Whether to use {@link https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver ResizeObserver} to observe the size of the panel element
     * This is only available when `useResizeObserver` is enabled.
     * This option garantees that the resize event is triggered when the size of the panel element is changed.
     * @ko 이 옵션을 활성화할 경우, {@link https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver ResizeObserver}를 사용하여 패널 엘리먼트의 크기를 추적합니다.
     * 이 옵션은 `useResizeObserver` 옵션이 활성화된 경우에만 사용할 수 있습니다.
     * 이 옵션은 패널 엘리먼트의 크기가 변경될 경우 resize 이벤트가 발생하도록 보장합니다.
     */
    get: function() {
      return this._observePanelResize;
    },
    set: function(val) {
      this._observePanelResize = val;
      if (this._initialized && this._autoResize) {
        if (val) {
          this._autoResizer.observePanels();
        } else {
          this._autoResizer.unobservePanels();
        }
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "resizeDebounce", {
    /**
     * Delays size recalculation from `autoResize` by the given time in milisecond.
     * If the size is changed again while being delayed, it cancels the previous one and delays from the beginning again.
     * This can increase performance by preventing `resize` being called too often.
     * @ko `autoResize` 설정시에 호출되는 크기 재계산을 주어진 시간(단위: ms)만큼 지연시킵니다.
     * 지연시키는 도중 크기가 다시 변경되었을 경우, 이전 것을 취소하고 주어진 시간만큼 다시 지연시킵니다.
     * 이를 통해 `resize`가 너무 많이 호출되는 것을 방지하여 성능을 향상시킬 수 있습니다.
     * @type {number}
     * @default 0
     * @see {@link https://naver.github.io/egjs-flicking/Options#resizedebounce resizeDebounce ( Options )}
     */
    get: function() {
      return this._resizeDebounce;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "maxResizeDebounce", {
    /**
     * The maximum time for size recalculation delay when using `resizeDebounce`, in milisecond.
     * This guarantees that size recalculation is performed at least once every (n)ms.
     * @ko `resizeDebounce` 사용시에 크기 재계산이 지연되는 최대 시간을 지정합니다. (단위: ms)
     * 이를 통해, 적어도 (n)ms에 한번은 크기 재계산을 수행하는 것을 보장할 수 있습니다.
     * @type {number}
     * @default 100
     * @see {@link https://naver.github.io/egjs-flicking/Options#maxresizedebounce maxResizeDebounce ( Options )}
     */
    get: function() {
      return this._maxResizeDebounce;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "useFractionalSize", {
    /**
     * By enabling this, Flicking will calculate all internal size with CSS width computed with getComputedStyle.
     * This can prevent 1px offset issue in some cases where panel size has the fractional part.
     * All sizes will have the original size before CSS {@link https://developer.mozilla.org/en-US/docs/Web/CSS/transform transform} is applied on the element.
     * @ko 이 옵션을 활성화할 경우, Flicking은 내부의 모든 크기를 {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect getBoundingClientRect}를 이용하여 계산합니다.
     * 이를 통해, 패널 크기에 소수점을 포함할 경우에 발생할 수 있는 일부 1px 오프셋 이슈를 해결 가능합니다.
     * 모든 크기는 CSS {@link https://developer.mozilla.org/en-US/docs/Web/CSS/transform transform}이 엘리먼트에 적용되기 이전의 크기를 사용할 것입니다.
     * @type {boolean}
     * @default false
     * @see {@link https://naver.github.io/egjs-flicking/Options#usefractionalsize useFractionalSize ( Options )}
     */
    get: function() {
      return this._useFractionalSize;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "externalRenderer", {
    /**
     * This is an option for the frameworks(React, Vue, Angular, ...). Don't set it as it's automatically managed by Flicking.
     * @ko 프레임워크(React, Vue, Angular, ...)에서만 사용하는 옵션으로, 자동으로 설정되므로 따로 사용하실 필요 없습니다!
     * @default null
     * @internal
     * @readonly
     */
    get: function() {
      return this._externalRenderer;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "renderExternal", {
    /**
     * This is an option for the frameworks(React, Vue, Angular, ...). Don't set it as it's automatically managed by Flicking.
     * @ko 프레임워크(React, Vue, Angular, ...)에서만 사용하는 옵션으로, 자동으로 설정되므로 따로 사용하실 필요 없습니다!
     * @default null
     * @internal
     * @readonly
     * @deprecated
     */
    get: function() {
      return this._renderExternal;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "optimizeSizeUpdate", {
    /**
     * This option works only when autoResize is set to true.
     * By default, autoResize listens to changes in both the viewport's width and height, updating all panel sizes accordingly.
     * When optimizeSizeUpdate is enabled, the update behavior is optimized based on the flicking direction:
     * If direction is "horizontal", only changes in width will trigger panel size updates.
     * If direction is "vertical", only changes in height will do so.
     * This option is useful when panel heights vary and unwanted flickering occurs due to frequent size recalculations during flicking. Enabling optimizeSizeUpdate prevents unnecessary updates and helps maintain visual stability.
     * @ko optimizeSizeUpdate는 autoResize가 true일 때만 동작합니다.
     * 기본적으로 autoResize는 뷰포트의 width와 height 변화를 모두 감지하여 패널들의 사이즈를 업데이트합니다.
     * 이 옵션을 활성화하면 플리킹 방향에 따라 필요한 차원(horizontal → width, vertical → height)에 대해서만 사이즈를 업데이트합니다.
     * 내부 패널의 높이가 서로 다를 때, 플리킹 중 과도한 리사이징으로 인한 깜빡임 현상을 줄이는 데 유용합니다.
     * @type {boolean}
     * @default false
     */
    get: function() {
      return this._optimizeSizeUpdate;
    },
    set: function(val) {
      this._optimizeSizeUpdate = val;
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function() {
    var _this = this;
    if (this._initialized) return Promise.resolve();
    var camera = this._camera;
    var renderer = this._renderer;
    var control = this._control;
    var virtualManager = this._virtualManager;
    var originalTrigger = this.trigger;
    var preventEventsBeforeInit = this._preventEventsBeforeInit;
    camera.init();
    virtualManager.init();
    renderer.init(this);
    control.init(this);
    if (preventEventsBeforeInit) {
      this.trigger = function() {
        return _this;
      };
    }
    this._initialResize();
    this._moveToInitialPanel();
    if (this._autoResize) {
      this._autoResizer.enable();
    }
    if (this._preventClickOnDrag) {
      control.controller.addPreventClickHandler();
    }
    if (this._disableOnInit) {
      this.disableInput();
    }
    renderer.checkPanelContentsReady(renderer.panels);
    this._initialized = true;
    return renderer.render().then(function() {
      _this._plugins.forEach(function(plugin) {
        return plugin.init(_this);
      });
      if (preventEventsBeforeInit) {
        _this.trigger = originalTrigger;
      }
      _this.trigger(new ComponentEvent$1(EVENTS.READY));
    });
  };
  __proto.destroy = function() {
    this.off();
    this._autoResizer.disable();
    this._control.destroy();
    this._camera.destroy();
    this._renderer.destroy();
    this._plugins.forEach(function(plugin) {
      return plugin.destroy();
    });
    this._scheduleResize = false;
    this._initialized = false;
    this._isResizing = false;
  };
  __proto.prev = function(duration) {
    var _a, _b, _c;
    if (duration === void 0) {
      duration = this._duration;
    }
    return this.moveTo((_c = (_b = (_a = this._control.activePanel) === null || _a === void 0 ? void 0 : _a.prev()) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1, duration, DIRECTION.PREV);
  };
  __proto.next = function(duration) {
    var _a, _b, _c;
    if (duration === void 0) {
      duration = this._duration;
    }
    return this.moveTo((_c = (_b = (_a = this._control.activePanel) === null || _a === void 0 ? void 0 : _a.next()) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : this._renderer.panelCount, duration, DIRECTION.NEXT);
  };
  __proto.moveTo = function(index, duration, direction) {
    if (duration === void 0) {
      duration = this._duration;
    }
    if (direction === void 0) {
      direction = DIRECTION.NONE;
    }
    var renderer = this._renderer;
    var panelCount = renderer.panelCount;
    var panel = renderer.getPanel(index);
    if (!panel) {
      return Promise.reject(new FlickingError(MESSAGE.INDEX_OUT_OF_RANGE(index, 0, panelCount - 1), CODE.INDEX_OUT_OF_RANGE));
    }
    if (this._control.animating) {
      return Promise.reject(new FlickingError(MESSAGE.ANIMATION_ALREADY_PLAYING, CODE.ANIMATION_ALREADY_PLAYING));
    }
    if (this._control.holding) {
      this._control.controller.release();
    }
    return this._control.moveToPanel(panel, {
      duration,
      direction
    });
  };
  __proto.updateAnimation = function(index, duration, direction) {
    if (!this._control.animating) {
      return;
    }
    var renderer = this._renderer;
    var panelCount = renderer.panelCount;
    var panel = renderer.getPanel(index);
    if (!panel) {
      throw new FlickingError(MESSAGE.INDEX_OUT_OF_RANGE(index, 0, panelCount - 1), CODE.INDEX_OUT_OF_RANGE);
    }
    this._control.updateAnimation(panel, duration, direction);
  };
  __proto.stopAnimation = function() {
    if (!this._control.animating) {
      return;
    }
    this._control.stopAnimation();
  };
  __proto.getPanel = function(index) {
    return this._renderer.getPanel(index);
  };
  __proto.enableInput = function() {
    this._control.enable();
    return this;
  };
  __proto.disableInput = function() {
    this._control.disable();
    return this;
  };
  __proto.getStatus = function(_a) {
    var _b, _c;
    var _d = _a === void 0 ? {} : _a, _e = _d.index, index = _e === void 0 ? true : _e, _f = _d.position, position = _f === void 0 ? true : _f, _g = _d.includePanelHTML, includePanelHTML = _g === void 0 ? false : _g, _h = _d.visiblePanelsOnly, visiblePanelsOnly = _h === void 0 ? false : _h;
    var camera = this._camera;
    var panels = visiblePanelsOnly ? this.visiblePanels : this.panels;
    var status = {
      panels: panels.map(function(panel) {
        var panelInfo = {
          index: panel.index
        };
        if (includePanelHTML) {
          panelInfo.html = panel.element.outerHTML;
        }
        return panelInfo;
      })
    };
    if (index) {
      status.index = this.index;
    }
    if (position) {
      var nearestAnchor = camera.findNearestAnchor(camera.position);
      if (nearestAnchor) {
        status.position = {
          panel: nearestAnchor.panel.index,
          progressInPanel: camera.getProgressInPanel(nearestAnchor.panel)
        };
      }
    }
    if (visiblePanelsOnly) {
      var visiblePanels = this.visiblePanels;
      status.visibleOffset = (_c = (_b = visiblePanels[0]) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : 0;
    }
    return status;
  };
  __proto.setStatus = function(status) {
    var _a;
    if (!this._initialized) {
      throw new FlickingError(MESSAGE.NOT_INITIALIZED, CODE.NOT_INITIALIZED);
    }
    var index = status.index, position = status.position, visibleOffset = status.visibleOffset, panels = status.panels;
    var renderer = this._renderer;
    var control = this._control;
    if (((_a = panels[0]) === null || _a === void 0 ? void 0 : _a.html) && !this._renderExternal) {
      renderer.batchRemove({
        index: 0,
        deleteCount: this.panels.length,
        hasDOMInElements: true
      });
      renderer.batchInsert({
        index: 0,
        elements: parseElement(panels.map(function(panel2) {
          return panel2.html;
        })),
        hasDOMInElements: true
      });
    }
    if (index != null) {
      var panelIndex = visibleOffset ? index - visibleOffset : index;
      void this.moveTo(panelIndex, 0).catch(function() {
        return void 0;
      });
    }
    if (position && this._moveType === MOVE_TYPE.FREE_SCROLL) {
      var panel = position.panel, progressInPanel = position.progressInPanel;
      var panelIndex = visibleOffset ? panel - visibleOffset : panel;
      var panelRange = renderer.panels[panelIndex].range;
      var newCameraPos = panelRange.min + (panelRange.max - panelRange.min) * progressInPanel;
      void control.moveToPosition(newCameraPos, 0).catch(function() {
        return void 0;
      });
    }
  };
  __proto.addPlugins = function() {
    var _a;
    var _this = this;
    var plugins = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      plugins[_i] = arguments[_i];
    }
    if (this._initialized) {
      plugins.forEach(function(item) {
        return item.init(_this);
      });
    }
    (_a = this._plugins).push.apply(_a, __spread(plugins));
    return this;
  };
  __proto.removePlugins = function() {
    var _this = this;
    var plugins = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      plugins[_i] = arguments[_i];
    }
    plugins.forEach(function(item) {
      var foundIndex = findIndex(_this._plugins, function(val) {
        return val === item;
      });
      if (foundIndex >= 0) {
        item.destroy();
        _this._plugins.splice(foundIndex, 1);
      }
    });
    return this;
  };
  __proto.resize = function() {
    return __awaiter(this, void 0, void 0, function() {
      var viewport, renderer, camera, control, activePanel, prevWidth, prevHeight, prevProgressInPanel, newWidth, newHeight, sizeChanged;
      return __generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            if (!this._initialized) {
              return [
                2
                /*return*/
              ];
            }
            if (this._isResizing) {
              this._scheduleResize = true;
              return [
                2
                /*return*/
              ];
            }
            this._scheduleResize = false;
            this._isResizing = true;
            viewport = this._viewport;
            renderer = this._renderer;
            camera = this._camera;
            control = this._control;
            activePanel = control.activePanel;
            prevWidth = viewport.width;
            prevHeight = viewport.height;
            prevProgressInPanel = activePanel ? camera.getProgressInPanel(activePanel) : 0;
            this.trigger(new ComponentEvent$1(EVENTS.BEFORE_RESIZE, {
              width: prevWidth,
              height: prevHeight,
              element: viewport.element
            }));
            viewport.resize();
            if (!this._optimizeSizeUpdate) return [3, 3];
            if (!(this.horizontal && viewport.width !== prevWidth || !this.horizontal && viewport.height !== prevHeight)) return [3, 2];
            return [4, renderer.forceRenderAllPanels()];
          case 1:
            _a.sent();
            _a.label = 2;
          case 2:
            return [3, 5];
          case 3:
            return [4, renderer.forceRenderAllPanels()];
          case 4:
            _a.sent();
            _a.label = 5;
          case 5:
            if (!this._initialized) {
              return [
                2
                /*return*/
              ];
            }
            renderer.updatePanelSize();
            camera.updateAlignPos();
            camera.updateRange();
            camera.updateAnchors();
            camera.updateAdaptiveHeight();
            camera.updatePanelOrder();
            camera.updateOffset();
            return [4, renderer.render()];
          case 6:
            _a.sent();
            if (!this._initialized) {
              return [
                2
                /*return*/
              ];
            }
            if (control.animating) ;
            else {
              control.updatePosition(prevProgressInPanel);
              control.updateInput();
            }
            newWidth = viewport.width;
            newHeight = viewport.height;
            sizeChanged = newWidth !== prevWidth || newHeight !== prevHeight;
            this.trigger(new ComponentEvent$1(EVENTS.AFTER_RESIZE, {
              width: viewport.width,
              height: viewport.height,
              prev: {
                width: prevWidth,
                height: prevHeight
              },
              sizeChanged,
              element: viewport.element
            }));
            this._isResizing = false;
            if (this._scheduleResize) {
              this.resize();
            }
            return [
              2
              /*return*/
            ];
        }
      });
    });
  };
  __proto.append = function(element) {
    return this.insert(this._renderer.panelCount, element);
  };
  __proto.prepend = function(element) {
    return this.insert(0, element);
  };
  __proto.insert = function(index, element) {
    if (this._renderExternal) {
      throw new FlickingError(MESSAGE.NOT_ALLOWED_IN_FRAMEWORK, CODE.NOT_ALLOWED_IN_FRAMEWORK);
    }
    return this._renderer.batchInsert({
      index,
      elements: parseElement(element),
      hasDOMInElements: true
    });
  };
  __proto.remove = function(index, deleteCount) {
    if (deleteCount === void 0) {
      deleteCount = 1;
    }
    if (this._renderExternal) {
      throw new FlickingError(MESSAGE.NOT_ALLOWED_IN_FRAMEWORK, CODE.NOT_ALLOWED_IN_FRAMEWORK);
    }
    return this._renderer.batchRemove({
      index,
      deleteCount,
      hasDOMInElements: true
    });
  };
  __proto._createControl = function() {
    var _a;
    var moveType = this._moveType;
    var moveTypes = Object.keys(MOVE_TYPE).map(function(key) {
      return MOVE_TYPE[key];
    });
    var moveTypeStr = Array.isArray(moveType) ? moveType[0] : moveType;
    var moveTypeOptions = Array.isArray(moveType) ? (_a = moveType[1]) !== null && _a !== void 0 ? _a : {} : {};
    if (!includes(moveTypes, moveTypeStr)) {
      throw new FlickingError(MESSAGE.WRONG_OPTION("moveType", JSON.stringify(moveType)), CODE.WRONG_OPTION);
    }
    switch (moveTypeStr) {
      case MOVE_TYPE.SNAP:
        return new SnapControl(moveTypeOptions);
      case MOVE_TYPE.FREE_SCROLL:
        return new FreeControl(moveTypeOptions);
      case MOVE_TYPE.STRICT:
        return new StrictControl(moveTypeOptions);
    }
  };
  __proto._createCamera = function() {
    if (this._circular && this._bound) {
      console.warn('"circular" and "bound" option cannot be used together, ignoring bound.');
    }
    return new Camera(this, {
      align: this._align
    });
  };
  __proto._createRenderer = function() {
    var externalRenderer = this._externalRenderer;
    if (this._virtual && this._panelsPerView <= 0) {
      console.warn('"virtual" and "panelsPerView" option should be used together, ignoring virtual.');
    }
    return externalRenderer ? externalRenderer : this._renderExternal ? this._createExternalRenderer() : this._createVanillaRenderer();
  };
  __proto._createExternalRenderer = function() {
    var _a = this._renderExternal, renderer = _a.renderer, rendererOptions = _a.rendererOptions;
    return new renderer(__assign({
      align: this._align
    }, rendererOptions));
  };
  __proto._createVanillaRenderer = function() {
    var virtual = this.virtualEnabled;
    return new VanillaRenderer({
      align: this._align,
      strategy: virtual ? new VirtualRenderingStrategy() : new NormalRenderingStrategy({
        providerCtor: VanillaElementProvider
      })
    });
  };
  __proto._moveToInitialPanel = function() {
    var renderer = this._renderer;
    var control = this._control;
    var camera = this._camera;
    var defaultPanel = renderer.getPanel(this._defaultIndex) || renderer.getPanel(0);
    if (!defaultPanel) return;
    var nearestAnchor = camera.findNearestAnchor(defaultPanel.position);
    var initialPanel = nearestAnchor && defaultPanel.position !== nearestAnchor.panel.position && defaultPanel.index !== nearestAnchor.panel.index ? nearestAnchor.panel : defaultPanel;
    control.setActive(initialPanel, null, false);
    if (!nearestAnchor) {
      throw new FlickingError(MESSAGE.POSITION_NOT_REACHABLE(initialPanel.position), CODE.POSITION_NOT_REACHABLE);
    }
    var position = initialPanel.position;
    if (!camera.canReach(initialPanel)) {
      position = nearestAnchor.position;
    }
    camera.lookAt(position);
    control.updateInput();
    camera.updateOffset();
  };
  __proto._initialResize = function() {
    var viewport = this._viewport;
    var renderer = this._renderer;
    var camera = this._camera;
    var control = this._control;
    this.trigger(new ComponentEvent$1(EVENTS.BEFORE_RESIZE, {
      width: 0,
      height: 0,
      element: viewport.element
    }));
    viewport.resize();
    renderer.updatePanelSize();
    camera.updateAlignPos();
    camera.updateRange();
    camera.updateAnchors();
    camera.updateOffset();
    control.updateInput();
    var newWidth = viewport.width;
    var newHeight = viewport.height;
    var sizeChanged = newWidth !== 0 || newHeight !== 0;
    this.trigger(new ComponentEvent$1(EVENTS.AFTER_RESIZE, {
      width: viewport.width,
      height: viewport.height,
      prev: {
        width: 0,
        height: 0
      },
      sizeChanged,
      element: viewport.element
    }));
  };
  Flicking2.VERSION = "4.15.0";
  return Flicking2;
})(Component);
var AutoPlay = /* @__PURE__ */ (function() {
  function AutoPlay2(_a) {
    var _this = this;
    var _b = _a === void 0 ? {} : _a, _c = _b.duration, duration = _c === void 0 ? 2e3 : _c, _d = _b.animationDuration, animationDuration = _d === void 0 ? void 0 : _d, _e = _b.direction, direction = _e === void 0 ? DIRECTION.NEXT : _e, _f = _b.stopOnHover, stopOnHover = _f === void 0 ? false : _f, delayAfterHover = _b.delayAfterHover;
    this._flicking = null;
    this._timerId = 0;
    this._mouseEntered = false;
    this._playing = false;
    this.play = function() {
      _this._movePanel(_this._duration);
    };
    this.stop = function() {
      _this._playing = false;
      clearTimeout(_this._timerId);
    };
    this._onMouseEnter = function() {
      _this._mouseEntered = true;
      _this.stop();
    };
    this._onMouseLeave = function() {
      _this._mouseEntered = false;
      _this._movePanel(_this._delayAfterHover);
    };
    this._duration = duration;
    this._animationDuration = animationDuration;
    this._direction = direction;
    this._stopOnHover = stopOnHover;
    this._delayAfterHover = delayAfterHover !== null && delayAfterHover !== void 0 ? delayAfterHover : duration;
  }
  var __proto = AutoPlay2.prototype;
  Object.defineProperty(__proto, "duration", {
    get: function() {
      return this._duration;
    },
    set: function(val) {
      this._duration = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "animationDuration", {
    get: function() {
      return this._animationDuration;
    },
    set: function(val) {
      this._animationDuration = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "direction", {
    get: function() {
      return this._direction;
    },
    set: function(val) {
      this._direction = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "stopOnHover", {
    get: function() {
      return this._stopOnHover;
    },
    set: function(val) {
      this._stopOnHover = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "delayAfterHover", {
    get: function() {
      return this._delayAfterHover;
    },
    set: function(val) {
      this._delayAfterHover = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "playing", {
    get: function() {
      return this._playing;
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function(flicking) {
    var _a;
    if (this._flicking) {
      this.destroy();
    }
    flicking.on((_a = {}, _a[EVENTS.MOVE_START] = this.stop, _a[EVENTS.HOLD_START] = this.stop, _a[EVENTS.MOVE_END] = this.play, _a[EVENTS.SELECT] = this.play, _a));
    this._flicking = flicking;
    if (this._stopOnHover) {
      var targetEl = this._flicking.element;
      targetEl.addEventListener("mouseenter", this._onMouseEnter, false);
      targetEl.addEventListener("mouseleave", this._onMouseLeave, false);
    }
    this.play();
  };
  __proto.destroy = function() {
    var flicking = this._flicking;
    this._mouseEntered = false;
    this.stop();
    if (!flicking) {
      return;
    }
    flicking.off(EVENTS.MOVE_START, this.stop);
    flicking.off(EVENTS.HOLD_START, this.stop);
    flicking.off(EVENTS.MOVE_END, this.play);
    flicking.off(EVENTS.SELECT, this.play);
    var targetEl = flicking.element;
    targetEl.removeEventListener("mouseenter", this._onMouseEnter, false);
    targetEl.removeEventListener("mouseleave", this._onMouseLeave, false);
    this._flicking = null;
  };
  __proto.update = function() {
  };
  __proto._movePanel = function(duration) {
    var _this = this;
    var flicking = this._flicking;
    var direction = this._direction;
    if (!flicking) {
      return;
    }
    this.stop();
    if (this._mouseEntered || flicking.animating) {
      return;
    }
    this._playing = true;
    this._timerId = window.setTimeout(function() {
      var _a, _b;
      var animationDuration = _this._animationDuration || flicking.duration;
      var moveType = flicking.moveType;
      if (moveType === MOVE_TYPE.FREE_SCROLL || (moveType === null || moveType === void 0 ? void 0 : moveType[0]) === MOVE_TYPE.FREE_SCROLL) {
        var range2 = flicking.camera.range;
        var cameraPosition = flicking.camera.position;
        var currentPanel = flicking.currentPanel;
        var prevPanel = currentPanel.prev();
        var nextPanel = currentPanel.next();
        var currentPosition = currentPanel.position;
        var nextPosition = (_a = nextPanel === null || nextPanel === void 0 ? void 0 : nextPanel.position) !== null && _a !== void 0 ? _a : range2.max;
        var prevPosition = (_b = prevPanel === null || prevPanel === void 0 ? void 0 : prevPanel.position) !== null && _b !== void 0 ? _b : range2.min;
        if (prevPosition > currentPosition) {
          prevPosition = range2.min - (range2.max - prevPosition);
        }
        if (nextPosition < currentPosition) {
          nextPosition += range2.max;
        }
        if (direction === DIRECTION.NEXT) {
          var size = nextPosition - currentPosition;
          var restSize = nextPosition - cameraPosition;
          if (cameraPosition < currentPosition) {
            restSize = nextPosition - cameraPosition;
          }
          animationDuration *= restSize / size;
        } else {
          var size = currentPosition - prevPosition;
          var restSize = cameraPosition - prevPosition;
          if (cameraPosition > currentPosition) {
            restSize = cameraPosition - prevPosition;
          }
          animationDuration *= restSize / size;
        }
      }
      if (direction === DIRECTION.NEXT) {
        flicking.next(animationDuration).catch(function() {
          return void 0;
        });
      } else {
        flicking.prev(animationDuration).catch(function() {
          return void 0;
        });
      }
      _this.play();
    }, duration);
  };
  return AutoPlay2;
})();
var BROWSER = {
  CLICK: "click",
  MOUSE_DOWN: "mousedown",
  TOUCH_START: "touchstart"
};
var ARROW = {
  PREV_SELECTOR: ".flicking-arrow-prev",
  NEXT_SELECTOR: ".flicking-arrow-next",
  DISABLED_CLASS: "flicking-arrow-disabled"
};
var PAGINATION = {
  SELECTOR: ".flicking-pagination",
  PREFIX: "flicking-pagination",
  BULLET_WRAPPER_SUFFIX: "bullets",
  BULLET_SUFFIX: "bullet",
  BULLET_ACTIVE_SUFFIX: "bullet-active",
  FRACTION_WRAPPER_SUFFIX: "fraction",
  FRACTION_CURRENT_SUFFIX: "fraction-current",
  FRACTION_TOTAL_SUFFIX: "fraction-total",
  SCROLL_UNINIT_SUFFIX: "uninitialized",
  SCROLL_WRAPPER_SUFFIX: "scroll",
  SCROLL_SLIDER_SUFFIX: "slider",
  SCROLL_PREV_SUFFIX: "bullet-prev",
  SCROLL_NEXT_SUFFIX: "bullet-next",
  TYPE: {
    BULLET: "bullet",
    FRACTION: "fraction",
    SCROLL: "scroll"
  }
};
var addClass = function(el, className) {
  if (!el) return;
  if (el.classList) {
    el.classList.add(className);
  } else {
    var classes = el.className.split(" ");
    if (classes.indexOf(className) < 0) {
      el.className = el.className + " " + className;
    }
  }
};
var removeClass = function(el, className) {
  if (!el) return;
  if (el.classList) {
    el.classList.remove(className);
  } else {
    var classRegex = new RegExp("( |^)" + className + "( |$)", "g");
    el.className.replace(classRegex, " ");
  }
};
var getElement = function(selector, parent, pluginName) {
  var el = parent.querySelector(selector);
  if (!el) {
    throw new Error("[Flicking-" + pluginName + "] Couldn't find element with the given selector: " + selector);
  }
  return el;
};
var Arrow = /* @__PURE__ */ (function() {
  function Arrow2(_a) {
    var _this = this;
    var _b = _a === void 0 ? {} : _a, _c = _b.parentEl, parentEl = _c === void 0 ? null : _c, _d = _b.prevElSelector, prevElSelector = _d === void 0 ? ARROW.PREV_SELECTOR : _d, _e = _b.nextElSelector, nextElSelector = _e === void 0 ? ARROW.NEXT_SELECTOR : _e, _f = _b.disabledClass, disabledClass = _f === void 0 ? ARROW.DISABLED_CLASS : _f, _g = _b.moveCount, moveCount = _g === void 0 ? 1 : _g, _h = _b.moveByViewportSize, moveByViewportSize = _h === void 0 ? false : _h;
    this._flicking = null;
    this._preventInputPropagation = function(e) {
      e.stopPropagation();
    };
    this._onPrevClick = function() {
      var flicking = _this._flicking;
      var camera = flicking.camera;
      var anchorPoints = camera.anchorPoints;
      if (flicking.animating || anchorPoints.length <= 0) return;
      var firstAnchor = anchorPoints[0];
      var moveCount2 = _this._moveCount;
      if (_this._moveByViewportSize) {
        flicking.control.moveToPosition(camera.position - camera.size, flicking.duration).catch(_this._onCatch);
      } else {
        if (flicking.circularEnabled) {
          var targetPanel = flicking.currentPanel;
          for (var i = 0; i < moveCount2; i++) {
            targetPanel = targetPanel.prev();
          }
          targetPanel.focus().catch(_this._onCatch);
        } else if (flicking.index > firstAnchor.panel.index) {
          flicking.moveTo(Math.max(flicking.index - moveCount2, firstAnchor.panel.index)).catch(_this._onCatch);
        } else if (camera.position > camera.range.min) {
          flicking.moveTo(flicking.index).catch(_this._onCatch);
        }
      }
    };
    this._onNextClick = function() {
      var flicking = _this._flicking;
      var camera = flicking.camera;
      var anchorPoints = camera.anchorPoints;
      if (flicking.animating || anchorPoints.length <= 0) return;
      var lastAnchor = anchorPoints[anchorPoints.length - 1];
      var moveCount2 = _this._moveCount;
      if (_this._moveByViewportSize) {
        flicking.control.moveToPosition(camera.position + camera.size, flicking.duration).catch(_this._onCatch);
      } else {
        if (flicking.circularEnabled) {
          var targetPanel = flicking.currentPanel;
          for (var i = 0; i < moveCount2; i++) {
            targetPanel = targetPanel.next();
          }
          targetPanel.focus().catch(_this._onCatch);
        } else if (flicking.index < lastAnchor.panel.index) {
          flicking.moveTo(Math.min(flicking.index + moveCount2, lastAnchor.panel.index)).catch(_this._onCatch);
        } else if (camera.position > camera.range.min) {
          flicking.moveTo(flicking.index).catch(_this._onCatch);
        }
      }
    };
    this._onAnimation = function() {
      var flicking = _this._flicking;
      var camera = flicking.camera;
      var controller = flicking.control.controller;
      if (flicking.holding) {
        _this._updateClass(camera.position);
      } else {
        _this._updateClass(controller.animatingContext.end);
      }
    };
    this._onCatch = function(err) {
      if (err instanceof FlickingError) return;
      throw err;
    };
    this._parentEl = parentEl;
    this._prevElSelector = prevElSelector;
    this._nextElSelector = nextElSelector;
    this._disabledClass = disabledClass;
    this._moveCount = moveCount;
    this._moveByViewportSize = moveByViewportSize;
  }
  var __proto = Arrow2.prototype;
  Object.defineProperty(__proto, "prevEl", {
    get: function() {
      return this._prevEl;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "nextEl", {
    get: function() {
      return this._nextEl;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "parentEl", {
    get: function() {
      return this._parentEl;
    },
    set: function(val) {
      this._parentEl = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "prevElSelector", {
    get: function() {
      return this._prevElSelector;
    },
    set: function(val) {
      this._prevElSelector = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "nextElSelector", {
    get: function() {
      return this._nextElSelector;
    },
    set: function(val) {
      this._nextElSelector = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "disabledClass", {
    get: function() {
      return this._disabledClass;
    },
    set: function(val) {
      this._disabledClass = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "moveCount", {
    get: function() {
      return this._moveCount;
    },
    set: function(val) {
      this._moveCount = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "moveByViewportSize", {
    get: function() {
      return this._moveByViewportSize;
    },
    set: function(val) {
      this._moveByViewportSize = val;
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function(flicking) {
    var _this = this;
    if (this._flicking) {
      this.destroy();
    }
    this._flicking = flicking;
    flicking.on(EVENTS.MOVE, this._onAnimation);
    var parentEl = this._parentEl ? this._parentEl : flicking.element;
    var prevEl = getElement(this._prevElSelector, parentEl, "Arrow");
    var nextEl = getElement(this._nextElSelector, parentEl, "Arrow");
    [BROWSER.MOUSE_DOWN, BROWSER.TOUCH_START].forEach(function(evt) {
      prevEl.addEventListener(evt, _this._preventInputPropagation, {
        passive: true
      });
      nextEl.addEventListener(evt, _this._preventInputPropagation, {
        passive: true
      });
    });
    prevEl.addEventListener(BROWSER.CLICK, this._onPrevClick);
    nextEl.addEventListener(BROWSER.CLICK, this._onNextClick);
    this._prevEl = prevEl;
    this._nextEl = nextEl;
    this.update();
  };
  __proto.destroy = function() {
    var _this = this;
    var flicking = this._flicking;
    if (!flicking) {
      return;
    }
    flicking.off(EVENTS.MOVE, this._onAnimation);
    var prevEl = this._prevEl;
    var nextEl = this._nextEl;
    [BROWSER.MOUSE_DOWN, BROWSER.TOUCH_START].forEach(function(evt) {
      prevEl.removeEventListener(evt, _this._preventInputPropagation);
      nextEl.removeEventListener(evt, _this._preventInputPropagation);
    });
    prevEl.removeEventListener(BROWSER.CLICK, this._onPrevClick);
    nextEl.removeEventListener(BROWSER.CLICK, this._onNextClick);
    this._flicking = null;
  };
  __proto.update = function() {
    this._updateClass(this._flicking.camera.position);
  };
  __proto._updateClass = function(pos) {
    var flicking = this._flicking;
    var disabledClass = this._disabledClass;
    var prevEl = this._prevEl;
    var nextEl = this._nextEl;
    var cameraRange = flicking.camera.range;
    var stopAtPrevEdge = flicking.circularEnabled ? false : pos <= cameraRange.min;
    var stopAtNextEdge = flicking.circularEnabled ? false : pos >= cameraRange.max;
    if (stopAtPrevEdge) {
      addClass(prevEl, disabledClass);
    } else {
      removeClass(prevEl, disabledClass);
    }
    if (stopAtNextEdge) {
      addClass(nextEl, disabledClass);
    } else {
      removeClass(nextEl, disabledClass);
    }
  };
  return Arrow2;
})();
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
function __spreadArray(to, from, pack) {
  if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || from);
}
var Renderer = /* @__PURE__ */ (function() {
  function Renderer2(_a) {
    var flicking = _a.flicking, pagination = _a.pagination, wrapper = _a.wrapper;
    this._flicking = flicking;
    this._pagination = pagination;
    this._wrapper = wrapper;
  }
  var __proto = Renderer2.prototype;
  __proto._createBulletFromString = function(html, index) {
    var range2 = document.createRange();
    var frag = range2.createContextualFragment(html);
    var bullet = frag.firstChild;
    this._addBulletEvents(bullet, index);
    return bullet;
  };
  __proto._addBulletEvents = function(bullet, index) {
    var _this = this;
    var anchorPoints = this._flicking.camera.anchorPoints;
    var panelIndex = anchorPoints[index].panel.index;
    bullet.addEventListener(BROWSER.MOUSE_DOWN, function(e) {
      e.stopPropagation();
    });
    bullet.addEventListener(BROWSER.TOUCH_START, function(e) {
      e.stopPropagation();
    }, {
      passive: true
    });
    bullet.addEventListener(BROWSER.CLICK, function() {
      _this._flicking.moveTo(panelIndex).catch(function(err) {
        if (err instanceof FlickingError) return;
        throw err;
      });
    });
  };
  return Renderer2;
})();
var BulletRenderer = /* @__PURE__ */ (function(_super) {
  __extends(BulletRenderer2, _super);
  function BulletRenderer2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this._bullets = [];
    _this._prevIndex = -1;
    return _this;
  }
  var __proto = BulletRenderer2.prototype;
  Object.defineProperty(__proto, "_bulletClass", {
    get: function() {
      var pagination = this._pagination;
      return pagination.classPrefix + "-" + PAGINATION.BULLET_SUFFIX;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "_activeClass", {
    get: function() {
      var pagination = this._pagination;
      return pagination.classPrefix + "-" + PAGINATION.BULLET_ACTIVE_SUFFIX;
    },
    enumerable: false,
    configurable: true
  });
  __proto.destroy = function() {
    this._bullets = [];
    this._prevIndex = -1;
  };
  __proto.render = function() {
    var _this = this;
    var flicking = this._flicking;
    var pagination = this._pagination;
    var wrapper = this._wrapper;
    var bulletClass = this._bulletClass;
    var activeClass = this._activeClass;
    var renderBullet = pagination.renderBullet;
    var renderActiveBullet = pagination.renderActiveBullet;
    var bulletWrapperClass = pagination.classPrefix + "-" + PAGINATION.BULLET_WRAPPER_SUFFIX;
    var anchorPoints = flicking.camera.anchorPoints;
    addClass(wrapper, bulletWrapperClass);
    wrapper.innerHTML = anchorPoints.map(function(anchorPoint, index) {
      if (renderActiveBullet && anchorPoint.panel.index === flicking.index) {
        return renderActiveBullet(bulletClass, index);
      } else {
        return renderBullet(bulletClass, index);
      }
    }).join("\n");
    var bullets = [].slice.call(wrapper.children);
    bullets.forEach(function(bullet, index) {
      var anchorPoint = anchorPoints[index];
      if (anchorPoint.panel.index === flicking.index) {
        addClass(bullet, activeClass);
        _this._prevIndex = index;
      }
      _this._addBulletEvents(bullet, index);
    });
    this._bullets = bullets;
  };
  __proto.update = function(index) {
    var flicking = this._flicking;
    var pagination = this._pagination;
    var wrapper = this._wrapper;
    var bullets = this._bullets;
    var bulletClass = this._bulletClass;
    var activeClass = this._activeClass;
    var prevIndex = this._prevIndex;
    var anchorPoints = flicking.camera.anchorPoints;
    var renderBullet = pagination.renderBullet;
    var renderActiveBullet = pagination.renderActiveBullet;
    if (anchorPoints.length <= 0) return;
    var anchorOffset = anchorPoints[0].panel.index;
    var activeBulletIndex = index - anchorOffset;
    if (prevIndex === activeBulletIndex) return;
    if (renderActiveBullet) {
      var prevBullet = bullets[prevIndex];
      if (prevBullet) {
        var newBullet = this._createBulletFromString(renderBullet(bulletClass, prevIndex), prevIndex);
        prevBullet.parentElement.replaceChild(newBullet, prevBullet);
        bullets[prevIndex] = newBullet;
      }
      var activeBullet = bullets[activeBulletIndex];
      var newActiveBullet = this._createBulletFromString(renderActiveBullet(bulletClass + " " + activeClass, activeBulletIndex), activeBulletIndex);
      wrapper.replaceChild(newActiveBullet, activeBullet);
      bullets[activeBulletIndex] = newActiveBullet;
    } else {
      var activeBullet = bullets[activeBulletIndex];
      var prevBullet = bullets[prevIndex];
      if (prevBullet) {
        removeClass(prevBullet, activeClass);
      }
      addClass(activeBullet, activeClass);
    }
    this._prevIndex = activeBulletIndex;
  };
  return BulletRenderer2;
})(Renderer);
var FractionRenderer = /* @__PURE__ */ (function(_super) {
  __extends(FractionRenderer2, _super);
  function FractionRenderer2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this._prevIndex = -1;
    _this._prevTotal = -1;
    return _this;
  }
  var __proto = FractionRenderer2.prototype;
  __proto.destroy = function() {
    this._prevIndex = -1;
    this._prevTotal = -1;
  };
  __proto.render = function() {
    var flicking = this._flicking;
    var wrapper = this._wrapper;
    var pagination = this._pagination;
    var fractionWrapperClass = pagination.classPrefix + "-" + PAGINATION.FRACTION_WRAPPER_SUFFIX;
    var fractionCurrentClass = pagination.classPrefix + "-" + PAGINATION.FRACTION_CURRENT_SUFFIX;
    var fractionTotalClass = pagination.classPrefix + "-" + PAGINATION.FRACTION_TOTAL_SUFFIX;
    addClass(wrapper, fractionWrapperClass);
    wrapper.innerHTML = pagination.renderFraction(fractionCurrentClass, fractionTotalClass);
    this.update(flicking.index);
  };
  __proto.update = function(index) {
    var flicking = this._flicking;
    var wrapper = this._wrapper;
    var pagination = this._pagination;
    var anchorPoints = flicking.camera.anchorPoints;
    var currentIndex = anchorPoints.length > 0 ? index - anchorPoints[0].panel.index + 1 : 0;
    var anchorCount = anchorPoints.length;
    if (currentIndex === this._prevIndex && anchorCount === this._prevTotal) return;
    var fractionCurrentSelector = "." + pagination.classPrefix + "-" + PAGINATION.FRACTION_CURRENT_SUFFIX;
    var fractionTotalSelector = "." + pagination.classPrefix + "-" + PAGINATION.FRACTION_TOTAL_SUFFIX;
    var currentWrapper = wrapper.querySelector(fractionCurrentSelector);
    var totalWrapper = wrapper.querySelector(fractionTotalSelector);
    currentWrapper.innerHTML = pagination.fractionCurrentFormat(currentIndex);
    totalWrapper.innerHTML = pagination.fractionTotalFormat(anchorCount);
    this._prevIndex = currentIndex;
    this._prevTotal = anchorCount;
  };
  return FractionRenderer2;
})(Renderer);
var ScrollBulletRenderer = /* @__PURE__ */ (function(_super) {
  __extends(ScrollBulletRenderer2, _super);
  function ScrollBulletRenderer2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this._bullets = [];
    _this._bulletSize = 0;
    _this._previousIndex = -1;
    _this._sliderIndex = -1;
    _this.moveTo = function(index) {
      var pagination = _this._pagination;
      var sliderEl = _this._wrapper.firstElementChild;
      var bulletSize = _this._bulletSize;
      var wrapperSize = bulletSize * pagination.bulletCount;
      sliderEl.style.transform = "translate(" + (wrapperSize / 2 - (index + 0.5) * bulletSize) + "px)";
      _this._sliderIndex = index;
    };
    return _this;
  }
  var __proto = ScrollBulletRenderer2.prototype;
  __proto.destroy = function() {
    this._bullets = [];
    this._bulletSize = 0;
    this._previousIndex = -1;
    this._sliderIndex = -1;
  };
  __proto.render = function() {
    var _this = this;
    var wrapper = this._wrapper;
    var flicking = this._flicking;
    var pagination = this._pagination;
    var renderBullet = pagination.renderBullet;
    var anchorPoints = flicking.camera.anchorPoints;
    var dynamicWrapperClass = pagination.classPrefix + "-" + PAGINATION.SCROLL_WRAPPER_SUFFIX;
    var bulletClass = pagination.classPrefix + "-" + PAGINATION.BULLET_SUFFIX;
    var sliderClass = pagination.classPrefix + "-" + PAGINATION.SCROLL_SLIDER_SUFFIX;
    var uninitClass = pagination.classPrefix + "-" + PAGINATION.SCROLL_UNINIT_SUFFIX;
    var sliderEl = document.createElement("div");
    addClass(sliderEl, sliderClass);
    addClass(wrapper, uninitClass);
    addClass(wrapper, dynamicWrapperClass);
    wrapper.appendChild(sliderEl);
    sliderEl.innerHTML = anchorPoints.map(function(_, index) {
      return renderBullet(bulletClass, index);
    }).join("\n");
    var bullets = [].slice.call(sliderEl.children);
    bullets.forEach(function(bullet, index) {
      _this._addBulletEvents(bullet, index);
    });
    if (bullets.length <= 0) return;
    var bulletStyle = getComputedStyle(bullets[0]);
    var bulletSize = bullets[0].clientWidth + parseFloat(bulletStyle.marginLeft) + parseFloat(bulletStyle.marginRight);
    wrapper.style.width = bulletSize * pagination.bulletCount + "px";
    this._bullets = bullets;
    this._bulletSize = bulletSize;
    this._previousIndex = -1;
    this.update(this._flicking.index);
    window.requestAnimationFrame(function() {
      removeClass(wrapper, uninitClass);
    });
  };
  __proto.update = function(index) {
    var pagination = this._pagination;
    var flicking = this._flicking;
    var bullets = this._bullets;
    var prevIndex = this._previousIndex;
    var renderBullet = pagination.renderBullet;
    var renderActiveBullet = pagination.renderActiveBullet;
    var anchorPoints = flicking.camera.anchorPoints;
    var anchorOffset = anchorPoints[0].panel.index;
    var activeIndex = index - anchorOffset;
    if (anchorPoints.length <= 0) return;
    var bulletClass = pagination.classPrefix + "-" + PAGINATION.BULLET_SUFFIX;
    var bulletActiveClass = pagination.classPrefix + "-" + PAGINATION.BULLET_ACTIVE_SUFFIX;
    var prevClassPrefix = pagination.classPrefix + "-" + PAGINATION.SCROLL_PREV_SUFFIX;
    var nextClassPrefix = pagination.classPrefix + "-" + PAGINATION.SCROLL_NEXT_SUFFIX;
    var bulletPrevClass = function(offset) {
      return "" + prevClassPrefix + (offset > 1 ? offset : "");
    };
    var bulletNextClass = function(offset) {
      return "" + nextClassPrefix + (offset > 1 ? offset : "");
    };
    var prevClassRegex = new RegExp("^" + prevClassPrefix);
    var nextClassRegex = new RegExp("^" + nextClassPrefix);
    if (renderActiveBullet) {
      var prevBullet = bullets[prevIndex];
      if (prevBullet) {
        var newBullet = this._createBulletFromString(renderBullet(bulletClass, prevIndex), prevIndex);
        prevBullet.parentElement.replaceChild(newBullet, prevBullet);
        bullets[prevIndex] = newBullet;
      }
      var activeBullet = bullets[activeIndex];
      if (activeBullet) {
        var newActiveBullet = this._createBulletFromString(renderActiveBullet(bulletClass, activeIndex), activeIndex);
        activeBullet.parentElement.replaceChild(newActiveBullet, activeBullet);
        bullets[activeIndex] = newActiveBullet;
      }
    }
    bullets.forEach(function(bullet, idx) {
      var indexOffset = idx - activeIndex;
      var classList = bullet.className.split(" ");
      for (var _i = 0, classList_1 = classList; _i < classList_1.length; _i++) {
        var className = classList_1[_i];
        if (className === bulletActiveClass || prevClassRegex.test(className) || nextClassRegex.test(className)) {
          removeClass(bullet, className);
        }
      }
      if (indexOffset === 0) {
        addClass(bullet, bulletActiveClass);
      } else if (indexOffset > 0) {
        addClass(bullet, bulletNextClass(Math.abs(indexOffset)));
      } else {
        addClass(bullet, bulletPrevClass(Math.abs(indexOffset)));
      }
    });
    pagination.scrollOnChange(activeIndex, {
      total: bullets.length,
      prevIndex,
      sliderIndex: this._sliderIndex,
      direction: activeIndex > prevIndex ? DIRECTION.NEXT : DIRECTION.PREV,
      bullets: __spreadArray([], bullets),
      moveTo: this.moveTo
    });
    this._previousIndex = activeIndex;
  };
  return ScrollBulletRenderer2;
})(Renderer);
var Pagination = /* @__PURE__ */ (function() {
  function Pagination2(_a) {
    var _this = this;
    var _b = _a === void 0 ? {} : _a, _c = _b.parentEl, parentEl = _c === void 0 ? null : _c, _d = _b.selector, selector = _d === void 0 ? PAGINATION.SELECTOR : _d, _e = _b.type, type = _e === void 0 ? PAGINATION.TYPE.BULLET : _e, _f = _b.classPrefix, classPrefix = _f === void 0 ? PAGINATION.PREFIX : _f, _g = _b.bulletCount, bulletCount = _g === void 0 ? 5 : _g, _h = _b.renderBullet, renderBullet = _h === void 0 ? function(className) {
      return '<span class="' + className + '"></span>';
    } : _h, _j = _b.renderActiveBullet, renderActiveBullet = _j === void 0 ? null : _j, _k = _b.renderFraction, renderFraction = _k === void 0 ? function(currentClass, totalClass) {
      return '<span class="' + currentClass + '"></span>/<span class="' + totalClass + '"></span>';
    } : _k, _l = _b.fractionCurrentFormat, fractionCurrentFormat = _l === void 0 ? function(index) {
      return index.toString();
    } : _l, _m = _b.fractionTotalFormat, fractionTotalFormat = _m === void 0 ? function(index) {
      return index.toString();
    } : _m, _o = _b.scrollOnChange, scrollOnChange = _o === void 0 ? function(index, ctx) {
      return ctx.moveTo(index);
    } : _o;
    this._flicking = null;
    this.update = function() {
      _this._removeAllChilds();
      _this._renderer.render();
    };
    this._onIndexChange = function(evt) {
      _this._renderer.update(evt.index);
    };
    this._parentEl = parentEl;
    this._selector = selector;
    this._type = type;
    this._classPrefix = classPrefix;
    this._bulletCount = bulletCount;
    this._renderBullet = renderBullet;
    this._renderActiveBullet = renderActiveBullet;
    this._renderFraction = renderFraction;
    this._fractionCurrentFormat = fractionCurrentFormat;
    this._fractionTotalFormat = fractionTotalFormat;
    this._scrollOnChange = scrollOnChange;
  }
  var __proto = Pagination2.prototype;
  Object.defineProperty(__proto, "parentEl", {
    get: function() {
      return this._parentEl;
    },
    set: function(val) {
      this._parentEl = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "selector", {
    get: function() {
      return this._selector;
    },
    set: function(val) {
      this._selector = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "type", {
    get: function() {
      return this._type;
    },
    set: function(val) {
      this._type = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "classPrefix", {
    get: function() {
      return this._classPrefix;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "bulletCount", {
    get: function() {
      return this._bulletCount;
    },
    set: function(val) {
      this._bulletCount = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "renderBullet", {
    get: function() {
      return this._renderBullet;
    },
    set: function(val) {
      this._renderBullet = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "renderActiveBullet", {
    get: function() {
      return this._renderActiveBullet;
    },
    set: function(val) {
      this._renderActiveBullet = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "renderFraction", {
    get: function() {
      return this._renderFraction;
    },
    set: function(val) {
      this._renderFraction = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "fractionCurrentFormat", {
    get: function() {
      return this._fractionCurrentFormat;
    },
    set: function(val) {
      this._fractionCurrentFormat = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "fractionTotalFormat", {
    get: function() {
      return this._fractionTotalFormat;
    },
    set: function(val) {
      this._fractionTotalFormat = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "scrollOnChange", {
    get: function() {
      return this._scrollOnChange;
    },
    set: function(val) {
      this._scrollOnChange = val;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(__proto, "bulletWrapperclassPrefixClass", {
    set: function(val) {
      this._classPrefix = val;
    },
    enumerable: false,
    configurable: true
  });
  __proto.init = function(flicking) {
    if (this._flicking) {
      this.destroy();
    }
    this._flicking = flicking;
    var type = this._type;
    var selector = this._selector;
    var parentEl = this._parentEl ? this._parentEl : flicking.element;
    var wrapper = parentEl.querySelector(selector);
    if (!wrapper) {
      throw new Error("[Flicking-Pagination] Couldn't find element with the given selector: " + selector);
    }
    this._wrapper = wrapper;
    this._renderer = this._createRenderer(type);
    flicking.on(EVENTS.WILL_CHANGE, this._onIndexChange);
    flicking.on(EVENTS.WILL_RESTORE, this._onIndexChange);
    flicking.on(EVENTS.PANEL_CHANGE, this.update);
    this.update();
  };
  __proto.destroy = function() {
    var flicking = this._flicking;
    if (!flicking) {
      return;
    }
    flicking.off(EVENTS.WILL_CHANGE, this._onIndexChange);
    flicking.off(EVENTS.WILL_RESTORE, this._onIndexChange);
    flicking.off(EVENTS.PANEL_CHANGE, this.update);
    this._renderer.destroy();
    this._removeAllChilds();
    this._flicking = null;
  };
  __proto._createRenderer = function(type) {
    var options = {
      flicking: this._flicking,
      pagination: this,
      wrapper: this._wrapper
    };
    switch (type) {
      case PAGINATION.TYPE.BULLET:
        return new BulletRenderer(options);
      case PAGINATION.TYPE.FRACTION:
        return new FractionRenderer(options);
      case PAGINATION.TYPE.SCROLL:
        return new ScrollBulletRenderer(options);
      default:
        throw new Error('[Flicking-Pagination] type "' + type + '" is not supported.');
    }
  };
  __proto._removeAllChilds = function() {
    var wrapper = this._wrapper;
    while (wrapper.firstChild) {
      wrapper.removeChild(wrapper.firstChild);
    }
  };
  return Pagination2;
})();
(function(Drupal2, once2) {
  function initViewport(viewport) {
    let options = {};
    const raw = viewport.getAttribute("data-flicking-options");
    if (raw) {
      try {
        options = JSON.parse(raw);
      } catch (e) {
        console.warn("Invalid options", e);
      }
    }
    const showArrows = options.showArrows;
    const showPagination = options.showPagination;
    if (options.panelsPerView == null) options.panelsPerView = 1;
    const flicking = new Flicking(viewport, options);
    const plugins = [];
    if (showArrows) {
      plugins.push(new Arrow({
        prevElSelector: ".flicking-arrow-prev",
        nextElSelector: ".flicking-arrow-next"
      }));
    }
    if (showPagination) {
      plugins.push(new Pagination({ type: "bullet" }));
    }
    if (options.autoPlay) {
      console.log(plugins);
      plugins.push(
        new AutoPlay({
          duration: options.autoplayDuration || 5e3,
          direction: "NEXT",
          stopOnHover: true
        })
      );
    }
    if (plugins.length) {
      flicking.addPlugins(...plugins);
    }
  }
  Drupal2.behaviors.slider = {
    attach(context) {
      const viewports = once2(
        "flicking",
        ".slider .flicking-viewport",
        context
      );
      viewports.forEach(initViewport);
    }
  };
})(Drupal, once);
